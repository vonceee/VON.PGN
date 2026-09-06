import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  ChangeDetectionStrategy,
  signal,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectItem<T = any> {
  label: string;
  value?: T;
  disabled?: boolean;
  action?: () => void;
}

export type DropdownItem<T = any> = SelectItem<T>;

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  host: {
    class: 'block relative',
    '[class.z-50]': 'isOpen()',
    '[class.z-0]': '!isOpen()',
  },
  template: `
    <div class="relative w-full text-left" [class.z-50]="isOpen()" [class]="containerClass()" #containerRef>
      <!-- Overlapping Label -->
      @if (label()) {
        <label
          class="absolute -top-2 left-3 z-10 inline-block bg-white px-1.5 text-xs font-medium transition-colors duration-150 pointer-events-none select-none"
          [class.text-slate-600]="!isOpen() && !error() && !disabled()"
          [class.text-blue-600]="isOpen() && !error() && !disabled()"
          [class.text-red-600]="error() && !disabled()"
          [class.text-slate-400]="disabled()"
          [class]="labelClass()">
          {{ label() }}
          @if (required()) {
            <span class="text-red-500 ml-0.5">*</span>
          }
        </label>
      }

      <button
        type="button"
        [disabled]="disabled()"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="menu"
        class="inline-flex w-full items-center justify-between gap-x-2 rounded-xl bg-white px-3.5 py-2.5 text-sm/6 font-medium text-gray-900 border border-slate-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600/30 cursor-pointer shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        [class.border-blue-600]="isOpen() && !error()"
        [class.ring-2]="isOpen() && !error()"
        [class.ring-blue-600/30]="isOpen() && !error()"
        [class.border-red-500]="error()"
        [class]="buttonClass()">
        <span class="truncate">{{ displayLabel() }}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          class="size-5 text-gray-400 shrink-0 transition-transform duration-150"
          [class.rotate-180]="isOpen()">
          <path
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clip-rule="evenodd"
            fill-rule="evenodd" />
        </svg>
      </button>

      @if (isOpen()) {
        <div
          role="menu"
          tabindex="-1"
          class="absolute z-50 min-w-full w-full max-w-sm rounded-xl bg-white shadow-xl ring-1 ring-black/5 focus:outline-none py-1 border border-slate-100 max-h-60 overflow-y-auto"
          [class.mt-1.5]="!openUpwards()"
          [class.top-full]="!openUpwards()"
          [class.origin-top-left]="!openUpwards()"
          [class.mb-1.5]="openUpwards()"
          [class.bottom-full]="openUpwards()"
          [class.origin-bottom-left]="openUpwards()"
          [class.left-0]="align() === 'left'"
          [class.right-0]="align() === 'right'"
          [class]="menuClass()">
          @for (item of items(); track item.label) {
            <button
              type="button"
              role="menuitem"
              [disabled]="item.disabled"
              (click)="onItemClick(item)"
              [class.bg-blue-50]="isSelected(item)"
              [class.text-blue-600]="isSelected(item)"
              [class.font-medium]="isSelected(item)"
              class="flex items-center justify-between w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-slate-50 hover:text-gray-900 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="truncate">{{ item.label }}</span>
              @if (isSelected(item)) {
                <svg class="size-4 text-blue-600 ml-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clip-rule="evenodd" />
                </svg>
              }
            </button>
          }
        </div>
      }

      <!-- Helper / Error Message -->
      @if (error()) {
        <p class="mt-1.5 text-xs text-red-600 ml-1 flex items-center gap-1">
          <svg class="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clip-rule="evenodd" />
          </svg>
          <span>{{ error() }}</span>
        </p>
      } @else if (hint()) {
        <p class="mt-1.5 text-xs text-slate-500 ml-1">{{ hint() }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent<T = any> {
  @ViewChild('containerRef') containerRef?: ElementRef<HTMLElement>;

  items = input.required<SelectItem<T>[]>();
  value = model<T | undefined>(undefined);
  label = input<string | undefined>(undefined);
  staticLabel = input<string | undefined>(undefined);
  placeholder = input<string>('Select...');
  align = input<'left' | 'right'>('left');
  buttonClass = input<string>('');
  menuClass = input<string>('');
  containerClass = input<string>('');
  labelClass = input<string>('');
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  error = input<string | null | undefined>(null);
  hint = input<string | null | undefined>(null);

  itemSelected = output<SelectItem<T>>();

  readonly isOpen = signal(false);
  readonly openUpwards = signal(false);

  readonly displayLabel = computed(() => {
    const fixedLabel = this.staticLabel();
    if (fixedLabel) return fixedLabel;

    const currentVal = this.value();
    const found = this.items().find((item) => item.value === currentVal);
    return found ? found.label : this.placeholder();
  });

  toggle(): void {
    if (this.disabled()) return;

    if (!this.isOpen() && this.containerRef?.nativeElement) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Auto-flip upwards if space below is less than 240px and there's more space above
      this.openUpwards.set(spaceBelow < 240 && spaceAbove > spaceBelow);
    }

    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  isSelected(item: SelectItem<T>): boolean {
    const currentVal = this.value();
    return currentVal !== undefined && currentVal === item.value;
  }

  onItemClick(item: SelectItem<T>): void {
    if (item.disabled) return;

    if (item.value !== undefined) {
      this.value.set(item.value);
    }
    if (item.action) {
      item.action();
    }
    this.itemSelected.emit(item);
    this.close();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (
      this.isOpen() &&
      !this.containerRef?.nativeElement.contains(event.target as Node)
    ) {
      this.close();
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.close();
  }
}
