import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

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
          alert('Course updated successfully');
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

  deleteChapter(id: number) {
    if (confirm('Are you sure you want to delete this chapter?')) {
      this.adminService.deleteChapter(id).subscribe(() => {
        this.loadCourse();
      });
    }
  }
}
