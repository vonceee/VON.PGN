import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FormFieldComponent } from './form-field.component';
import { ButtonComponent  } from '@shared/ui';

// Step 1: Basic Info
@Component({
  selector: 'app-step-basic-info',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent],
  template: `
    <div [formGroup]="form" class="space-y-6">
      <app-form-field
        formControlName="name"
        label="Tournament Name"
        placeholder="e.g. Mobile Chess Bus Tournament 2026"
        [required]="true"
        [showCharCount]="true"
        [charLimit]="64"
        [errorMessage]="getError('name')"
      ></app-form-field>

      <app-form-field
        formControlName="description"
        label="Description"
        type="textarea"
        placeholder="you can add description, social media links, etc..."
        [optional]="true"
        [showCharCount]="true"
        [charLimit]="65535"
      ></app-form-field>
    </div>
  `,
})
export class StepBasicInfoComponent {
  @Input() form!: FormGroup;
  @Input() getError!: (field: string) => string;
}

// Step 2: Dates & Location
@Component({
  selector: 'app-step-dates-location',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, FormFieldComponent, ButtonComponent],
  template: `
    <div [formGroup]="form" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <app-form-field
          formControlName="startDate"
          label="Start Date"
          type="date"
          [required]="true"
          [errorMessage]="getError('startDate')"
        ></app-form-field>

        <div class="relative">
          <app-form-field
            formControlName="endDate"
            label="End Date"
            type="date"
            [required]="true"
            [errorMessage]="getError('endDate')"
          ></app-form-field>
          <div class="absolute top-0 right-0 flex items-center gap-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                [ngModel]="isOneDayTournament()"
                (ngModelChange)="toggleOneDayTournament()"
                [ngModelOptions]="{ standalone: true }"
                class="w-4 h-4 text-cyan-400 bg-slate-800 border-border-base rounded focus:ring-cyan-400 focus:ring-2"
              />
              <span class="text-sm ">1-day tournament</span>
            </label>
          </div>
        </div>

        <app-form-field
          formControlName="registrationDeadline"
          label="Registration Deadline"
          type="date"
          [optional]="true"
        ></app-form-field>
      </div>

      <app-form-field
        formControlName="location"
        label="Venue Location"
        placeholder="e.g. Kai Mall, Almar, Zabarte, Caloocan City, Metro Manila"
        [required]="true"
        [showCharCount]="true"
        [charLimit]="255"
        [errorMessage]="getError('location')"
      ></app-form-field>

      <div class="space-y-1.5">
        <label class="field-label block text-sm  text-slate-700 ">Google Maps Link <span class="text-slate-500 font-normal">(Optional)</span></label>
        <div class="flex gap-2">
          <input
            type="text"
            [ngModel]="mapsLink()"
            (ngModelChange)="mapsLink.set($event)"
            [ngModelOptions]="{ standalone: true }"
            placeholder="Paste Google Maps URL to verify location"
            class="flex-1 p-3 border border-border-theme rounded focus:outline-none focus:border-cyan-400 "
          />
          <button
            appButton
            variant="primary"
            (click)="parseMapsLink.emit()"
            [disabled]="mapsLinkLoading()"
          >
            {{ mapsLinkLoading() ? 'Verifying...' : 'Verify' }}
          </button>
        </div>
        @if (verificationStatus() === 'success') {
          <p class="text-xs text-green-600 mt-1.5">✓ Location verified successfully</p>
        }
        @if (verificationStatus() === 'error') {
          <p class="text-xs text-red-500 mt-1.5">{{ mapsLinkError() }}</p>
        }
        <p class="text-xs text-slate-500 mt-1.5">
          Paste a Google Maps URL to verify the tournament location
        </p>
      </div>
    </div>
  `,
})
export class StepDatesLocationComponent implements OnInit {
  @Input() form!: FormGroup;
  @Input() getError!: (field: string) => string;
  @Input() mapsLink!: any;
  @Input() mapsLinkLoading!: any;
  @Input() mapsLinkError!: any;
  @Input() verificationStatus!: any;
  @Output() parseMapsLink = new EventEmitter<void>();

  isOneDayTournament = signal(false);

  ngOnInit() {
    // Check if start and end dates are the same to determine initial state
    const startDate = this.form.get('startDate')?.value;
    const endDate = this.form.get('endDate')?.value;
    if (startDate && endDate && startDate === endDate) {
      this.isOneDayTournament.set(true);
      this.form.get('endDate')?.disable();
    }

    // Watch for start date changes to update end date if one-day tournament is checked
    this.form.get('startDate')?.valueChanges.subscribe((value) => {
      if (this.isOneDayTournament() && value) {
        this.form.get('endDate')?.setValue(value);
      }
    });
  }

  toggleOneDayTournament() {
    const isChecked = !this.isOneDayTournament();
    this.isOneDayTournament.set(isChecked);

    const endDateControl = this.form.get('endDate');
    if (isChecked) {
      // Set end date to match start date and disable field
      const startDate = this.form.get('startDate')?.value;
      if (startDate) {
        endDateControl?.setValue(startDate);
      }
      endDateControl?.disable();
    } else {
      endDateControl?.enable();
    }
  }
}

// Step 3: Format & Rules
@Component({
  selector: 'app-step-format-rules',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent],
  template: `
    <div [formGroup]="form" class="space-y-6">
      <app-form-field
        formControlName="format"
        label="Format"
        placeholder="e.g. Swiss System, 9 Rounds"
        [required]="true"
        [showCharCount]="true"
        [charLimit]="255"
        [errorMessage]="getError('format')"
      ></app-form-field>

      <app-form-field
        formControlName="timeControl"
        label="Time Control"
        placeholder="e.g. 90 min + 30 sec increment"
        [required]="true"
        [showCharCount]="true"
        [charLimit]="255"
        [errorMessage]="getError('timeControl')"
      ></app-form-field>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <app-form-field
          formControlName="rounds"
          label="Rounds"
          type="number"
          [required]="true"
          [errorMessage]="getError('rounds')"
        ></app-form-field>

        <app-form-field
          formControlName="entryFee"
          label="Registration Fee"
          type="currency"
          [optional]="true"
        ></app-form-field>

        <app-form-field
          formControlName="prizePool"
          label="Total Prize Pool"
          type="currency"
          [optional]="true"
        ></app-form-field>
      </div>
    </div>
  `,
})
export class StepFormatRulesComponent {
  @Input() form!: FormGroup;
  @Input() getError!: (field: string) => string;
}


