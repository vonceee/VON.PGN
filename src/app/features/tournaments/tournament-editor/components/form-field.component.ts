import { Component, Input, forwardRef } from '@angular/core';
import { ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  styleUrls: ['./form-field.component.css'],
  template: `
    <div class="field-group">
      <label class="field-label" [class.required]="required" [class.optional]="optional" [class.muted]="muted">
        {{ label }}
      </label>

      @switch (type) {
        @case ('text') {
          <div [class.flex]="showCharCount" class="gap-2 items-start">
            <input
              type="text"
              [value]="value"
              (input)="onInput($event)"
              (blur)="onBlur()"
              [placeholder]="placeholder"
              [class]="inputClasses"
              [disabled]="disabled"
            />
            @if (showCharCount) {
              <span class="char-counter" [class.near-limit]="isNearLimit">
                {{ charCount }}/{{ charLimit }}
              </span>
            }
          </div>
        }

        @case ('textarea') {
          <div class="relative">
            <textarea
              [rows]="rows"
              [value]="value"
              (input)="onInput($event)"
              (blur)="onBlur()"
              [placeholder]="placeholder"
              [class]="textareaClasses"
              [disabled]="disabled"
            ></textarea>
            @if (showCharCount) {
              <span class="char-counter textarea-counter" [class.near-limit]="isNearLimit">
                {{ charCount }}/{{ charLimit }}
              </span>
            }
          </div>
        }

        @case ('number') {
          <input
            type="number"
            [step]="step"
            [value]="value"
            (input)="onInput($event)"
            (blur)="onBlur()"
            [class]="inputClasses"
            [disabled]="disabled"
          />
        }

        @case ('date') {
          <input
            type="date"
            [value]="value"
            (input)="onInput($event)"
            (blur)="onBlur()"
            [class]="inputClasses"
            [disabled]="disabled"
          />
        }

        @case ('select') {
          <select [value]="value" (change)="onSelectChange($event)" [class]="inputClasses" [disabled]="disabled">
            @for (opt of options; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        }

        @case ('currency') {
          <div class="currency-input-wrapper" [class.error]="hasError">
            <span class="currency-prefix">&#8369;</span>
            <input
              type="text"
              [value]="formattedValue"
              (input)="onCurrencyInput($event)"
              (focus)="onCurrencyFocus($event)"
              (blur)="onCurrencyBlur($event)"
              class="currency-input"
              [disabled]="disabled"
              placeholder="0.00"
            />
          </div>
        }

        @case ('url') {
          <div class="flex gap-2">
            <input
              type="url"
              [value]="value"
              (input)="onInput($event)"
              (blur)="onBlur()"
              [placeholder]="placeholder"
              class="flex-1 p-3 border border-border-theme rounded focus:outline-none focus:border-cyan-400 "
              [disabled]="disabled"
            />
            @if (showCharCount) {
              <span class="char-counter" [class.near-limit]="isNearLimit">
                {{ charCount }}/{{ charLimit }}
              </span>
            }
          </div>
        }
      }

      @if (errorMessage) {
        <div class="field-error">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
            <path fill-rule="evenodd"
              d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clip-rule="evenodd" />
          </svg>
          {{ errorMessage }}
        </div>
      }

      @if (hint) {
        <p class="text-xs  mt-1.5">{{ hint }}</p>
      }
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormFieldComponent),
      multi: true
    }
  ]
})
export class FormFieldComponent implements ControlValueAccessor {
  @Input() label!: string;
  @Input() type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'currency' | 'url' = 'text';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() optional = false;
  @Input() muted = false;
  @Input() disabled = false;
  @Input() rows = 5;
  @Input() step = '1';
  @Input() options: { value: string; label: string }[] = [];
  @Input() charLimit = 255;
  @Input() showCharCount = false;
  @Input() errorMessage = '';
  @Input() hint = '';

  value: any = '';
  formattedValue = '';
  private _onChange: any = () => {};
  private _onTouched: any = () => {};

  get hasError(): boolean {
    return !!this.errorMessage;
  }

  get charCount(): number {
    return (this.value || '').length;
  }

  get isNearLimit(): boolean {
    return this.charCount >= this.charLimit * 0.9;
  }

  get inputClasses(): string {
    const base = 'w-full p-3 border rounded focus:outline-none ';
    if (this.hasError) {
      return base + ' border-red-500 focus:border-red-500';
    }
    return base + ' border-border-theme focus:border-cyan-400';
  }

  get textareaClasses(): string {
    const base = 'w-full p-3 border rounded focus:outline-none  pb-6';
    if (this.hasError) {
      return base + ' border-red-500 focus:border-red-500';
    }
    return base + ' border-border-theme focus:border-cyan-400';
  }

  writeValue(value: any): void {
    this.value = value;
    this.formattedValue = this.formatCurrency(value);
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this._onChange(this.value);
  }

  onSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.value = select.value;
    this._onChange(this.value);
  }

  onBlur(): void {
    this._onTouched();
  }

  onCurrencyInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^\d.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    if (parts.length > 0) {
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      value = parts.length > 1 ? intPart + '.' + parts[1] : intPart;
    }

    input.value = value;
    this.formattedValue = value;
    this.value = value.replace(/,/g, '');
    this._onChange(this.value);
  }

  onCurrencyFocus(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/,/g, '');
  }

  onCurrencyBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^\d.]/g, '');
    if (!value) return;

    const parts = value.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    value = parts.length > 1 ? intPart + '.' + parts[1] : intPart;

    input.value = value;
    this.formattedValue = value;
    this._onTouched();
  }

  private formatCurrency(value: string): string {
    if (!value) return '';
    const cleaned = String(value).replace(/[₱,\s]/g, '');
    if (!cleaned || isNaN(parseFloat(cleaned))) return '';
    const num = parseFloat(cleaned);
    const parts = num.toString().split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? intPart + '.' + parts[1] : intPart;
  }
}
