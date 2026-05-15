import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FideService, PaginatedFidePlayers } from '../../../core/services/fide';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroMagnifyingGlass, heroChevronLeft, heroChevronRight, heroFunnel } from '@ng-icons/heroicons/outline';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIcon, FormsModule],
  providers: [provideIcons({ heroMagnifyingGlass, heroChevronLeft, heroChevronRight, heroFunnel })],
  templateUrl: './player-list.html',
  styleUrls: ['./player-list.css']
})
export class PlayerListComponent implements OnInit {
  private fideService = inject(FideService);
  private route = inject(ActivatedRoute);
  
  playersResponse = signal<PaginatedFidePlayers | null>(null);
  
  // Filters
  searchQuery = signal('');
  selectedFed = signal('');
  currentPage = signal(1);

  ngOnInit() {
    // Sync with query params
    this.route.queryParams.subscribe(params => {
      if (params['fed']) this.selectedFed.set(params['fed']);
      if (params['search']) this.searchQuery.set(params['search']);
      this.loadPlayers();
    });
  }

  loadPlayers() {
    this.fideService.getPlayers({
      search: this.searchQuery(),
      fed: this.selectedFed(),
      page: this.currentPage()
    }).subscribe(res => {
      this.playersResponse.set(res);
    });
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.loadPlayers();
  }

  setPage(page: number) {
    if (page < 1 || page > (this.playersResponse()?.last_page || 1)) return;
    this.currentPage.set(page);
    this.loadPlayers();
  }

  getFlagUrl(alpha2?: string): string {
    if (!alpha2) return 'assets/images/flags/fide.png';
    return `https://flagcdn.com/w40/${alpha2.toLowerCase()}.png`;
  }
}
