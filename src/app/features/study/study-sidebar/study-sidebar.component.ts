import { Component, inject, DestroyRef, signal, computed, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroEye,
  heroPhone,
  heroPhoneXMark,
  heroChatBubbleLeftRight,
  heroUsers,
  heroCog6Tooth,
  heroPlus,
  heroShare,
  heroTag,
  heroPencilSquare
} from '@ng-icons/heroicons/outline';

import { StudyService } from '../../../core/services/study.service';
import { ToastService } from '../../../core/services/toast.service';
import { WebrtcService } from '../../../core/services/webrtc.service';
import { StudyFacade } from '../services/study.facade';
import { StudyChapter } from '../../../core/models/study.model';

import { EditChapterDialogComponent, EditChapterDialogResult } from '../dialogs/edit-chapter-dialog/edit-chapter-dialog.component';
import { ConfirmDeleteDialogComponent } from '../dialogs/confirm-delete-dialog/confirm-delete-dialog.component';
import { AddMemberDialogComponent, AddMemberResult } from '../dialogs/add-member-dialog/add-member-dialog.component';

// Import newly created sub-components
import { ChaptersListComponent } from './components/chapters-list/chapters-list.component';
import { AddChapterComponent, ChapterTab } from './components/add-chapter/add-chapter.component';
import { StudySettingsComponent } from './components/study-settings/study-settings.component';
import { GameMetadataComponent } from './components/game-metadata/game-metadata.component';
import { StudyMembersComponent } from './components/study-members/study-members.component';
import { StudyExportComponent } from './components/study-export/study-export.component';
import { StudyChatComponent } from '../study-chat/study-chat.component';
import { StudyAnnotateComponent } from './components/study-annotate/study-annotate.component';

export type SidebarSection = 'chapters' | 'add-chapter' | 'settings' | 'members' | 'metadata' | 'chat' | 'export' | 'annotate';

@Component({
  selector: 'app-study-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent,
    DialogModule,
    StudyChatComponent,
    ChaptersListComponent,
    AddChapterComponent,
    StudySettingsComponent,
    GameMetadataComponent,
    StudyMembersComponent,
    StudyExportComponent,
    StudyAnnotateComponent
  ],
  providers: [
    provideIcons({
      heroEye,
      heroPhone,
      heroPhoneXMark,
      heroChatBubbleLeftRight,
      heroUsers,
      heroCog6Tooth,
      heroPlus,
      heroShare,
      heroTag,
      heroPencilSquare
    })
  ],
  templateUrl: './study-sidebar.component.html',
  host: {
    'class': 'flex flex-col min-h-0 overflow-hidden'
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

  // Preview Board Editor shared state
  settingsPreviewFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  settingsPreviewLastMove = signal<string | null>(null);
  settingsOrientation = signal<'white' | 'black'>('white');
  isSettingsEditorActive = signal(false);

  constructor() {
    effect(() => {
      const s = this.study();
      if (s) {
        this.settingsPreviewFen.set(s.preview_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        this.settingsPreviewLastMove.set(s.preview_last_move || null);
        this.settingsOrientation.set(s.orientation || 'white');
      }
    });
  }

  isBoardEditorActive = computed(() => 
    (this.activeSection() === 'add-chapter' && this.newChapterActiveTab() === 'editor') ||
    (this.activeSection() === 'settings' && this.isSettingsEditorActive())
  );

  getEditorFen(): string {
    if (this.activeSection() === 'settings') {
      return this.settingsPreviewFen() || '';
    }
    return this.newChapterFen() || '';
  }

  getEditorOrientation(): 'white' | 'black' {
    if (this.activeSection() === 'settings') {
      return this.settingsOrientation() || 'white';
    }
    return this.newChapterOrientation() || 'white';
  }

  setEditorFen(fen: string) {
    if (this.activeSection() === 'settings') {
      this.settingsPreviewFen.set(fen);
      this.settingsPreviewLastMove.set(null); // Clear last move coordinates for custom positions
    } else {
      this.newChapterFen.set(fen);
    }
  }

  isExportAllowed = computed(() => {
    const s = this.study();
    if (!s) return false;
    if (s.export_visibility === 'owner') {
      return this.isOwner();
    }
    return true;
  });

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

  toggleSplit(section: 'chat' | 'metadata') {
    if (this.splitSection() === section) {
      this.splitSection.set(null);
    } else {
      this.splitSection.set(section);
    }
  }

  selectSection(section: SidebarSection) {
    if (this.displayMode() !== 'all') {
      this.activeSection.set(section);
      return;
    }

    const isCollapsed = this.isCollapsed();

    if (section === 'chat' || section === 'metadata') {
      if (this.splitSection() === section) {
        this.splitSection.set(null);
        if (isCollapsed) this.isExpanded.set(false);
      } else {
        this.splitSection.set(section);
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

  onDrop(event: any) {
    if (!this.canEdit()) return;
    const s = this.study();
    if (!s || !s.chapters) return;

    const chapters = [...s.chapters];
    moveItemInArray(chapters, event.previousIndex, event.currentIndex);

    this.studyService.currentStudy.update(curr => curr ? { ...curr, chapters } : null);

    const chapterIds = chapters.map(c => c.id);
    this.studyService.reorderChapters(s.id, chapterIds).subscribe({
      error: () => {
        this.toastService.show('Failed to save new order', 'error');
        this.studyService.getStudy(s.id); // Revert on error
      }
    });
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

  handleSettingsSaved(payload: { 
    name: string; 
    visibility: string; 
    engine_visibility: string; 
    export_visibility: string; 
    category: string; 
    orientation: string;
    preview_fen?: string;
    preview_last_move?: string;
  }) {
    const s = this.study();
    if (!s) return;

    this.studyService.updateStudy(s.id, payload).subscribe({
      next: () => {
        this.toastService.show('Study settings updated', 'success');
        this.studyService.getStudy(s.id);
        this.selectSection('chapters');
      },
      error: () => this.toastService.show('Failed to update settings', 'error')
    });
  }

  handleChatCleared() {
    const s = this.study();
    if (!s) return;
    this.studyService.clearStudyChat(s.id).subscribe({
      next: () => {
        this.studyService.emitClearChat();
      }
    });
  }

  handleStudyDeleted() {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    this.studyService.deleteStudy(s.id).subscribe({
      next: () => {
        this.toastService.show('Study deleted successfully', 'success');
        this.router.navigate(['/study']);
      }
    });
  }

  addMember() {
    if (!this.isOwner()) return;
    const dialogRef = this.dialog.open<AddMemberResult>(AddMemberDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
    });
    dialogRef.closed.subscribe((result) => {
      if (result) {
        const canEdit = result.role === 'collaborator';
        this.studyService.addCollaborator(this.study()!.id, result.user.uid, canEdit).subscribe({
          next: () => {
            const roleName = result.role === 'collaborator' ? 'Collaborator' : 'Member';
            this.toastService.show(`${roleName} added successfully`, 'success');
            this.studyService.getStudy(this.study()!.id);
          }
        });
      }
    });
  }

  removeMember(userId: string) {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    const confirmRef = this.dialog.open<boolean>(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Remove member',
        message: 'Are you sure you want to remove this member?',
        confirmText: 'Remove'
      }
    });

    confirmRef.closed.subscribe((confirmed) => {
      if (confirmed) {
        this.studyService.removeCollaborator(s.id, userId).subscribe({
          next: () => {
            this.toastService.show('Member removed successfully', 'success');
            this.studyService.getStudy(s.id);
          }
        });
      }
    });
  }

  toggleMemberPermission(userId: string, canEdit: boolean) {
    if (!this.isOwner()) return;
    this.studyService.updateCollaboratorPermission(this.study()!.id, userId, canEdit).subscribe({
      next: () => {
        const roleName = canEdit ? 'Collaborator' : 'Member';
        this.toastService.show(`Role updated to ${roleName}`, 'success');
        this.studyService.getStudy(this.study()!.id);
      }
    });
  }

  grantBoardControl(userId: string) {
    this.studyService.grantBoardControl(userId);
  }

  revokeBoardControl() {
    this.studyService.revokeBoardControl();
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

  toggleVideoCall() {
    if (this.webrtc.isCallActive()) {
      this.webrtc.leaveCall();
    } else {
      this.webrtc.joinCall().catch(err => {
        console.error('[StudySidebarComponent] Error joining video call:', err);
      });
    }
  }
}
