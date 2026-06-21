import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  PLATFORM_ID,
  input,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
import { StudyMetadataComponent } from './study-metadata/study-metadata.component';
import { StudyMetadataDialogComponent } from './dialogs/study-metadata-dialog/study-metadata-dialog.component';
import { StartClassDialogComponent } from './dialogs/start-class-dialog/start-class-dialog.component';
import { ViewersDialogComponent } from './dialogs/viewers-dialog/viewers-dialog.component';
import { LayoutService } from '../../core/services/layout.service';
import { StudyShortcutsService } from './services/study-shortcuts.service';
import { StudyFacade } from './services/study.facade';
import { StudyAnalysisComponent } from './study-analysis/study-analysis.component';

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
    StudyMetadataComponent,
    StartClassDialogComponent,
    JoinClassDialogComponent,
    StudyAnalysisComponent,
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
  host: { class: 'absolute inset-0 overflow-hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyComponent implements OnInit, OnDestroy {
  public facade = inject(StudyFacade);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private dialog = inject(Dialog);
  private layoutService = inject(LayoutService);
  private shortcutsService = inject(StudyShortcutsService);

  @ViewChild('board') board!: ChessBoardComponent;

  id = input.required<string>();
  chapterId = input<string | undefined>(undefined, { alias: 'chapter' });

  // Layout States
  boardSize = signal(600);
  isLargeScreen = signal(false);
  isThreeColumn = signal(false);
  isTwoColumn = signal(false);
  otherColumnsWidth = computed(() => {
    if (this.isThreeColumn()) {
      return 330 + 400 + 80; // Left sidebar (330px) + Right notation (400px) + Gaps/Paddings (80px)
    } else if (this.isTwoColumn()) {
      return 400 + 60; // Right notation (400px) + Gaps/Paddings (60px)
    } else {
      return 32; // Mobile padding
    }
  });

  isMetadataDialogOpen = signal(false);

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty('--board-size', `${this.boardSize()}px`);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
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
    this.isLargeScreen.set(width >= 1024);
    this.isThreeColumn.set(width >= 1280);
    this.isTwoColumn.set(width >= 768 && width < 1280);

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

  openMetadataDialog() {
    this.isMetadataDialogOpen.set(true);
    const dialogRef = this.dialog.open(StudyMetadataDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
      data: {
        chapter: this.facade.currentChapter(),
        canEdit: this.facade.canEdit()
      }
    });

    dialogRef.closed.subscribe((result: any) => {
      this.isMetadataDialogOpen.set(false);
      if (result && result.action === 'edit') {
        this.facade.onEditMetadata();
      }
    });
  }

  openViewers() {
    this.dialog.open(ViewersDialogComponent, {
      width: '450px',
      maxWidth: '90vw',
      backdropClass: ['bg-black/60'],
      data: {
        viewers: this.facade.viewerNames(),
        count: this.facade.viewerCount()
      }
    });
  }





  ngOnInit() {
    this.layoutService.setFluid(true);
  }

  ngOnDestroy() {
    this.facade.cleanup();
    this.layoutService.setFluid(false);
  }
}
