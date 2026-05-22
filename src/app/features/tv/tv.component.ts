import { Component, inject, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TvService, CanvasGame } from '../../core/services/tv.service';
import { ChessBoardComponent, ChessClockComponent } from '@shared/chess';
import { GameInfoComponent } from '../play/live-game/components/game-info.component';
import { Config } from 'chessground/config';

export interface CanvasItem {
  game?: CanvasGame;
  x: number;
  y: number;
}

@Component({
  selector: 'app-tv',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ChessBoardComponent,
    ChessClockComponent,
    GameInfoComponent,
  ],
  templateUrl: './tv.component.html',
  styleUrls: ['./tv.component.css'],
})
export class TvComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('viewport') viewportRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasPlane') canvasPlaneRef!: ElementRef<HTMLDivElement>;

  tvService = inject(TvService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  ongoingGames = this.tvService.ongoingGames;

  // Infinite Canvas State
  panX = signal(0);
  panY = signal(0);
  gridPanX = signal(0);
  gridPanY = signal(0);
  isDragging = signal(false);

  private startX = 0;
  private startY = 0;
  private startPanX = 0;
  private startPanY = 0;
  private itemMap = new Map<string, { x: number, y: number }>();
  private dragThresholdExceeded = false;

  canvasItems = computed(() => {
    const activeGames = this.ongoingGames() || [];
    const items: CanvasItem[] = [];
    
    const activeCols = 6;
    const xGap = 600;
    const yGap = 700;
    const offsetX = 240; 
    const offsetY = 300;

    // Map active games to their fixed grid coordinates
    const activeMap = new Map<string, CanvasGame>();
    activeGames.forEach((game, index) => {
      const r = Math.floor(index / activeCols);
      const c = index % activeCols;
      activeMap.set(`${c},${r}`, game);
    });

    // Calculate visible grid based on gridPan (throttled) instead of visual pan
    const pX = this.gridPanX();
    const pY = this.gridPanY();
    
    // Tighter buffer window (1400x900) drastically reduces total loaded boards
    const minCol = Math.floor((-pX - 1400 + offsetX) / xGap);
    const maxCol = Math.ceil((-pX + 1400 + offsetX) / xGap);
    
    const minRow = Math.floor((-pY - 900 + offsetY) / yGap);
    const maxRow = Math.ceil((-pY + 900 + offsetY) / yGap);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const key = `${c},${r}`;
        const activeGame = activeMap.get(key);
        
        let gameToRender: CanvasGame;
        if (activeGame) {
          gameToRender = activeGame;
        } else {
          gameToRender = {
            gameId: `dummy-${c}-${r}`,
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            turn: 'white'
          } as CanvasGame;
        }

        items.push({
          game: gameToRender,
          x: c * xGap - offsetX,
          y: r * yGap - offsetY
        });
      }
    }
    
    return items;
  });

  private boundPointerDown = this.onPointerDown.bind(this);
  private boundPointerMove = this.onPointerMove.bind(this);
  private boundPointerUp = this.onPointerUp.bind(this);

  ngOnInit() {
    this.tvService.startPollingGames();
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      const viewport = this.viewportRef.nativeElement;
      viewport.addEventListener('pointerdown', this.boundPointerDown);
      window.addEventListener('pointermove', this.boundPointerMove);
      window.addEventListener('pointerup', this.boundPointerUp);
      window.addEventListener('pointercancel', this.boundPointerUp);
    });
    // Set initial transform
    if (this.canvasPlaneRef) {
      this.canvasPlaneRef.nativeElement.style.transform = `translate(0px, 0px)`;
    }
  }

  ngOnDestroy() {
    this.tvService.stopPollingGames();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this.boundPointerMove);
      window.removeEventListener('pointerup', this.boundPointerUp);
      window.removeEventListener('pointercancel', this.boundPointerUp);
    }
  }

  onPointerDown(event: PointerEvent) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    this.ngZone.run(() => this.isDragging.set(true));
    this.dragThresholdExceeded = false;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startPanX = this.panX();
    this.startPanY = this.panY();
    
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent) {
    if (!this.isDragging()) return;
    
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      this.dragThresholdExceeded = true;
    }
    
    const newPanX = this.startPanX + dx;
    const newPanY = this.startPanY + dy;
    
    // Update raw signal values without triggering immediate CD
    this.panX.set(newPanX);
    this.panY.set(newPanY);
    
    // Direct DOM update outside Angular zone
    if (this.canvasPlaneRef) {
      this.canvasPlaneRef.nativeElement.style.transform = `translate(${newPanX}px, ${newPanY}px)`;
    }

    // Only recalculate the grid items every 200 pixels
    if (Math.abs(newPanX - this.gridPanX()) > 200 || Math.abs(newPanY - this.gridPanY()) > 200) {
      this.ngZone.run(() => {
        this.gridPanX.set(newPanX);
        this.gridPanY.set(newPanY);
      });
    }
  }

  onPointerUp(event: PointerEvent) {
    this.ngZone.run(() => this.isDragging.set(false));
    const target = event.currentTarget as HTMLElement;
    target.releasePointerCapture(event.pointerId);
  }



  goToGame(gameId: string) {
    // If user was dragging, don't trigger click navigation
    if (this.dragThresholdExceeded) return;
    this.router.navigate(['/play', gameId]);
  }

  resetPan() {
    this.ngZone.run(() => {
      this.panX.set(0);
      this.panY.set(0);
      this.gridPanX.set(0);
      this.gridPanY.set(0);
      if (this.canvasPlaneRef) {
        this.canvasPlaneRef.nativeElement.style.transform = `translate(0px, 0px)`;
      }
    });
  }

  getCgConfig(game: CanvasGame | undefined): Config {
    return {
      turnColor: game?.turn === 'black' ? 'black' : 'white',
      viewOnly: true,
      movable: { color: undefined, dests: new Map() },
      coordinates: false,
    };
  }

  formatTime(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getGamePlayer(playerData: { name?: string; rating?: number } | undefined): any {
    if (!playerData) {
      return { id: 0, name: 'Anonymous', rating: 1500 };
    }
    return {
      id: 0,
      name: playerData.name || 'Anonymous',
      rating: playerData.rating || 1500
    };
  }
}
