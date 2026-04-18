import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { FormFieldComponent } from './form-field.component';
import { ButtonComponent  } from '@shared/ui';

// Step 4: Organizer
@Component({
  selector: 'app-step-organizer',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent],
  template: `
    <div [formGroup]="form" class="space-y-6">

      <app-form-field
        formControlName="organizer"
        label="Organizer Name"
        placeholder="e.g. National Chess Federation of the Philippines"
        [required]="true"
        [showCharCount]="true"
        [charLimit]="255"
        [errorMessage]="getError('organizer')"
      ></app-form-field>

      <app-form-field
        formControlName="contact"
        label="Contact"
        placeholder="e.g. tournaments@ncfph.org or 0917-123-4567"
        [required]="true"
        [showCharCount]="true"
        [charLimit]="255"
        [errorMessage]="getError('contact')"
      ></app-form-field>

      <app-form-field
        formControlName="link"
        label="Link"
        type="url"
        placeholder="e.g. https://facebook.com/posts/your-tournament-updates"
        [optional]="true"
        [showCharCount]="true"
        [charLimit]="255"
        hint="Optional — link to a Facebook post or page for tournament updates"
      ></app-form-field>
    </div>
  `
})
export class StepOrganizerComponent {
  @Input() form!: FormGroup;
  @Input() getError!: (field: string) => string;
}

// Step 5: Registration
@Component({
  selector: 'app-step-registration',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent],
  template: `
    <div [formGroup]="form">
      <app-form-field
        formControlName="registrationInstructions"
        label="Registration Instructions"
        type="textarea"
        [rows]="8"
        placeholder="e.g. to register, fill up this google form, or contact 0917-XXX-XXXX"
        [required]="true"
        [showCharCount]="true"
        [charLimit]="65535"
        [errorMessage]="getError('registrationInstructions')"
      ></app-form-field>
    </div>
  `
})
export class StepRegistrationComponent {
  @Input() form!: FormGroup;
  @Input() getError!: (field: string) => string;
}

// Step 6: Eligibility
@Component({
  selector: 'app-step-eligibility',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <div>
      <div class="space-y-4">
        @for (control of eligibilityArray.controls; track $index; let i = $index) {
        <div class="flex gap-3 items-center p-4">
          <input
            type="text"
            [formControl]="eligibilityControl(i)"
            placeholder="e.g. 2200 & Below"
            class="flex-1 p-3 border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors"
          />
          <app-button
            variant="danger"
            size="sm"
            label="✕"
            (click)="removeItem.emit(i)"
          ></app-button>
        </div>
        }
        <app-button
          variant="outline"
          size="sm"
          label="+ Add Requirement"
          (click)="addItem.emit()"
        ></app-button>
      </div>
    </div>
  `
})
export class StepEligibilityComponent implements OnInit {
  @Input() eligibilityArray!: FormArray;
  @Output() addItem = new EventEmitter<void>();
  @Output() removeItem = new EventEmitter<number>();

  ngOnInit() {
    // Ensure there's at least one empty field for users to type into
    if (this.eligibilityArray.length === 0) {
      this.addItem.emit();
    }
  }

  eligibilityControl(index: number): FormControl {
    return this.eligibilityArray.at(index) as FormControl;
  }
}

