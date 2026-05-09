import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { UserHovercardDirective } from '@shared/directives';

@Component({
  selector: 'app-viewers-dialog',
  standalone: true,
  imports: [CommonModule, DialogWrapperComponent, ButtonComponent, UserHovercardDirective],
  template: `
    <div class="block max-w-sm w-[90vw] mx-auto">
      <app-dialog-wrapper title="Study Viewers" (close)="dialogRef.close()">
        <div class="space-y-4">
          <div class="max-h-[300px] overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
            @for (viewer of data.viewers; track viewer) {
              <div class="w-full flex items-center p-2.5 px-4 rounded-xl hover:bg-surface  group">
                <div class="flex flex-col">
                  <span 
                    class="text-sm font-bold text-content group-hover:text-accent transition-colors cursor-pointer"
                    [appUserHovercard]="viewer"
                  >{{ viewer }}</span>
                </div>
              </div>
            } @empty {
              <div class="flex flex-col items-center justify-center py-12 text-muted">
                <span class="text-sm italic tracking-wide">No active viewers found</span>
              </div>
            }
          </div>
        </div>

        <div actions class="flex justify-end items-center w-full">
          <button appButton variant="ghost" (click)="dialogRef.close()">Close</button>
        </div>
      </app-dialog-wrapper>
    </div>
  `,
  styles: [`
    :host ::ng-deep .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    :host ::ng-deep .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    :host ::ng-deep .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 10px;
    }
    :host ::ng-deep .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: var(--accent);
    }
  `]
})
export class ViewersDialogComponent {
  dialogRef = inject(DialogRef);
  data = inject<{ viewers: string[], count: number }>(DIALOG_DATA);
}

