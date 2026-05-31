import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, EMPTY, throwError, tap } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { DevLogger } from '../utils/dev-logger';
import {
  Study,
  StudyChapter,
  StudyMoveMadePayload,
  StudyShapesDrawnPayload,
  StudySyncedPayload,
} from '../models/study.model';

export interface StudyViewer {
  userId: string;
  userName: string;
}

@Injectable({
  providedIn: 'root',
})
export class StudyService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private apiUrl = environment.apiUrl;
  private socketUrl = environment.chessMicroserviceUrl || 'http://localhost:3006';
  private socket: Socket | null = null;

  currentStudy = signal<Study | null>(null);
  currentChapter = signal<StudyChapter | null>(null);
  isLoading = signal(false);
  isConnected = signal(false);
  viewerCount = signal(1);
  viewerNames = signal<StudyViewer[]>([]);
  
  isClassActive = signal<boolean>(false);
  lockHolderId = signal<string | null>(null);
  hasJoinedClass = signal<boolean>(false);

  hasBoardControl = computed(() => {
    // If no class is active, everyone can explore locally
    if (!this.isClassActive()) return true;

    // If a class is active, check if this is the owner
    const user = this.authService.currentUser();
    const myUid = user?.uid || user?.id;
    const study = this.currentStudy();
    const studyOwnerId = study?.user_id || (study as any)?.userId || study?.owner?.id;
    const isOwner = !!(myUid && studyOwnerId && String(myUid) === String(studyOwnerId));

    // Students who haven't joined the class yet can explore freely
    if (!isOwner && !this.hasJoinedClass()) return true;

    // If joined, only the lock holder can explore/write
    return !!(myUid && this.lockHolderId() && String(myUid) === String(this.lockHolderId()));
  });
  
  // Track recently emitted move IDs to prevent 'back and forth' stuttering when receiving own broadcasts
  private emittedMoveIds = new Set<string>();

  // Real-time updates
  private moveMadeSubject = new Subject<StudyMoveMadePayload>();
  private shapesDrawnSubject = new Subject<StudyShapesDrawnPayload>();
  private chapterChangedSubject = new Subject<any>();
  private chatMessageSubject = new Subject<any>();
  private chatClearedSubject = new Subject<void>();

  onMoveMade$ = this.moveMadeSubject.asObservable();
  onShapesDrawn$ = this.shapesDrawnSubject.asObservable();
  onChapterChanged$ = this.chapterChangedSubject.asObservable();
  onChatMessage$ = this.chatMessageSubject.asObservable();
  onChatCleared$ = this.chatClearedSubject.asObservable();

  // Track the absolute current state of the study room (owner's state)
  lastRemoteState = signal<{
    chapterId: number | null;
    fen: string | null;
    moves: any[] | null;
    orientation?: 'white' | 'black';
  }>({ chapterId: null, fen: null, moves: null });

  constructor() {}

  // ── HTTP API ──────────────────────────────────────────────────

  getStudies(my: boolean = false, category?: string): Observable<any> {
    let params = my ? 'my=1' : '';
    if (category) {
      params += params ? `&category=${category}` : `category=${category}`;
    }
    const queryString = params ? `?${params}` : '';
    return this.http.get(`${this.apiUrl}/studies${queryString}`);
  }

  createStudy(
    name: string,
    description: string = '',
    visibility: string = 'public',
    category: string = 'general',
    orientation: string = 'white'
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies`, { name, description, visibility, category, orientation });
  }

  updateStudy(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/studies/${id}`, data);
  }

  deleteStudy(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/studies/${id}`);
  }

  getStudy(id: number, targetChapterId?: number): void {
    this.isLoading.set(true);
    this.http.get<{ data: Study }>(`${this.apiUrl}/studies/${id}`).subscribe({
      next: (res) => {
        DevLogger.log('[StudyService] Raw API Response:', res.data);
        this.currentStudy.set(res.data);
        
        // Real-time synchronization of collaborator roles
        const user = this.authService.currentUser();
        const studyOwnerId = res.data.user_id || (res.data as any).userId || res.data.owner?.id;
        const myUid = user?.uid || user?.id;
        const isOwner = !!(myUid && studyOwnerId && String(myUid) === String(studyOwnerId));
        if (isOwner && this.socket) {
          this.emitMembersUpdate(res.data.id, res.data.collaborators || []);
        }

        const chapters = res.data.chapters || [];
        if (chapters.length > 0) {
          const unwrap = (c: any) => (c as any)?.data || c;
          let chapterToSet = null;

          // 1. Try to find targetChapterId if provided
          if (targetChapterId) {
            const found = chapters.find(c => String(unwrap(c).id) === String(targetChapterId));
            if (found) chapterToSet = unwrap(found);
          }

          // 2. Fallback to currently selected if it exists in the refreshed list
          if (!chapterToSet) {
            const current = this.currentChapter();
            if (current) {
              const found = chapters.find(c => String(unwrap(c).id) === String(current.id));
              if (found) chapterToSet = unwrap(found);
            }
          }

          // 3. Fallback to first chapter
          if (!chapterToSet) {
            chapterToSet = unwrap(chapters[0]);
          }

          this.currentChapter.set(chapterToSet);
        }
        
        this.isLoading.set(false);
        this.connectSocket(res.data);
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

  addChapter(studyId: number, name: string, fen?: string, orientation?: 'white' | 'black'): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/chapters`, { 
      name, 
      initial_fen: fen,
      orientation: orientation 
    });
  }

  updateChapter(studyId: number, chapterId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/studies/${studyId}/chapters/${chapterId}`, data);
  }

  deleteChapter(studyId: number, chapterId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/studies/${studyId}/chapters/${chapterId}`);
  }
  
  reorderChapters(studyId: number, chapterIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/chapters/reorder`, { 
      chapter_ids: chapterIds 
    });
  }

  addCollaborator(studyId: number, userId: string, canEdit?: boolean): Observable<any> {
    const body: any = { user_id: userId };
    if (canEdit !== undefined) {
      body.can_edit = canEdit;
    }
    return this.http.post(`${this.apiUrl}/studies/${studyId}/collaborators`, body);
  }

  removeCollaborator(studyId: number, userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/studies/${studyId}/collaborators/${userId}`);
  }

  updateCollaboratorPermission(studyId: number, userId: string, canEdit: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/studies/${studyId}/collaborators/${userId}`, { can_edit: canEdit });
  }

  getStudyMessages(studyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/studies/${studyId}/messages`);
  }

  sendMessageToDb(studyId: number, body: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/messages`, { body });
  }

  clearStudyChat(studyId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/studies/${studyId}/messages`);
  }

  // ── Socket Logic ──────────────────────────────────────────────

  private connectSocket(study: Study): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.socket?.connected) this.socket.disconnect();

    const user = this.authService.currentUser();
    const token = this.authService.getToken();

    const userId = user?.uid || user?.id;
    const userName = user?.username || user?.displayName || user?.name || 'Anonymous';

    this.socket = io(this.socketUrl, {
      auth: { token, userId, userName },
    });

    this.socket.on('connect', () => {
      this.isConnected.set(true);
      const s = this.currentStudy();
      if (!s) return;

      // Fallback for ownerId: check user_id, userId, or owner.id
      const ownerId = s.user_id || (s as any).userId || s.owner?.id;

      this.socket?.emit('join_study', {
        studyId: s.id,
        ownerId: ownerId,
        collaboratorIds: s.collaborators?.map(c => String(c.uid)) || [],
        initialState: {
          chapterId: this.currentChapter()?.id,
          fen: this.currentChapter()?.current_fen,
          moves: this.currentChapter()?.moves,
          orientation: this.currentChapter()?.orientation,
        },
      });
    });

    this.socket.on('study_synced', (state: any) => {
      DevLogger.log(`[Study] Synced state received for study ${state.chapterId || 'unknown'}`);
      this.isClassActive.set(state.isClassActive || false);
      this.lockHolderId.set(state.lockHolderId || null);
      this.lastRemoteState.set({
        chapterId: state.chapterId || state.currentChapterId,
        fen: state.fen,
        moves: state.moves,
        orientation: state.orientation,
      });
    });

    this.socket.on('study_move_made', (payload: StudyMoveMadePayload) => {
      // Ignore own move broadcasts to prevent 'back and forth' stuttering
      if (payload.clientGeneratedId && this.emittedMoveIds.has(payload.clientGeneratedId)) {
        DevLogger.log('[Study] Ignoring own move broadcast:', payload.clientGeneratedId);
        return;
      }

      DevLogger.log(`[Study] Move received for chapter ${payload.chapterId}, FEN: ${payload.fen}`);

      this.lastRemoteState.update(s => ({ 
        ...s, 
        chapterId: payload.chapterId, // CRITICAL: Update chapterId so component knows which context this move belongs to
        fen: payload.fen, 
        moves: payload.moves,
        orientation: payload.orientation
      }));
      this.moveMadeSubject.next(payload);
    });

    this.socket.on('study_shapes_drawn', (payload: StudyShapesDrawnPayload) => {
      this.shapesDrawnSubject.next(payload);
    });

    this.socket.on('study_chapter_changed', (payload: any) => {
      // Ignore own chapter change broadcasts
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
      this.chapterChangedSubject.next(payload);
    });

    this.socket.on('viewer_list_update', (payload: { studyId: string | number; viewers: StudyViewer[]; count: number }) => {
      this.viewerNames.set(payload.viewers || []);
      this.viewerCount.set(payload.count || 0);
    });

    this.socket.on('class_session_started', (payload: { isClassActive: boolean; lockHolderId: string }) => {
      DevLogger.log(`[Study] Class started. Lock holder: ${payload.lockHolderId}`);
      this.isClassActive.set(payload.isClassActive);
      this.lockHolderId.set(payload.lockHolderId);

      const user = this.authService.currentUser();
      const myUid = user?.uid || user?.id;
      const study = this.currentStudy();
      const studyOwnerId = study?.user_id || (study as any)?.userId || study?.owner?.id;
      const isOwner = !!(myUid && studyOwnerId && String(myUid) === String(studyOwnerId));

      if (isOwner) {
        this.hasJoinedClass.set(true); // Host is always in class
        this.toastService.show('Classroom session has started!');
      } else {
        this.hasJoinedClass.set(false); // Students reset join state
      }
    });

    this.socket.on('class_session_ended', (payload: { isClassActive: boolean; lockHolderId: string | null }) => {
      DevLogger.log('[Study] Class ended.');
      this.isClassActive.set(payload.isClassActive);
      this.lockHolderId.set(payload.lockHolderId);
      this.hasJoinedClass.set(false);
      this.toastService.show('Classroom session has ended. Free exploration restored.');
    });

    this.socket.on('board_control_updated', (payload: { lockHolderId: string }) => {
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

    this.socket.on('members_updated', (payload: { collaborators: any[] }) => {
      DevLogger.log('[Study] Members/Collaborators list updated in real-time');
      this.currentStudy.update(curr => curr ? { ...curr, collaborators: payload.collaborators } : null);
    });

    this.socket.on('study_chat_message', (payload: any) => {
      this.chatMessageSubject.next(payload);
    });

    this.socket.on('study_chat_cleared', () => {
      this.chatClearedSubject.next();
    });
  }

  emitMove(move: string, fen: string, moves: any[], orientation?: 'white' | 'black', broadcast: boolean = true): Observable<any> {
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
      
      this.socket?.emit('study_move', {
        studyId: study.id,
        move,
        fen,
        chapterId: chapterId,
        moves: moves,
        orientation: orientation || chapter.orientation,
        clientGeneratedId
      });

      // Cleanup ID after 15 seconds
      setTimeout(() => this.emittedMoveIds.delete(clientGeneratedId), 15000);
    }

    // Persist full tree to database
    return this.updateChapter(study.id, chapterId, {
      current_fen: fen,
      moves: moves,
    }).pipe(
      tap({
        next: (res) => {
          const updated = (res as any).data || res;
          this.currentChapter.set(updated);

          // SYNC: Update the chapter in the master study list so the sidebar stays current
          this.currentStudy.update(s => {
            if (!s || !s.chapters) return s;
            const chapters = s.chapters.map(c => 
              String(c.id) === String(updated.id) ? updated : c
            );
            return { ...s, chapters };
          });

          // Broadcast switch to other clients with the same ID to prevent self-sync
          if (broadcast) {
            this.socket?.emit('study_change_chapter', {
              studyId: study.id,
              chapterId: updated.id,
              fen: updated.current_fen,
              moves: updated.moves,
              orientation: updated.orientation,
              clientGeneratedId // REUSE the same ID
            });
          }
        },
        error: (err) => {
          DevLogger.error('[StudyService] Failed to save move to DB:', err);
          this.toastService.show('Failed to sync changes with server. Please refresh.', 'error');
        }
      })
    );
  }

  emitShapes(shapes: any[]): void {
    const study = this.currentStudy();
    if (!study || !this.socket) return;
    this.socket.emit('study_draw_shapes', {
      studyId: study.id,
      shapes,
    });
  }

  sendChatMessage(text: string): void {
    const study = this.currentStudy();
    if (!study || !this.socket) return;
    this.socket.emit('study_send_chat', {
      studyId: study.id,
      text
    });
  }

  emitClearChat(): void {
    const study = this.currentStudy();
    if (!study || !this.socket) return;
    this.socket.emit('study_clear_chat', {
      studyId: study.id
    });
  }

  emitMembersUpdate(studyId: number, collaborators: any[]): void {
    if (!this.socket) return;
    this.socket.emit('update_members', {
      studyId,
      collaborators
    });
  }

  emitChapterChange(studyId: number, chapterId: number, fen: string, moves: any[], orientation?: 'white' | 'black', broadcast: boolean = true): void {
    this.lastRemoteState.set({
      chapterId,
      fen,
      moves,
      orientation
    });

    if (!broadcast) return;
    const clientGeneratedId = crypto.randomUUID();
    this.emittedMoveIds.add(clientGeneratedId);
    
    this.socket?.emit('study_change_chapter', {
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
    if (!s || !c || !this.socket || !broadcast) return;

    this.lastRemoteState.set({
      chapterId: c.id,
      fen,
      moves,
      orientation: orientation || c.orientation
    });

    const clientGeneratedId = crypto.randomUUID();
    if (broadcast) this.emittedMoveIds.add(clientGeneratedId);

    this.socket.emit('study_move', {
      studyId: s.id,
      chapterId: c.id,
      fen: fen,
      moves: moves,
      orientation: orientation || c.orientation,
      isNavigation: true,
      clientGeneratedId
    });

    if (broadcast) {
      setTimeout(() => this.emittedMoveIds.delete(clientGeneratedId), 10000);
    }
  }

  importPgn(studyId: number, pgn: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/import-pgn`, { pgn });
  }

  exportPgn(studyId: number): void {
    this.http.get(`${this.apiUrl}/studies/${studyId}/export-pgn`, { 
      responseType: 'blob' 
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study_${studyId}.pgn`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  startClass(): void {
    const study = this.currentStudy();
    if (!study || !this.socket) return;
    this.socket.emit('start_class', { studyId: study.id });
  }

  endClass(): void {
    const study = this.currentStudy();
    if (!study || !this.socket) return;
    this.socket.emit('end_class', { studyId: study.id });
  }

  grantBoardControl(targetUserId: string): void {
    const study = this.currentStudy();
    if (!study || !this.socket) return;
    this.socket.emit('grant_board_control', { studyId: study.id, targetUserId });
  }

  revokeBoardControl(): void {
    const study = this.currentStudy();
    if (!study || !this.socket) return;
    this.socket.emit('revoke_board_control', { studyId: study.id });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.isConnected.set(false);
    this.viewerNames.set([]);
    this.viewerCount.set(0);
  }
}
