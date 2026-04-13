import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

// Step 7: Prizes
@Component({
  selector: 'app-step-prizes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  styleUrls: ['./step-styles.component.css'],
  template: `
    <div>
      
      @if (categoriesArray.length === 0) {
      <p class="text-slate-400 text-sm py-4 text-center">No prize categories added.</p>
      }
      
      <div class="space-y-6">
        @for (cat of categoriesArray.controls; track $index; let ci = $index) {
        <div class="p-5">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg m-0">Category {{ ci + 1 }}</h3>
            <app-button
              variant="danger"
              size="sm"
              label="Remove"
              (click)="removeCategory.emit(ci)"
            ></app-button>
          </div>

          <div class="field-group mb-4">
            <label class="block mb-1 text-sm font-medium">Category Name</label>
            <input 
              type="text" 
              [formControl]="getControl(categoryGroup(ci), 'name')" 
              placeholder="e.g. Open, Under 14"
              class="w-full p-2.5 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors" 
            />
          </div>



          <div class="mb-4">
            <label class="text-sm font-medium block mb-2">Main Prizes</label>
            <div class="space-y-3">
              <div>
                <label class="block mb-1 text-xs text-slate-500">1st</label>
                <input
                  type="text"
                  [formControl]="getControl(categoryGroup(ci), 'champion')"
                  placeholder="P50,000 + trophy"
                  class="w-full p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
              <div>
                <label class="block mb-1 text-xs text-slate-500">2nd</label>
                <input
                  type="text"
                  [formControl]="getControl(categoryGroup(ci), '2nd_place')"
                  placeholder="Prize value"
                  class="w-full p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
              <div>
                <label class="block mb-1 text-xs text-slate-500">3rd</label>
                <input
                  type="text"
                  [formControl]="getControl(categoryGroup(ci), '3rd_place')"
                  placeholder="Prize value"
                  class="w-full p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            @if (getCategoryExtraPrizes(ci).length > 0) {
            <div class="space-y-3 mt-3">
              @for (ep of getCategoryExtraPrizes(ci).controls; track $index; let ei = $index) {
              <div class="flex gap-2 items-start">
                <div class="flex-1">
                  <div class="flex gap-2 items-center mb-1">
                    <input
                      type="text"
                      [formControl]="getControl(extraPrizeGroup(ci, ei), 'label')"
                      placeholder="Place name (e.g. 4th - 10th)"
                      class="flex-1 p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                    <app-button
                      variant="danger"
                      size="sm"
                      label="✕"
                      (click)="removeExtraPrize.emit({ci, ei})"
                    ></app-button>
                  </div>
                    <input 
                      type="text" 
                      [formControl]="getControl(extraPrizeGroup(ci, ei), 'value')" 
                      placeholder="Prize value"
                      class="w-full p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors" 
                    />
                </div>
              </div>
              }
            </div>
            }
            <br />
            <app-button
              variant="outline"
              size="sm"
              label="Add Place"
              (click)="addExtraPrize.emit(ci)"
            ></app-button>
          </div>

          <div>
            <div class="mb-2">
              <label class="text-sm font-medium">Special Awards</label>
            </div>
            @for (award of getCategorySpecialAwards(ci).controls; track $index; let ai = $index) {
            <div class="p-3 mb-3">
              <div class="flex gap-2 items-center mb-2">
                   <input
                     type="text"
                     [formControl]="getControl(specialAwardGroup(ci, ai), 'name')"
                     placeholder="e.g. Top Senior"
                     class="flex-1 p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors"
                   />
                  <select 
                    [formControl]="getControl(specialAwardGroup(ci, ai), 'type')"
                    class="p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 bg-white dark:bg-slate-900 transition-colors"
                  >
                  <option value="simple">Simple</option>
                  <option value="nested">1st/2nd/3rd</option>
                </select>
                <app-button
                  variant="danger"
                  size="sm"
                  label="✕"
                  (click)="removeSpecialAward.emit({ci, ai})"
                ></app-button>
              </div>
              @if (specialAwardGroup(ci, ai).get('type')?.value === 'simple') {
                <input 
                  type="text" 
                  [formControl]="getControl(specialAwardGroup(ci, ai), 'value')" 
                  placeholder="Prize value"
                  class="w-full p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors" 
                />
              } @else {
              <div class="grid grid-cols-3 gap-2">
                <input 
                  type="text" 
                  [formControl]="getControl(specialAwardGroup(ci, ai), '1st')" 
                  placeholder="1st prize"
                  class="p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors" 
                />
                <input 
                  type="text" 
                  [formControl]="getControl(specialAwardGroup(ci, ai), '2nd')" 
                  placeholder="2nd prize"
                  class="p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors" 
                />
                <input 
                  type="text" 
                  [formControl]="getControl(specialAwardGroup(ci, ai), '3rd')" 
                  placeholder="3rd prize"
                  class="p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors" 
                />
              </div>
              }
            </div>
            }
            <app-button
              variant="outline"
              size="sm"
              label="Add Special Award"
              (click)="addSpecialAward.emit(ci)"
              class="mt-3"
            ></app-button>
          </div>
        </div>
        }
        <app-button
          variant="outline"
          size="sm"
          label="Add Category"
          (click)="addCategory.emit()"
        ></app-button>
      </div>
    </div>
  `
})
export class StepPrizesComponent implements OnInit {
  @Input() categoriesArray!: FormArray;

  @Output() addCategory = new EventEmitter<void>();
  @Output() removeCategory = new EventEmitter<number>();
  @Output() addExtraPrize = new EventEmitter<number>();
  @Output() removeExtraPrize = new EventEmitter<{ ci: number, ei: number }>();
  @Output() addSpecialAward = new EventEmitter<number>();
  @Output() removeSpecialAward = new EventEmitter<{ ci: number, ai: number }>();

  ngOnInit() {
    // Ensure there's at least one empty category for users to type into
    if (this.categoriesArray.length === 0) {
      this.addCategory.emit();
    }
  }

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
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  styleUrls: ['./step-styles.component.css'],
  template: `
    <div>
      @if (scheduleDaysArray.length === 0) {
      <p class="text-slate-400 text-sm py-4 text-center">No schedule days added yet.</p>
      }
      
      <div class="space-y-4">
        @for (day of scheduleDaysArray.controls; track $index; let di = $index) {
        <div class="p-5">
          <div class="flex justify-between items-center mb-4">
            <span class="bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-xs font-bold">Day {{ di + 1 }}</span>
            <div class="flex gap-2">
              <app-button
                variant="outline"
                size="sm"
                label="+ Event"
                (click)="addScheduleEvent.emit(di)"
              ></app-button>
              <app-button
                variant="danger"
                size="sm"
                label="Remove Day"
                (click)="removeScheduleDay.emit(di)"
              ></app-button>
            </div>
          </div>
          <div class="space-y-2">
            @for (event of getScheduleEvents(di).controls; track $index; let ei = $index) {
            <div class="flex gap-2 items-center">
              <input 
                type="text" 
                [formControl]="getControl(scheduleEventGroup(di, ei), 'name')"
                placeholder="e.g. Onsite Registration"
                class="flex-1 p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors" 
              />
              <input 
                type="text" 
                [formControl]="getControl(scheduleEventGroup(di, ei), 'time')"
                placeholder="Time (e.g. 9:00 AM - 11:00 AM)"
                class="w-56 p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 transition-colors" 
              />
              <app-button
                variant="danger"
                size="sm"
                label="✕"
                (click)="removeScheduleEvent.emit({di, ei})"
              ></app-button>
            </div>
            }
          </div>
        </div>
        }
        <app-button
          variant="outline"
          size="sm"
          label="+ Add Day"
          (click)="addScheduleDay.emit()"
        ></app-button>
      </div>
    </div>
  `
})
export class StepScheduleComponent implements OnInit {
  @Input() scheduleDaysArray!: FormArray;

  @Output() addScheduleDay = new EventEmitter<void>();
  @Output() removeScheduleDay = new EventEmitter<number>();
  @Output() addScheduleEvent = new EventEmitter<number>();
  @Output() removeScheduleEvent = new EventEmitter<{ di: number, ei: number }>();

  ngOnInit() {
    // Ensure there's at least one empty schedule day for users to type into
    if (this.scheduleDaysArray.length === 0) {
      this.addScheduleDay.emit();
    }
  }

  scheduleDayGroup(index: number): FormGroup { return this.scheduleDaysArray.at(index) as FormGroup; }
  getScheduleEvents(dayIndex: number): FormArray { return this.scheduleDaysArray.at(dayIndex).get('events') as FormArray; }
  scheduleEventGroup(dayIndex: number, eventIndex: number): FormGroup { return this.getScheduleEvents(dayIndex).at(eventIndex) as FormGroup; }

  // Safe control getters
  getControl(group: FormGroup, name: string): FormControl {
    return group.get(name) as FormControl;
  }
}
