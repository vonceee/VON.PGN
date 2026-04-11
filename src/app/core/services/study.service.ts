import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
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

  getStudy(id: number): void {
    this.isLoading.set(true);
    this.http.get<{ data: Study }>(`${this.apiUrl}/studies/${id}`).subscribe({
      next: (res) => {
        this.currentStudy.set(res.data);
        if (res.data.chapters && res.data.chapters.length > 0) {
          this.currentChapter.set(res.data.chapters[0]);
        }
        this.isLoading.set(false);
        this.connectSocket(res.data);
      },
      error: () => this.isLoading.set(false),
    });
  }

  addChapter(studyId: number, name: string, fen?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/chapters`, { name, initial_fen: fen });
  }

  updateChapter(studyId: number, chapterId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/studies/${studyId}/chapters/${chapterId}`, data);
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
      this.socket?.emit('join_study', {
        studyId: study.id,
        ownerId: study.user_id,
        initialState: {
          chapterId: this.currentChapter()?.id,
          fen: this.currentChapter()?.current_fen,
          moves: this.currentChapter()?.moves,
        },
      });
    });

    this.socket.on('study_synced', (state: StudySyncedPayload) => {
      console.log('[Study] Synced state:', state);
    });

    this.socket.on('study_move_made', (payload: StudyMoveMadePayload) => {
      this.moveMadeSubject.next(payload);
    });

    this.socket.on('study_shapes_drawn', (payload: StudyShapesDrawnPayload) => {
      this.shapesDrawnSubject.next(payload);
    });

    this.socket.on('study_chapter_changed', (payload: any) => {
      this.chapterChangedSubject.next(payload);
    });
  }

  emitMove(move: string, fen: string): void {
    const study = this.currentStudy();
    const chapter = this.currentChapter();
    if (!study || !chapter || !this.socket) return;

    this.socket.emit('study_move', {
      studyId: study.id,
      move,
      fen,
      chapterId: chapter.id,
    });

    // Also persist to DB (debounced or immediate)
    this.updateChapter(study.id, chapter.id, {
      current_fen: fen,
      moves: [...chapter.moves, move],
    }).subscribe();
  }

  emitShapes(shapes: any[]): void {
    const study = this.currentStudy();
    if (!study || !this.socket) return;
    this.socket.emit('study_draw_shapes', {
      studyId: study.id,
      shapes,
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.isConnected.set(false);
  }
}
