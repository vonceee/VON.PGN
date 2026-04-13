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
  @Output() mediaUpload = new EventEmitter<{
    file: File;
    type: 'background' | 'logo' | 'poster';
  }>();

  @ViewChild('canvasHolder') canvasHolder!: ElementRef<HTMLDivElement>;
  @ViewChild('konvaHolder') konvaHolder!: ElementRef<HTMLDivElement>;

  private stage?: Konva.Stage;
  private layer?: Konva.Layer;

  zoomLevel = signal(1.0);

  // Internal A4 Dimensions (300 DPI)
  private readonly CANVAS_WIDTH = 2480;
  private readonly CANVAS_HEIGHT = 3508;

  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.form.valueChanges.subscribe(() => {
        if (!this.useCustomPoster) {
          if (!this.stage) {
            setTimeout(() => this.initAndRender());
          } else {
            this.renderPoster();
          }
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['tournamentData'] || changes['prizeCategories']) &&
      !changes['tournamentData']?.firstChange
    ) {
      if (isPlatformBrowser(this.platformId)) this.renderPoster();
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId) && !this.useCustomPoster) {
      this.initAndRender();
    }
  }

  private initAndRender() {
    this.initKonva();
    this.setupResizeObserver();
    this.renderPoster();
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    if (this.stage) this.stage.destroy();
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
    if (!this.konvaHolder?.nativeElement) return;
    this.stage = new Konva.Stage({
      container: this.konvaHolder.nativeElement,
      width: this.CANVAS_WIDTH,
      height: this.CANVAS_HEIGHT,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  }

  private setupResizeObserver() {
    if (!this.canvasHolder?.nativeElement) return;
    const observer = new ResizeObserver(() => this.fitStageToContainer());
    observer.observe(this.canvasHolder.nativeElement);
    this.fitStageToContainer();
  }

  private fitStageToContainer() {
    if (!this.stage || !this.canvasHolder) return;
    const workspaceWidth = this.canvasHolder.nativeElement.parentElement?.offsetWidth || 800;
    const padding = workspaceWidth < 768 ? 16 : 40;
    const availableWidth = Math.max(workspaceWidth - padding, 280);
    const baseScale = availableWidth / this.CANVAS_WIDTH;
    const finalScale = baseScale * this.zoomLevel();
    this.stage.width(this.CANVAS_WIDTH * finalScale);
    this.stage.height(this.CANVAS_HEIGHT * finalScale);
    this.stage.scale({ x: finalScale, y: finalScale });
  }

  zoomIn() {
    this.zoomLevel.set(Math.min(2.0, this.zoomLevel() + 0.1));
    this.fitStageToContainer();
  }
  zoomOut() {
    this.zoomLevel.set(Math.max(0.1, this.zoomLevel() - 0.1));
    this.fitStageToContainer();
  }
  resetZoom() {
    this.zoomLevel.set(1.0);
    this.fitStageToContainer();
  }

  async renderPoster() {
    if (!this.layer || !this.stage || this.useCustomPoster) return;
    this.layer.destroyChildren();

    const settings = this.posterSettings.value;
    const data = this.tournamentData;
    const isDark = settings.theme === 'dark';

    const colors = {
      text: isDark ? '#ffffff' : '#0f172a',
      sub: isDark ? '#94a3b8' : '#64748b',
      accent: '#22d3ee',
      bg: isDark ? '#020617' : '#ffffff',
      border: isDark ? '#1e293b' : '#e2e8f0',
    };

    // 1. Background
    const rect = new Konva.Rect({
      width: this.CANVAS_WIDTH,
      height: this.CANVAS_HEIGHT,
      fill: colors.bg,
    });
    this.layer.add(rect);

    if (settings.backgroundImage) {
      try {
        const bgImg = await this.loadImage(this.processUrl(settings.backgroundImage)!);
        const bg = new Konva.Image({
          image: bgImg,
          width: this.CANVAS_WIDTH,
          height: this.CANVAS_HEIGHT,
          opacity: 0.2,
        });
        this.layer.add(bg);
      } catch (e) {
        console.error('BG load fail', e);
      }
    }

    // 2. Traditional Frame
    const framePadding = 80;
    const innerFrame = new Konva.Rect({
      x: framePadding,
      y: framePadding,
      width: this.CANVAS_WIDTH - framePadding * 2,
      height: this.CANVAS_HEIGHT - framePadding * 2,
      stroke: colors.text,
      strokeWidth: 4,
    });
    this.layer.add(innerFrame);

    const outerFrame = new Konva.Rect({
      x: framePadding - 20,
      y: framePadding - 20,
      width: this.CANVAS_WIDTH - framePadding * 2 + 40,
      height: this.CANVAS_HEIGHT - framePadding * 2 + 40,
      stroke: colors.text,
      strokeWidth: 12,
    });
    this.layer.add(outerFrame);

    // 3. Draw Content
    await this.drawTraditionalPremium(this.layer, data, settings, colors);

    this.layer.batchDraw();
  }

  private async drawTraditionalPremium(layer: Konva.Layer, data: any, settings: any, colors: any) {
    const v = settings.visibility;
    const margin = 200;
    let currentY = 350;

    // Header Content
    const title = new Konva.Text({
      x: margin,
      y: currentY,
      text: (data.name || 'Tournament Name').toUpperCase(),
      fontSize: 140, // Reduced from 180 for better balance
      fontFamily: 'Google Sans',
      fontStyle: 'bold',
      fill: colors.text,
      width: this.CANVAS_WIDTH - margin * 2,
      align: 'center',
      lineHeight: 1.1,
      letterSpacing: 4,
    });
    layer.add(title);
    currentY += title.height() + 80;

    // Dates & Location Row
    const infoText = `${data.dates?.start || ''}  •  ${(data.location || '').toUpperCase()}`;
    const info = new Konva.Text({
      x: margin,
      y: currentY,
      text: infoText,
      fontSize: 80, // Reduced from 120 (approx)
      fontFamily: 'Google Sans',
      fontStyle: 'bold',
      fill: colors.text,
      width: this.CANVAS_WIDTH - margin * 2,
      align: 'center',
      letterSpacing: 2,
    });
    layer.add(info);
    currentY += info.height() + 100;

    // Decorative Separator
    const sepWidth = 800;
    const sep = new Konva.Line({
      points: [
        (this.CANVAS_WIDTH - sepWidth) / 2,
        currentY,
        (this.CANVAS_WIDTH + sepWidth) / 2,
        currentY,
      ],
      stroke: colors.text,
      strokeWidth: 2,
    });
    layer.add(sep);
    currentY += 100;

    // Main Details (Format · Time Control · Rounds)
    const details = [
      { label: 'FORMAT', value: data.format },
      { label: 'TIME CONTROL', value: data.timeControl },
      { label: 'ROUNDS', value: data.rounds ? `${data.rounds} ROUNDS` : '' },
    ];
    if (v.showEntryFee && data.entryFee)
      details.push({ label: 'ENTRY FEE', value: this.formatMoney(data.entryFee) });

    const detailsText = details
      .filter((d) => d.value)
      .map((d) => String(d.value).toUpperCase())
      .join('  ·  ');

    const detailsView = new Konva.Text({
      x: margin,
      y: currentY,
      text: detailsText,
      fontSize: 70, // Slightly smaller for the horizontal list
      fontFamily: 'Google Sans',
      fontStyle: 'bold',
      fill: colors.text,
      width: this.CANVAS_WIDTH - margin * 2,
      align: 'center',
      letterSpacing: 2,
    });
    layer.add(detailsView);
    currentY += 150;

    // Prizes Section (Leaderboard Style)
    if (v.showPrizePool && this.prizeCategories.length > 0) {
      const pHeader = new Konva.Text({
        x: margin,
        y: currentY,
        text: 'PRIZES & CATEGORIES',
        fontSize: 100, // Upscaled from 50
        fontFamily: 'Google Sans',
        fontStyle: 'bold',
        fill: colors.text,
        width: this.CANVAS_WIDTH - margin * 2,
        align: 'center',
        letterSpacing: 5,
      });
      layer.add(pHeader);
      currentY += 120;

      this.prizeCategories.slice(0, 4).forEach((cat) => {
        const catBox = new Konva.Group({ x: margin, y: currentY });
        layer.add(catBox);

        const catTitle = new Konva.Text({
          text: cat.category.toUpperCase(),
          fontSize: 45,
          fontFamily: 'Google Sans',
          fontStyle: 'bold',
          fill: colors.text,
          width: this.CANVAS_WIDTH - margin * 2,
          align: 'center',
        });
        catBox.add(catTitle);
        let catY = 140;

        cat.prizes.forEach((p, pi) => {
          const rowY = catY + pi * 100; // More row spacing
          const pLabel = new Konva.Text({
            x: 200, // Move label bit more left
            y: rowY,
            text: p.place.toUpperCase(),
            fontSize: 45,
            fontFamily: 'Google Sans',
            fill: colors.text,
          });
          const pValue = new Konva.Text({
            x: 200,
            y: rowY,
            text: this.formatMoney(p.value),
            fontSize: 45,
            fontFamily: 'Google Sans',
            fontStyle: 'bold',
            fill: colors.text,
            width: this.CANVAS_WIDTH - margin * 2 - 400,
            align: 'right',
          });
          catBox.add(pLabel, pValue);
        });

        currentY += catBox.getClientRect().height + 150;
      });
    }

    // Branding & Footer
    const footerY = this.CANVAS_HEIGHT - 600;
    if (settings.logos?.length > 0) {
      await this.drawLogos(layer, settings.logos);
    }

    if (v.showOrganizerInfo) {
      const org = new Konva.Text({
        x: margin,
        y: this.CANVAS_HEIGHT - 280,
        text: `ORGANIZER: ${data.organizer || ''}  |  CONTACT: ${data.contact || ''}`.toUpperCase(),
        fontSize: 70, // Slightly reduced to ensure it fits width-wise
        fontFamily: 'Google Sans',
        fill: colors.sub,
        width: this.CANVAS_WIDTH - margin * 2,
        align: 'center',
        letterSpacing: 2,
      });
      layer.add(org);
    }
  }

  private async drawLogos(layer: Konva.Layer, logos: string[]) {
    const logoSize = 220; // Reduced from 250
    const spacing = 100;
    const totalWidth = logos.length * logoSize + (logos.length - 1) * spacing;
    let startX = (this.CANVAS_WIDTH - totalWidth) / 2;
    const y = this.CANVAS_HEIGHT - 550;

    for (const url of logos.slice(0, 5)) {
      try {
        const img = await this.loadImage(url);
        const kImg = new Konva.Image({
          image: img,
          x: startX,
          y,
          width: logoSize,
          height: logoSize,
        });
        layer.add(kImg);
        startX += logoSize + spacing;
      } catch (e) {
        console.error('Logo load fail', e);
      }
    }
  }

  private formatMoney(val: any): string {
    if (!val) return '';
    const cleanStr = String(val).replace(/[₱$,\s]/g, '');
    const num = parseFloat(cleanStr);
    return !isNaN(num)
      ? new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num)
      : String(val);
  }

  private processUrl(url: any): string | null {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) return url;
    return `https://vonchess.net${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = this.processUrl(url) || url;
    });
  }

  onFileSelected(event: any, type: 'background' | 'logo' | 'poster') {
    const file = event.target.files?.[0];
    if (file) this.mediaUpload.emit({ file, type });
  }

  removeLogo(index: number) {
    this.logosArray.removeAt(index);
    this.renderPoster();
  }

  handleDownload() {
    if (!this.stage) return;
    const dataURL = this.stage.toDataURL({ mimeType: 'image/jpeg', quality: 0.9 });
    const link = document.createElement('a');
    link.download = `tournament-poster-${this.tournamentData['name'] || 'export'}.jpg`;
    link.href = dataURL;
    link.click();
  }

  exportAsPDF() {
    if (!this.stage) return;
    const dataURL = this.stage.toDataURL({ mimeType: 'image/jpeg', quality: 0.95 });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.addImage(dataURL, 'JPEG', 0, 0, 210, 297);
    pdf.save(`tournament-poster-${this.tournamentData['name'] || 'export'}.pdf`);
  }
}
