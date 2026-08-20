import { Component } from '@angular/core';
import { FloatingCursorContainerDirective, FloatingCursorTriggerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

@Component({
  selector: 'app-ui-cursor',
  standalone: true,
  imports: [
    FloatingCursorContainerDirective,
    FloatingCursorTriggerDirective,
    FloatingCursorComponent
  ],
  templateUrl: './ui-cursor.component.html',
})
export class UiCursorComponent {}
