import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  OnDestroy,
  AfterViewInit,
  PLATFORM_ID,
  NgZone,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { BughouseGameStateService } from '../../services/bughouse-game-state.service';
import { BughouseBoardComponent } from '../bughouse-board/bughouse-board.component';
import { BughouseSidebarComponent } from '../bughouse-sidebar/bughouse-sidebar.component';

/**
 * Controller Component for the active Bughouse match gameplay screen.
 * 
 * WHY: Separating the playing board view from the lobby and match-found views
 *      isolates board resize calculations, DOM height synchronization, and chessboards
 *      into a modular, clean component.
 */
@Component({
  selector: 'app-bughouse-play',
  standalone: true,
  imports: [
    CommonModule,
    BughouseBoardComponent,
    BughouseSidebarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-play.component.html',
  styleUrls: ['./bughouse-play.component.css'],
})
export class BughousePlayComponent implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  gameStateService = inject(BughouseGameStateService);

  @ViewChild('boardAComponent', { read: ElementRef }) boardAElement?: ElementRef<HTMLElement>;
  @ViewChild('boardBComponent', { read: ElementRef }) boardBElement?: ElementRef<HTMLElement>;

  private boardResizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.gameStateService.myBoard();
      if (isPlatformBrowser(this.platformId)) {
        requestAnimationFrame(() => {
          this.updateSidebarHeight();
        });
      }
    });
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.setupBoardResizeObserver();
    this.updateSidebarHeight();
  }

  private setupBoardResizeObserver() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.boardResizeObserver?.disconnect();

    this.ngZone.runOutsideAngular(() => {
      this.boardResizeObserver = new ResizeObserver(() => {
        this.updateSidebarHeight();
      });

      if (this.boardAElement?.nativeElement) {
        this.boardResizeObserver.observe(this.boardAElement.nativeElement);
      }
      if (this.boardBElement?.nativeElement) {
        this.boardResizeObserver.observe(this.boardBElement.nativeElement);
      }
    });
  }

  private updateSidebarHeight() {
    if (!isPlatformBrowser(this.platformId)) return;

    const myBoardId = this.gameStateService.myBoard();
    let targetElement: HTMLElement | null = null;

    if (myBoardId === 'A' && this.boardAElement?.nativeElement) {
      targetElement = this.boardAElement.nativeElement;
    } else if (myBoardId === 'B' && this.boardBElement?.nativeElement) {
      targetElement = this.boardBElement.nativeElement;
    } else if (this.boardAElement?.nativeElement && this.boardBElement?.nativeElement) {
      const hA = this.boardAElement.nativeElement.clientHeight;
      const hB = this.boardBElement.nativeElement.clientHeight;
      targetElement = hA >= hB ? this.boardAElement.nativeElement : this.boardBElement.nativeElement;
    } else if (this.boardAElement?.nativeElement) {
      targetElement = this.boardAElement.nativeElement;
    }

    if (targetElement) {
      const height = targetElement.clientHeight;
      if (height > 0) {
        document.documentElement.style.setProperty('--bughouse-board-height', `${height}px`);
      }
    }
  }

  ngOnDestroy() {
    if (this.boardResizeObserver) {
      this.boardResizeObserver.disconnect();
      this.boardResizeObserver = null;
    }
  }
}
