import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { StudyService } from '../../../core/services/study.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { Study } from '../../../core/models/study.model';
import { ButtonComponent } from '@shared/ui';
import { ChessBoardComponent } from '@shared/chess';
import { buildTreeFromMoves } from '../../../core/utils/chess-tree.utils';
import type { Key } from 'chessground/types';

@Component({
  selector: 'app-opening-drills',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonComponent, ChessBoardComponent],
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

  isLoading = signal(false);
  activeTab = signal<'my' | 'public'>('my');

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
    this.studyService.getStudies(isMy, 'opening_repertoire', false, undefined, undefined, 'chapters').subscribe({
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

  getStudyFinalPosition(study: Study): { fen: string; lastMove: Key[] | null } {
    const chapters = study.chapters || [];
    if (chapters.length === 0) {
      return { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', lastMove: null };
    }
    const firstChapter = chapters[0];
    const rawMoves = firstChapter.moves || [];
    const initialFen = firstChapter.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const parsedTree = buildTreeFromMoves(rawMoves, initialFen);
    if (parsedTree.length === 0) {
      return { fen: initialFen, lastMove: null };
    }

    // Get the last node of the mainline
    const lastNode = parsedTree[parsedTree.length - 1];
    let lastMove: Key[] | null = null;
    if (lastNode.uci && lastNode.uci.length >= 4) {
      lastMove = [lastNode.uci.substring(0, 2) as Key, lastNode.uci.substring(2, 4) as Key];
    }

    return {
      fen: lastNode.fen,
      lastMove
    };
  }
}
