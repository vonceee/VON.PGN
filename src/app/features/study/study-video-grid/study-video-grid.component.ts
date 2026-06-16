import { Component, inject, computed, ChangeDetectionStrategy, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroVideoCamera,
  heroVideoCameraSlash,
  heroMicrophone,
  heroPhoneXMark,
  heroUser,
  heroArrowUpRight,
  heroArrowDownLeft
} from '@ng-icons/heroicons/outline';
import { WebrtcService } from '../../../core/services/webrtc.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-study-video-grid',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      heroVideoCamera,
      heroVideoCameraSlash,
      heroMicrophone,
      heroPhoneXMark,
      heroUser,
      heroArrowUpRight,
      heroArrowDownLeft
    })
  ],
  template: `
    <div class="flex flex-col h-full min-h-0 overflow-hidden" [ngClass]="webrtc.isDetached() ? 'bg-surface/95 text-content p-4 rounded-2xl border border-border-base/50 shadow-2xl backdrop-blur-md' : 'bg-transparent text-content p-3'">
      <!-- Scrollable Videos Container -->
      <div class="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0 mb-4 custom-scrollbar">
        
        <!-- Local Stream Video Box -->
        <div class="relative bg-subtle rounded-xl overflow-hidden border border-border-base/50 aspect-video flex items-center justify-center shadow-sm">
          @if (localStream()) {
            <video 
              #localVideo 
              [srcObject]="localStream()" 
              autoplay 
              playsinline 
              muted 
              class="w-full h-full object-cover transform -scale-x-100"
            ></video>
            @if (isCameraOff()) {
              <div class="absolute inset-0 bg-subtle flex flex-col items-center justify-center">
                <div class="w-12 h-12 rounded-full bg-surface border border-border-base flex items-center justify-center mb-1.5 shadow-inner">
                  <ng-icon name="heroUser" class="w-6 h-6 text-muted"></ng-icon>
                </div>
                <span class="text-xstext-muted font-medium">Camera Off</span>
              </div>
            }
          } @else {
            <div class="text-muted text-xs flex flex-col items-center">
              <div class="w-10 h-10 rounded-full bg-surface border border-border-base/50 flex items-center justify-center mb-2">
                <ng-icon name="heroVideoCameraSlash" class="w-5 h-5 text-muted"></ng-icon>
              </div>
              <span class="text-xsfont-medium">Connecting camera...</span>
            </div>
          }
          <!-- Label Overlay -->
          <div class="absolute bottom-2 left-2 px-2 py-0.5 bg-white/80 backdrop-blur-sm rounded text-[10px] font-semibold text-content border border-border-base/50 shadow-sm flex items-center gap-1.5">
            <span>You</span>
            @if (isMuted()) {
              <div class="relative flex items-center justify-center">
                <ng-icon name="heroMicrophone" class="text-red-500 w-3 h-3"></ng-icon>
                <div class="absolute w-[1.2px] h-4 bg-red-500 rotate-45 pointer-events-none rounded"></div>
              </div>
            }
          </div>
        </div>

        <!-- Remote Stream Video Boxes -->
        @for (peer of remoteStreamsList(); track peer.id) {
          <div class="relative bg-subtle rounded-xl overflow-hidden border border-border-base/50 aspect-video flex items-center justify-center shadow-sm">
            <video 
              [srcObject]="peer.stream" 
              autoplay 
              playsinline 
              class="w-full h-full object-cover"
            ></video>
            <!-- Label Overlay -->
            <div class="absolute bottom-2 left-2 px-2 py-0.5 bg-white/80 backdrop-blur-sm rounded text-[10px] font-semibold text-content border border-border-base/50 shadow-sm flex items-center gap-1.5">
              <span>{{ peer.userName }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Controls Panel (Light Mode) -->
      <div class="flex items-center justify-center gap-4 bg-surface py-2 px-4 rounded-xl border border-border-base/50 shadow-sm shrink-0">
        <!-- Mic Toggle -->
        <button 
          (click)="toggleMic()" 
          [class.bg-rose-50]="isMuted()" [class.text-rose-600]="isMuted()" [class.border-rose-100]="isMuted()" [class.hover:bg-rose-100]="isMuted()"
          [class.bg-subtle]="!isMuted()" [class.text-content]="!isMuted()" [class.border-border-base]="!isMuted()" [class.hover:bg-border-base/50]="!isMuted()"
          class="w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
          title="Toggle Mic"
        >
          <div class="relative flex items-center justify-center">
            <ng-icon name="heroMicrophone" class="w-4 h-4"></ng-icon>
            @if (isMuted()) {
              <div class="absolute w-[1.5px] h-4.5 bg-rose-500 rotate-45 pointer-events-none rounded"></div>
            }
          </div>
        </button>

        <!-- Camera Toggle -->
        <button 
          (click)="toggleCam()" 
          [class.bg-rose-50]="isCameraOff()" [class.text-rose-600]="isCameraOff()" [class.border-rose-100]="isCameraOff()" [class.hover:bg-rose-100]="isCameraOff()"
          [class.bg-subtle]="!isCameraOff()" [class.text-content]="!isCameraOff()" [class.border-border-base]="!isCameraOff()" [class.hover:bg-border-base/50]="!isCameraOff()"
          class="w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
          title="Toggle Camera"
        >
          <ng-icon [name]="isCameraOff() ? 'heroVideoCameraSlash' : 'heroVideoCamera'" class="w-4 h-4"></ng-icon>
        </button>

        <!-- Dock/Undock Toggle -->
        <button 
          (click)="toggleDetached()" 
          class="w-9 h-9 rounded-full bg-subtle text-content hover:bg-border-base/50 border border-border-base flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
          [title]="webrtc.isDetached() ? 'Dock to Sidebar' : 'Pop Out Video Call'"
        >
          <ng-icon [name]="webrtc.isDetached() ? 'heroArrowDownLeft' : 'heroArrowUpRight'" class="w-4 h-4"></ng-icon>
        </button>

        <!-- Hang Up -->
        <button 
          (click)="leaveCall()" 
          class="w-9 h-9 rounded-full bg-rose-500 hover:bg-rose-600 border-0 flex items-center justify-center text-white shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
          title="Leave Call"
        >
          <ng-icon name="heroPhoneXMark" class="w-4 h-4"></ng-icon>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyVideoGridComponent {
  public webrtc = inject(WebrtcService);

  localStream = this.webrtc.localStream;
  isMuted = this.webrtc.isMuted;
  isCameraOff = this.webrtc.isCameraOff;

  @ViewChild('localVideo') set localVideoElement(ref: ElementRef<HTMLVideoElement> | undefined) {
    if (ref && this.localStream()) {
      ref.nativeElement.srcObject = this.localStream();
    }
  }

  // Convert the remoteStreams Map signal into a reactive list signal
  remoteStreamsList = computed(() => {
    const list: Array<{ id: string; userName: string; stream: MediaStream }> = [];
    this.webrtc.remoteStreams().forEach((info, id) => {
      list.push({ id, userName: info.userName, stream: info.stream });
    });
    return list;
  });

  // Calculate dynamic grid classes based on how many streams we have
  gridClass = computed(() => {
    const count = 1 + this.remoteStreamsList().length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
  });

  constructor() {
    // Keep local video element synced if stream changes
    effect(() => {
      const stream = this.localStream();
      // Side-effect is tracked, but template bindings handle it reactively.
    });
  }

  toggleMic(): void {
    this.webrtc.toggleMicrophone();
  }

  toggleCam(): void {
    this.webrtc.toggleCamera();
  }

  leaveCall(): void {
    this.webrtc.leaveCall();
  }

  toggleDetached(): void {
    this.webrtc.isDetached.update(d => !d);
  }
}
