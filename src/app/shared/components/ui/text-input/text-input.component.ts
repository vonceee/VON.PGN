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
 * Line Text Input Component.
 *
 * WHY:
 * Provides a clean, minimalist line-style text input (bottom border only, transparent background)
 * matching the visual language of `SelectComponent`. Eliminates boxed containers and overlapping
 * label notch hacks (`bg-white`), blending seamlessly across modals, panels, and toolbars.
 *
 * ARCHITECTURAL CHOICE:
 * Uses an unboxed bottom underline (`border-0 border-b border-slate-200`) with an active blue underline accent
 * (`border-b-2 border-blue-600`) without focus rings, paired with a stacked block label above.
 * Implements both modern Angular Signals (`model<string>()`) and `ControlValueAccessor` for seamless
 * interoperability with signal two-way binding, Reactive Forms, and Template-Driven forms.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Zero horizontal padding (`px-0`) aligns label and input text flush with adjacent line components like `app-select`.
 * - Compensates 1px border shift on active state with `-mb-px` to prevent layout jumps.
 * - Handles optional prefix and suffix icon slots while retaining full underline width and flexible input layout.
 */
@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: { class: 'block' },
  template: `
    <div class="relative w-full text-left" [class]="containerClass()">
      <!-- Label -->
      @if (label()) {
        <label
          [for]="computedId()"
          class="block text-xs font-medium transition-colors duration-150 select-none mb-1 cursor-pointer"
          [class.text-slate-600]="!isFocused() && !error() && !isDisabled()"
          [class.text-blue-600]="isFocused() && !error() && !isDisabled()"
          [class.text-red-600]="error() && !isDisabled()"
          [class.text-slate-400]="isDisabled()"
          [class.cursor-not-allowed]="isDisabled()"
          [class]="labelClass()">
          {{ label() }}
          @if (required()) {
            <span class="text-red-500 ml-0.5">*</span>
          }
        </label>
      }

      <div
        class="inline-flex w-full items-center gap-x-2 bg-transparent px-0 py-2 text-sm/6 font-medium text-gray-900 border-0 border-b border-slate-200 hover:border-slate-400 transition-colors"
        [class.border-b-2]="isFocused() || error()"
        [class.-mb-px]="isFocused() || error()"
        [class.border-blue-600]="isFocused() && !error()"
        [class.border-red-500]="error()"
        [class.opacity-50]="isDisabled()"
        [class.cursor-not-allowed]="isDisabled()"
        [class.cursor-text]="!isDisabled()"
        [class]="lineClass()"
        (click)="onContainerClick($event)">
        <!-- Optional Prefix Slot -->
        @if (hasPrefix()) {
          <div class="shrink-0 flex items-center text-gray-400">
            <ng-content select="[prefix]" />
          </div>
        }

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
          class="w-full min-w-0 bg-transparent p-0 border-0 text-sm/6 font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none disabled:cursor-not-allowed"
          [class]="inputClass()" />

        <!-- Optional Suffix Slot -->
        @if (hasSuffix()) {
          <div class="shrink-0 flex items-center text-gray-400">
            <ng-content select="[suffix]" />
          </div>
        }
      </div>

      <!-- Helper / Error Message -->
      @if (error()) {
        <p class="mt-1 text-xs text-red-600 flex items-center gap-1">
          <svg class="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clip-rule="evenodd" />
          </svg>
          <span>{{ error() }}</span>
        </p>
      } @else if (hint()) {
        <p class="mt-1 text-xs text-slate-500">{{ hint() }}</p>
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
  lineClass = input<string>('');
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
  readonly isFocused = signal(false);
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

  onContainerClick(event: MouseEvent): void {
    if (this.isDisabled()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('button, a')) {
      this.focusInput();
    }
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    this.value.set(newValue);
    this.onChange(newValue);
  }

  onFocus(event: FocusEvent): void {
    this.isFocused.set(true);
    this.focus.emit(event);
  }

  onBlur(event: FocusEvent): void {
    this.isFocused.set(false);
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
