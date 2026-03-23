import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  OnInit,
  inject,
  HostListener,
  NgZone,
  ChangeDetectorRef,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Course, LessonDetail } from '../../../../core/models/course.model';
import { InteractiveBoardComponent } from '../interactive-board/interactive-board.component';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LessonService } from '../../../../core/services/lesson.service';

@Component({
  selector: 'app-lesson-view',
  standalone: true,
  imports: [InteractiveBoardComponent, RouterLink],
  templateUrl: './lesson-view.html',
  styleUrl: './lesson-view.css',
})
export class LessonView implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  userService = inject(UserService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  lessonService = inject(LessonService);
  router = inject(Router);
  ngZone = inject(NgZone);
  cdr = inject(ChangeDetectorRef);
  @Input() courseData: Course | null = null;
  @Input() lessonData: LessonDetail | null = null;
  @Output() startCourse = new EventEmitter<string>();
  @Output() nextLesson = new EventEmitter<string>();
  @Output() prevLesson = new EventEmitter<string>();
  @Output() backToCourse = new EventEmitter<void>();

  @ViewChild('bottomTrigger') bottomTrigger!: ElementRef;

  private observer: IntersectionObserver | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  isCompleted = false;
  isSpeaking = signal(false);
  isPaused = signal(false);

  ngOnInit() {
    if (this.authService.isAuthenticated() && !this.userService.currentUser()) {
      this.userService.loadMyProfile().subscribe();
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }

    if (this.lessonService.allCourses().length === 0) {
      this.lessonService.loadAllCourses().subscribe();
    }
  }

  ngAfterViewInit() {
    this.setupObserver();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lessonData'] && !changes['lessonData'].isFirstChange()) {
      this.isCompleted = false;
      this.setupObserver();
    }
  }

  onStartCourse() {
    const firstLessonId = this.courseData?.chapters[0].lessons[0].id;
    if (firstLessonId) {
      this.startCourse.emit(firstLessonId);
    }
  }

  get isAlreadyCompleted(): boolean {
    const user = this.userService.currentUser();
    const lessonId = this.lessonData?.id;

    if (!user || !lessonId) return false;

    return user.progress.completedLessonIds.includes(lessonId);
  }

  get isLastLesson(): boolean {
    if (!this.courseData || !this.lessonData) return false;
    const allLessons = this.courseData.chapters.flatMap((c) => c.lessons);
    if (!allLessons.length) return false;
    return allLessons[allLessons.length - 1].id === this.lessonData.id;
  }

  get suggestedCourses() {
    return this.lessonService.allCourses()
      .filter(c => c.id !== this.courseData?.id)
      .slice(0, 3);
  }

  getStripedDescription(html: string) {
    return this.stripHtml(html);
  }

  private setupObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver(
      (entries) => {
        const triggerDiv = entries[0];

        if (
          triggerDiv.isIntersecting &&
          !this.isAlreadyCompleted &&
          !this.isCompleted &&
          this.lessonData?.id &&
          this.authService.isAuthenticated()
        ) {
          this.finishLecture(this.lessonData.id);
        }
      },
      { threshold: 0.1 },
    );

    setTimeout(() => {
      if (this.bottomTrigger) {
        this.observer?.observe(this.bottomTrigger.nativeElement);
      }
    }, 100);
  }

  private finishLecture(lessonId: string) {
    this.isCompleted = true;

    this.userService.completeLecture(lessonId).subscribe({
      next: (response) => {
        if (response.leveled_up) {
          this.toastService.show('You levelled up!', 'level-up');
        }

        this.observer?.disconnect();
      },
    });
  }

  /** convenience getter used in tests/template */
  get isLoggedIn() {
    return this.authService.isAuthenticated();
  }

  /**
   * Functions for Progress Bar, (Completed Chapters / Total Chapters) * 100 )
   */
  get chapterCount() {
    return this.courseData?.chapters.length ?? 0;
  }

  get progressPercent() {
    const course = this.courseData;
    const userProfile = this.userService.currentUser();

    if (!course || !userProfile) return 0;

    const allLessonIds = course.chapters.flatMap((chapter) =>
      chapter.lessons.map((lesson) => lesson.id),
    );

    const totalLessons = allLessonIds.length;
    if (totalLessons === 0) return 0;

    const completedCount = allLessonIds.filter((id) =>
      userProfile.progress.completedLessonIds.includes(id),
    ).length;

    return Math.round((completedCount / totalLessons) * 100);
  }

  /**
   * Functions for Meta Data, Course Overview
   */
  get chapters() {
    return this.courseData?.chapters.slice().sort((a, b) => a.order - b.order) ?? [];
  }

  get estimatedTime() {
    const mins = this.chapterCount * 10;
    return `${mins} min`;
  }

  get difficulty() {
    const c = this.chapterCount;
    if (c < 10) return 'Beginner';
    if (c < 20) return 'Intermediate';
    return 'Advanced';
  }

  get prerequisites() {
    return this.courseData?.prerequisites ?? ['none']; // TODO
  }

  @HostListener('window:beforeunload')
  onBeforeUnload() {
    this.stopSpeaking();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.stopSpeaking();
  }

  /**
   * Functions for Read Aloud
   */
  availableVoices = signal<SpeechSynthesisVoice[]>([]);
  selectedVoiceURI = signal<string>('');
  playbackRates: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  playbackRate = signal<number>(1.0);
  activeBlockIndex = signal<number>(-1);
  isSettingsOpen = signal(false);

  toggleSettings() {
    this.isSettingsOpen.update((v) => !v);
  }

  loadVoices() {
    this.availableVoices.set(window.speechSynthesis.getVoices());
    if (this.availableVoices().length > 0 && !this.selectedVoiceURI()) {
      const defaultVoice =
        this.availableVoices().find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
        this.availableVoices().find((v) => v.lang.startsWith('en')) ||
        this.availableVoices()[0];
      this.selectedVoiceURI.set(defaultVoice.voiceURI);
    }
  }

  onVoiceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedVoiceURI.set(target.value);
    if (this.isSpeaking() && !this.isPaused()) {
      this.readFromBlock(this.activeBlockIndex() !== -1 ? this.activeBlockIndex() : 0);
    }
  }

  onRateChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.playbackRate.set(parseFloat(target.value));
    if (this.isSpeaking() && !this.isPaused()) {
      this.readFromBlock(this.activeBlockIndex() !== -1 ? this.activeBlockIndex() : 0);
    }
  }

  toggleReadAloud() {
    if (this.isSpeaking() && !this.isPaused()) {
      this.pauseSpeaking();
    } else if (this.isPaused()) {
      this.resumeSpeaking();
    } else {
      this.readFromBlock(0);
    }
  }

  readFromBlock(startIndex: number) {
    if (!this.lessonData?.contentBlocks) return;
    this.stopSpeaking();
    this.isSpeaking.set(true);
    this.isPaused.set(false);
    this.playBlockRecursive(startIndex);
  }

  private playBlockRecursive(index: number) {
    if (!this.lessonData?.contentBlocks || index >= this.lessonData.contentBlocks.length) {
      this.finishReading();
      return;
    }

    const block = this.lessonData.contentBlocks[index];
    if (block.type !== 'text' || !block.content) {
      // Skip non-text blocks
      this.playBlockRecursive(index + 1);
      return;
    }

    const textContent = this.stripHtml(block.content).trim();
    if (!textContent) {
      this.playBlockRecursive(index + 1);
      return;
    }

    this.activeBlockIndex.set(index);
    this.cdr.detectChanges();
    
    this.speechSynthesis = window.speechSynthesis;

    this.currentUtterance = new SpeechSynthesisUtterance(textContent);
    this.currentUtterance.lang = 'en-US';
    this.currentUtterance.rate = this.playbackRate();

    if (this.selectedVoiceURI()) {
      const voice = this.availableVoices().find((v) => v.voiceURI === this.selectedVoiceURI());
      if (voice) {
        this.currentUtterance.voice = voice;
      }
    }

    this.currentUtterance.onend = () => {
      this.ngZone.run(() => {
        // Only proceed if we are still marked as speaking and this is the active block
        if (this.isSpeaking() && this.activeBlockIndex() === index) {
          this.playBlockRecursive(index + 1);
        }
      });
    };

    this.currentUtterance.onerror = (e) => {
      this.ngZone.run(() => {
        console.error('SpeechSynthesis error:', e);
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          this.finishReading();
        }
      });
    };

    this.speechSynthesis.speak(this.currentUtterance);
  }

  private finishReading() {
    this.isSpeaking.set(false);
    this.isPaused.set(false);
    this.activeBlockIndex.set(-1);
    this.currentUtterance = null;
    this.cdr.detectChanges();
  }

  private pauseSpeaking() {
    if (this.speechSynthesis) {
      this.speechSynthesis.pause();
      this.isPaused.set(true);
      this.cdr.detectChanges();
    }
  }

  private resumeSpeaking() {
    if (this.speechSynthesis) {
      this.speechSynthesis.resume();
      this.isPaused.set(false);
      this.cdr.detectChanges();
    }
  }

  stopSpeaking() {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.speechSynthesis = null;
    }
    this.finishReading();
  }

  private stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Functions for Navigation
   */
  onNext() {
    this.nextLesson.emit();
  }
  onPrev() {
    this.prevLesson.emit();
  }
  onFinish() {
    this.router.navigate(['/profile']);
  }
}
