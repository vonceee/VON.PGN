import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StudyService } from '../../../core/services/study.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-study-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto p-4 md:p-8">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Chess Studies</h1>
          <p class="text-gray-400">
            Collaborate, analyze, and learn with interactive shared boards.
          </p>
        </div>
        <button
          (click)="createNewStudy()"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          Create New Study
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (study of studies(); track study.id) {
          <div
            [routerLink]="['/study', study.id]"
            class="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/[0.08] hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col h-full"
          >
            <div class="flex justify-between items-start mb-4">
              <h2 class="text-xl font-bold group-hover:text-blue-400 transition-colors">
                {{ study.name }}
              </h2>
              <span
                class="text-[10px] px-2 py-0.5 rounded bg-white/10 opacity-60 text-white uppercase"
                >{{ study.visibility }}</span
              >
            </div>
            <p class="text-gray-400 text-sm line-clamp-3 mb-6 flex-1">
              {{ study.description || 'No description provided.' }}
            </p>
            <div class="flex items-center justify-between pt-4 border-t border-white/5">
              <div class="flex items-center gap-2">
                <div
                  class="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400"
                >
                  {{ study.owner.name.substring(0, 1).toUpperCase() }}
                </div>
                <span class="text-xs text-gray-500">{{ study.owner.name }}</span>
              </div>
              <span class="text-xs text-gray-600">{{ study.chapters_count }} Chapters</span>
            </div>
          </div>
        } @empty {
          <div
            class="col-span-full py-20 text-center bg-white/5 border border-white/10 border-dashed rounded-xl"
          >
            <p class="text-gray-500">No studies found. Start by creating one!</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class StudyListComponent implements OnInit {
  private studyService = inject(StudyService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  studies = signal<any[]>([]);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.studyService.getStudies().subscribe((res) => {
        this.studies.set(res.data);
      });
    }
  }

  createNewStudy() {
    const name = prompt('Study name:');
    if (name) {
      this.studyService.createStudy(name).subscribe((res) => {
        this.router.navigate(['/study', res.data.id]);
      });
    }
  }
}
