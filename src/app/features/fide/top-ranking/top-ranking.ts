import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FideService, FidePlayer } from '../../../core/services/fide';
import { provideIcons } from '@ng-icons/core';
import { heroTrophy, heroUserGroup, heroGlobeAlt } from '@ng-icons/heroicons/outline';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-top-ranking',
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [provideIcons({ heroTrophy, heroUserGroup, heroGlobeAlt })],
  templateUrl: './top-ranking.html',
  styleUrls: ['./top-ranking.css']
})
export class TopRankingComponent implements OnInit {
  private fideService = inject(FideService);
  
  players = signal<FidePlayer[]>([]);
  isLoading = signal(true);
  activeType = signal<'standard' | 'rapid' | 'blitz'>('standard');
  
  // Search & Pagination
  searchQuery = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  isSearching = signal(false);

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.currentPage.set(1);
      this.loadData();
    });

    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    
    if (this.searchQuery()) {
      this.fideService.getPlayers({
        search: this.searchQuery(),
        page: this.currentPage()
      }).subscribe({
        next: (res) => {
          this.players.set(res.data);
          this.totalPages.set(res.last_page);
          this.isLoading.set(false);
          this.isSearching.set(true);
        },
        error: () => this.isLoading.set(false)
      });
    } else {
      this.fideService.getRanking(this.activeType()).subscribe({
        next: (data) => {
          this.players.set(data);
          this.totalPages.set(1);
          this.isLoading.set(false);
          this.isSearching.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  onSearch(query: string) {
    this.searchSubject.next(query);
  }

  setPage(page: number) {
    this.currentPage.set(page);
    this.loadData();
  }

  switchType(type: 'standard' | 'rapid' | 'blitz') {
    this.activeType.set(type);
    if (!this.searchQuery()) {
      this.loadData();
    }
  }

  getFlagUrl(alpha2?: string): string {
    if (!alpha2) return 'assets/images/flags/fide.png';
    return `https://flagcdn.com/w40/${alpha2.toLowerCase()}.png`;
  }

  getPlayerImage(fideId: number): string {
    const images: any = {
      1503014: 'https://www.chess.com/bundles/web/images/user-experience/magnus-carlsen.png',
      2016192: 'https://www.chess.com/bundles/web/images/user-experience/hikaru-nakamura.png',
      4166610: 'https://www.chess.com/bundles/web/images/user-experience/ding-liren.png',
    };
    return images[fideId] || 'https://www.chess.com/bundles/web/images/user-experience/default-avatar.svg';
  }

  handleImageError(event: any) {
    const target = event.target as HTMLImageElement;
    if (!target.src.includes('default-avatar.svg')) {
      target.src = 'https://www.chess.com/bundles/web/images/user-experience/default-avatar.svg';
    }
  }
}
