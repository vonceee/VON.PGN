import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cookie-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cookie-policy.component.html',
})
export class CookiePolicyComponent {
  lastUpdated = 'March 31, 2026';
}
