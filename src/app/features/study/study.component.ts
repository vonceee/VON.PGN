import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  signal,
  computed,
  effect,
  untracked,
  PLATFORM_ID,
  input,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroQueueList,
  heroInformationCircle,
  heroTag,
  heroBookOpen,
  heroChatBubbleLeftRight,
  heroQuestionMarkCircle,
  heroPlay,
  heroStop,
  heroArrowsRightLeft,
  heroChevronLeft,
  heroChevronRight,
  heroChevronDoubleLeft,
  heroChevronDoubleRight,
  heroEye,
  heroUserPlus,
  heroUserMinus,
  heroExclamationCircle,
  heroMicrophone,
  heroPhone,
} from '@ng-icons/heroicons/outline';
import { Router } from '@angular/router';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ChessBoardComponent } from '@shared/chess';
import { MoveNotationComponent } from '@shared/chess';
import { FormsModule } from '@angular/forms';
import { ConfirmDeleteModalComponent } from '@shared/feedback';
import { StudySidebarComponent } from './study-sidebar/study-sidebar.component';
import { JoinClassDialogComponent } from './dialogs/join-class-dialog/join-class-dialog.component';
import { LeaveClassDialogComponent } from './dialogs/leave-class-dialog/leave-class-dialog.component';
import { StartClassDialogComponent } from './dialogs/start-class-dialog/start-class-dialog.component';
import { EndClassDialogComponent } from './dialogs/end-class-dialog/end-class-dialog.component';
import {
  StudySettingsDialogComponent,
} from './dialogs/study-settings-dialog/study-settings-dialog.component';
import { StudyMembersDialogComponent } from './dialogs/study-members-dialog/study-members-dialog.component';
import { ExportStudyDialogComponent } from './dialogs/export-study-dialog/export-study-dialog.component';

import { LayoutService } from '../../core/services/layout.service';
import { StudyShortcutsService } from './services/study-shortcuts.service';
import { StudyFacade } from './facade/study.facade';
import { WebrtcService } from './services/webrtc.service';
import { StudyAnalysisComponent } from './study-analysis/study-analysis.component';
import { BoardEditorComponent } from '../../shared/components/chess/board-editor/board-editor.component';
import { SelectComponent, SelectItem } from '@shared/ui';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent,
    ChessBoardComponent,
    MoveNotationComponent,
    FormsModule,
    DialogModule,
    ConfirmDeleteModalComponent,
    StudySidebarComponent,
    StartClassDialogComponent,
    EndClassDialogComponent,
    JoinClassDialogComponent,
    LeaveClassDialogComponent,
    StudyAnalysisComponent,
    BoardEditorComponent,
    SelectComponent,
  ],
  providers: [
    StudyFacade,
    StudyShortcutsService,
    provideIcons({
      heroQueueList,
      heroInformationCircle,
      heroTag,
      heroBookOpen,
      heroChatBubbleLeftRight,
      heroQuestionMarkCircle,
      heroPlay,
      heroStop,
      heroArrowsRightLeft,
      heroChevronLeft,
      heroChevronRight,
      heroChevronDoubleLeft,
      heroChevronDoubleRight,
      heroEye,
      heroUserPlus,
      heroUserMinus,
      heroExclamationCircle,
      heroMicrophone,
      heroPhone,
    }),
  ],
  templateUrl: './study.component.html',
  styles: [
    `
      :host ::ng-deep {
        .mat-mdc-slide-toggle {
          --mdc-switch-selected-track-color: #22d3ee;
          --mdc-switch-selected-handle-color: #ffffff;
          --mdc-switch-unselected-track-color: #1e293b;
          --mdc-switch-unselected-handle-color: #94a3b8;
          display: flex;
          align-items: center;
          margin: 0 !important;
        }
        .mat-mdc-slide-toggle .mdc-switch {
          width: 30px !important;
          height: 16px !important;
        }
        .mat-mdc-slide-toggle .mdc-switch__track {
          height: 16px !important;
          border-radius: 8px !important;
        }
        .mat-mdc-slide-toggle .mdc-switch__handle-container {
          width: 12px !important;
          height: 12px !important;
          top: 2px !important;
          left: 2px !important;
        }
        .mat-mdc-slide-toggle.mat-checked .mdc-switch__handle-container {
          transform: translateX(14px) !important;
        }
        .mat-mdc-slide-toggle .mdc-switch__handle {
          width: 12px !important;
          height: 12px !important;
        }
        .mdc-switch__icons {
          display: none !important;
        }
      }
    `,
  ],
  host: { class: 'absolute inset-0 overflow-y-auto md:overflow-hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyComponent implements OnInit, OnDestroy {
  public facade = inject(StudyFacade);
  public webrtc = inject(WebrtcService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private location = inject(Location);
  private dialog = inject(Dialog);
  private layoutService = inject(LayoutService);
  private shortcutsService = inject(StudyShortcutsService);

  @ViewChild('board') board!: ChessBoardComponent;
  @ViewChild(StudySidebarComponent) sidebar?: StudySidebarComponent;
  @ViewChild('rightEditor') rightEditor?: BoardEditorComponent;

  toggleVoiceCall() {
    if (this.webrtc.isCallActive()) {
      this.webrtc.leaveCall();
    } else {
      this.webrtc.joinCall().catch(err => {
        console.error('[StudyComponent] Error joining voice call:', err);
      });
    }
  }

  openSettingsDialog() {
    this.dialog.open(StudySettingsDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60']
    });
  }

  openMembersDialog() {
    this.dialog.open(StudyMembersDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60']
    });
  }

  /**
   * Opens the standalone Study Export modal.
   *
   * WHY: Provides direct access to PGN export in a dedicated modal matching CreateStudyDialog styling.
   */
  openExportDialog() {
    this.dialog.open(ExportStudyDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60']
    });
  }

  id = input.required<string>();
  chapterId = input<string | undefined>(undefined, { alias: 'chapter' });

  chapterOptions = computed<SelectItem<number>[]>(() => {
    const chapters = this.facade.study()?.chapters || [];
    return [...chapters]
      .sort((a, b) => a.order - b.order)
      .map((chap, index) => ({
        label: chap.name || `Chapter ${index + 1}`,
        value: chap.id,
      }));
  });

  onChapterSelect(item: SelectItem<number>) {
    if (item.value === undefined) return;
    const chap = this.facade.study()?.chapters?.find((c) => c.id === item.value);
    if (chap) {
      this.facade.selectChapter(chap);
    }
  }

  // Layout States
  boardSize = signal(600);
  effectiveBoardSize = computed(() => {
    if (this.isMobileLayout()) {
      return this.maxBoardSize();
    }
    return this.boardSize();
  });
  isLargeScreen = signal(false);
  isThreeColumn = signal(false);
  isSidebarCollapsed = computed(() => {
    const width = this.windowWidth();
    return width >= 768 && width < 1024;
  });

  otherColumnsWidth = computed(() => {
    if (this.isThreeColumn()) {
      const width = this.windowWidth();
      const gutterAndBreathingSpace = width >= 1280 ? 120 : 96;
      if (this.isSidebarCollapsed()) {
        return 320 + gutterAndBreathingSpace;
      }
      if (width < 1280) {
        return 280 + 320 + gutterAndBreathingSpace;
      }
      return 340 + 380 + gutterAndBreathingSpace;
    } else {
      return 32; // Mobile padding
    }
  });

  isMobileLayout = computed(() => !this.isThreeColumn());

  windowWidth = signal(1200);
  windowHeight = signal(800);
  maxBoardSize = computed(() => {
    const width = this.windowWidth();
    const height = this.windowHeight();
    if (this.isMobileLayout()) {
      return Math.max(260, Math.min(width - 32, 600));
    }
    const maxHeight = height - 120;
    const otherWidth = this.otherColumnsWidth();
    const maxWidth = width - otherWidth;
    const maxPossible = Math.min(maxWidth, maxHeight);
    return Math.max(400, Math.min(1000, maxPossible));
  });

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty('--board-size', `${this.effectiveBoardSize()}px`);
      }
    });

    effect(() => {
      const studyId = this.id();
      const chapId = this.chapterId();
      if (studyId && isPlatformBrowser(this.platformId)) {
        untracked(() => {
          this.facade.cleanup();
          this.facade.loadStudy(studyId, chapId ? Number(chapId) : undefined);
        });
      }
    });

    effect(() => {
      const study = this.facade.study();
      if (study && isPlatformBrowser(this.platformId)) {
        const currentUrlId = this.id();
        if (currentUrlId && String(study.id) !== currentUrlId) {
          const chapParam = this.chapterId() ? `?chapter=${this.chapterId()}` : '';
          this.location.replaceState(`/study/${study.id}${chapParam}`);
        }
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      this.windowWidth.set(window.innerWidth);
      this.windowHeight.set(window.innerHeight);
      this.updateLayoutStates();
      fromEvent(window, 'resize')
        .pipe(takeUntilDestroyed(), debounceTime(100))
        .subscribe(() => {
          this.updateLayoutStates();
        });

      this.shortcutsService.register({
        flipBoard: () => this.flipBoard(),
        toggleEngine: () => this.facade.isEngineActive.set(!this.facade.isEngineActive()),
        nextChapter: () => this.facade.nextChapter(),
        prevChapter: () => this.facade.prevChapter(),
        isEngineVisible: () => this.facade.isEngineVisible(),
        canEdit: () => this.facade.canEdit(),
        getCurrentNode: () => this.facade.currentNode(),
        annotateMove: (node) => this.facade.onAnnotateMove(node),
        quickAnnotate: (node, glyphId) => this.facade.quickAnnotate(node, glyphId),
      });
    }
  }

  private updateLayoutStates() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.windowWidth.set(width);
    this.windowHeight.set(height);
    this.isLargeScreen.set(width >= 1024);
    this.isThreeColumn.set(width >= 768);

    if (this.isThreeColumn() && (this.facade.activeTab() === 'chapters' || this.facade.activeTab() === 'chat')) {
      this.facade.activeTab.set('notation');
    }
  }

  flipBoard() {
    this.facade.flipBoard(this.facade.boardOrientation(), (newO) =>
      this.facade.boardOrientation.set(newO)
    );
  }

  goToFirst() {
    this.facade.onNavigateToPly(this.facade.initialPly());
  }

  goToLast() {
    const tree = this.facade.moveTree();
    if (tree.length > 0) {
      this.facade.onNavigateToPly(tree[tree.length - 1].ply);
    }
  }

  onMoveMade(event: any) {
    this.facade.onMoveMade(event, () => {
      if (this.board) {
        this.board.undoMove();
      }
    });
  }


  onDeleteConfirmed() {
    this.facade.onDeleteConfirmed(() => {
      this.router.navigate(['/study']);
    });
  }

  // Removed openMetadataDialog as metadata has been moved inline to the sidebar.







  @HostListener('window:beforeunload')
  onBeforeUnload() {
    this.facade.flushPendingSaves();
  }

  ngOnInit() {
    this.layoutService.setFluid(true);
  }

  ngOnDestroy() {
    this.facade.cleanup();
    this.layoutService.setFluid(false);
  }
}
