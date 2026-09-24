import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect
} from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Study, StudyChapter } from '../../../models/study.model';

@Component({
  selector: 'app-study-chapters-list',
  standalone: true,
  imports: [DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chapters-list.component.html'
})
export class ChaptersListComponent {

  // Inputs
  study = input.required<Study | null>();
  currentChapter = input.required<StudyChapter | null>();
  canEdit = input.required<boolean>();

  // Outputs
  chapterSelected = output<StudyChapter>();
  chapterEditClicked = output<{ event: MouseEvent; chapter: StudyChapter }>();
  orderChanged = output<{ previousIndex: number; currentIndex: number }>();

  // Pagination Constants & State
  readonly PAGE_SIZE = 64;
  readonly Math = Math;

  currentPage = signal(1);
  private lastSeenChapterId: number | null = null;

  // Computed Chapter Collections
  allChapters = computed(() => this.study()?.chapters || []);
  totalChapters = computed(() => this.allChapters().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalChapters() / this.PAGE_SIZE)));

  pageOffset = computed(() => (this.currentPage() - 1) * this.PAGE_SIZE);

  paginatedChapters = computed(() => {
    const start = this.pageOffset();
    return this.allChapters().slice(start, start + this.PAGE_SIZE);
  });

  pageOptions = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  activeChapterIndex = computed(() => {
    const cur = this.currentChapter();
    if (!cur) return -1;
    return this.allChapters().findIndex(c => c.id === cur.id);
  });

  activeChapterPage = computed(() => {
    const idx = this.activeChapterIndex();
    return idx !== -1 ? Math.floor(idx / this.PAGE_SIZE) + 1 : null;
  });

  isCurrentChapterOnActivePage = computed(() => {
    const activePage = this.activeChapterPage();
    return activePage !== null && activePage === this.currentPage();
  });

  constructor() {
    effect(() => {
      const cur = this.currentChapter();
      const currentId = cur ? Number(cur.id) : null;
      if (currentId !== null && currentId !== this.lastSeenChapterId) {
        this.lastSeenChapterId = currentId;
        const idx = this.allChapters().findIndex(c => Number(c.id) === currentId);
        if (idx !== -1) {
          const targetPage = Math.floor(idx / this.PAGE_SIZE) + 1;
          if (targetPage !== this.currentPage()) {
            this.currentPage.set(targetPage);
          }
        }
      }
    });

    effect(() => {
      const maxPages = this.totalPages();
      if (this.currentPage() > maxPages) {
        this.currentPage.set(maxPages);
      }
    });
  }

  selectChapter(chap: StudyChapter) {
    this.chapterSelected.emit(chap);
  }

  onEditChapter(event: MouseEvent, chap: StudyChapter) {
    this.chapterEditClicked.emit({ event, chapter: chap });
  }

  onDrop(event: CdkDragDrop<StudyChapter[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const offset = this.pageOffset();
    this.orderChanged.emit({
      previousIndex: offset + event.previousIndex,
      currentIndex: offset + event.currentIndex
    });
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  onPageSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const page = parseInt(select.value, 10);
    if (!isNaN(page)) {
      this.goToPage(page);
    }
  }

  goToPage(page: number) {
    const target = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(target);
  }

  jumpToActiveChapter() {
    const targetPage = this.activeChapterPage();
    if (targetPage) {
      this.goToPage(targetPage);
    }
  }
}
