import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { DevLogger } from '../utils/dev-logger';
import {
  Study,
  StudyChapter,
  StudyMoveMadePayload,
  StudyShapesDrawnPayload,
} from '../models/study.model';

export interface StudyViewer {
  userId: string;
  userName: string;
}

@Injectable({
  providedIn: 'root',
})
export class StudySocketService {
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  private socketUrl = environment.chessMicroserviceUrl || 'http://localhost:3006';
  private socket: Socket | null = null;

  isConnected = signal(false);

  // Real-time Event Subjects
  private syncedSubject = new Subject<any>();
  private moveMadeSubject = new Subject<StudyMoveMadePayload>();
  private shapesDrawnSubject = new Subject<StudyShapesDrawnPayload>();
  private chapterChangedSubject = new Subject<any>();
  private viewerListUpdateSubject = new Subject<{ studyId: string | number; viewers: StudyViewer[]; count: number }>();
  private classSessionStartedSubject = new Subject<{ isClassActive: boolean; lockHolderId: string; classStartedAt?: string }>();
  private classSessionEndedSubject = new Subject<{ isClassActive: boolean; lockHolderId: string | null; classStartedAt?: null }>();
  private boardControlUpdatedSubject = new Subject<{ lockHolderId: string }>();
  private membersUpdatedSubject = new Subject<{ collaborators: any[] }>();
  private chatMessageSubject = new Subject<any>();
  private chatClearedSubject = new Subject<void>();
  private movePermissionRequestedSubject = new Subject<{ userId: string; userName: string }>();
  private movePermissionDeclinedSubject = new Subject<{ targetUserId: string }>();
  private userJoinedCallSubject = new Subject<{ userId: string; userName: string }>();
  private userLeftCallSubject = new Subject<{ userId: string }>();
  private webrtcSignalSubject = new Subject<{ senderUserId: string; studyId: string | number; signalData: any }>();

  // Expose Observables
  onSynced$ = this.syncedSubject.asObservable();
  onMoveMade$ = this.moveMadeSubject.asObservable();
  onShapesDrawn$ = this.shapesDrawnSubject.asObservable();
  onChapterChanged$ = this.chapterChangedSubject.asObservable();
  onViewerListUpdate$ = this.viewerListUpdateSubject.asObservable();
  onClassSessionStarted$ = this.classSessionStartedSubject.asObservable();
  onClassSessionEnded$ = this.classSessionEndedSubject.asObservable();
  onBoardControlUpdated$ = this.boardControlUpdatedSubject.asObservable();
  onMembersUpdated$ = this.membersUpdatedSubject.asObservable();
  onChatMessage$ = this.chatMessageSubject.asObservable();
  onChatCleared$ = this.chatClearedSubject.asObservable();
  onMovePermissionRequested$ = this.movePermissionRequestedSubject.asObservable();
  onMovePermissionDeclined$ = this.movePermissionDeclinedSubject.asObservable();
  onUserJoinedCall$ = this.userJoinedCallSubject.asObservable();
  onUserLeftCall$ = this.userLeftCallSubject.asObservable();
  onWebrtcSignal$ = this.webrtcSignalSubject.asObservable();

  connect(study: Study, currentChapter: StudyChapter | null): void {
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
      const ownerId = study.user_id || (study as any).userId || study.owner?.id;

      this.socket?.emit('join_study', {
        studyId: study.id,
        ownerId: ownerId,
        collaboratorIds: study.collaborators?.map(c => String(c.uid)) || [],
        initialState: {
          chapterId: currentChapter?.id,
          fen: currentChapter?.current_fen,
          moves: currentChapter?.moves,
          orientation: currentChapter?.orientation,
        },
      });
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('study_synced', (state: any) => {
      this.syncedSubject.next(state);
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

    this.socket.on('viewer_list_update', (payload: any) => {
      this.viewerListUpdateSubject.next(payload);
    });

    this.socket.on('class_session_started', (payload: any) => {
      this.classSessionStartedSubject.next(payload);
    });

    this.socket.on('class_session_ended', (payload: any) => {
      this.classSessionEndedSubject.next(payload);
    });

    this.socket.on('board_control_updated', (payload: any) => {
      this.boardControlUpdatedSubject.next(payload);
    });

    this.socket.on('members_updated', (payload: any) => {
      this.membersUpdatedSubject.next(payload);
    });

    this.socket.on('study_chat_message', (payload: any) => {
      this.chatMessageSubject.next(payload);
    });

    this.socket.on('study_chat_cleared', () => {
      this.chatClearedSubject.next();
    });

    this.socket.on('move_permission_requested', (payload: any) => {
      this.movePermissionRequestedSubject.next(payload);
    });

    this.socket.on('move_permission_declined', (payload: any) => {
      this.movePermissionDeclinedSubject.next(payload);
    });

    this.socket.on('user_joined_call', (payload: any) => {
      this.userJoinedCallSubject.next(payload);
    });

    this.socket.on('user_left_call', (payload: any) => {
      this.userLeftCallSubject.next(payload);
    });

    this.socket.on('webrtc_signal', (payload: any) => {
      this.webrtcSignalSubject.next(payload);
    });
  }

  emitJoinStudy(studyId: number, ownerId: any, collaboratorIds: string[], initialState: any): void {
    this.socket?.emit('join_study', {
      studyId,
      ownerId,
      collaboratorIds,
      initialState,
    });
  }

  emitMove(payload: any): void {
    this.socket?.emit('study_move', payload);
  }

  emitShapes(studyId: number, shapes: any[]): void {
    this.socket?.emit('study_draw_shapes', { studyId, shapes });
  }

  emitSendChat(studyId: number, text: string): void {
    this.socket?.emit('study_send_chat', { studyId, text });
  }

  emitClearChat(studyId: number): void {
    this.socket?.emit('study_clear_chat', { studyId });
  }

  emitMembersUpdate(studyId: number, collaborators: any[]): void {
    this.socket?.emit('update_members', { studyId, collaborators });
  }

  emitChangeChapter(payload: any): void {
    this.socket?.emit('study_change_chapter', payload);
  }

  emitStartClass(studyId: number): void {
    this.socket?.emit('start_class', { studyId });
  }

  emitEndClass(studyId: number): void {
    this.socket?.emit('end_class', { studyId });
  }

  emitGrantBoardControl(studyId: number, targetUserId: string): void {
    this.socket?.emit('grant_board_control', { studyId, targetUserId });
  }

  emitRevokeBoardControl(studyId: number): void {
    this.socket?.emit('revoke_board_control', { studyId });
  }

  emitRequestMovePermission(studyId: number, userId: string, userName: string): void {
    this.socket?.emit('request_move_permission', { studyId, userId, userName });
  }

  emitDeclineMovePermission(studyId: number, targetUserId: string): void {
    this.socket?.emit('decline_move_permission', { studyId, targetUserId });
  }

  emitLeaveStudy(studyId: number): void {
    this.socket?.emit('leave_study', studyId);
  }

  emitJoinCall(studyId: number): void {
    this.socket?.emit('join_call', { studyId });
  }

  emitLeaveCall(studyId: number): void {
    this.socket?.emit('leave_call', { studyId });
  }

  emitWebrtcSignal(studyId: number, targetUserId: string, signalData: any): void {
    this.socket?.emit('webrtc_signal', { studyId, targetUserId, signalData });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.isConnected.set(false);
  }
}
