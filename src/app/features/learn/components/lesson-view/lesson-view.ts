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
  inject,
} from '@angular/core';
import { Course, LessonDetail } from '../../../../core/models/course.model';
import { InteractiveBoardComponent } from '../interactive-board/interactive-board.component';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-lesson-view',
  standalone: true,
  imports: [InteractiveBoardComponent],
  templateUrl: './lesson-view.html',
  styleUrl: './lesson-view.css',
})
export class LessonView implements AfterViewInit, OnDestroy, OnChanges {
  userService = inject(UserService);
  @Input() courseData: Course | null = null;
  @Input() lessonData: LessonDetail | null = null;
  @Output() startCourse = new EventEmitter<string>();
  @Output() nextLesson = new EventEmitter<string>();
  @Output() prevLesson = new EventEmitter<string>();
  @Output() backToCourse = new EventEmitter<void>();

  @ViewChild('bottomTrigger') bottomTrigger!: ElementRef;

  private observer: IntersectionObserver | null = null;
  isCompleted = false;

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

  private setupObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver(
      (entries) => {
        const triggerDiv = entries[0];

        if (
          triggerDiv.isIntersecting &&
          !this.isCompleted &&
          this.lessonData?.id &&
          this.userService.currentUser()
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
      next: () => {
        this.observer?.disconnect();
      },
    });
  }

  // metadata helpers for course overview
  get chapterCount() {
    return this.courseData?.chapters.length ?? 0;
  }

  get estimatedTime() {
    // 10 units per chapter (minutes)
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
    return this.courseData?.prerequisites ?? ['None'];
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
