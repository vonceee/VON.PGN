import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TvService } from '../../core/services/tv.service';
import { ChessBoardComponent } from '../../shared/components/chess-board/chess-board.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-tv',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessBoardComponent, FooterComponent],
  templateUrl: './tv.component.html',
  styles: []
})
export class TvComponent implements OnInit, OnDestroy {
  tvService = inject(TvService);
  router = inject(Router);

  ngOnInit() {
    this.tvService.joinTv();
  }

  ngOnDestroy() {
    this.tvService.leaveTv();
  }

  goToGame(gameId: string | undefined) {
    if (gameId) {
      this.router.navigate(['/play', gameId]);
    }
  }
}
