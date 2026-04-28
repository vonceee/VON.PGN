import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CoachService } from '../../coaches/services/coach.service';
import { Coach } from '../../coaches/models/coach.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { 
  heroPlus, 
  heroPencilSquare, 
  heroTrash, 
  heroMagnifyingGlass,
  heroCheckBadge,
  heroMapPin,
  heroAcademicCap
} from '@ng-icons/heroicons/outline';
import { ToastService } from '../../../core/services/toast.service';


@Component({
  selector: 'app-coach-management',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  providers: [
    provideIcons({ 
      heroPlus, 
      heroPencilSquare, 
      heroTrash, 
      heroMagnifyingGlass,
      heroCheckBadge,
      heroMapPin,
      heroAcademicCap
    })
  ],
  template: `
    <div class="coach-management space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <!-- Header Actions -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Coach Profiles</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and curate public coach profiles on the platform.</p>
        </div>
        <a routerLink="/admin/coach/new" class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
          <ng-icon name="heroPlus" class="text-lg"></ng-icon>
          <span>Add New Coach</span>
        </a>
      </div>

      <!-- Filters & Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Coaches</span>
          <div class="flex items-end justify-between mt-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ coaches().length }}</span>
            <span class="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">+1 this month</span>
          </div>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Academy Instructors</span>
          <div class="flex items-end justify-between mt-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ academyInstructorsCount() }}</span>
            <span class="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">Top Tier</span>
          </div>
        </div>
        <div class="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-2 flex items-center">
          <div class="flex-1 flex items-center px-4">
            <ng-icon name="heroMagnifyingGlass" class="text-slate-400 text-xl"></ng-icon>
            <input 
              type="text" 
              placeholder="Search coaches by name, title, or location..." 
              (input)="searchTerm.set($any($event.target).value)"
              class="w-full bg-transparent border-none outline-none px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400"
            >
          </div>
        </div>
      </div>

      <!-- Coaches List -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 dark:border-slate-800">
                <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Coach</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-900">
              @for (coach of filteredCoaches(); track coach.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      @if (coach.title) {
                        <span class="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase shrink-0">
                          {{ coach.title }}
                        </span>
                      }
                      <span class="font-bold text-slate-900 dark:text-white">{{ coach.name }}</span>
                      @if (coach.isAcademyInstructor) {
                        <ng-icon name="heroCheckBadge" class="text-blue-500" title="Academy Instructor"></ng-icon>
                      }
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-4">
                      <a [routerLink]="['/admin/coach', coach.id]" class="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors uppercase tracking-widest">
                        Edit
                      </a>
                      <button (click)="deleteCoach(coach)" class="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors uppercase tracking-widest">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="2" class="px-6 py-20 text-center">

                    <div class="flex flex-col items-center">
                      <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                        <ng-icon name="heroMagnifyingGlass" class="text-3xl"></ng-icon>
                      </div>
                      <h3 class="text-lg font-bold text-slate-900 dark:text-white">No coaches found</h3>
                      <p class="text-slate-500 text-sm">Try adjusting your search or add a new coach profile.</p>
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
