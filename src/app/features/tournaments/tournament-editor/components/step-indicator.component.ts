import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Step {
  key: string;
  label: string;
  fields: string[];
}

@Component({
  selector: 'app-step-indicator',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./step-indicator.component.css'],
  template: `
    <div class="progress-bar mb-10">
      <div class="progress-steps">
        @for (step of steps; track step.key; let i = $index) {
        <div class="step-item" [ngClass]="'step-' + getStepStatus(i)">
          @if (i > 0) {
          <div class="step-connector" [ngClass]="{'completed': stepsCompleted.has(i)}"></div>
          }
          <button 
            type="button" 
            class="step-circle" 
            [disabled]="!isStepClickable(i)" 
            (click)="goToStep.emit(i)"
          >
            @if (getStepStatus(i) === 'completed') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clip-rule="evenodd" />
            </svg>
            } @else {
            {{ i + 1 }}
            }
          </button>
          <span class="step-label">{{ step.label }}</span>
        </div>
        }
      </div>
    </div>
  `
})
export class StepIndicatorComponent {
  @Input() steps!: Step[];
  @Input() currentStep = 0;
  @Input() stepsCompleted: Set<number> = new Set();
  @Input() isEditMode = false;
  @Output() goToStep = new EventEmitter<number>();

  getStepStatus(index: number): 'completed' | 'current' | 'upcoming' {
    if (this.isEditMode && index !== this.currentStep) return 'completed';
    if (this.stepsCompleted.has(index) && index !== this.currentStep) return 'completed';
    if (index === this.currentStep) return 'current';
    return 'upcoming';
  }

  isStepClickable(index: number): boolean {
    if (this.isEditMode) return true;
    return this.stepsCompleted.has(index) || index <= this.currentStep;
  }
}
