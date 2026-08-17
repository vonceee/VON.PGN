import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { FormFieldComponent } from './form-field.component';

// Step 4: Organizer
@Component({
  selector: 'app-step-organizer',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent],
  templateUrl: './step-organizer.component.html'
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
  templateUrl: './step-registration.component.html'
})
export class StepRegistrationComponent {
  @Input() form!: FormGroup;
  @Input() getError!: (field: string) => string;
}

// Step 6: Eligibility
@Component({
  selector: 'app-step-eligibility',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './step-eligibility.component.html'
})
export class StepEligibilityComponent {
  @Input() eligibilityArray!: FormArray;
  @Output() addItem = new EventEmitter<void>();
  @Output() removeItem = new EventEmitter<number>();

  eligibilityControl(index: number): FormControl {
    return this.eligibilityArray.at(index) as FormControl;
  }
}
