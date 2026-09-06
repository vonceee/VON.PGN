import { Component, ChangeDetectionStrategy, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BughouseBoardComponent } from '../bughouse-board/bughouse-board.component';
import { BughouseTvService } from '../../services/bughouse-tv.service';
import { BughouseTvState, PieceType } from '../../../../core/models/bughouse.model';

/**
 * Bughouse Broadcast / TV Component.
 *
 * WHY: Modularizes the live spectator view of active matches or idle demo boards.
 *      Maintains consistent dual-board layout with player labels, clocks, and pockets
 *      across both active and empty states to prevent layout shifts.
 */
@Component({
  selector: 'app-bughouse-broadcast',
  standalone: true,
  imports: [CommonModule, BughouseBoardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-broadcast.component.html',
})
export class BughouseBroadcastComponent {
  tvService = inject(BughouseTvService);
  tvStateInput = input<BughouseTvState | null | undefined>(undefined);

  readonly initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  readonly emptyPocket: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

  state = computed(() => {
    const override = this.tvStateInput();
    return override !== undefined ? override : this.tvService.tvState();
  });
}
