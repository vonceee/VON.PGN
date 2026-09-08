import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Study, StudyChapter } from '../../../../../../core/models/study.model';
import { MistakeAlert } from '../../models/opening-drill.model';

/**
 * Sidebar diagnostics, status readouts, and control panel for active opening drills.
 * 
 * WHY: Decouples active drill metrics and controls from the main board orchestrator,
 *      maintaining an isolated OnPush rendering boundary.
 */
@Component({
  selector: 'app-drill-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './drill-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block lg:my-auto',
  },
})
export class DrillSidebarComponent {
  selectedStudy = input<Study | null>(null);
  currentChapter = input<StudyChapter | null>(null);
  accuracy = input.required<number>();
  currentPathIndex = input.required<number>();
  totalPaths = input.required<number>();
  currentChapterIndex = input.required<number>();
  totalChapters = input.required<number>();
  lastMistake = input<MistakeAlert | null>(null);
  isRetryMode = input<boolean>(false);

  pause = output<void>();
  cancelRetry = output<void>();

  chapterProgressPercent = computed(() => {
    const total = this.totalChapters();
    if (total === 0) return 0;
    return ((this.currentChapterIndex() + 1) / total) * 100;
  });
}
