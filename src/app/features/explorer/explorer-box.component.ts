import { Component, OnInit, signal, inject, input, computed, effect, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OpeningExplorerService } from '../../core/services/opening-explorer.service';
import { AuthService } from '../../core/services/auth.service';
import { LichessExplorerResponse, TablebaseResponse, LichessExplorerMove, TablebaseMove, ExplorerData } from '../../core/models/opening.model';
import { WinRateBarComponent, ButtonComponent } from '@shared/ui';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-explorer-box',
  standalone: true,
  imports: [
    CommonModule, 
    WinRateBarComponent, 
    MatIconModule, 
    MatTooltipModule, 
    MatButtonModule, 
    MatMenuModule,
    ButtonComponent
  ],
  templateUrl: './explorer-box.component.html',
  host: {
    'class': 'block z-50 relative transition-all duration-300 ease-in-out w-full'
  }
})
export class ExplorerBoxComponent {
  @HostBinding('class.collapsed') get collapsed() { return this.isCollapsed(); }

  fen = input.required<string>();
  variant = input<string>('standard');
  orientation = input<'white' | 'black'>('white');
  
  explorerService = inject(OpeningExplorerService);
  authService = inject(AuthService);
  
  dbType = signal<'masters' | 'lichess' | 'player'>('lichess');
  isLoading = signal(false);
  isCollapsed = signal(true);
  error = signal<string | null>(null);
  data = signal<ExplorerData | null>(null);
  
  isTablebase = computed(() => {
    const fenStr = this.fen();
    if (!fenStr) return false;
    const pieces = fenStr.split(' ')[0].replace(/[^a-zA-Z]/g, '');
    return pieces.length <= 7;
  });

  constructor() {
    effect(() => {
      if (this.authService.isInitialized()) {
        this.fetchData();
      }
    });
  }

  toggleCollapse() {
    this.isCollapsed.set(!this.isCollapsed());
    if (!this.isCollapsed()) {
      this.fetchData();
    }
  }

  fetchData() {
    if (this.isCollapsed()) return; // Don't fetch if hidden

    const currentFen = this.fen();
    
    if (!currentFen) return;
    
    this.isLoading.set(true);
    this.error.set(null);

    if (this.isTablebase()) {
      this.explorerService.getTablebase(currentFen).subscribe({
        next: (res) => {
          this.data.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set('Tablebase unreachable');
          this.isLoading.set(false);
        }
      });
    } else {
      this.explorerService.getExploration(currentFen, this.dbType()).subscribe({
        next: (res) => {
          this.data.set(res);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set('Explorer unreachable');
          this.isLoading.set(false);
        }
      });
    }
  }

  setDb(db: 'masters' | 'lichess' | 'player') {
    this.dbType.set(db);
    this.fetchData();
  }

  get openingData() {
    const d = this.data();
    return d && 'isOpening' in d ? d as LichessExplorerResponse : null;
  }

  get tablebaseData() {
    const d = this.data();
    return d && 'isTablebase' in d ? d as TablebaseResponse : null;
  }

  formatTotal(total: number): string {
    if (total >= 1000000) return (total / 1000000).toFixed(1) + 'M';
    if (total >= 1000) return (total / 1000).toFixed(1) + 'K';
    return total.toString();
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'win': return 'text-emerald-500';
      case 'loss': return 'text-rose-500';
      case 'draw': return 'text-zinc-400';
      default: return 'text-zinc-400';
    }
  }
}
