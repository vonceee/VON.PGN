import { Component, OnInit, signal, inject, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/ui';
import { TacticsService, WoodpeckerSession } from '../../../../core/services/tactics.service';
import { WoodpeckerExplanationModalComponent } from '../explanation-modal/woodpecker-explanation-modal.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroInformationCircle } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-woodpecker-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonComponent,
    WoodpeckerExplanationModalComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({ heroInformationCircle })
  ],
  templateUrl: './woodpecker-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WoodpeckerDashboardComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private platformId = inject(PLATFORM_ID);

  sessions = signal<WoodpeckerSession[]>([]);
  isLoading = signal<boolean>(true);
  showExplanation = signal<boolean>(false);
  sessionToAbandon = signal<number | null>(null);
  sessionToDelete = signal<number | null>(null);

  toggleExplanation() {
    this.showExplanation.update(val => !val);
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSessions();
    }
  }

  loadSessions() {
    this.isLoading.set(true);
    this.tacticsService.getWoodpeckerSessions().subscribe({
      next: (res) => {
        this.sessions.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  abandonSession(id: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.sessionToAbandon.set(id);
  }

  cancelAbandon() {
    this.sessionToAbandon.set(null);
  }

  confirmAbandon(id: number) {
    this.tacticsService.abandonWoodpeckerSession(id).subscribe({
      next: () => {
        this.sessionToAbandon.set(null);
        this.loadSessions();
      },
      error: () => {
        this.sessionToAbandon.set(null);
      }
    });
  }

  deleteSession(id: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.sessionToDelete.set(id);
  }

  cancelDelete() {
    this.sessionToDelete.set(null);
  }

  confirmDelete(id: number) {
    this.tacticsService.deleteWoodpeckerSession(id).subscribe({
      next: () => {
        this.sessionToDelete.set(null);
        this.loadSessions();
      },
      error: () => {
        this.sessionToDelete.set(null);
      }
    });
  }

  getThemeDisplayName(theme: string | null): string {
    if (!theme || theme === 'mix') return 'Recommended Mix';
    // Format camelCase to Title Case
    return theme
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  }

  formatTime(seconds: number): string {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  getOverallAccuracy(session: WoodpeckerSession): number {
    const activeCycle = session.cycles?.find(c => c.cycle_number === session.current_cycle_number);
    if (!activeCycle || activeCycle.total_solved === 0) return 0;
    return Math.round((activeCycle.total_correct / activeCycle.total_solved) * 100);
  }

  getProgressPercentage(session: WoodpeckerSession): number {
    const activeCycle = session.cycles?.find(c => c.cycle_number === session.current_cycle_number);
    if (!activeCycle) return 0;
    return Math.round((activeCycle.current_puzzle_index / session.total_puzzles) * 100);
  }

  getCycleAccuracy(cycle: any): number {
    if (!cycle || cycle.total_solved === 0) return 0;
    return Math.round((cycle.total_correct / cycle.total_solved) * 100);
  }

  getMissingCycles(session: WoodpeckerSession): number[] {
    const cyclesCount = session.cycles?.length ?? 0;
    const missing: number[] = [];
    for (let i = cyclesCount + 1; i <= 4; i++) {
      missing.push(i);
    }
    return missing;
  }
}
