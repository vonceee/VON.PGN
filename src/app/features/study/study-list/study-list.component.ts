import { Component, OnInit, inject, signal, PLATFORM_ID, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { CreateStudyDialogComponent } from '../dialogs/create-study-dialog/create-study-dialog.component';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui';
import { LoadingComponent } from '@shared/feedback';
import { effect } from '@angular/core';


@Component({
  selector: 'app-study-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonComponent, DialogModule, LoadingComponent],
  templateUrl: './study-list.component.html',
})
export class StudyListComponent implements OnInit {
  private studyService = inject(StudyService);
  public authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(Dialog);
  
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;
  
  studies = signal<any[]>([]);
  activeTab = signal<'all' | 'my'>('all');
  isLoggedIn = signal(false);
  isDropdownOpen = signal(false);
  isLoading = signal(false);

  constructor() {
    effect(() => {
      this.isLoggedIn.set(!!this.authService.currentUser());
      if (!this.isLoggedIn() && this.activeTab() === 'my') {
        this.activeTab.set('all');
      }
    });

    effect(() => {
      this.loadStudies();
    });
  }

  ngOnInit() {
    // Initial load is handled by effect
  }

  loadStudies() {
    if (isPlatformBrowser(this.platformId)) {
      this.isLoading.set(true);
      this.studyService.getStudies(this.activeTab() === 'my').subscribe({
        next: (res) => {
          this.studies.set(res.data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
    }
  }

  setTab(tab: 'all' | 'my') {
    this.activeTab.set(tab);
    this.isDropdownOpen.set(false);
  }

  createNewStudy() {
    const dialogRef = this.dialog.open<{ name: string; visibility: string }>(CreateStudyDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/5'],
    });

    dialogRef.closed.subscribe((result) => {
      if (result && result.name) {
        this.studyService.createStudy(result.name, result.visibility).subscribe((res) => {
          this.router.navigate(['/study', res.data.id]);
        });
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return this.formatDate(dateStr);
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

