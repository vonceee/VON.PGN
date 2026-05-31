import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-join-class-dialog',
  standalone: true,
  imports: [CommonModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <div class="block max-w-sm w-[90vw] mx-auto">
      <app-dialog-wrapper title="Join Class Session" (close)="dialogRef.close(false)">
        <div class="space-y-4">
          <p class="text-sm text-content/85 leading-relaxed">
            Your tutor has started a live classroom session. Join now to follow their board and participate in the lesson!
          </p>
        </div>

        <div actions class="flex justify-end items-center gap-3 w-full">
          <button appButton variant="ghost" (click)="dialogRef.close(false)">Explore Freely</button>
          <button appButton variant="primary" (click)="dialogRef.close(true)">Join Session</button>
        </div>
      </app-dialog-wrapper>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class JoinClassDialogComponent {
  dialogRef = inject(DialogRef<boolean>);
}
