import { Component, model, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-toggle',
  standalone: true,
  template: `
    <label class="relative inline-flex items-center cursor-pointer select-none">
      <input 
        type="checkbox" 
        class="sr-only peer" 
        [checked]="checked()" 
        [disabled]="disabled()"
        (change)="onToggle($event)"
      >
      <div 
        class="relative w-11 h-6 bg-slate-50 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border-base after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-accent transition-colors duration-200 outline-none"
        [class.opacity-60]="disabled()"
        [class.cursor-not-allowed]="disabled()"
      ></div>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleComponent {
  checked = model<boolean>(false);
  disabled = input<boolean>(false);

  onToggle(event: Event) {
    if (this.disabled()) return;
    const checkbox = event.target as HTMLInputElement;
    this.checked.set(checkbox.checked);
  }
}
