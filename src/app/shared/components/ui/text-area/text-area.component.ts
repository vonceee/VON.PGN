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
 * Reusable Multiline Form Textarea with Modern Overlapping Label Styling.
 *
 * WHY:
 * Provides a clean, modern "overlapping label" aesthetic where the field label sits
 * directly over the top border with a matching background (`bg-white`), creating a crisp
 * notch effect without layout shifts. Matches the design language of `TextInputComponent`.
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
 * - Supports configurable `resize` mode ('none', 'vertical', 'horizontal', 'both').
 */
@Component({
  selector: 'app-text-area',
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

        <!-- Textarea Field -->
        <textarea
          #textareaEl
          [id]="computedId()"
          [name]="name() || computedId()"
          [rows]="rows()"
          [value]="value()"
          [placeholder]="placeholder()"
          [disabled]="isDisabled()"
          [readOnly]="readonly()"
          [required]="required()"
          [maxLength]="maxlength() ?? 524288"
          [attr.minlength]="minlength() ?? null"
          (input)="onInput($event)"
          (focus)="onFocus($event)"
          (blur)="onBlur($event)"
          (keydown.enter)="onEnter($event)"
          class="peer block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm/6 text-slate-900 placeholder:text-muted transition-all duration-150 focus:outline-none"
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
          [class.resize-none]="resize() === 'none'"
          [class.resize-y]="resize() === 'vertical'"
          [class.resize-x]="resize() === 'horizontal'"
          [class.resize]="resize() === 'both'"
          [class]="textareaClass()"></textarea>
      </div>

      <!-- Helper / Error Message & Character Count -->
      @if (error() || hint() || maxlength()) {
        <div class="mt-1.5 flex items-center justify-between text-xs px-1">
          @if (error()) {
            <p class="text-red-600 flex items-center gap-1">
              <svg class="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clip-rule="evenodd" />
              </svg>
              <span>{{ error() }}</span>
            </p>
          } @else if (hint()) {
            <p class="text-slate-500">{{ hint() }}</p>
          } @else {
            <span></span>
          }

          @if (maxlength()) {
            <span class="text-slate-400 font-mono text-[11px]">{{ value().length }}/{{ maxlength() }}</span>
          }
        </div>
      }
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextAreaComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextAreaComponent implements ControlValueAccessor, AfterViewInit {
  @ViewChild('textareaEl') textareaEl?: ElementRef<HTMLTextAreaElement>;

  // Core Inputs
  label = input<string>('');
  id = input<string>('');
  name = input<string>('');
  rows = input<number>(4);
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  readonly = input<boolean>(false);
  required = input<boolean>(false);
  autofocus = input<boolean>(false);
  maxlength = input<number | undefined>(undefined);
  minlength = input<number | undefined>(undefined);
  resize = input<'none' | 'vertical' | 'horizontal' | 'both'>('none');
  error = input<string | null | undefined>(null);
  hint = input<string | null | undefined>(null);

  // Styling inputs
  containerClass = input<string>('');
  textareaClass = input<string>('');
  labelClass = input<string>('');

  // Two-way bound value
  value = model<string>('');

  // Outputs
  focus = output<FocusEvent>();
  blur = output<FocusEvent>();
  enter = output<KeyboardEvent>();

  // Internal State
  private readonly internalId = `app-text-area-${++nextUniqueId}`;
  readonly computedId = computed(() => this.id() || this.internalId);

  private internalDisabled = signal(false);
  readonly isDisabled = computed(() => this.disabled() || this.internalDisabled());

  // ControlValueAccessor Callbacks
  // TRADEOFF: Storing callbacks as no-op fallbacks to allow standalone signal binding without forms.
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    if (this.autofocus() && this.textareaEl) {
      // Focus textarea programmatically when requested
      setTimeout(() => {
        this.textareaEl?.nativeElement.focus();
      }, 0);
    }
  }

  // --- Event Handlers ---

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
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
  focusTextarea(): void {
    this.textareaEl?.nativeElement.focus();
  }

  // Public API to select text
  select(): void {
    this.textareaEl?.nativeElement.select();
  }
}
