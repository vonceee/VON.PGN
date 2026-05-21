import { Component, inject, OnInit, OnDestroy, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { GameService } from '../../../core/services/game.service';
import { GameSeek, TIME_CONTROLS, TimeControlOption } from '../../../core/models/game.model';
import { PresenceService } from '../../../core/services/presence.service';
import { LayoutService } from '../../../core/services/layout.service';
import { ComputerSetupModalComponent } from '../computer/computer-setup-modal.component';
import { CustomTimeControlModalComponent } from './custom-time-control-modal.component';
import { ButtonComponent } from '@shared/ui';
import { TopMatchesComponent } from './components/top-matches.component';

@Component({
  selector: 'app-matchmaking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    TopMatchesComponent,
  ],
  templateUrl: './matchmaking.component.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
    `,
  ],
})
export class MatchmakingComponent implements OnInit, OnDestroy {
  gameService = inject(GameService);
  presenceService = inject(PresenceService);
  layoutService = inject(LayoutService);
  private router = inject(Router);
  private dialog = inject(Dialog);

  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef<HTMLDivElement>;
  isDropdownOpen = signal(false);

  timeControls = TIME_CONTROLS;
  selectedTimeControlValue = signal('180+0'); // Default to 3+0 Blitz

  isServiceMaintenance = () => this.gameService.isServiceMaintenance();

  ngOnInit(): void {
    this.gameService.checkActiveGame();
    this.presenceService.subscribeToSiteStats();
    this.layoutService.setFluid(true);
  }

  ngOnDestroy(): void {
    this.presenceService.unsubscribeFromSiteStats();
    this.layoutService.setFluid(false);
  }

  activeGameId = () => {
    const g = this.gameService.myActiveGame();
    return g && g.status === 'active' ? g.id : null;
  };

  rejoinGame(): void {
    const gameId = this.activeGameId();
    if (gameId) {
      this.router.navigate(['/play', gameId]);
    }
  }

  startPlay(): void {
    const tcValue = this.selectedTimeControlValue();
    this.gameService.seekGame(tcValue);
  }

  cancelSearch(): void {
    this.gameService.cancelSeek();
  }

  getSelectedTimeControlLabel(): string {
    const selected = this.timeControls.find(tc => tc.value === this.selectedTimeControlValue());
    return selected ? selected.label : this.selectedTimeControlValue();
  }

  getCategoryLabel(tc: TimeControlOption): string {
    return tc.category.charAt(0).toUpperCase() + tc.category.slice(1);
  }

  openCustomTimeControl(): void {
    const dialogRef = this.dialog.open(CustomTimeControlModalComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/5'],
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        const value = `${result.minutes * 60}+${result.increment}`;
        this.gameService.seekGame(value);
      }
    });
  }

  playWithComputer(): void {
    const dialogRef = this.dialog.open(ComputerSetupModalComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/5'],
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        const queryParams: any = {
          level: result.level,
          color: result.color,
        };

        if (result.useCustom) {
          queryParams.time = `${result.customMinutes * 60}+${result.customIncrement}`;
        } else if (result.timeControl) {
          queryParams.time = result.timeControl.value;
        }

        this.router.navigate(['/play-computer'], { queryParams });
      }
    });
  }

  onSeekClicked(seek: GameSeek): void {
    this.gameService.joinSeek(seek.id);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (
      this.isDropdownOpen() &&
      this.dropdownContainer &&
      !this.dropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isDropdownOpen.set(false);
    }
  }
}

