import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CoachService } from '../../coaches/services/coach.service';
import { Coach } from '../../coaches/models/coach.model';

import { ToastService } from '../../../core/services/toast.service';


@Component({
  selector: 'app-coach-management',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [],
  template: `
    <div class="coach-management space-y-8">
      <!-- Header Actions -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-semibold  ">Coach Profiles</h1>
          <p class=" mt-1 ">Manage and curate public coach profiles on the platform.</p>
        </div>
        <a routerLink="/admin/coach/new" class="px-6 py-3 rounded bg-content text-white font-semibold hover:bg-content">
          <span>Add New Coach</span>
        </a>
      </div>

      <!-- Filters & Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white rounded border border-border-base p-6 flex flex-col justify-between">
          <span class="text-xs font-semibold  ">Total Coaches</span>
          <div class="flex items-end justify-between mt-2">
            <span class="text-3xl font-semibold ">{{ coaches().length }}</span>
            <span class="text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-1 rounded">+1 this month</span>
          </div>
        </div>
        <div class="bg-white rounded border border-border-base p-6 flex flex-col justify-between">
          <span class="text-xs font-semibold  ">Academy Instructors</span>
          <div class="flex items-end justify-between mt-2">
            <span class="text-3xl font-semibold ">{{ academyInstructorsCount() }}</span>
            <span class="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-1 rounded">Top Tier</span>
          </div>
        </div>
        <div class="md:col-span-2 bg-white rounded border border-border-base p-2 flex items-center">
          <div class="flex-1 flex items-center px-4">
            <input 
              type="text" 
              placeholder="Search coaches by name, title, or location..." 
              (input)="searchTerm.set($any($event.target).value)"
              class="w-full bg-transparent border-none outline-none px-4 py-3  placeholder:"
            >
          </div>
        </div>
      </div>

      <!-- Coaches List -->
      <div class="bg-white rounded border border-border-base overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-border-base">
                <th class="px-6 py-4 text-xs font-semibold  ">Coach</th>
                <th class="px-6 py-4 text-xs font-semibold   text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (coach of filteredCoaches(); track coach.id) {
                <tr class="/50  group">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      @if (coach.title) {
                        <span class="px-1.5 py-0.5 bg-red-600 text-white text-xs font-semibold rounded shrink-0">
                          {{ coach.title }}
                        </span>
                      }
                      <span class="font-semibold ">{{ coach.name }}</span>
                      @if (coach.isAcademyInstructor) {
                        <span class="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">ACADEMY</span>
                      }
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-4">
                      <a [routerLink]="['/admin/coach', coach.id]" class="text-xs font-semibold text-blue-600 hover:text-blue-700  ">
                        Edit
                      </a>
                      <button (click)="deleteCoach(coach)" class="text-xs font-semibold text-rose-600 hover:underline  ">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: []

})
export class CoachManagementComponent {
  private coachService = inject(CoachService);
  private toastService = inject(ToastService);


  coaches = this.coachService.coaches;
  searchTerm = signal('');

  filteredCoaches = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.coaches();

    return this.coaches().filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      c.location.toLowerCase().includes(term)
    );
  });

  academyInstructorsCount = computed(() =>
    this.coaches().filter(c => c.isAcademyInstructor).length
  );

  deleteCoach(coach: Coach) {
    if (confirm(`Are you sure you want to delete ${coach.name}'s profile?`)) {
      this.coachService.deleteCoach(coach.id).subscribe({
        next: () => {
          this.toastService.show('Coach profile deleted successfully');
          // The signal will update if the service handles it, but since we use toSignal from a GET request,
          // we might need to manually trigger a refresh or use a more reactive pattern.
          // For now, let's assume the user will refresh or the service has a refresh mechanism.
          // Actually, let's just reload for simplicity in this demo.
          window.location.reload();
        },
        error: (err) => {
          this.toastService.show('Failed to delete coach', 'error');

          console.error(err);
        }
      });
    }
  }
}
