import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-lesson-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lesson-editor.html'
})
export class LessonEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public location = inject(Location);

  chapterId = signal<number | null>(null);
  lessonId = signal<number | null>(null);
  lesson = signal<any>(null);
  loading = signal(false);
  saving = signal(false);

  lessonForm = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    order: [1, [Validators.required, Validators.min(1)]],
    content_blocks: this.fb.array([])
  });

  get contentBlocks() {
    return this.lessonForm.get('content_blocks') as FormArray;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const pChapId = params.get('chapterId');
      if (pChapId) this.chapterId.set(Number(pChapId));
      
      const lId = params.get('lessonId');
      if (lId && lId !== 'new') {
        this.lessonId.set(+lId);
        this.loadLesson();
      }
    });
  }

  loadLesson() {
    const lId = this.lessonId();
    if (!lId) return;
    this.loading.set(true);
    this.adminService.getLesson(lId).subscribe({
      next: (lesson) => {
        this.lesson.set(lesson);
        this.lessonForm.patchValue({
          title: lesson.title,
          slug: lesson.slug,
          order: lesson.order
        });

        if (lesson.content_blocks) {
          lesson.content_blocks.forEach((block: any) => {
            if (block.type === 'text') {
              this.contentBlocks.push(this.createTextBlock(block.content));
            } else if (block.type === 'board') {
              this.contentBlocks.push(this.createBoardBlock(block.task?.lichessUrl, block.task?.instructions));
            }
          });
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load lesson', err);
        this.loading.set(false);
      }
    });
  }

  createTextBlock(content: string = '') {
    return this.fb.group({
      type: ['text'],
      content: [content, Validators.required]
    });
  }

  createBoardBlock(lichessUrl: string = '', instructions: string = '') {
    return this.fb.group({
      type: ['board'],
      task: this.fb.group({
        lichessUrl: [lichessUrl, Validators.required],
        instructions: [instructions, Validators.required]
      })
    });
  }

  addTextBlock() {
    this.contentBlocks.push(this.createTextBlock());
  }

  addBoardBlock() {
    this.contentBlocks.push(this.createBoardBlock());
  }

  removeBlock(index: number) {
    this.contentBlocks.removeAt(index);
  }

  moveBlock(index: number, direction: number) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.contentBlocks.length) return;
    
    const block = this.contentBlocks.at(index);
    this.contentBlocks.removeAt(index);
    this.contentBlocks.insert(targetIndex, block);
  }

  saveLesson() {
    if (this.lessonForm.invalid) return;
    this.saving.set(true);
    const data = { ...this.lessonForm.value, chapter_id: this.chapterId() };

    const lId = this.lessonId();
    if (lId) {
      this.adminService.updateLesson(lId, data).subscribe({
        next: () => {
          this.saving.set(false);
          this.toastService.show('Lesson updated successfully', 'success');
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.adminService.createLesson(data).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.router.navigate(['/admin/chapter', this.chapterId(), 'lesson', res.id]);
        },
        error: () => this.saving.set(false)
      });
    }
  }
}
