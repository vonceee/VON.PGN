import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '@shared/ui';

@Component({
  selector: 'app-ui-badges',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  templateUrl: './ui-badges.component.html',
})
export class UiBadgesComponent {}
