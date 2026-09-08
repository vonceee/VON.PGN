import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PracticeMistake } from '../../models/opening-drill.model';

/**
 * Summary view presented upon completion of an opening drill run.
 * 
 * WHY: Modularizes post-drill statistics, mistake breakdown diagnostics,
 *      and drill restarting/continuation workflows into an OnPush component.
 */
@Component({
  selector: 'app-drill-summary',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './drill-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block lg:my-auto',
  },
})
export class DrillSummaryComponent {
  studyId = input<string | number | undefined>();
  studyName = input<string | undefined>();
  accuracy = input.required<number>();
  correctCount = input.required<number>();
  mistakes = input.required<PracticeMistake[]>();

  restart = output<void>();
  backToSelection = output<void>();
}
