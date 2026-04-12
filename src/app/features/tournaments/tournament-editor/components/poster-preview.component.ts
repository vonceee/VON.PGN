import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  OnInit,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  signal,
  WritableSignal,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormGroup } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import Konva from 'konva';
import { jsPDF } from 'jspdf';

interface PosterPrize {
  place: string;
  value: string;
}

interface PosterSpecialAward {
  name: string;
  value: string;
}

interface PosterCategory {
  category: string;
  prizes: PosterPrize[];
  specialAwards?: PosterSpecialAward[];
}

@Component({
  selector: 'app-poster-preview',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './poster-preview.component.html',
  styleUrls: ['./poster-preview.component.css'],
})
export class PosterPreviewComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() tournamentData!: Record<string, any>;
  @Input() prizeCategories: PosterCategory[] = [];
  @Input() downloading = false;
  @Input() isEditable = true;
  @Input() form!: FormGroup;

  @Output() download = new EventEmitter<void>();
  @Output() mediaUpload = new EventEmitter<{ file: File; type: 'background' | 'logo' | 'poster' }>();

  @ViewChild('canvasHolder') canvasHolder!: ElementRef<HTMLDivElement>;
  @ViewChild('konvaHolder') konvaHolder!: ElementRef<HTMLDivElement>;

  private stage?: Konva.Stage;
  private layer?: Konva.Layer;
  private groups: Record<string, Konva.Group> = {};
  
  zoomLevel = signal(0.5);
  
  // Internal A4 Dimensions (300 DPI)
  private readonly CANVAS_WIDTH = 2480;
  private readonly CANVAS_HEIGHT = 3508;

  private formatMoney(val: any): string {
    if (val === undefined || val === null || val === '') return '';
    const str = String(val).trim();
    // Remove common non-numeric characters for parsing check ($, ₱, spaces, commas)
    const cleanStr = str.replace(/[₱$,\s]/g, '');
    const num = parseFloat(cleanStr);
    
    // If it's a valid number, format it
    if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(cleanStr)) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
      }).format(num);
    }
    return str;
  }

  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  constructor() {}

  ngOnInit() {
    // Redraw when form settings change
    this.form.valueChanges.subscribe(() => {
      if (isPlatformBrowser(this.platformId)) {
        if (!this.useCustomPoster && !this.stage) {
          // Switching back from custom mode to designer mode
          setTimeout(() => {
            if (!this.stage) {
              this.initKonva();
              this.setupResizeObserver();
              this.renderPoster();
              this.cdr.detectChanges();
            }
          });
        } else {
          this.renderPoster();
          this.cdr.detectChanges();
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['tournamentData'] || changes['prizeCategories']) && !changes['tournamentData']?.firstChange) {
      if (isPlatformBrowser(this.platformId)) {
        this.renderPoster();
      }
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      if (!this.useCustomPoster) {
        this.initKonva();
        this.setupResizeObserver();
        this.renderPoster();
      }
    }
  }

  ngOnDestroy() {
    if (this.stage) {
      this.stage.destroy();
    }
  }

  get posterSettings() {
    return this.form.get('posterSettings') as FormGroup;
  }

  get logosArray() {
    return this.posterSettings.get('logos') as FormArray;
  }

  get useCustomPoster(): boolean {
    return this.posterSettings.get('useCustomPoster')?.value ?? false;
  }

  get customPosterUrl(): string | null {
    return this.posterSettings.get('customPosterUrl')?.value;
  }

  private initKonva() {
    this.stage = new Konva.Stage({
      container: this.konvaHolder.nativeElement,
      width: this.CANVAS_WIDTH,
      height: this.CANVAS_HEIGHT,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // Create groups for each layout
    const layouts: ('portrait-classic' | 'portrait-split' | 'portrait-minimal')[] = [
      'portrait-classic',
      'portrait-split',
      'portrait-minimal',
    ];

    layouts.forEach((id) => {
      const group = new Konva.Group({ id, visible: false });
      this.groups[id] = group;
      this.layer?.add(group);
    });
  }

  private setupResizeObserver() {
    const observer = new ResizeObserver(() => {
      this.fitStageToContainer();
    });
    observer.observe(this.canvasHolder.nativeElement);
    this.fitStageToContainer();
  }

  private fitStageToContainer() {
    if (!this.stage || !this.konvaHolder || !this.canvasHolder) return;

    // Use Workspace Width as the baseline for "100%"
    const workspaceWidth = this.canvasHolder.nativeElement.parentElement?.offsetWidth || 800;
    const padding = 40; // Correspond to 2rem padding in CSS
    const availableWidth = Math.max(workspaceWidth - padding, 400);

    const baseScale = availableWidth / this.CANVAS_WIDTH;
    const finalScale = baseScale * this.zoomLevel();

    this.stage.width(this.CANVAS_WIDTH * finalScale);
    this.stage.height(this.CANVAS_HEIGHT * finalScale);
    this.stage.scale({ x: finalScale, y: finalScale });
  }

  zoomIn() {
    const current = this.zoomLevel();
    if (current < 2.0) {
      this.zoomLevel.set(Number((current + 0.1).toFixed(2)));
      this.fitStageToContainer();
    }
  }

  zoomOut() {
    const current = this.zoomLevel();
    if (current > 0.1) {
      this.zoomLevel.set(Number((current - 0.1).toFixed(2)));
      this.fitStageToContainer();
    }
  }

  resetZoom() {
    this.zoomLevel.set(1.0);
    this.fitStageToContainer();
  }

  async renderPoster() {
    if (!this.layer || !this.stage || this.useCustomPoster) return;

    const settings = this.posterSettings.value;
    const layoutId = settings.layoutId;

    // Show selected group, hide others
    Object.keys(this.groups).forEach((id) => {
      this.groups[id].visible(id === layoutId);
      if (id === layoutId) {
        this.drawLayout(id, this.groups[id]);
      }
    });

    this.layer.batchDraw();
  }

  private async drawLayout(id: string, group: Konva.Group) {
    group.destroyChildren();

    const settings = this.posterSettings.value;
    const visibility = settings.visibility;
    const data = this.tournamentData;

    const isDark = settings.theme === 'dark';
    const textColor = isDark ? '#fff' : '#000';
    const subColor = isDark ? '#cbd5e1' : '#64748b';
    const bgColor = isDark ? '#000' : '#fff';
    const borderColor = isDark ? '#fff' : '#000';

    // 1. Background
    const rect = new Konva.Rect({
      width: this.CANVAS_WIDTH,
      height: this.CANVAS_HEIGHT,
      fill: bgColor,
    });
    group.add(rect);

    if (settings.backgroundImage) {
      try {
        const bgImg = await this.loadImage(this.processUrl(settings.backgroundImage)!);
        const bg = new Konva.Image({
          image: bgImg,
          width: this.CANVAS_WIDTH,
          height: this.CANVAS_HEIGHT,
        });
        group.add(bg);

        const overlay = new Konva.Rect({
          width: this.CANVAS_WIDTH,
          height: this.CANVAS_HEIGHT,
          fill: bgColor,
          opacity: 0.6,
        });
        group.add(overlay);
      } catch (e) {
        console.error('Failed to load background image', e);
      }
    }

    // 2. Layout Specific Structures
    const colors = { text: textColor, sub: subColor, bg: bgColor, border: borderColor };
    if (id === 'portrait-classic') {
      this.drawClassic(group, data, settings, colors);
    } else if (id === 'portrait-split') {
      this.drawSplit(group, data, settings, colors);
    } else if (id === 'portrait-minimal') {
      this.drawMinimal(group, data, settings, colors);
    }

    // 3. Logos (Shared logic)
    if (settings.logos && settings.logos.length > 0) {
      this.drawLogos(group, settings.logos, id);
    }
  }

  private drawClassic(group: Konva.Group, data: any, settings: any, colors: any) {
    const v = settings.visibility;
    const margin = 150;
    let currentY = 200;

    // Title (Centered, auto-scales)
    const titleFontSize = data.name?.length > 40 ? 80 : 120;
    const title = new Konva.Text({
      x: margin,
      y: currentY,
      text: (data.name || 'TOURNAMENT NAME').toUpperCase(),
      fontSize: titleFontSize,
      fontFamily: 'Arial',
      fill: colors.text,
      width: this.CANVAS_WIDTH - (margin * 2),
      align: 'center',
      fontStyle: 'bold',
      lineHeight: 1.2,
    });
    group.add(title);
    currentY += title.height() + 80;

    // Subheader Line
    const line = new Konva.Line({
        points: [margin, currentY, this.CANVAS_WIDTH - margin, currentY],
        stroke: colors.text,
        strokeWidth: 4,
    });
    group.add(line);
    currentY += 100;

    // Info Grid (Plain text)
    const details = [
        { label: 'Date:', value: data.dates?.start },
        { label: 'Location:', value: data.location },
        { label: 'Format:', value: data.format },
        { label: 'Time Control:', value: data.timeControl },
        { label: 'Rounds:', value: data.rounds },
    ];

    if (v.showEntryFee && data.entryFee) {
        details.push({ label: 'Entry Fee:', value: this.formatMoney(data.entryFee) });
    }

    details.forEach(detail => {
        if (!detail.value) return;
        const label = new Konva.Text({
            x: margin,
            y: currentY,
            text: detail.label,
            fontSize: 50,
            fontFamily: 'Arial',
            fill: colors.text,
            fontStyle: 'bold',
        });
        group.add(label);

        const val = new Konva.Text({
            x: margin + 450,
            y: currentY,
            text: String(detail.value).toUpperCase(),
            fontSize: 50,
            fontFamily: 'Arial',
            fill: colors.text,
        });
        group.add(val);
        currentY += 80;
    });

    currentY += 100;

    // Prizes Section
    if (v.showPrizePool && this.prizeCategories.length > 0) {
        const pHeader = new Konva.Text({
            x: margin,
            y: currentY,
            text: 'PRIZES & CATEGORIES',
            fontSize: 60,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: colors.text,
        });
        group.add(pHeader);
        currentY += 100;

        this.prizeCategories.forEach(cat => {
            const catName = new Konva.Text({
                x: margin,
                y: currentY,
                text: cat.category.toUpperCase(),
                fontSize: 45,
                fontFamily: 'Arial',
                fontStyle: 'bold',
                fill: colors.text,
            });
            group.add(catName);
            currentY += 60;

            cat.prizes.forEach(p => {
                const pText = new Konva.Text({
                    x: margin + 50,
                    y: currentY,
                    text: `${p.place}: ${this.formatMoney(p.value)}`,
                    fontSize: 40,
                    fontFamily: 'Arial',
                    fill: colors.text,
                });
                group.add(pText);
                currentY += 50;
            });

            if (cat.specialAwards && cat.specialAwards.length > 0) {
                const saHeader = new Konva.Text({
                    x: margin + 50,
                    y: currentY,
                    text: 'SPECIAL PRIZES:',
                    fontSize: 30,
                    fontFamily: 'Arial',
                    fill: colors.text,
                    fontStyle: 'bold',
                });
                group.add(saHeader);
                currentY += 40;

                cat.specialAwards.forEach(sa => {
                    const saText = new Konva.Text({
                        x: margin + 70,
                        y: currentY,
                        text: `${sa.name}: ${this.formatMoney(sa.value)}`,
                        fontSize: 35,
                        fontFamily: 'Arial',
                        fill: colors.text,
                        fontStyle: 'italic',
                    });
                    group.add(saText);
                    currentY += 45;
                });
            }
            currentY += 40;
        });
    }

    // Schedule
    if (v.showSchedule && data.schedule?.day_1?.events) {
        currentY += 60;
        const sHeader = new Konva.Text({
            x: margin,
            y: currentY,
            text: 'SCHEDULE',
            fontSize: 60,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: colors.text,
        });
        group.add(sHeader);
        currentY += 100;

        data.schedule.day_1.events.forEach((e: any) => {
            const eText = new Konva.Text({
                x: margin + 50,
                y: currentY,
                text: `${e.time} - ${e.name}`,
                fontSize: 40,
                fontFamily: 'Arial',
                fill: colors.text,
            });
            group.add(eText);
            currentY += 50;
        });
    }

    // Footer
    const footerY = this.CANVAS_HEIGHT - 300;
    const footerLine = new Konva.Line({
        points: [margin, footerY, this.CANVAS_WIDTH - margin, footerY],
        stroke: '#ccc',
        strokeWidth: 2,
    });
    group.add(footerLine);

    if (v.showOrganizerInfo) {
        const org = new Konva.Text({
            x: margin,
            y: footerY + 50,
            text: `Organizer: ${data.organizer || ''} | Contact: ${data.contact || ''}`,
            fontSize: 40,
            fontFamily: 'Arial',
            fill: colors.sub,
            width: this.CANVAS_WIDTH - (margin * 2),
            align: 'center',
        });
        group.add(org);
    }
  }

  private drawTopHeavy(group: Konva.Group, data: any, settings: any) {
    const v = settings.visibility;

    // Massive black box at top
    const topBox = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.CANVAS_WIDTH,
      height: 1000,
      fill: '#000',
    });
    group.add(topBox);

    // Title
    const titleFontSize = data.name?.length > 30 ? 120 : 180;
    const title = new Konva.Text({
      x: 100,
      y: 200,
      text: (data.name || 'TOURNAMENT').toUpperCase(),
      fontSize: titleFontSize,
      fontFamily: 'Arial Black',
      fill: '#fff',
      width: this.CANVAS_WIDTH - 200,
      align: 'left',
      lineHeight: 1.1,
    });
    group.add(title);
    let currentY = Math.max(1150, title.y() + title.height() + 150);

    // Subtitle / Date
    const subtitle = new Konva.Text({
      x: 100,
      y: 450,
      text: `${data.dates?.start || ''} • ${data.location || ''}`.toUpperCase(),
      fontSize: 60,
      fontFamily: 'Courier New',
      fill: '#ccc', // Light gray/White for black background
      width: this.CANVAS_WIDTH - 200,
    });
    group.add(subtitle);

    // Prize Pool in top box
    if (v.showPrizePool && data.prizePool) {
      const prizePool = new Konva.Text({
        x: 100,
        y: 650,
        text: `PRIZE POOL: ${this.formatMoney(data.prizePool)}`.toUpperCase(),
        fontSize: 100,
        fontFamily: 'Arial Black',
        fill: '#fff',
      });
      group.add(prizePool);
    }

    // Entry Fee in top box
    if (v.showEntryFee && data.entryFee) {
      const entryFee = new Konva.Text({
        x: 100,
        y: 800,
        text: `ENTRY FEE: ${this.formatMoney(data.entryFee)}`.toUpperCase(),
        fontSize: 70,
        fontFamily: 'Arial Black',
        fill: '#fff',
      });
      group.add(entryFee);
    }

    // Bottom content
    // currentY is already calculated above based on title height

    // Schedule
    if (v.showSchedule && data.schedule) {
      const scheduleHeader = new Konva.Text({
        x: 100,
        y: currentY,
        text: 'SCHEDULE',
        fontSize: 80,
        fontFamily: 'Arial Black',
        fill: '#000',
      });
      group.add(scheduleHeader);
      currentY += 100;

      // Draw first few events
      const day1 = data.schedule.day_1;
      if (day1 && day1.events) {
        day1.events.slice(0, 5).forEach((e: any) => {
          const eventText = new Konva.Text({
            x: 150,
            y: currentY,
            text: `${e.time} - ${e.name}`.toUpperCase(),
            fontSize: 50,
            fontFamily: 'Courier New',
            fill: '#334155',
          });
          group.add(eventText);
          currentY += 70;
        });
      }
    }

    // Prizes
    if (v.showPrizePool && this.prizeCategories.length > 0) {
      const prizeHeader = new Konva.Text({
        x: 100,
        y: currentY,
        text: 'PRIZES',
        fontSize: 80,
        fontFamily: 'Arial Black',
        fill: '#000',
      });
      group.add(prizeHeader);
      currentY += 100;

      this.prizeCategories.slice(0, 3).forEach((cat) => {
        const catName = new Konva.Text({
          x: 100,
          y: currentY,
          text: cat.category.toUpperCase(),
          fontSize: 50,
          fontFamily: 'Arial Black',
          fill: '#334155',
        });
        group.add(catName);
        currentY += 60;

        cat.prizes.forEach((p) => {
          const pText = new Konva.Text({
            x: 150,
            y: currentY,
            text: `${p.place}: ${this.formatMoney(p.value)}`.toUpperCase(),
            fontSize: 40,
            fontFamily: 'Courier New',
            fill: '#475569',
          });
          group.add(pText);
          currentY += 50;
        });

        if (cat.specialAwards) {
          cat.specialAwards.forEach((sa) => {
            const saText = new Konva.Text({
              x: 150,
              y: currentY,
              text: `${sa.name}: ${this.formatMoney(sa.value)}`.toUpperCase(),
              fontSize: 35,
              fontFamily: 'Courier New',
              fill: '#64748b',
              fontStyle: 'italic',
            });
            group.add(saText);
            currentY += 45;
          });
        }
        currentY += 40;
      });
    }

    // Organizer Info
    if (v.showOrganizerInfo) {
      const footerY = this.CANVAS_HEIGHT - 400;
      const organizer = new Konva.Text({
        x: 100,
        y: footerY,
        text: `ORGANIZER: ${data.organizer || ''}`.toUpperCase(),
        fontSize: 50,
        fontFamily: 'Courier New',
        fill: '#64748b',
      });
      group.add(organizer);

      const contact = new Konva.Text({
        x: 100,
        y: footerY + 70,
        text: `CONTACT: ${data.contact || ''}`.toUpperCase(),
        fontSize: 50,
        fontFamily: 'Courier New',
        fill: '#64748b',
      });
      group.add(contact);
    }
    
    // Branding
    const branding = new Konva.Text({
      x: this.CANVAS_WIDTH - 500,
      y: this.CANVAS_HEIGHT - 100,
      text: 'RENDERED BY VON.CHESS',
      fontSize: 30,
      fontFamily: 'Courier New',
      fill: '#94a3b8',
      letterSpacing: 5
    });
    group.add(branding);
  }

  private drawSplit(group: Konva.Group, data: any, settings: any, colors: any) {
    const v = settings.visibility;
    const margin = 100;
    const colWidth = (this.CANVAS_WIDTH - (margin * 3)) / 2;
    let leftY = 200;
    let rightY = 200;

    // Vertical Divider
    const divider = new Konva.Line({
        points: [this.CANVAS_WIDTH / 2, margin, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT - margin],
        stroke: colors.text,
        opacity: 0.1,
        strokeWidth: 2,
    });
    group.add(divider);

    // --- LEFT COLUMN: Tournament Info ---
    
    // Auto-scaling Title
    const titleFontSize = data.name?.length > 30 ? 80 : 120;
    const title = new Konva.Text({
      x: margin,
      y: leftY,
      text: (data.name || 'TOURNAMENT').toUpperCase(),
      fontSize: titleFontSize,
      fontFamily: 'Arial Black',
      fill: colors.text,
      width: colWidth,
      lineHeight: 1.1,
    });
    group.add(title);
    leftY += title.height() + 100;

    // Details List
    const details = [
        { label: 'DATE', value: data.dates?.start },
        { label: 'LOCATION', value: data.location },
        { label: 'FORMAT', value: data.format },
        { label: 'TIME CONTROL', value: data.timeControl },
        { label: 'ROUNDS', value: data.rounds },
    ];

    if (v.showEntryFee && data.entryFee) {
        details.push({ label: 'ENTRY FEE', value: this.formatMoney(data.entryFee) });
    }

    details.forEach(detail => {
        if (!detail.value) return;
        const label = new Konva.Text({
            x: margin,
            y: leftY,
            text: detail.label,
            fontSize: 35,
            fontFamily: 'Courier New',
            fill: colors.text,
            fontStyle: 'bold'
        });
        group.add(label);
        leftY += 50;

        const val = new Konva.Text({
            x: margin,
            y: leftY,
            text: String(detail.value).toUpperCase(),
            fontSize: 50,
            fontFamily: 'Arial Black',
            fill: colors.text,
            width: colWidth,
        });
        group.add(val);
        leftY += val.height() + 60;
    });

    // Overall Prize Pool (if enabled)
    if (v.showPrizePool && data.prizePool) {
        const pLabel = new Konva.Text({
            x: margin,
            y: leftY,
            text: 'TOTAL PRIZE POOL',
            fontSize: 40,
            fontFamily: 'Arial Black',
            fill: colors.text,
        });
        group.add(pLabel);
        leftY += 60;

        const pVal = new Konva.Text({
            x: margin,
            y: leftY,
            text: this.formatMoney(data.prizePool).toUpperCase(),
            fontSize: 90,
            fontFamily: 'Arial Black',
            fill: colors.text,
        });
        group.add(pVal);
    }

    // --- RIGHT COLUMN: Prizes ---
    if (v.showPrizePool && this.prizeCategories.length > 0) {
        const prizeHeader = new Konva.Text({
            x: (this.CANVAS_WIDTH / 2) + 100,
            y: rightY,
            text: 'PRIZES',
            fontSize: 80,
            fontFamily: 'Arial Black',
            fill: colors.text,
        });
        group.add(prizeHeader);
        rightY += 120;

        this.prizeCategories.forEach(cat => {
            const catTitle = new Konva.Text({
                x: (this.CANVAS_WIDTH / 2) + 100,
                y: rightY,
                text: cat.category.toUpperCase(),
                fontSize: 60,
                fontFamily: 'Arial Black',
                fill: colors.text,
                width: colWidth,
            });
            group.add(catTitle);
            rightY += catTitle.height() + 20;

            cat.prizes.forEach(p => {
                const row = new Konva.Text({
                    x: (this.CANVAS_WIDTH / 2) + 130,
                    y: rightY,
                    text: `${p.place}: ${this.formatMoney(p.value)}`.toUpperCase(),
                    fontSize: 45,
                    fontFamily: 'Courier New',
                    fontStyle: 'bold',
                    fill: colors.text,
                    width: colWidth - 30,
                });
                group.add(row);
                rightY += row.height() + 15;
            });

            if (cat.specialAwards && cat.specialAwards.length > 0) {
                rightY += 20;
                const saHead = new Konva.Text({
                  x: (this.CANVAS_WIDTH / 2) + 130,
                  y: rightY,
                  text: 'SPECIAL PRIZES:',
                  fontSize: 35,
                  fontFamily: 'Courier New',
                  fill: colors.text,
                  fontStyle: 'bold',
                });
                group.add(saHead);
                rightY += 40;

                cat.specialAwards.forEach(sa => {
                    const saRow = new Konva.Text({
                        x: (this.CANVAS_WIDTH / 2) + 150,
                        y: rightY,
                        text: `${sa.name}: ${this.formatMoney(sa.value)}`.toUpperCase(),
                        fontSize: 40,
                        fontFamily: 'Courier New',
                        fontStyle: 'bold',
                        fill: colors.text,
                    });
                    group.add(saRow);
                    rightY += saRow.height() + 10;
                });
            }
            rightY += 70;
        });
    }

    // Schedule (If space allows, or in Left Column if low on content)
    if (v.showSchedule && data.schedule?.day_1?.events) {
        const targetY = rightY > 1500 ? leftY + 100 : rightY;
        const targetX = rightY > 1500 ? margin : (this.CANVAS_WIDTH / 2) + 100;
        
        let sY = targetY;
        const sHeader = new Konva.Text({
            x: targetX,
            y: sY,
            text: 'SCHEDULE',
            fontSize: 60,
            fontFamily: 'Arial Black',
            fill: colors.text,
        });
        group.add(sHeader);
        sY += 80;

        data.schedule.day_1.events.slice(0, 8).forEach((e: any) => {
            const eText = new Konva.Text({
                x: targetX + 30,
                y: sY,
                text: `${e.time} - ${e.name}`.toUpperCase(),
                fontSize: 35,
                fontFamily: 'Courier New',
                fill: colors.text,
                width: colWidth,
            });
            group.add(eText);
            sY += eText.height() + 10;
        });
    }

    // FOOTER: Organizer
    if (v.showOrganizerInfo) {
        const footerY = this.CANVAS_HEIGHT - 200;
        const orgInfo = new Konva.Text({
            x: margin,
            y: footerY,
            text: `ORGANIZED BY: ${data.organizer || ''}  |  CONTACT: ${data.contact || ''}`.toUpperCase(),
            fontSize: 40,
            fontFamily: 'Courier New',
            fill: colors.text,
            width: this.CANVAS_WIDTH - (margin * 2),
            align: 'center',
            letterSpacing: 2,
        });
        group.add(orgInfo);
    }
  }

  private drawMinimal(group: Konva.Group, data: any, settings: any, colors: any) {
    const v = settings.visibility;

    // Thick raw border
    const border = new Konva.Rect({
      x: 100,
      y: 100,
      width: this.CANVAS_WIDTH - 200,
      height: this.CANVAS_HEIGHT - 200,
      stroke: colors.text,
      strokeWidth: 40,
    });
    group.add(border);

    // Left Aligned Stacked Text
    let currentY = 300;
    const margin = 200;

    const items = [
      { text: data.name, size: 220, font: 'Arial Black', color: colors.text },
      { text: data.dates?.start, size: 80, font: 'Courier New', color: colors.text },
      { text: data.location, size: 60, font: 'Courier New', color: colors.text },
      { text: data.format, size: 60, font: 'Courier New', color: colors.text },
      { text: data.rounds ? `${data.rounds} ROUNDS` : '', size: 60, font: 'Courier New', color: colors.text },
    ];

    if (v.showPrizePool && data.prizePool) items.push({ text: `PRIZE: ${this.formatMoney(data.prizePool)}`, size: 100, font: 'Arial Black', color: colors.text });
    if (v.showEntryFee && data.entryFee) items.push({ text: `FEE: ${this.formatMoney(data.entryFee)}`, size: 80, font: 'Courier New', color: colors.text });

    items.forEach((item, index) => {
      if (!item.text) return;
      
      let size = item.size;
      if (index === 0 && item.text.length > 20) size = 140;

      const text = new Konva.Text({
        x: margin,
        y: currentY,
        text: item.text.toUpperCase(),
        fontSize: size,
        fontFamily: item.font,
        fill: item.color,
        width: this.CANVAS_WIDTH - (margin * 2),
        lineHeight: 1.1,
      });
      group.add(text);
      currentY += text.height() + 40;
    });

    // Minimalist Prizes List
    if (v.showPrizePool && this.prizeCategories.length > 0) {
        currentY += 60;
        this.prizeCategories.forEach(cat => {
            const catName = new Konva.Text({
                x: margin,
                y: currentY,
                text: cat.category.toUpperCase(),
                fontSize: 80,
                fontFamily: 'Arial Black',
                fill: colors.text,
            });
            group.add(catName);
            currentY += 80;

            cat.prizes.forEach(p => {
                const pLine = new Konva.Text({
                    x: margin + 50,
                    y: currentY,
                    text: `${p.place} >> ${this.formatMoney(p.value)}`.toUpperCase(),
                    fontSize: 55,
                    fontFamily: 'Courier New',
                    fontStyle: 'bold',
                    fill: colors.text,
                });
                group.add(pLine);
                currentY += 75;
            });

            if (cat.specialAwards && cat.specialAwards.length > 0) {
                const saHead = new Konva.Text({
                  x: margin + 50,
                  y: currentY,
                  text: 'SPECIALS',
                  fontSize: 40,
                  fontFamily: 'Courier New',
                  fill: colors.text,
                  fontStyle: 'bold',
                });
                group.add(saHead);
                currentY += 40;

                cat.specialAwards.forEach(sa => {
                    const saLine = new Konva.Text({
                        x: margin + 80,
                        y: currentY,
                        text: `[-] ${sa.name}: ${this.formatMoney(sa.value)}`.toUpperCase(),
                        fontSize: 45,
                        fontFamily: 'Courier New',
                        fontStyle: 'bold',
                        fill: colors.text,
                    });
                    group.add(saLine);
                    currentY += 60;
                });
            }
            currentY += 40;

            // Stop if we are reaching the bottom border
            if (currentY > this.CANVAS_HEIGHT - 400) return;
        });
    }

    // Organizer Info (Footer)
    if (v.showOrganizerInfo) {
        const orgInfo = new Konva.Text({
            x: margin,
            y: this.CANVAS_HEIGHT - 300,
            text: `ORGANIZER: ${data.organizer || ''} | CONTACT: ${data.contact || ''}`.toUpperCase(),
            fontSize: 40,
            fontFamily: 'Courier New',
            fill: colors.sub,
            width: this.CANVAS_WIDTH - (margin * 2),
            align: 'center',
        });
        group.add(orgInfo);
    }
  }

  private async drawLogos(group: Konva.Group, logos: string[], layoutId: string) {
    let x = 100;
    let y = this.CANVAS_HEIGHT - 300;
    const logoSize = 250;
    const spacing = 100;

    if (layoutId === 'portrait-minimal') {
        x = 200;
        y = this.CANVAS_HEIGHT - 550;
        // Stack logos vertically in minimal
        for (const url of logos.slice(0, 3)) {
            try { const img = await this.loadImage(this.processUrl(url)!);
            const kImg = new Konva.Image({
                image: img,
                x,
                y,
                width: 150,
                height: 150,
            });
            group.add(kImg);
            y += 180;
        } catch(e) { console.error('Logo err', e); } }
        return;
    }

    for (const url of logos.slice(0, 5)) {
      try {
        const img = await this.loadImage(url);
        const kImg = new Konva.Image({
          image: img,
          x,
          y,
          width: logoSize,
          height: logoSize,
        });
        group.add(kImg);
        x += logoSize + spacing;
      } catch (e) {
        console.error('Failed to load logo', url, e);
      }
    }
  }

  
  private processUrl(url: any): string | null {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) return url;
    // Assuming relative path from API base
    const base = 'https://vonchess.net'; // Fallback to production base if relative
    if (url.startsWith('/')) return `${base}${url}`;
    return url;
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async onFileSelected(event: any, type: 'background' | 'logo' | 'poster') {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Max 10MB.');
      return;
    }

    this.mediaUpload.emit({ file, type });
  }


  removeLogo(index: number) {
    this.logosArray.removeAt(index);
    this.renderPoster();
  }

  handleDownload() {
    if (!this.stage) return;
    
    const dataURL = this.stage.toDataURL({
      mimeType: 'image/jpeg',
      quality: 0.9,
      pixelRatio: 1, // Already at high res
    });

    const link = document.createElement('a');
    link.download = `tournament-poster-${this.tournamentData['name'] || 'export'}.jpg`;
    link.href = dataURL;
    link.click();
  }

  exportAsPDF() {
    if (!this.stage) return;

    const dataURL = this.stage.toDataURL({
        pixelRatio: 1, // Full A4 high res
        mimeType: 'image/jpeg',
        quality: 0.95
    });

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // A4 is 210 x 297 mm
    pdf.addImage(dataURL, 'JPEG', 0, 0, 210, 297);
    pdf.save(`tournament-poster-${this.tournamentData['name'] || 'export'}.pdf`);
  }
}
