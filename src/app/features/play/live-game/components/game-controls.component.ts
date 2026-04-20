import { Component, input, output, signal } from '@angular/core';
import { GameState } from '../../../../core/models/game.model';
import { ButtonComponent  } from '@shared/ui';

@Component({
  selector: 'app-game-controls',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <div class="p-2 border-t border-border-theme flex flex-col items-center w-full">
      @if (game()?.status === 'active') {
        <div class="flex items-center justify-center gap-1 w-full">
          @if (game()!.moves.length < 2) {
            <button
              appButton
              variant="ghost"
              size="sm"
              (click)="abort.emit()"
              title="Abort"
              class="w-full"
            >
              <svg
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          } @else {
            <div class="flex gap-1 w-full">
              @if (drawOfferFromOpponent()) {
                <div
                  class="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <span
                    class="text-[10px] uppercase font-black tracking-wider text-cyan-400 opacity-80 whitespace-nowrap"
                    >Draw Offered</span
                  >
                  <div class="flex gap-1">
                    <button
                      appButton
                      variant="primary"
                      size="sm"
                      (click)="acceptDraw.emit()"
                      title="Accept Draw"
                    >
                      <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </button>
                    <button
                      appButton
                      variant="outline"
                      size="sm"
                      (click)="declineDraw.emit()"
                      title="Decline Draw"
                    >
                      <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              } @else if (iOfferedDraw()) {
                <div
                  class="flex-1 text-[10px] uppercase font-black text-slate-500 text-center py-2 animate-pulse bg-slate-400/5 rounded border border-border-theme"
                >
                  Draw Offered
                </div>
              } @else {
                @if (canOfferDraw()) {
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    (click)="offerDraw.emit()"
                    title="Offer Draw"
                  >
                    1/2
                  </button>
                }

                @if (!showResignConfirm()) {
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    (click)="showResignConfirm.set(true)"
                    title="Resign"
                    class="flex-1"
                  >
                    <svg
                      class="w-4 h-4 text-red-500/70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                      <line x1="4" y1="22" x2="4" y2="15"></line>
                    </svg>
                  </button>
                } @else {
                  <div
                    class="flex-1 flex gap-1 animate-in fade-in slide-in-from-right-2 duration-200"
                  >
                    <button
                      appButton
                      variant="danger"
                      size="sm"
                      (click)="resign.emit(); showResignConfirm.set(false)"
                      title="Confirm Resign"
                    >
                      <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </button>
                    <button
                      appButton
                      variant="outline"
                      size="sm"
                      (click)="showResignConfirm.set(false)"
                      title="Cancel"
                    >
                      <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                }
              }
            </div>
          }
        </div>
      } @else if (game()?.status === 'completed' || game()?.status === 'aborted') {
        <!-- Rematch Section -->
        <div class="w-full flex gap-1.5">
          @if (!game()?.arena_id) {
            @if (!myRematchOffered() && !rematchOfferFrom()) {
              <button appButton variant="ghost" size="md" (click)="offerRematch.emit()">Rematch</button>
            } @else if (myRematchOffered()) {
              <div
                class="text-[10px] uppercase font-black text-slate-500 text-center py-2 animate-pulse bg-slate-400/5 rounded border border-border-theme"
              >
                Waiting...
              </div>
            } @else if (rematchOfferFrom()) {
              <div class="flex-1 flex gap-1">
                <button
                  appButton
                  variant="primary"
                  size="md"
                  (click)="acceptRematch.emit()"
                  class="flex-1"
                  title="Accept"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
                <button
                  appButton
                  variant="outline"
                  size="md"
                  (click)="declineRematch.emit()"
                  title="Decline"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            }

            <button appButton variant="ghost" size="md" (click)="newOpponent.emit()" title="New opponent">
              New Game
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class GameControlsComponent {
  game = input<GameState | null>(null);
  canOfferDraw = input<boolean>(false);
  drawOfferFromOpponent = input<boolean>(false);
  iOfferedDraw = input<boolean>(false);
  myRematchOffered = input<boolean>(false);
  rematchOfferFrom = input<string | null>(null);

  abort = output();
  offerDraw = output();
  acceptDraw = output();
  declineDraw = output();
  resign = output();
  offerRematch = output();
  acceptRematch = output();
  declineRematch = output();
  newOpponent = output();

  showResignConfirm = signal(false);
}

