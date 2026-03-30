import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-chapter-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './chapter-editor.html',
  styleUrls: ['../course-editor/course-editor.css'] // reuse course-editor styles
})
export class ChapterEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public location = inject(Location);

  courseId = signal<number | null>(null);
  chapterId = signal<number | null>(null);
  chapter = signal<any>(null);
  loading = signal(false);
  saving = signal(false);

  chapterForm = this.fb.group({
    title: ['', Validators.required],
    order: [1, [Validators.required, Validators.min(1)]]
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const pCourseId = params.get('courseId');
      if (pCourseId) this.courseId.set(Number(pCourseId));
      
      const cId = params.get('chapterId');
      if (cId && cId !== 'new') {
        this.chapterId.set(+cId);
        this.loadChapter();
      }
    });
  }

  loadChapter() {
    const chId = this.chapterId();
    if (!chId) return;
    this.loading.set(true);
    this.adminService.getChapter(chId).subscribe({
      next: (chapter) => {
        this.chapter.set(chapter);
        this.chapterForm.patchValue({
          title: chapter.title,
          order: chapter.order
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load chapter', err);
        this.loading.set(false);
      }
    });
  }

  saveChapter() {
    if (this.chapterForm.invalid) return;
    this.saving.set(true);
    const data = { ...this.chapterForm.value, course_id: this.courseId() };

    const chId = this.chapterId();
    if (chId) {
      this.adminService.updateChapter(chId, data).subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('Chapter updated successfully', 'success');
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.adminService.createChapter(data).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.router.navigate(['/admin/course', this.courseId(), 'chapter', res.id]);
        },
        error: () => this.saving.set(false)
      });
    }
  }

  deleteLessonTarget = signal<number | null>(null);

  requestDeleteLesson(id: number) {
    this.deleteLessonTarget.set(id);
  }

  cancelDeleteLesson() {
    this.deleteLessonTarget.set(null);
  }

  confirmDeleteLesson() {
    const id = this.deleteLessonTarget();
    if (!id) return;
    this.adminService.deleteLesson(id).subscribe({
      next: () => {
        this.toastService.show('Lesson deleted successfully', 'success');
        this.deleteLessonTarget.set(null);
        this.loadChapter();
      },
      error: (err) => {
        this.toastService.show('Failed to delete: ' + (err.error?.message || err.message), 'error');
        this.deleteLessonTarget.set(null);
      }
    });
  }
}
