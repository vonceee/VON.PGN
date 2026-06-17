import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, PLATFORM_ID, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { StudyService } from '../../../core/services/study.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { Study } from '../../../core/models/study.model';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-opening-drills',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonComponent],
  templateUrl: './opening-drills.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full w-full' }
})
export class OpeningDrillsComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private studyService = inject(StudyService);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;
  private platformId = inject(PLATFORM_ID);

  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;

  isLoading = signal(false);
  activeTab = signal<'my' | 'public'>('my');
  isDropdownOpen = signal(false);

  // Selection list
  openingRepertoires = signal<Study[]>([]);
  searchQuery = signal('');

  filteredRepertoires = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.openingRepertoires();
    if (!q) return list;
    return list.filter(s => s.name.toLowerCase().includes(q));
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchRepertoires();
    }
  }

  fetchRepertoires() {
    this.isLoading.set(true);
    const isMy = this.activeTab() === 'my';
    this.studyService.getStudies(isMy, 'opening_repertoire').subscribe({
      next: (res) => {
        const studiesList = res.data || [];
        const filtered = studiesList.filter((s: Study) => s.category === 'opening_repertoire');
        this.openingRepertoires.set(filtered);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch studies list:', err);
        this.toastService.show('Failed to load repertoires.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: 'my' | 'public') {
    this.activeTab.set(tab);
    this.isDropdownOpen.set(false);
    this.fetchRepertoires();
  }

  selectRepertoire(study: Study) {
    this.router.navigate(['/study/drills/solve', study.id]);
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (
      this.isDropdownOpen() &&
      this.dropdownContainer &&
      !this.dropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isDropdownOpen.set(false);
    }
  }
}
