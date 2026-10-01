import { Component, inject, DestroyRef, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudyService } from '../services/study.service';
import { ToastService } from '../../../core/services/toast.service';
import { WebrtcService } from '../services/webrtc.service';
import { StudyFacade } from '../facade/study.facade';
import { StudyChapter } from '../models/study.model';

import { EditChapterDialogComponent, EditChapterDialogResult } from '../dialogs/edit-chapter-dialog/edit-chapter-dialog.component';
import { StudySettingsDialogComponent } from '../dialogs/study-settings-dialog/study-settings-dialog.component';
import { StudyMembersDialogComponent } from '../dialogs/study-members-dialog/study-members-dialog.component';
import { ExportStudyDialogComponent } from '../dialogs/export-study-dialog/export-study-dialog.component';

// Import sub-components
import { ChaptersListComponent } from './components/chapters-list/chapters-list.component';
import { AddChapterComponent, ChapterTab } from './components/add-chapter/add-chapter.component';
import { GameMetadataComponent } from './components/game-metadata/game-metadata.component';
import { StudyExportComponent } from './components/study-export/study-export.component';
import { StudyChatComponent } from '../study-chat/study-chat.component';
import { StudyAnnotateComponent } from './components/study-annotate/study-annotate.component';

export type SidebarSection = 'chapters' | 'add-chapter' | 'chat' | 'export' | 'annotate';

@Component({
  selector: 'app-study-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    StudyChatComponent,
    ChaptersListComponent,
    AddChapterComponent,
    GameMetadataComponent,
    StudyExportComponent,
    StudyAnnotateComponent
  ],
  templateUrl: './study-sidebar.component.html',
  host: {
    'class': 'flex flex-col min-h-0 relative'
  }
})
export class StudySidebarComponent {
  private studyService = inject(StudyService);
  private dialog = inject(Dialog);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  public webrtc = inject(WebrtcService);
  public facade = inject(StudyFacade);

  isClassActive = this.studyService.isClassActive;
  isOwner = this.studyService.isOwner;
  hasJoinedClass = this.studyService.hasJoinedClass;

  // Sidebar navigation state
  activeSection = this.facade.activeSection;
  splitSection = this.facade.splitSection;
  isExpanded = signal(false);

  // Expose signals for Board Sync in StudyComponent template
  newChapterFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  newChapterOrientation = signal<'white' | 'black'>('white');
  newChapterActiveTab = signal<ChapterTab>('empty');

  // Board Editor shared state (for Add Chapter editor mode)
  isBoardEditorActive = computed(() => 
    this.activeSection() === 'add-chapter' && this.newChapterActiveTab() === 'editor'
  );

  getEditorFen(): string {
    return this.newChapterFen() || '';
  }

  getEditorOrientation(): 'white' | 'black' {
    return this.newChapterOrientation() || 'white';
  }

  setEditorFen(fen: string) {
    this.newChapterFen.set(fen);
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
   * WHY: Provides a dedicated, streamlined export flow with styling consistent with CreateStudyDialog.
   */
  openExportDialog() {
    this.dialog.open(ExportStudyDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60']
    });
  }

  isExportAllowed = this.studyService.isExportAllowed;

  // Inputs
  isLargeScreen = input.required<boolean>();
  isSyncing = input.required<boolean>();
  canEdit = input.required<boolean>();
  isTabMode = input<boolean>(false);
  displayMode = input<'all' | 'chapters' | 'chat'>('all');
  isCollapsed = input<boolean>(false);

  // Signals from service
  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  viewerCount = this.studyService.viewerCount;
  viewerNames = this.studyService.viewerNames;

  editMetadata() {
    this.facade.onEditMetadata();
  }

  toggleSplit(section: 'chat') {
    if (this.splitSection() === section) {
      this.splitSection.set(null);
    } else {
      this.splitSection.set(section);
    }
  }

  selectSection(section: SidebarSection | 'metadata') {
    if (section === 'metadata') {
      section = 'chapters';
    }

    if (this.displayMode() !== 'all') {
      this.activeSection.set(section);
      return;
    }

    const isCollapsed = this.isCollapsed();

    if (section === 'chat') {
      if (this.splitSection() === 'chat') {
        this.splitSection.set(null);
        if (isCollapsed) this.isExpanded.set(false);
      } else {
        this.splitSection.set('chat');
        this.activeSection.set('chapters');
        if (isCollapsed) this.isExpanded.set(true);
      }
      return;
    }

    this.splitSection.set(null);

    if (section === 'add-chapter') {
      const s = this.study();
      this.newChapterActiveTab.set('empty');
      this.newChapterOrientation.set('white');
      this.newChapterFen.set('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    }

    if (isCollapsed) {
      if (this.activeSection() === section && this.isExpanded()) {
        this.isExpanded.set(false);
      } else {
        this.activeSection.set(section);
        this.isExpanded.set(true);
      }
    } else {
      this.activeSection.set(section);
    }
  }

  selectChapter(chap: StudyChapter) {
    if (this.currentChapter()?.id === chap.id) return;

    this.studyService.currentChapter.set(chap);
    if (this.canEdit()) {
      this.studyService.emitChapterChange(
        this.study()!.id,
        chap.id,
        chap.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        chap.moves || [],
        chap.orientation,
        this.isSyncing()
      );
    }
  }


  onEditChapter(event: MouseEvent, chap: StudyChapter) {
    if (!this.canEdit()) return;
    event.stopPropagation();

    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open<EditChapterDialogResult>(EditChapterDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
      data: {
        currentName: chap.name,
        currentOrientation: chap.orientation || 'white',
        isLastChapter: (s.chapters?.length ?? 0) <= 1
      }
    });

    dialogRef.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;

        if (result.action === 'save' && result.name) {
          this.studyService.updateChapter(s.id, chap.id, {
            name: result.name,
            orientation: result.orientation
          }).subscribe({
            next: () => {
              this.toastService.show('Chapter updated', 'success');
              this.studyService.getStudy(s.id);
            },
            error: () => this.toastService.show('Failed to update chapter', 'error')
          });
        } else if (result.action === 'delete') {
          this.studyService.deleteChapter(s.id, chap.id).subscribe({
            next: () => {
              this.toastService.show('Chapter deleted', 'success');
              if (this.currentChapter()?.id === chap.id) {
                const remaining = s.chapters?.filter(c => c.id !== chap.id) || [];
                if (remaining.length > 0) {
                  this.selectChapter(remaining[0]);
                } else {
                  this.router.navigate(['/study']);
                }
              }
              this.studyService.getStudy(s.id);
            }
          });
        }
      });
  }

  handleChapterCreated(payload: { name: string; type: ChapterTab; fen: string; pgn: string; orientation: 'white' | 'black' }) {
    const s = this.study();
    if (!s) return;

    if (payload.type === 'pgn' && payload.pgn) {
      this.studyService.importPgn(s.id, payload.pgn).subscribe({
        next: (res) => {
          const firstNewChapter = (res.data?.chapters || res.chapters)?.[0];
          this.studyService.getStudy(s.id, firstNewChapter?.id);
          this.toastService.show(res.message || 'Import successful!', 'success');
          this.selectSection('chapters');
        },
        error: (err) => {
          console.error('Import failed:', err);
          this.toastService.show(err.error?.message || 'Failed to import PGN.', 'error');
        }
      });
    } else {
      const fen = payload.type === 'empty' ? undefined : payload.fen;
      this.studyService.addChapter(s.id, payload.name, fen, payload.orientation).subscribe({
        next: (res) => {
          const newChapter = res.data ?? res;
          this.studyService.getStudy(s.id, newChapter?.id);
          this.selectSection('chapters');
        },
        error: (err) => {
          console.error('Chapter creation failed:', err);
          this.toastService.show(err.error?.message || 'Failed to create chapter.', 'error');
        }
      });
    }
  }


  handleExport(payload: { option: 'current' | 'all' | 'selected'; selectedIds: Set<number> }) {
    const s = this.study();
    if (!s) return;

    if (payload.option === 'current') {
      const current = this.currentChapter();
      if (current) {
        this.studyService.exportPgn(s.id, [current.id]);
      } else {
        this.toastService.show('No active chapter to export', 'error');
      }
    } else if (payload.option === 'all') {
      this.studyService.exportPgn(s.id);
    } else if (payload.option === 'selected') {
      const ids = Array.from(payload.selectedIds);
      if (ids.length > 0) {
        this.studyService.exportPgn(s.id, ids);
      } else {
        this.toastService.show('Please select at least one chapter to export', 'error');
      }
    }

    this.selectSection('chapters');
  }

  toggleVoiceCall() {
    if (this.webrtc.isCallActive()) {
      this.webrtc.leaveCall();
    } else {
      this.webrtc.joinCall().catch(err => {
        console.error('[StudySidebarComponent] Error joining voice call:', err);
      });
    }
  }
}
