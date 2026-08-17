import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';

// Step 7: Prizes
@Component({
  selector: 'app-step-prizes',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './step-prizes.component.html'
})
export class StepPrizesComponent implements OnInit {
  @Input() categoriesArray!: FormArray;

  @Output() addCategory = new EventEmitter<void>();
  @Output() removeCategory = new EventEmitter<number>();
  @Output() addExtraPrize = new EventEmitter<number>();
  @Output() removeExtraPrize = new EventEmitter<{ ci: number, ei: number }>();
  @Output() addSpecialAward = new EventEmitter<number>();
  @Output() removeSpecialAward = new EventEmitter<{ ci: number, ai: number }>();

  ngOnInit() { }

  categoryGroup(index: number): FormGroup { return this.categoriesArray.at(index) as FormGroup; }
  getCategorySpecialAwards(catIndex: number): FormArray { return this.categoriesArray.at(catIndex).get('specialAwards') as FormArray; }
  specialAwardGroup(catIndex: number, awardIndex: number): FormGroup { return this.getCategorySpecialAwards(catIndex).at(awardIndex) as FormGroup; }
  getCategoryExtraPrizes(catIndex: number): FormArray { return this.categoriesArray.at(catIndex).get('extraPrizes') as FormArray; }
  extraPrizeGroup(catIndex: number, prizeIndex: number): FormGroup { return this.getCategoryExtraPrizes(catIndex).at(prizeIndex) as FormGroup; }

  // Safe control getters
  getControl(group: FormGroup, name: string): FormControl {
    return group.get(name) as FormControl;
  }
}

// Step 8: Schedule
@Component({
  selector: 'app-step-schedule',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './step-schedule.component.html'
})
export class StepScheduleComponent implements OnInit {
  @Input() scheduleDaysArray!: FormArray;

  @Output() addScheduleDay = new EventEmitter<void>();
  @Output() removeScheduleDay = new EventEmitter<number>();
  @Output() addScheduleEvent = new EventEmitter<number>();
  @Output() removeScheduleEvent = new EventEmitter<{ di: number, ei: number }>();

  ngOnInit() { }

  scheduleDayGroup(index: number): FormGroup { return this.scheduleDaysArray.at(index) as FormGroup; }
  getScheduleEvents(dayIndex: number): FormArray { return this.scheduleDaysArray.at(dayIndex).get('events') as FormArray; }
  scheduleEventGroup(dayIndex: number, eventIndex: number): FormGroup { return this.getScheduleEvents(dayIndex).at(eventIndex) as FormGroup; }

  // Safe control getters
  getControl(group: FormGroup, name: string): FormControl {
    return group.get(name) as FormControl;
  }
}


