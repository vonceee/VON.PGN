import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect
} from '@angular/core';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDragHandle,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCog6ToothSolid, heroArrowDownTraySolid, heroUsersSolid } from '@ng-icons/heroicons/solid';
import { Study, StudyChapter } from '../../../models/study.model';

@Component({
  selector: 'app-study-chapters-list',
  standalone: true,
  imports: [NgIconComponent, CdkDropList, CdkDrag, CdkDragHandle],
  providers: [provideIcons({ heroCog6ToothSolid, heroArrowDownTraySolid, heroUsersSolid })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chapters-list.component.html',
  styleUrl: './chapters-list.component.css'
})
export class ChaptersListComponent {

  // Inputs
  study = input.required<Study | null>();
  currentChapter = input.required<StudyChapter | null>();
  canEdit = input.required<boolean>();
  isExportAllowed = input<boolean>(true);

  // Outputs
  chapterSelected = output<StudyChapter>();
  chapterEditClicked = output<{ event: MouseEvent; chapter: StudyChapter }>();
  chaptersReordered = output<StudyChapter[]>();
  addChapterClicked = output<void>();
  exportClicked = output<void>();
  membersClicked = output<void>();
  settingsClicked = output<void>();

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

  pageOptions = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => {
      const page = i + 1;
      const start = i * this.PAGE_SIZE + 1;
      const end = page * this.PAGE_SIZE;
      return {
        page,
        label: `${start}-${end}`
      };
    })
  );

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
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const chapters = [...this.allChapters()];
    const fromIndex = this.pageOffset() + event.previousIndex;
    const toIndex = this.pageOffset() + event.currentIndex;

    moveItemInArray(chapters, fromIndex, toIndex);
    this.chaptersReordered.emit(chapters);
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
}
