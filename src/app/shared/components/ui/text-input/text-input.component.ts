import {
  Component,
  ChangeDetectionStrategy,
  forwardRef,
  input,
  model,
  output,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

let nextUniqueId = 0;

/**
 * Reusable Form Input with Modern Overlapping Label Styling.
 *
 * WHY:
 * Provides a clean, modern "overlapping label" aesthetic where the field label sits
 * directly over the top border with a matching background (`bg-white`), creating a crisp
 * notch effect without layout shifts. Replaces fragmented inline input patterns across dialogs.
 *
 * ARCHITECTURAL CHOICE:
 * Implements both modern Angular Signals (`model<string>()`) and `ControlValueAccessor`.
 * This allows full interoperability with:
 *   1. Signal two-way binding: `[(value)]="mySignal"`
 *   2. Template-driven forms: `[(ngModel)]="myValue"`
 *   3. Reactive forms: `[formControl]="myControl"` or `formControlName="myField"`
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Assumes a solid/card container background (defaults to `bg-white`).
 * - Generates an accessible, unique HTML `id` fallback when `id` input is not provided.
 * - Handles `autofocus` gracefully in `AfterViewInit` without layout flashing.
 * - Supports prefix and suffix icon/button projections via `<ng-content>`.
 */
@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: { class: 'block' },
  template: `
    <div class="w-full flex flex-col" [class]="containerClass()">
      <div class="relative w-full">
        <!-- Overlapping Label -->
        @if (label()) {
          <label
            [for]="computedId()"
            class="absolute -top-2 left-3 z-10 inline-block bg-white px-1.5 text-xs font-medium transition-colors duration-150 pointer-events-none select-none"
            [class.text-slate-600]="!error() && !isDisabled()"
            [class.peer-focus:text-blue-600]="!error() && !isDisabled()"
            [class.text-red-600]="error() && !isDisabled()"
            [class.text-slate-400]="isDisabled()"
            [class]="labelClass()">
            {{ label() }}
            @if (required()) {
              <span class="text-red-500 ml-0.5">*</span>
            }
          </label>
        }

        <!-- Optional Prefix Slot -->
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
          <ng-content select="[prefix]" />
        </div>

        <!-- Input Field -->
        <input
          #inputEl
          [id]="computedId()"
          [name]="name() || computedId()"
          [type]="type()"
          [value]="value()"
          [placeholder]="placeholder()"
          [disabled]="isDisabled()"
          [readOnly]="readonly()"
          [required]="required()"
          [maxLength]="maxlength() ?? 524288"
          [attr.minlength]="minlength() ?? null"
          [attr.autocomplete]="autocomplete()"
          (input)="onInput($event)"
          (focus)="onFocus($event)"
          (blur)="onBlur($event)"
          (keydown.enter)="onEnter($event)"
          class="peer block w-full rounded-xl border bg-white py-2.5 text-sm/6 text-slate-900 placeholder:text-muted transition-all duration-150 focus:outline-none"
          [class.pl-3.5]="!hasPrefix()"
          [class.pl-10]="hasPrefix()"
          [class.pr-3.5]="!hasSuffix()"
          [class.pr-10]="hasSuffix()"
          [class.border-slate-200]="!error()"
          [class.focus:border-blue-600]="!error()"
          [class.focus:ring-2]="!error()"
          [class.focus:ring-blue-600/30]="!error()"
          [class.border-red-500]="error()"
          [class.focus:border-red-600]="error()"
          [class.focus:ring-2]="error()"
          [class.focus:ring-red-500/30]="error()"
          [class.disabled:bg-slate-50]="isDisabled()"
          [class.disabled:text-slate-400]="isDisabled()"
          [class.disabled:border-slate-200]="isDisabled()"
          [class.disabled:cursor-not-allowed]="isDisabled()"
          [class]="inputClass()" />

        <!-- Optional Suffix Slot -->
        <div class="absolute inset-y-0 right-0 pr-3.5 flex items-center z-10">
          <ng-content select="[suffix]" />
        </div>
      </div>

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
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInputComponent implements ControlValueAccessor, AfterViewInit {
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  // Core Inputs
  label = input<string>('');
  id = input<string>('');
  name = input<string>('');
  type = input<string>('text');
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  readonly = input<boolean>(false);
  required = input<boolean>(false);
  autofocus = input<boolean>(false);
  maxlength = input<number | undefined>(undefined);
  minlength = input<number | undefined>(undefined);
  autocomplete = input<string>('off');
  error = input<string | null | undefined>(null);
  hint = input<string | null | undefined>(null);

  // Styling inputs
  containerClass = input<string>('');
  inputClass = input<string>('');
  labelClass = input<string>('');

  // Slots presence flags
  hasPrefix = input<boolean>(false);
  hasSuffix = input<boolean>(false);

  // Two-way bound value
  value = model<string>('');

  // Outputs
  focus = output<FocusEvent>();
  blur = output<FocusEvent>();
  enter = output<KeyboardEvent>();

  // Internal State
  private readonly internalId = `app-text-input-${++nextUniqueId}`;
  readonly computedId = computed(() => this.id() || this.internalId);

  private internalDisabled = signal(false);
  readonly isDisabled = computed(() => this.disabled() || this.internalDisabled());

  // ControlValueAccessor Callbacks
  // TRADEOFF: Storing callbacks as no-op fallbacks to allow standalone signal binding without forms.
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    if (this.autofocus() && this.inputEl) {
      // Focus input programmatically when requested
      setTimeout(() => {
        this.inputEl?.nativeElement.focus();
      }, 0);
    }
  }

  // --- Event Handlers ---

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    this.value.set(newValue);
    this.onChange(newValue);
  }

  onFocus(event: FocusEvent): void {
    this.focus.emit(event);
  }

  onBlur(event: FocusEvent): void {
    this.onTouched();
    this.blur.emit(event);
  }

  onEnter(event: Event | KeyboardEvent): void {
    this.enter.emit(event as KeyboardEvent);
  }

  // --- ControlValueAccessor Implementation ---

  writeValue(value: any): void {
    const strVal = value !== null && value !== undefined ? String(value) : '';
    this.value.set(strVal);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalDisabled.set(isDisabled);
  }

  // Public API to focus manually
  focusInput(): void {
    this.inputEl?.nativeElement.focus();
  }

  // Public API to select text
  select(): void {
    this.inputEl?.nativeElement.select();
  }
}
