import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-tactics-skeleton',
  standalone: true,
  templateUrl: './tactics-skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-1 w-full lg:overflow-hidden flex flex-col min-h-0',
  },
})
export class TacticsSkeletonComponent {
  readonly rows = [0, 1, 2, 3, 4, 5, 6, 7];
  readonly cols = [0, 1, 2, 3, 4, 5, 6, 7];
}
