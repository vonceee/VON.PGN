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
import { LessonDetail } from '../../../../core/models/course.model';
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
  private userService = inject(UserService);

  @Input() lessonData: LessonDetail | null = null;

  @Output() nextLesson = new EventEmitter<string>();
  @Output() prevLesson = new EventEmitter<string>();

  // 1. Grab the sentinel div from the bottom of the HTML
  @ViewChild('bottomTrigger') bottomTrigger!: ElementRef;

  private observer: IntersectionObserver | null = null;
  isCompleted = false;

  ngAfterViewInit() {
    this.setupObserver();
  }

  // 2. React to the user clicking "Next" or "Prev"
  ngOnChanges(changes: SimpleChanges) {
    // If the lessonData changes (and it's not the very first load)
    if (changes['lessonData'] && !changes['lessonData'].isFirstChange()) {
      this.isCompleted = false; // Reset the completion status
      this.setupObserver(); // Start watching the bottom of the new lesson!
    }
  }

  private setupObserver() {
    // Clean up any existing observer first
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        const triggerDiv = entries[0];

        // If the bottom div is visible, we haven't completed it yet, AND we have an ID
        if (triggerDiv.isIntersecting && !this.isCompleted && this.lessonData?.id) {
          this.finishLecture(this.lessonData.id);
        }
      },
      {
        threshold: 0.1,
      },
    );

    // Start watching the div!
    // Using setTimeout ensures the view is fully rendered before trying to observe it
    setTimeout(() => {
      if (this.bottomTrigger) {
        this.observer?.observe(this.bottomTrigger.nativeElement);
      }
    }, 100);
  }

  private finishLecture(lessonId: string) {
    this.isCompleted = true;

    // Call the Laravel Backend!
    this.userService.completeLecture(lessonId).subscribe({
      next: () => {
        console.log(`XP Awarded for lesson: ${lessonId}`);
        // Stop watching so we don't spam the API
        this.observer?.disconnect();
      },
    });
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
