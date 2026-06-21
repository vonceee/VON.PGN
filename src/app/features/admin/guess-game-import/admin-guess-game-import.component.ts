import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GuessTheGameService } from '../../../core/services/guess-the-game.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-guess-game-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-[800px] mx-auto space-y-8 p-6">
      <header class="mb-8 flex flex-col justify-between gap-4">
        <div>
          <h1 class="text-3xl mb-2 text-content font-medium">Import Guess the Game</h1>
          <p class="text-muted text-base">Paste a standard PGN of a popular chess game.</p>
        </div>
      </header>

      <div class="bg-main border border-border-base rounded-2xl p-8 space-y-6 shadow-sm">

        <div class="space-y-2">
          <label class="block text-sm font-medium text-content">Chess PGN data</label>
          <textarea
            rows="12"
            [(ngModel)]="pgn"
            placeholder="[Event &quot;Wijk aan Zee&quot;]&#10;[Date &quot;1999.01.20&quot;]&#10;[White &quot;Kasparov, Garry&quot;]&#10;[Black &quot;Topalov, Veselin&quot;]&#10;[Result &quot;1-0&quot;]&#10;&#10;1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6..."
            class="w-full p-4 bg-subtle border border-border-base rounded-xl text-content outline-none font-mono text-sm transition-all focus:border-accent resize-y"
          ></textarea>
        </div>

        <div class="flex justify-end gap-4 pt-4">
          <button
            (click)="resetForm()"
            [disabled]="isSubmitting()"
            class="px-5 py-3 border border-border-base text-content hover:bg-subtle rounded-xl text-sm font-medium active:scale-95 transition-all"
          >
            Clear form
          </button>
          <button
            (click)="submitImport()"
            [disabled]="isSubmitting() || !pgn"
            class="px-6 py-3 bg-accent text-white hover:opacity-90 disabled:opacity-50 rounded-xl text-sm font-medium active:scale-95 transition-all flex items-center gap-2"
          >
            @if (isSubmitting()) {
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Importing...</span>
            } @else {
              <span>Import game challenge</span>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class AdminGuessGameImportComponent {
  private guessGameService = inject(GuessTheGameService);
  private toastService = inject(ToastService);

  pgn = '';
  isSubmitting = signal(false);

  resetForm() {
    this.pgn = '';
  }

  submitImport() {
    if (!this.pgn.trim()) return;

    this.isSubmitting.set(true);
    this.guessGameService.importChallenge(this.pgn, null).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.toastService.show('Successfully imported ' + res.data.white_player + ' vs ' + res.data.black_player, 'success');
        this.resetForm();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.message || err.error?.error || 'Failed to import PGN';
        this.toastService.show(msg, 'error');
      }
    });
  }
}
