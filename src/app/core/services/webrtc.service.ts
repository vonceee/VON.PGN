import { Injectable, inject, signal, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudyService } from './study.service';
import { StudySocketService } from './study-socket.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { DevLogger } from '../utils/dev-logger';

export interface RemoteStreamInfo {
  userName: string;
  stream: MediaStream;
}

@Injectable({
  providedIn: 'root',
})
export class WebrtcService {
  private studyService = inject(StudyService);
  private socketService = inject(StudySocketService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteAudios = new Map<string, HTMLAudioElement>();
  
  localStream = signal<MediaStream | null>(null);
  remoteStreams = signal<Map<string, RemoteStreamInfo>>(new Map());
  isCallActive = signal(false);
  isMuted = signal(false);
  isCameraOff = signal(false);
  isDetached = signal(false);
  activeSubTab = signal<'chat' | 'call'>('chat');

  private iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor() {
    this.listenToSignaling();
  }

  private listenToSignaling(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. Another user joined the call
    this.socketService.onUserJoinedCall$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (!this.isCallActive()) return;

        const isTutor = this.studyService.isOwner();
        const currentUserId = String(this.authService.currentUser()?.uid || this.authService.currentUser()?.id || '');
        const targetUserId = String(user.userId);

        if (targetUserId === currentUserId) return;

        DevLogger.log(`[WebRTC] User joined call: ${user.userName} (${targetUserId})`);

        // Hub-and-Spoke rule:
        // If current user is Tutor, we expect a Student to offer, or we initiate if needed.
        // If current user is Student, and the joining user is the Tutor, we initiate the connection.
        const studyOwner = this.studyService.currentStudy();
        const tutorId = String(studyOwner?.user_id || (studyOwner as any)?.userId || studyOwner?.owner?.id || '');

        if (!isTutor && targetUserId === tutorId) {
          // I am a student, and the tutor just joined! I must send an offer.
          this.initiateConnection(tutorId, user.userName);
        }
      });

    // 2. Another user left the call
    this.socketService.onUserLeftCall$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        DevLogger.log(`[WebRTC] User left call: ${user.userId}`);
        this.closePeerConnection(String(user.userId));
      });

    // 3. WebRTC handshake signaling message received
    this.socketService.onWebrtcSignal$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (payload) => {
        if (!this.isCallActive()) return;

        const senderId = String(payload.senderUserId);
        const { sdp, candidate } = payload.signalData;

        // Hub-and-Spoke rule validation:
        // Only accept signals if one of us is the Tutor
        const isTutor = this.studyService.isOwner();
        const studyOwner = this.studyService.currentStudy();
        const tutorId = String(studyOwner?.user_id || (studyOwner as any)?.userId || studyOwner?.owner?.id || '');

        if (!isTutor && senderId !== tutorId) {
          DevLogger.warn(`[WebRTC] Student rejected signaling from other Student ${senderId}`);
          return;
        }

        try {
          if (sdp) {
            if (sdp.type === 'offer') {
              DevLogger.log(`[WebRTC] Received Offer from ${senderId}`);
              await this.handleOffer(senderId, sdp);
            } else if (sdp.type === 'answer') {
              DevLogger.log(`[WebRTC] Received Answer from ${senderId}`);
              await this.handleAnswer(senderId, sdp);
            }
          } else if (candidate) {
            DevLogger.log(`[WebRTC] Received ICE Candidate from ${senderId}`);
            const pc = this.peerConnections.get(senderId);
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        } catch (err) {
          DevLogger.error(`[WebRTC] Signal error from peer ${senderId}:`, err);
        }
      });
  }

  async joinCall(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.isCallActive()) return;

    try {
      DevLogger.log('[WebRTC] Requesting local camera/microphone stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });
      this.localStream.set(stream);
      this.isCallActive.set(true);

      const study = this.studyService.currentStudy();
      if (!study) return;

      // Emit join call to WebSocket room
      this.socketService.emitJoinCall(study.id);

      // Student initiates connection immediately if the tutor is already online
      const isTutor = this.studyService.isOwner();
      if (!isTutor) {
        const tutorId = String(study.user_id || (study as any).userId || study.owner?.id || '');
        const tutorOnline = this.studyService.viewerNames().some(v => String(v.userId) === tutorId);
        
        if (tutorOnline) {
          DevLogger.log('[WebRTC] Tutor is online, initiating WebRTC connection...');
          const tutorViewer = this.studyService.viewerNames().find(v => String(v.userId) === tutorId);
          this.initiateConnection(tutorId, tutorViewer?.userName || 'Tutor');
        }
      }
    } catch (err) {
      DevLogger.error('[WebRTC] Failed to join call:', err);
      this.toastService.show('Failed to access camera or microphone.', 'error');
      throw err;
    }
  }

  leaveCall(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.isCallActive()) return;

    const study = this.studyService.currentStudy();
    if (study) {
      this.socketService.emitLeaveCall(study.id);
    }

    // Clean up local media tracks
    const stream = this.localStream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.localStream.set(null);
    }

    // Clean up all peer connections
    for (const peerId of Array.from(this.peerConnections.keys())) {
      this.closePeerConnection(peerId);
    }

    // Stop and clear all audio tags
    for (const audio of this.remoteAudios.values()) {
      try {
        audio.pause();
        audio.srcObject = null;
      } catch (e) {}
    }
    this.remoteAudios.clear();

    this.isCallActive.set(false);
    this.isMuted.set(false);
    this.isCameraOff.set(false);
    this.isDetached.set(false);
    DevLogger.log('[WebRTC] Disconnected from call.');
  }

  private createPeerConnection(targetUserId: string, userName: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.isCallActive()) {
        const study = this.studyService.currentStudy();
        if (study) {
          this.socketService.emitWebrtcSignal(study.id, targetUserId, {
            candidate: event.candidate
          });
        }
      }
    };

    pc.ontrack = (event) => {
      DevLogger.log(`[WebRTC] Received remote stream track from ${userName} (${targetUserId})`);
      const remoteStream = event.streams[0];

      if (isPlatformBrowser(this.platformId)) {
        // Clean up old audio element for this user if any exists
        const oldAudio = this.remoteAudios.get(targetUserId);
        if (oldAudio) {
          try {
            oldAudio.pause();
            oldAudio.srcObject = null;
          } catch (e) {}
        }

        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.play().catch(err => DevLogger.error(`[WebRTC] Failed to play remote audio for ${userName}:`, err));
        this.remoteAudios.set(targetUserId, audio);
      }

      this.remoteStreams.update(map => {
        const next = new Map(map);
        next.set(targetUserId, { userName, stream: remoteStream });
        return next;
      });
    };

    pc.onconnectionstatechange = () => {
      DevLogger.log(`[WebRTC] Connection state with ${userName}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeerConnection(targetUserId);
      }
    };

    // Attach local stream tracks to this peer connection
    const local = this.localStream();
    if (local) {
      local.getTracks().forEach(track => pc.addTrack(track, local));
    }

    this.peerConnections.set(targetUserId, pc);
    return pc;
  }

  private async initiateConnection(targetUserId: string, userName: string): Promise<void> {
    const pc = this.createPeerConnection(targetUserId, userName);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const study = this.studyService.currentStudy();
      if (study) {
        DevLogger.log(`[WebRTC] Sending Offer to ${userName}`);
        this.socketService.emitWebrtcSignal(study.id, targetUserId, {
          sdp: offer
        });
      }
    } catch (err) {
      DevLogger.error(`[WebRTC] Error initiating offer to ${userName}:`, err);
    }
  }

  private async handleOffer(senderId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    // Look up username from viewers list
    const viewer = this.studyService.viewerNames().find(v => String(v.userId) === senderId);
    const userName = viewer?.userName || 'Student';

    const pc = this.createPeerConnection(senderId, userName);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const study = this.studyService.currentStudy();
    if (study) {
      DevLogger.log(`[WebRTC] Sending Answer to ${userName}`);
      this.socketService.emitWebrtcSignal(study.id, senderId, {
        sdp: answer
      });
    }
  }

  private async handleAnswer(senderId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(senderId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }

  private closePeerConnection(userId: string): void {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }

    const audio = this.remoteAudios.get(userId);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
      } catch (e) {}
      this.remoteAudios.delete(userId);
    }

    this.remoteStreams.update(map => {
      if (!map.has(userId)) return map;
      const next = new Map(map);
      next.delete(userId);
      return next;
    });

    DevLogger.log(`[WebRTC] Closed peer connection for ${userId}`);
  }

  toggleMicrophone(): void {
    const stream = this.localStream();
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted.set(!audioTrack.enabled);
      }
    }
  }

  toggleCamera(): void {
    const stream = this.localStream();
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isCameraOff.set(!videoTrack.enabled);
      }
    }
  }
}
