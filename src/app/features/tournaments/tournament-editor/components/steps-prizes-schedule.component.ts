import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { ButtonComponent  } from '@shared/ui';

// Step 7: Prizes
@Component({
  selector: 'app-step-prizes',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      
      @if (categoriesArray.length === 0) {
      <p class="text-slate-400 text-sm py-4 text-center">No prize categories added.</p>
      }
      
      <div class="space-y-8">
        @for (cat of categoriesArray.controls; track $index; let ci = $index) {
        <div class="p-6 bg-slate-50 /50 rounded-xl border border-border-theme">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-semibold text-lg text-slate-800 ">Category {{ ci + 1 }}</h3>
            <button
              appButton
              variant="danger"
              (click)="removeCategory.emit(ci)"
            >
              Remove Category
            </button>
          </div>

          <div class="space-y-4 mb-8">
            <label class="block text-sm font-semibold text-slate-700 ">Category Name</label>
            <input 
              type="text" 
              [formControl]="getControl(categoryGroup(ci), 'name')" 
              placeholder="e.g. Open, Under 14"
              class="w-full p-3 border border-border-theme rounded-lg focus:outline-none focus:border-cyan-400 " 
            />
          </div>

          <div class="space-y-6">
            <div class="p-4 bg-white  rounded-lg border border-border-theme">
              <label class="text-sm font-semibold block mb-4 text-cyan-600  uppercase ">Main Prizes</label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-slate-500 uppercase">1st Place</label>
                  <input
                    type="text"
                    [formControl]="getControl(categoryGroup(ci), 'champion')"
                    placeholder="P50,000 + trophy"
                    class="w-full p-2.5 text-sm border border-border-theme rounded-md focus:outline-none focus:border-cyan-400 "
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-slate-500 uppercase">2nd Place</label>
                  <input
                    type="text"
                    [formControl]="getControl(categoryGroup(ci), '2nd_place')"
                    placeholder="Prize value"
                    class="w-full p-2.5 text-sm border border-border-theme rounded-md focus:outline-none focus:border-cyan-400 "
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-slate-500 uppercase">3rd Place</label>
                  <input
                    type="text"
                    [formControl]="getControl(categoryGroup(ci), '3rd_place')"
                    placeholder="Prize value"
                    class="w-full p-2.5 text-sm border border-border-theme rounded-md focus:outline-none focus:border-cyan-400 "
                  />
                </div>
              </div>

              @if (getCategoryExtraPrizes(ci).length > 0) {
              <div class="space-y-4 mt-6 pt-6 border-t border-dashed border-border-theme">
                @for (ep of getCategoryExtraPrizes(ci).controls; track $index; let ei = $index) {
                <div class="flex gap-4 items-start bg-slate-50 /30 p-3 rounded-lg">
                  <div class="flex-1 space-y-2">
                    <div class="flex gap-2 items-center">
                      <input
                        type="text"
                        [formControl]="getControl(extraPrizeGroup(ci, ei), 'label')"
                        placeholder="Place name (e.g. 4th - 10th)"
                        class="flex-1 p-2 text-sm border border-border-theme rounded-md focus:outline-none focus:border-cyan-400 "
                      />
                      <button
                        appButton
                        variant="danger"
                        (click)="removeExtraPrize.emit({ci, ei})"
                      >
                        ✕
                      </button>
                    </div>
                      <input 
                        type="text" 
                        [formControl]="getControl(extraPrizeGroup(ci, ei), 'value')" 
                        placeholder="Prize value"
                        class="w-full p-2 text-sm border border-border-theme rounded-md focus:outline-none focus:border-cyan-400 " 
                      />
                  </div>
                </div>
                }
              </div>
              }
              <div class="mt-4">
                <button
                  appButton
                  variant="outline"
                  (click)="addExtraPrize.emit(ci)"
                >
                  + Add Extra Place
                </button>
              </div>
            </div>

            <div class="p-4 bg-white  rounded-lg border border-border-theme">
              <label class="text-sm font-semibold block mb-4 text-purple-600  uppercase ">Special Awards</label>
              <div class="space-y-4">
                @for (award of getCategorySpecialAwards(ci).controls; track $index; let ai = $index) {
                <div class="p-4 bg-slate-50 /30 rounded-lg border border-border-theme">
                  <div class="flex gap-3 items-center mb-3">
                       <input
                         type="text"
                         [formControl]="getControl(specialAwardGroup(ci, ai), 'name')"
                         placeholder="e.g. Top Senior"
                         class="flex-1 p-2.5 text-sm border border-border-theme rounded-md focus:outline-none focus:border-cyan-400 "
                       />
                      <select 
                        [formControl]="getControl(specialAwardGroup(ci, ai), 'type')"
                        class="p-2.5 text-sm border border-border-theme rounded-md focus:outline-none focus:border-cyan-400 bg-white  "
                      >
                      <option value="simple">Simple</option>
                      <option value="nested">1st/2nd/3rd Style</option>
                    </select>
                    <button
                      appButton
                      variant="danger"
                      (click)="removeSpecialAward.emit({ci, ai})"
                    >
                      ✕
                    </button>
                  </div>
                  @if (specialAwardGroup(ci, ai).get('type')?.value === 'simple') {
                    <input 
                      type="text" 
                      [formControl]="getControl(specialAwardGroup(ci, ai), 'value')" 
                      placeholder="Prize value"
                      class="w-full p-2.5 text-sm border border-border-theme rounded-md focus:outline-none focus:border-cyan-400 " 
                    />
                  } @else {
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="space-y-1">
                      <label class="text-xs font-semibold text-slate-500 uppercase ml-1">1st</label>
                      <input 
                        type="text" 
                        [formControl]="getControl(specialAwardGroup(ci, ai), '1st')" 
                        placeholder="1st prize"
                        class="w-full p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 " 
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs font-semibold text-slate-500 uppercase ml-1">2nd</label>
                      <input 
                        type="text" 
                        [formControl]="getControl(specialAwardGroup(ci, ai), '2nd')" 
                        placeholder="2nd prize"
                        class="w-full p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 " 
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs font-semibold text-slate-500 uppercase ml-1">3rd</label>
                      <input 
                        type="text" 
                        [formControl]="getControl(specialAwardGroup(ci, ai), '3rd')" 
                        placeholder="3rd prize"
                        class="w-full p-2 text-sm border border-border-theme rounded focus:outline-none focus:border-cyan-400 " 
                      />
                    </div>
                  </div>
                  }
                </div>
                }
              </div>
              <div class="mt-4">
                <button
                  appButton
                  variant="outline"
                  (click)="addSpecialAward.emit(ci)"
                >
                  + Add Special Award
                </button>
              </div>
            </div>
          </div>
        </div>
        }
        <button
          appButton
          variant="primary"
          (click)="addCategory.emit()"
          class="w-full md:w-auto"
        >
          + Add New Category
        </button>
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

  ngOnInit() {}

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
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      @if (scheduleDaysArray.length === 0) {
      <p class="text-slate-400 text-sm py-8 text-center bg-slate-50  rounded-xl border-2 border-dashed border-border-theme">No schedule days added yet.</p>
      }
      
      <div class="space-y-6">
        @for (day of scheduleDaysArray.controls; track $index; let di = $index) {
        <div class="p-6 bg-white  rounded-xl border border-border-theme shadow-sm">
          <div class="flex justify-between items-center mb-6">
            <span class="bg-accent  text-cyan-700  px-3 py-1 rounded-full text-xs font-semibold uppercase ">Day {{ di + 1 }} Schedule</span>
            <div class="flex gap-2">
              <button
                appButton
                variant="outline"
                (click)="addScheduleEvent.emit(di)"
              >
                + Add Event
              </button>
              <button
                appButton
                variant="danger"
                (click)="removeScheduleDay.emit(di)"
              >
                Remove Day
              </button>
            </div>
          </div>
          <div class="space-y-3">
            @for (event of getScheduleEvents(di).controls; track $index; let ei = $index) {
            <div class="flex gap-3 items-center group">
              <input 
                type="text" 
                [formControl]="getControl(scheduleEventGroup(di, ei), 'name')"
                placeholder="e.g. Onsite Registration"
                class="flex-1 p-3 text-sm border border-border-theme rounded-lg focus:outline-none focus:border-cyan-400 " 
              />
              <input 
                type="text" 
                [formControl]="getControl(scheduleEventGroup(di, ei), 'time')"
                placeholder="Time (e.g. 9:00 AM - 11:00 AM)"
                class="w-48 p-3 text-sm border border-border-theme rounded-lg focus:outline-none focus:border-cyan-400 " 
              />
              <button
                appButton
                variant="danger"
                (click)="removeScheduleEvent.emit({di, ei})"
                class="opacity-50 group-hover:opacity-100 "
              >
                ✕
              </button>
            </div>
            }
          </div>
        </div>
        }
        <button
          appButton
          variant="outline"
          (click)="addScheduleDay.emit()"
          class="w-full"
        >
          + Add New Day
        </button>
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

  ngOnInit() {}

  scheduleDayGroup(index: number): FormGroup { return this.scheduleDaysArray.at(index) as FormGroup; }
  getScheduleEvents(dayIndex: number): FormArray { return this.scheduleDaysArray.at(dayIndex).get('events') as FormArray; }
  scheduleEventGroup(dayIndex: number, eventIndex: number): FormGroup { return this.getScheduleEvents(dayIndex).at(eventIndex) as FormGroup; }

  // Safe control getters
  getControl(group: FormGroup, name: string): FormControl {
    return group.get(name) as FormControl;
  }
}


