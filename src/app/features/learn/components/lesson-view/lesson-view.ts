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
} from '@angular/core';
import { Course, LessonDetail } from '../../../../core/models/course.model';
import { InteractiveBoardComponent } from '../interactive-board/interactive-board.component';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-lesson-view',
  standalone: true,
  imports: [InteractiveBoardComponent],
  templateUrl: './lesson-view.html',
  styleUrl: './lesson-view.css',
})
export class LessonView implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  userService = inject(UserService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  @Input() courseData: Course | null = null;
  @Input() lessonData: LessonDetail | null = null;
  @Output() startCourse = new EventEmitter<string>();
  @Output() nextLesson = new EventEmitter<string>();
  @Output() prevLesson = new EventEmitter<string>();
  @Output() backToCourse = new EventEmitter<void>();

  @ViewChild('bottomTrigger') bottomTrigger!: ElementRef;

  private observer: IntersectionObserver | null = null;
  isCompleted = false;

  ngOnInit() {
    // ensure profile data is loaded if we're authenticated; this prevents UI flash and
    // allows other computed getters to function later.
    if (this.authService.isAuthenticated() && !this.userService.currentUser()) {
      this.userService.loadMyProfile().subscribe();
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
        // the backend returns a `leveled_up` flag so we can give instant
        // feedback; the service already pushes the new profile into the
        // signal so the level/value itself will update automatically.
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
      chapter.lessons.map((lesson) => lesson.id)
    );

    const totalLessons = allLessonIds.length;
    if (totalLessons === 0) return 0;

    const completedCount = allLessonIds.filter((id) =>
      userProfile.progress.completedLessonIds.includes(id)
    ).length;

    return Math.round((completedCount / totalLessons) * 100);
  }

  /**
  * Functions for Meta Data, Course Overview
  */
  get chapters() {
    return this.courseData?.chapters
      .slice()
      .sort((a, b) => a.order - b.order) ?? [];
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

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  onNext() {
    this.nextLesson.emit();
  }
  onPrev() {
    this.prevLesson.emit();
  }
}
