import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FideService, FideFederation } from '../../../core/services/fide';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroFlag, heroUsers, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-federation-list',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIcon, FormsModule],
  providers: [provideIcons({ heroFlag, heroUsers, heroMagnifyingGlass })],
  templateUrl: './federation-list.html',
  styleUrls: ['./federation-list.css']
})
export class FederationListComponent implements OnInit {
  private fideService = inject(FideService);
  
  allFederations = signal<FideFederation[]>([]);
  filteredFederations = signal<FideFederation[]>([]);
  searchQuery = signal('');

  ngOnInit() {
    this.fideService.getFederations().subscribe(feds => {
      this.allFederations.set(feds);
      this.filteredFederations.set(feds);
    });
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    const filtered = this.allFederations().filter(f => 
      f.name.toLowerCase().includes(query.toLowerCase()) || 
      f.code.toLowerCase().includes(query.toLowerCase())
    );
    this.filteredFederations.set(filtered);
  }

  getFlagUrl(alpha2: string): string {
    if (!alpha2) return 'assets/images/flags/fide.png';
    return `https://flagcdn.com/w80/${alpha2.toLowerCase()}.png`;
  }
}
