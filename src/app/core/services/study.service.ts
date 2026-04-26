import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import {
  Study,
  StudyChapter,
  StudyMoveMadePayload,
  StudyShapesDrawnPayload,
  StudySyncedPayload,
} from '../models/study.model';

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

  // Real-time updates
  private moveMadeSubject = new Subject<StudyMoveMadePayload>();
  private shapesDrawnSubject = new Subject<StudyShapesDrawnPayload>();
  private chapterChangedSubject = new Subject<any>();

  onMoveMade$ = this.moveMadeSubject.asObservable();
  onShapesDrawn$ = this.shapesDrawnSubject.asObservable();
  onChapterChanged$ = this.chapterChangedSubject.asObservable();

  // Track the absolute current state of the study room (owner's state)
  lastRemoteState = signal<{
    chapterId: number | null;
    fen: string | null;
    moves: any[] | null;
    orientation?: 'white' | 'black';
  }>({ chapterId: null, fen: null, moves: null });

  constructor() {}

  // ── HTTP API ──────────────────────────────────────────────────

  getStudies(my: boolean = false): Observable<any> {
    const params = my ? '?my=1' : '';
    return this.http.get(`${this.apiUrl}/studies${params}`);
  }

  createStudy(
    name: string,
    description: string = '',
    visibility: string = 'public',
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies`, { name, description, visibility });
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
        console.log('[StudyService] Raw API Response:', res.data);
        this.currentStudy.set(res.data);
        
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
        console.error('[StudyService] Failed to fetch study:', err);
        
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

  addCollaborator(studyId: number, userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/collaborators`, { user_id: userId });
  }

  removeCollaborator(studyId: number, userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/studies/${studyId}/collaborators/${userId}`);
  }

  updateCollaboratorPermission(studyId: number, userId: string, canEdit: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/studies/${studyId}/collaborators/${userId}`, { can_edit: canEdit });
  }

  // ── Socket Logic ──────────────────────────────────────────────

  private connectSocket(study: Study): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.socket?.connected) this.socket.disconnect();

    const user = this.authService.currentUser();
    const token = this.authService.getToken();

    this.socket = io(this.socketUrl, {
      auth: { token, userId: user?.uid, userName: user?.username },
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

    this.socket.on('study_synced', (state: StudySyncedPayload) => {
      console.log('[Study] Synced state:', state);
      this.lastRemoteState.set({
        chapterId: state.chapterId,
        fen: state.fen,
        moves: state.moves,
        orientation: state.orientation,
      });
    });

    this.socket.on('study_move_made', (payload: StudyMoveMadePayload) => {
      this.lastRemoteState.update(s => ({ 
        ...s, 
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
      this.lastRemoteState.set({ 
        chapterId: payload.chapterId, 
        fen: payload.fen, 
        moves: payload.moves,
        orientation: payload.orientation 
      });
      this.chapterChangedSubject.next(payload);
    });
  }

  emitMove(move: string, fen: string, moves: any[], orientation?: 'white' | 'black', broadcast: boolean = true): void {
    const study = this.currentStudy();
    const chapter = this.currentChapter();
    
    if (!study || !chapter) {
      console.warn('[StudyService] Missing study or chapter to save move.');
      return;
    }

    const chapterId = chapter.id;
    if (!chapterId) {
      console.error('[StudyService] Chapter object exists but ID is missing:', chapter);
      return;
    }

    if (broadcast) {
      this.socket?.emit('study_move', {
        studyId: study.id,
        move,
        fen,
        chapterId: chapterId,
        moves: moves,
        orientation: orientation || chapter.orientation
      });
    }

    // Persist full tree to database
    this.updateChapter(study.id, chapterId, {
      current_fen: fen,
      moves: moves,
    }).subscribe({
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

        // Broadcast switch to other clients
        if (broadcast) {
          this.socket?.emit('study_change_chapter', {
            studyId: study.id,
            chapterId: updated.id,
            fen: updated.current_fen,
            moves: updated.moves,
            orientation: updated.orientation
          });
        }
      },
      error: (err) => {
        console.error('[StudyService] Failed to save move to DB:', err);
        this.toastService.show('Failed to sync changes with server. Please refresh.', 'error');
      }
    });
  }

  emitShapes(shapes: any[]): void {
    const study = this.currentStudy();
    if (!study || !this.socket) return;
    this.socket.emit('study_draw_shapes', {
      studyId: study.id,
      shapes,
    });
  }

  emitChapterChange(studyId: number, chapterId: number, fen: string, moves: any[], orientation?: 'white' | 'black', broadcast: boolean = true): void {
    if (!broadcast) return;
    this.socket?.emit('study_change_chapter', {
      studyId,
      chapterId,
      fen,
      moves,
      orientation
    });
  }

  emitNavigation(fen: string, moves: any[], orientation?: 'white' | 'black', broadcast: boolean = true): void {
    const s = this.currentStudy();
    const c = this.currentChapter();
    if (!s || !c || !this.socket || !broadcast) return;

    this.socket.emit('study_move', {
      studyId: s.id,
      chapterId: c.id,
      fen: fen,
      moves: moves,
      orientation: orientation || c.orientation,
      isNavigation: true,
    });
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

  disconnect(): void {
    this.socket?.disconnect();
    this.isConnected.set(false);
  }
}
