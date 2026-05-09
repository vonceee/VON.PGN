import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-eval-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="eval-bar-container"
      [class.horizontal]="mode() === 'horizontal'"
      [class.vertical]="mode() === 'vertical'"
      [class.reverse]="orientation() === 'black'"
    >
      <!-- Evaluation Bar -->
      <div class="eval-bar-track bg-white">
        <!-- Black bar (the overlay) -->
        <div
          class="eval-bar-fill bg-neutral-800 transition-all duration-700 ease-out"
          [style.height]="mode() === 'vertical' ? (100 - fillPercentage()) + '%' : '100%'"
          [style.width]="mode() === 'horizontal' ? (100 - fillPercentage()) + '%' : '100%'"
        ></div>

        <!-- Ticks -->
        <div class="eval-bar-ticks">
          @for (tick of ticks; track $index) {
            <div
              class="eval-bar-tick"
              [class.zero]="tick === 50"
              [style.bottom.%]="mode() === 'vertical' ? tick : 'auto'"
              [style.left.%]="mode() === 'horizontal' ? tick : 'auto'"
            ></div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: fit-content;
    }

    .eval-bar-container {
      position: relative;
      overflow: hidden;
      border-radius: 2px;
      border: 1px solid var(--border-base, #333);
      background: #fff;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      box-sizing: border-box;
    }

    .eval-bar-container.vertical {
      height: 99.8%;
      width: 16px;
    }

    .eval-bar-container.horizontal {
      height: 12px;
      width: 100%;
    }

    /* Reverse logic: if orientation is black, white is on top/right */
    .eval-bar-container.vertical.reverse .eval-bar-track {
      transform: scaleY(-1);
    }
    .eval-bar-container.horizontal.reverse .eval-bar-track {
      transform: scaleX(-1);
    }

    .eval-bar-track {
      position: relative;
      height: 100%;
      width: 100%;
      display: flex;
    }

    .eval-bar-container.vertical .eval-bar-track {
      flex-direction: column;
    }

    .eval-bar-fill {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }

    .eval-bar-ticks {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .eval-bar-tick {
      position: absolute;
      background: rgba(0, 0, 0, 0.15);
    }

    .eval-bar-container.vertical .eval-bar-tick {
      width: 100%;
      height: 1px;
    }

    .eval-bar-container.horizontal .eval-bar-tick {
      height: 100%;
      width: 1px;
    }

    .eval-bar-tick.zero {
      background: rgba(0, 0, 0, 0.4);
      height: 2px;
      z-index: 10;
    }
  `]
})
export class EvalBarComponent {
  eval = input<string | null>(null);
  orientation = input<'white' | 'black'>('white');
  mode = input<'vertical' | 'horizontal'>('vertical');

  // Lila ticks: every 12.5% (8 segments)
  readonly ticks = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];

  private readonly MULTIPLIER = -0.00368208;

  /**
   * Calculates "winning chances" based on Lila's formula.
   * Maps -1 (black winning) to 1 (white winning).
   */
  winningChances = computed(() => {
    const e = this.eval();
    if (!e) return 0; // Equal

    let cp = 0;
    if (e.startsWith('#')) {
      // Mate handling
      const mate = parseInt(e.substring(1), 10);
      if (isNaN(mate)) return 0;
      // Lila's mate to cp conversion: (21 - min(10, abs(mate))) * 100
      cp = (21 - Math.min(10, Math.abs(mate))) * 100;
      if (mate < 0) cp = -cp;
    } else {
      cp = parseFloat(e) * 100;
    }

    // rawWinningChances formula: 2 / (1 + exp(MULTIPLIER * cp)) - 1
    // Note: Stockfish eval is from POV of side to move usually, 
    // but in our app engineEval is already absolute or handled?
    // Looking at StudyComponent, it seems it's absolute (+ for white, - for black)
    return 2 / (1 + Math.exp(this.MULTIPLIER * cp)) - 1;
  });

  /**
   * Maps winning chances (-1..1) to percentage (0..100)
   * 1 (white winning) -> 100%
   * -1 (black winning) -> 0%
   */
  fillPercentage = computed(() => {
    return (this.winningChances() + 1) * 50;
  });

  isWhiteWinning = computed(() => {
    return this.winningChances() >= 0;
  });
}
