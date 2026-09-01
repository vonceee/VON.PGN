import { Component, Input, forwardRef } from '@angular/core';
import { ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroExclamationCircle } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [ReactiveFormsModule, NgIconComponent],
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
          <div [class]="currencyWrapperClasses">
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
          <div class="flex gap-2 w-full">
            <input
              type="url"
              [value]="value"
              (input)="onInput($event)"
              (blur)="onBlur()"
              [placeholder]="placeholder"
              [class]="urlClasses"
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
          <ng-icon name="heroExclamationCircle" class="w-3.5 h-3.5"></ng-icon>
          {{ errorMessage }}
        </div>
      }

      @if (hint) {
        <p class="text-xs  mt-1.5">{{ hint }}</p>
      }
    </div>
  `,
  providers: [
    provideIcons({
      heroExclamationCircle,
    }),
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
  private _onChange: any = () => { };
  private _onTouched: any = () => { };

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
    const base = 'block w-full pl-3 pr-3 py-2.5 bg-white border rounded-xl text-sm/6 placeholder:text-gray-500 focus:outline-none focus:ring-2 ';
    if (this.hasError) {
      return base + ' border-red-500 focus:ring-red-500/50';
    }
    return base + ' border-slate-200 focus:ring-blue-600/50';
  }

  get textareaClasses(): string {
    const base = 'block w-full pl-3 pr-3 py-2.5 bg-white border rounded-xl text-sm/6 placeholder:text-gray-500 focus:outline-none focus:ring-2 pb-6';
    if (this.hasError) {
      return base + ' border-red-500 focus:ring-red-500/50';
    }
    return base + ' border-slate-200 focus:ring-blue-600/50';
  }

  get urlClasses(): string {
    const base = 'flex-1 pl-3 pr-3 py-2.5 bg-white border rounded-xl text-sm/6 placeholder:text-gray-500 focus:outline-none focus:ring-2 ';
    if (this.hasError) {
      return base + ' border-red-500 focus:ring-red-500/50';
    }
    return base + ' border-slate-200 focus:ring-blue-600/50';
  }

  get currencyWrapperClasses(): string {
    const base = 'flex items-stretch border rounded-xl overflow-hidden transition-all bg-white w-full focus-within:ring-2 ';
    if (this.hasError) {
      return base + ' border-red-500 focus-within:ring-red-500/50';
    }
    return base + ' border-slate-200 focus-within:ring-blue-600/50';
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
