import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UiButtonsComponent } from './ui-components/ui-buttons.component';
import { UiBadgesComponent } from './ui-components/ui-badges.component';
import { UiTogglesComponent } from './ui-components/ui-toggles.component';
import { UiInputsComponent } from './ui-components/ui-inputs.component';

@Component({
  selector: 'app-docs-ui-components',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    UiButtonsComponent,
    UiBadgesComponent,
    UiTogglesComponent,
    UiInputsComponent,
  ],
  templateUrl: './ui-components.component.html',
})
export class UiComponentsComponent {}
