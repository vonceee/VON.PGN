import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FormFieldComponent } from './form-field.component';

// Step 1: Basic Info
@Component({
  selector: 'app-step-basic-info',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent],
  templateUrl: './step-basic-info.component.html'
})
export class StepBasicInfoComponent {
  @Input() form!: FormGroup;
  @Input() getError!: (field: string) => string;
}

// Step 2: Dates & Location
@Component({
  selector: 'app-step-dates-location',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, FormFieldComponent],
  templateUrl: './step-dates-location.component.html'
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
    const startDate = this.form.get('startDate')?.value;
    const endDate = this.form.get('endDate')?.value;
    if (startDate && endDate && startDate === endDate) {
      this.isOneDayTournament.set(true);
      this.form.get('endDate')?.disable();
    }

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
  templateUrl: './step-format-rules.component.html'
})
export class StepFormatRulesComponent {
  @Input() form!: FormGroup;
  @Input() getError!: (field: string) => string;
}
