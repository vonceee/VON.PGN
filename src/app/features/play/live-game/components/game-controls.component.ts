import { Component, input, output, signal, computed } from '@angular/core';
import { GameState } from '../../../../core/models/game.model';
import { ButtonComponent } from '@shared/ui';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroXMark,
  heroFlag,
  heroHandRaised,
  heroCheck,
  heroArrowPath,
  heroPlus,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-game-controls',
  standalone: true,
  imports: [ButtonComponent, NgIcon],
  providers: [
    provideIcons({
      heroXMark,
      heroFlag,
      heroHandRaised,
      heroCheck,
      heroArrowPath,
      heroPlus,
    }),
  ],
  template: `
    <div class="p-4 flex flex-col items-center w-full">
      @if (game()?.status === 'active') {
        <div class="flex items-center justify-center gap-2 w-full">
          @if (canAbort()) {
            <button appButton variant="ghost" (click)="abort.emit()" title="Abort">
              <ng-icon name="heroXMark" class="text-xl"></ng-icon>
            </button>
          } @else {
            <div class="flex items-center justify-center gap-2">
              @if (drawOfferFromOpponent()) {
                <div class="flex items-center gap-1   ">
                  <button
                    appButton
                    variant="primary"
                    (click)="acceptDraw.emit()"
                    title="Accept Draw"
                  >
                    <ng-icon name="heroCheck" class="text-lg"></ng-icon>
                  </button>
                  <button
                    appButton
                    variant="outline"
                    (click)="declineDraw.emit()"
                    title="Decline Draw"
                  >
                    <ng-icon name="heroXMark" class="text-lg"></ng-icon>
                  </button>
                </div>
              } @else if (iOfferedDraw()) {
                <div class="flex items-center gap-1   ">
                  <button
                    appButton
                    variant="primary"
                    [disabled]="true"
                    title="Draw Offered"
                    class="opacity-50 pointer-events-none"
                  >
                    <ng-icon name="heroHandRaised" class="text-xl"></ng-icon>
                  </button>
                  <button
                    appButton
                    variant="ghost"
                    (click)="cancelDraw.emit()"
                    title="Cancel draw offer"
                  >
                    <ng-icon name="heroXMark" class="text-lg"></ng-icon>
                  </button>
                </div>
              } @else {
                @if (canOfferDraw()) {
                  <button
                    appButton
                    variant="ghost"
                    (click)="offerDraw.emit()"
                    title="Offer Draw"
                  >
                    <ng-icon name="heroHandRaised" class="text-xl"></ng-icon>
                  </button>
                }

                @if (!showResignConfirm()) {
                  <button
                    appButton
                    variant="ghost"
                    (click)="showResignConfirm.set(true)"
                    title="Resign"
                  >
                    <ng-icon name="heroFlag" class="text-xl"></ng-icon>
                  </button>
                } @else {
                  <div class="flex items-center gap-1   ">
                    <button
                      appButton
                      variant="danger"
                      (click)="resign.emit(); showResignConfirm.set(false)"
                      title="Confirm Resign"
                    >
                      <ng-icon name="heroFlag" class="text-lg"></ng-icon>
                    </button>
                    <button
                      appButton
                      variant="ghost"
                      (click)="showResignConfirm.set(false)"
                      title="Cancel"
                    >
                      <ng-icon name="heroXMark" class="text-lg"></ng-icon>
                    </button>
                  </div>
                }
              }
            </div>
          }
        </div>
      } @else if (game()?.status === 'completed' || game()?.status === 'aborted') {
        <!-- Rematch Section -->
        <div class="w-full flex justify-center gap-1.5">
          @if (!game()?.arena_id) {
            @if (!myRematchOffered() && !rematchOfferFrom()) {
              <button appButton variant="ghost" (click)="offerRematch.emit()">
                <ng-icon name="heroArrowPath" class="text-lg mr-2"></ng-icon>
                Rematch
              </button>
            } @else if (myRematchOffered()) {
              <div
                class="flex-1 text-xs uppercase   text-center py-2  bg-slate-400/5 rounded border border-border-theme"
              >
                Waiting...
              </div>
            } @else if (rematchOfferFrom()) {
              <div class="flex gap-1">
                <button
                  appButton
                  variant="primary"
                  (click)="acceptRematch.emit()"
                  title="Accept"
                >
                  <ng-icon name="heroCheck" class="text-lg"></ng-icon>
                </button>
                <button
                  appButton
                  variant="outline"
                  (click)="declineRematch.emit()"
                  title="Decline"
                >
                  <ng-icon name="heroXMark" class="text-lg"></ng-icon>
                </button>
              </div>
            }

            <button
              appButton
              variant="ghost"
              (click)="newOpponent.emit()"
              title="New opponent"
            >
              <ng-icon name="heroPlus" class="text-lg mr-2"></ng-icon>
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
  cancelDraw = output();
  offerRematch = output();
  acceptRematch = output();
  declineRematch = output();
  newOpponent = output();

  showResignConfirm = signal(false);

  canAbort = computed(() => {
    const g = this.game();
    if (!g || g.status !== 'active') return false;
    const movesCount = g.moves.length;
    return g.my_color === 'white' ? movesCount === 0 : movesCount <= 1;
  });
}

