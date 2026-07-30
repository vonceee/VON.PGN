import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { Observable, Subject, EMPTY, throwError, tap, of, concat } from 'rxjs';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { DevLogger } from '../utils/dev-logger';
import { StudyApiService } from './study-api.service';
import { StudySocketService, StudyViewer } from './study-socket.service';
export type { StudyViewer } from './study-socket.service';
import {
  Study,
  StudyChapter,
  StudyMoveMadePayload,
  StudyShapesDrawnPayload,
} from '../models/study.model';

@Injectable({
  providedIn: 'root',
})
export class StudyService {
  private api = inject(StudyApiService);
  private socketService = inject(StudySocketService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  currentStudy = signal<Study | null>(null);
  currentChapter = signal<StudyChapter | null>(null);
  isLoading = signal(false);
  isConnected = this.socketService.isConnected;
  viewerCount = signal(1);
  viewerNames = signal<StudyViewer[]>([]);

  isClassActive = signal<boolean>(false);
  lockHolderId = signal<string | null>(null);
  hasJoinedClass = signal<boolean>(false);
  classStartedAt = signal<string | null>(null);

  isOwner = computed(() => {
    const user = this.authService.currentUser();
    const study = this.currentStudy();
    if (!user || !study) return false;
    const myUid = user.uid || user.id;
    const studyOwnerId = study.user_id || (study as any).userId || study.owner?.id;
    return !!(myUid && studyOwnerId && String(myUid) === String(studyOwnerId));
  });

  hasBoardControl = computed(() => {
    if (!this.isClassActive()) return true;
    if (this.isOwner()) return true;
    if (!this.hasJoinedClass()) return true;

    const user = this.authService.currentUser();
    const myUid = user?.uid || user?.id;
    return !!(myUid && this.lockHolderId() && String(myUid) === String(this.lockHolderId()));
  });

  private emittedMoveIds = new Set<string>();

  // Expose Real-time event streams from Socket service
  onMoveMade$ = this.socketService.onMoveMade$;
  onSynced$ = this.socketService.onSynced$;
  onShapesDrawn$ = this.socketService.onShapesDrawn$;
  onChapterChanged$ = this.socketService.onChapterChanged$;
  onChatMessage$ = this.socketService.onChatMessage$;
  onChatCleared$ = this.socketService.onChatCleared$;
  onMovePermissionRequested$ = this.socketService.onMovePermissionRequested$;
  onMovePermissionDeclined$ = this.socketService.onMovePermissionDeclined$;

  lastRemoteState = signal<{
    chapterId: number | null;
    fen: string | null;
    moves: any[] | null;
    orientation?: 'white' | 'black';
    shapes?: any[];
    shapesChapterId?: number | string | null;
    shapesFen?: string | null;
  }>({ chapterId: null, fen: null, moves: null });

  private dbSaveSubject = new Subject<{
    studyId: number | string;
    chapterId: number;
    fen: string;
    moves: any[];
    broadcast: boolean;
    clientGeneratedId: string;
  }>();

  private pendingSavePayload: {
    studyId: number | string;
    chapterId: number;
    fen: string;
    moves: any[];
    broadcast: boolean;
    clientGeneratedId: string;
  } | null = null;

  constructor() {
    this.initDbSavePipeline();
    this.listenToSocketEvents();
  }

  private initDbSavePipeline(): void {
    this.dbSaveSubject.pipe(
      debounceTime(5000),
      switchMap((payload) => {
        if (!this.pendingSavePayload) return EMPTY;
        this.pendingSavePayload = null;

        return this.api.updateChapter(payload.studyId, payload.chapterId, {
          current_fen: payload.fen,
          moves: payload.moves,
        }).pipe(
          tap({
            next: (res) => {
              const updated = (res as any).data || res;
              this.currentChapter.set(updated);
              this.currentStudy.update(s => {
                if (!s || !s.chapters) return s;
                const chapters = s.chapters.map(c =>
                  String(c.id) === String(updated.id) ? updated : c
                );
                return { ...s, chapters };
              });
              if (payload.broadcast) {
                this.socketService.emitChangeChapter({
                  studyId: payload.studyId,
                  chapterId: updated.id,
                  fen: updated.current_fen,
                  moves: updated.moves,
                  orientation: updated.orientation,
                  clientGeneratedId: payload.clientGeneratedId
                });
              }
            },
            error: (err) => {
              DevLogger.error('[StudyService] Failed to save move to DB:', err);
              this.toastService.show('Failed to sync changes with server. Please refresh.', 'error');
            }
          }),
          catchError(() => EMPTY)
        );
      })
    ).subscribe();
  }

  flushPendingSaves(): void {
    if (this.pendingSavePayload) {
      const payload = this.pendingSavePayload;
      this.pendingSavePayload = null;

      this.api.updateChapter(payload.studyId, payload.chapterId, {
        current_fen: payload.fen,
        moves: payload.moves,
      }).subscribe({
        next: (res) => {
          const updated = (res as any).data || res;
          this.currentChapter.set(updated);
          this.currentStudy.update(s => {
            if (!s || !s.chapters) return s;
            const chapters = s.chapters.map(c =>
              String(c.id) === String(updated.id) ? updated : c
            );
            return { ...s, chapters };
          });
          if (payload.broadcast) {
            this.socketService.emitChangeChapter({
              studyId: payload.studyId,
              chapterId: updated.id,
              fen: updated.current_fen,
              moves: updated.moves,
              orientation: updated.orientation,
              clientGeneratedId: payload.clientGeneratedId
            });
          }
        },
        error: (err) => {
          DevLogger.error('[StudyService] Failed to flush pending saves to DB:', err);
        }
      });
    }
  }

  private listenToSocketEvents(): void {
    this.socketService.onSynced$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        DevLogger.log(`[Study] Synced state received for study ${state.chapterId || 'unknown'}`);
        this.isClassActive.set(state.isClassActive || false);
        this.lockHolderId.set(state.lockHolderId || null);
        this.classStartedAt.set(state.classStartedAt || null);
        this.lastRemoteState.set({
          chapterId: state.chapterId !== null && state.chapterId !== undefined ? Number(state.chapterId) : null,
          fen: state.fen,
          moves: state.moves,
          orientation: state.orientation,
          shapes: state.shapes,
          shapesChapterId: state.shapesChapterId,
          shapesFen: state.shapesFen,
        });
      });

    this.socketService.onMoveMade$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (payload.clientGeneratedId && this.emittedMoveIds.has(payload.clientGeneratedId)) {
          DevLogger.log('[Study] Ignoring own move broadcast:', payload.clientGeneratedId);
          return;
        }

        DevLogger.log(`[Study] Move received for chapter ${payload.chapterId}, FEN: ${payload.fen}`);
        this.lastRemoteState.update(s => ({
          ...s,
          chapterId: payload.chapterId,
          fen: payload.fen,
          moves: payload.moves,
          orientation: payload.orientation
        }));
      });

    this.socketService.onChapterChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (payload.clientGeneratedId && this.emittedMoveIds.has(payload.clientGeneratedId)) {
          DevLogger.log('[Study] Ignoring own chapter change broadcast:', payload.clientGeneratedId);
          return;
        }

        DevLogger.log(`[Study] Chapter changed to ${payload.chapterId}`);
        this.lastRemoteState.set({
          chapterId: payload.chapterId,
          fen: payload.fen,
          moves: payload.moves,
          orientation: payload.orientation
        });
      });

    this.socketService.onViewerListUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        this.viewerNames.set(payload.viewers || []);
        this.viewerCount.set(payload.count || 0);
      });

    this.socketService.onClassSessionStarted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        DevLogger.log(`[Study] Class started. Lock holder: ${payload.lockHolderId}`);
        this.isClassActive.set(payload.isClassActive);
        this.lockHolderId.set(payload.lockHolderId);
        this.classStartedAt.set(payload.classStartedAt || null);

        const user = this.authService.currentUser();
        const myUid = user?.uid || user?.id;
        const study = this.currentStudy();
        const studyOwnerId = study?.user_id || (study as any)?.userId || study?.owner?.id;
        const isOwner = !!(myUid && studyOwnerId && String(myUid) === String(studyOwnerId));

        if (isOwner) {
          this.hasJoinedClass.set(true);
          this.toastService.show('Classroom session has started!');
        } else {
          this.hasJoinedClass.set(false);
        }
      });

    this.socketService.onClassSessionEnded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        DevLogger.log('[Study] Class ended.');
        this.isClassActive.set(payload.isClassActive);
        this.lockHolderId.set(payload.lockHolderId);
        this.classStartedAt.set(null);
        this.hasJoinedClass.set(false);
        this.toastService.show('Classroom session has ended. Free exploration restored.');
      });

    this.socketService.onBoardControlUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        DevLogger.log(`[Study] Board control updated. Lock holder: ${payload.lockHolderId}`);
        this.lockHolderId.set(payload.lockHolderId);

        const user = this.authService.currentUser();
        const myUid = user?.uid || user?.id;
        if (String(myUid) === String(payload.lockHolderId)) {
          this.toastService.show('You have been granted board control!', 'success');
        } else {
          this.toastService.show('Board control has been updated.');
        }
      });

    this.socketService.onMembersUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        DevLogger.log('[Study] Members/Collaborators list updated in real-time');
        this.currentStudy.update(curr => curr ? { ...curr, collaborators: payload.collaborators } : null);
      });
  }

  // ── HTTP Proxy Methods ────────────────────────────────────────

  getStudies(my: boolean = false, category?: string, forceRefresh = false, search?: string, sort?: string, include?: string): Observable<any> {
    return this.api.getStudies(my, category, forceRefresh, search, sort, include);
  }

  clearCache(): void {
    this.api.clearCache();
  }

  createStudy(name: string, description: string = '', visibility: string = 'public', category: string = 'general', orientation: string = 'white'): Observable<any> {
    return this.api.createStudy(name, description, visibility, category, orientation);
  }

  updateStudy(id: number | string, data: any): Observable<any> {
    return this.api.updateStudy(id, data);
  }

  deleteStudy(id: number | string): Observable<any> {
    return this.api.deleteStudy(id);
  }

  getStudy(id: number | string, targetChapterId?: number): void {
    this.isLoading.set(true);
    this.api.getStudyRaw(id).subscribe({
      next: (res) => {
        DevLogger.log('[StudyService] Raw API Response:', res.data);
        this.currentStudy.set(res.data);

        const user = this.authService.currentUser();
        const studyOwnerId = res.data.user_id || (res.data as any).userId || res.data.owner?.id;
        const myUid = user?.uid || user?.id;
        const isOwner = !!(myUid && studyOwnerId && String(myUid) === String(studyOwnerId));
        if (isOwner) {
          this.emitMembersUpdate(res.data.id, res.data.collaborators || []);
        }

        const chapters = res.data.chapters || [];
        if (chapters.length > 0) {
          const unwrap = (c: any) => (c as any)?.data || c;
          let chapterToSet = null;

          if (targetChapterId) {
            const found = chapters.find(c => String(unwrap(c).id) === String(targetChapterId));
            if (found) chapterToSet = unwrap(found);
          }

          if (!chapterToSet) {
            const current = this.currentChapter();
            if (current) {
              const found = chapters.find(c => String(unwrap(c).id) === String(current.id));
              if (found) chapterToSet = unwrap(found);
            }
          }

          if (!chapterToSet) {
            chapterToSet = unwrap(chapters[0]);
          }

          this.currentChapter.set(chapterToSet);
        }

        this.isLoading.set(false);
        this.socketService.connect(res.data, this.currentChapter());
      },
      error: (err) => {
        this.isLoading.set(false);
        DevLogger.error('[StudyService] Failed to fetch study:', err);

        if (err.status === 403) {
          this.toastService.show('This study is private.', 'error');
        } else if (err.status === 404) {
          this.toastService.show('Study not found.', 'error');
        } else {
          this.toastService.show('Failed to load study.', 'error');
        }

        this.router.navigate(['/study']);
      },
    });
  }

  addChapter(studyId: number | string, name: string, fen?: string, orientation?: 'white' | 'black'): Observable<any> {
    return this.api.addChapter(studyId, name, fen, orientation);
  }

  updateChapter(studyId: number | string, chapterId: number, data: any): Observable<any> {
    return this.api.updateChapter(studyId, chapterId, data);
  }

  deleteChapter(studyId: number | string, chapterId: number): Observable<any> {
    return this.api.deleteChapter(studyId, chapterId);
  }

  reorderChapters(studyId: number | string, chapterIds: number[]): Observable<any> {
    return this.api.reorderChapters(studyId, chapterIds);
  }

  addCollaborator(studyId: number | string, userId: string, canEdit?: boolean): Observable<any> {
    return this.api.addCollaborator(studyId, userId, canEdit);
  }

  removeCollaborator(studyId: number | string, userId: string): Observable<any> {
    return this.api.removeCollaborator(studyId, userId);
  }

  updateCollaboratorPermission(studyId: number | string, userId: string, canEdit: boolean): Observable<any> {
    return this.api.updateCollaboratorPermission(studyId, userId, canEdit);
  }

  getStudyMessages(studyId: number | string): Observable<any[]> {
    return this.api.getStudyMessages(studyId);
  }

  sendMessageToDb(studyId: number | string, body: string): Observable<any> {
    return this.api.sendMessageToDb(studyId, body);
  }

  clearStudyChat(studyId: number | string): Observable<any> {
    return this.api.clearStudyChat(studyId);
  }

  importPgn(studyId: number | string, pgn: string): Observable<any> {
    return this.api.importPgn(studyId, pgn);
  }

  exportPgn(studyId: number | string, chapterIds?: number[]): void {
    this.api.exportPgnBlob(studyId, chapterIds).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let filename = `study_${studyId}`;
        const study = this.currentStudy();
        if (study) {
          filename = study.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        }
        
        if (chapterIds && chapterIds.length === 1) {
          const chap = study?.chapters?.find(c => String(c.id) === String(chapterIds[0]));
          if (chap) {
            filename += `_${chap.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          }
        }
        
        a.download = `${filename}.pgn`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to export PGN:', err);
        this.toastService.show('Failed to export PGN file.', 'error');
      }
    });
  }

  // ── Socket Proxy Emitter Methods ──────────────────────────────

  emitMove(move: string, fen: string, moves: any[], orientation?: 'white' | 'black', broadcast: boolean = true, immediate: boolean = false): Observable<any> {
    const study = this.currentStudy();
    const chapter = this.currentChapter();

    if (!study || !chapter) {
      DevLogger.warn('[StudyService] Missing study or chapter to save move.');
      return EMPTY;
    }

    const chapterId = chapter.id;
    if (!chapterId) {
      DevLogger.error('[StudyService] Chapter object exists but ID is missing:', chapter);
      return throwError(() => new Error('Chapter ID missing'));
    }

    this.lastRemoteState.set({
      chapterId,
      fen,
      moves,
      orientation: orientation || chapter.orientation
    });

    const clientGeneratedId = crypto.randomUUID();
    if (broadcast) {
      this.emittedMoveIds.add(clientGeneratedId);

      this.socketService.emitMove({
        studyId: study.id,
        move,
        fen,
        chapterId: chapterId,
        moves: moves,
        orientation: orientation || chapter.orientation,
        clientGeneratedId
      });

      setTimeout(() => this.emittedMoveIds.delete(clientGeneratedId), 15000);
    }

    const payload = {
      studyId: study.id,
      chapterId,
      fen,
      moves,
      broadcast,
      clientGeneratedId
    };

    if (immediate) {
      this.pendingSavePayload = null;

      return this.api.updateChapter(study.id, chapterId, {
        current_fen: fen,
        moves: moves,
      }).pipe(
        tap({
          next: (res) => {
            const updated = (res as any).data || res;
            this.currentChapter.set(updated);
            this.currentStudy.update(s => {
              if (!s || !s.chapters) return s;
              const chapters = s.chapters.map(c =>
                String(c.id) === String(updated.id) ? updated : c
              );
              return { ...s, chapters };
            });
            if (broadcast) {
              this.socketService.emitChangeChapter({
                studyId: study.id,
                chapterId: updated.id,
                fen: updated.current_fen,
                moves: updated.moves,
                orientation: updated.orientation,
                clientGeneratedId
              });
            }
          },
          error: (err) => {
            DevLogger.error('[StudyService] Failed to save move to DB:', err);
            this.toastService.show('Failed to sync changes with server. Please refresh.', 'error');
          }
        })
      );
    } else {
      this.pendingSavePayload = payload;
      this.dbSaveSubject.next(payload);
      return of(null);
    }
  }

  emitShapes(shapes: any[], chapterId?: number, fen?: string): void {
    const study = this.currentStudy();
    if (!study) return;
    this.socketService.emitShapes(study.id, shapes, chapterId, fen);
  }

  sendChatMessage(text: string): void {
    const study = this.currentStudy();
    if (!study) return;
    this.socketService.emitSendChat(study.id, text);
  }

  emitClearChat(): void {
    const study = this.currentStudy();
    if (!study) return;
    this.socketService.emitClearChat(study.id);
  }

  emitMembersUpdate(studyId: number | string, collaborators: any[]): void {
    this.socketService.emitMembersUpdate(studyId, collaborators);
  }

  emitChapterChange(studyId: number | string, chapterId: number, fen: string, moves: any[], orientation?: 'white' | 'black', broadcast: boolean = true): void {
    this.flushPendingSaves();
    this.lastRemoteState.set({
      chapterId,
      fen,
      moves,
      orientation
    });

    if (!broadcast) return;
    const clientGeneratedId = crypto.randomUUID();
    this.emittedMoveIds.add(clientGeneratedId);

    this.socketService.emitChangeChapter({
      studyId,
      chapterId,
      fen,
      moves,
      orientation,
      clientGeneratedId
    });

    setTimeout(() => this.emittedMoveIds.delete(clientGeneratedId), 15000);
  }

  emitNavigation(fen: string, moves: any[], orientation?: 'white' | 'black', broadcast: boolean = true): void {
    const s = this.currentStudy();
    const c = this.currentChapter();
    if (!s || !c || !broadcast) return;

    this.lastRemoteState.set({
      chapterId: c.id,
      fen,
      moves,
      orientation: orientation || c.orientation
    });

    const clientGeneratedId = crypto.randomUUID();
    this.emittedMoveIds.add(clientGeneratedId);

    this.socketService.emitMove({
      studyId: s.id,
      chapterId: c.id,
      fen: fen,
      moves: moves,
      orientation: orientation || c.orientation,
      isNavigation: true,
      clientGeneratedId
    });

    setTimeout(() => this.emittedMoveIds.delete(clientGeneratedId), 10000);
  }

  startClass(): void {
    const study = this.currentStudy();
    if (!study) return;
    this.socketService.emitStartClass(study.id);
  }

  endClass(): void {
    const study = this.currentStudy();
    if (!study) return;
    this.socketService.emitEndClass(study.id);
  }

  grantBoardControl(targetUserId: string): void {
    const study = this.currentStudy();
    if (!study) return;
    this.socketService.emitGrantBoardControl(study.id, targetUserId);
  }

  revokeBoardControl(): void {
    const study = this.currentStudy();
    if (!study) return;
    this.socketService.emitRevokeBoardControl(study.id);
  }

  requestMovePermission(userId: string, userName: string): void {
    const study = this.currentStudy();
    if (!study) return;
    this.socketService.emitRequestMovePermission(study.id, userId, userName);
  }

  declineMovePermission(targetUserId: string): void {
    const study = this.currentStudy();
    if (!study) return;
    this.socketService.emitDeclineMovePermission(study.id, targetUserId);
  }

  disconnect(): void {
    this.flushPendingSaves();
    this.socketService.disconnect();
    this.classStartedAt.set(null);
    this.viewerNames.set([]);
    this.viewerCount.set(0);
    this.currentStudy.set(null);
    this.currentChapter.set(null);
  }
}
