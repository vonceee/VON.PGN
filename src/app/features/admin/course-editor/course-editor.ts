import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-course-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './course-editor.html',
  styleUrls: ['./course-editor.css']
})
export class CourseEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public location = inject(Location);

  courseId = signal<number | null>(null);
  course = signal<any>(null);
  loading = signal(false);
  saving = signal(false);

  courseForm = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    description: ['']
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('courseId');
      if (id) {
        this.courseId.set(+id);
        this.loadCourse();
      }
    });
  }

  loadCourse() {
    const cid = this.courseId();
    if (!cid) return;
    this.loading.set(true);
    this.adminService.getCourse(cid).subscribe({
      next: (course) => {
        this.course.set(course);
        this.courseForm.patchValue({
          title: course.title,
          slug: course.slug,
          description: course.description
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load course', err);
        this.loading.set(false);
      }
    });
  }

  saveCourse() {
    if (this.courseForm.invalid) return;
    this.saving.set(true);
    const data = this.courseForm.value;

    const cid = this.courseId();
    if (cid) {
      this.adminService.updateCourse(cid, data).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toastService.show('Course updated successfully', 'success');
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.adminService.createCourse(data).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.router.navigate(['/admin/course', res.id]);
        },
        error: () => this.saving.set(false)
      });
    }
  }

  deleteChapterTarget = signal<number | null>(null);

  requestDeleteChapter(id: number) {
    this.deleteChapterTarget.set(id);
  }

  cancelDeleteChapter() {
    this.deleteChapterTarget.set(null);
  }

  confirmDeleteChapter() {
    const id = this.deleteChapterTarget();
    if (!id) return;
    this.adminService.deleteChapter(id).subscribe({
      next: () => {
        this.toastService.show('Chapter deleted successfully', 'success');
        this.deleteChapterTarget.set(null);
        this.loadCourse();
      },
      error: (err) => {
        this.toastService.show('Failed to delete: ' + (err.error?.message || err.message), 'error');
        this.deleteChapterTarget.set(null);
      }
    });
  }
}
