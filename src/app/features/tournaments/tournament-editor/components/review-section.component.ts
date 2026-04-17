import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeadingComponent  } from '@shared/ui';

@Component({
  selector: 'app-review-section',
  standalone: true,
  imports: [CommonModule, SectionHeadingComponent],
  styleUrls: ['./review-section.component.css'],
  template: `
    <div class="step-content">
      <app-section-heading text="Review &" highlight="Submit" size="text-3xl mb-1"></app-section-heading>

      <p class="text-sm text-slate-600 dark:text-slate-400 mb-8">Review all information before submitting. Click any section header to go back and edit.</p>

      <!-- Basic Info -->
      <div class="review-section">
        <div class="review-header" (click)="onEdit('sec-basic')">
          <h3>Basic Information</h3>
          <span class="review-edit">Edit</span>
        </div>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-label">Name</span>
            <span class="review-value">{{ data['name'] || '—' }}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Status</span>
            <span class="review-value capitalize">{{ data['status'] }}</span>
          </div>
          @if (data['description']) {
          <div class="review-item full-width">
            <span class="review-label">Description</span>
            <span class="review-value">{{ data['description'] }}</span>
          </div>
          }
        </div>
      </div>

      <!-- Dates & Location -->
      <div class="review-section">
        <div class="review-header" (click)="onEdit('sec-dates')">
          <h3>Dates & Location</h3>
          <span class="review-edit">Edit</span>
        </div>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-label">Dates</span>
            <span class="review-value">
              {{ formatDate(data['dates']?.start) }} - {{ formatDate(data['dates']?.end) }}
            </span>
          </div>
          @if (data['registrationDeadline']) {
          <div class="review-item">
            <span class="review-label">Registration Deadline</span>
            <span class="review-value">{{ formatDate(data['registrationDeadline']) }}</span>
          </div>
          }
          <div class="review-item">
            <span class="review-label">Location</span>
            <span class="review-value">{{ data['location'] || '—' }}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Coordinates</span>
            <span class="review-value">{{ data['coordinates']?.lat }}, {{ data['coordinates']?.lng }}</span>
          </div>
        </div>
      </div>

      <!-- Format -->
      <div class="review-section">
        <div class="review-header" (click)="onEdit('sec-format')">
          <h3>Format & Rules</h3>
          <span class="review-edit">Edit</span>
        </div>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-label">Format</span>
            <span class="review-value">{{ data['format'] || '—' }}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Time Control</span>
            <span class="review-value">{{ data['timeControl'] || '—' }}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Rounds</span>
            <span class="review-value">{{ data['rounds'] }}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Registration Fee</span>
            <span class="review-value">{{ data['entryFee'] || '—' }}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Total Prize Pool</span>
            <span class="review-value">{{ data['prizePool'] || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Organizer -->
      <div class="review-section">
        <div class="review-header" (click)="onEdit('sec-organizer')">
          <h3>Organizer</h3>
          <span class="review-edit">Edit</span>
        </div>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-label">Organizer</span>
            <span class="review-value">{{ data['organizer'] || '—' }}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Contact</span>
            <span class="review-value">{{ data['contact'] || '—' }}</span>
          </div>
          @if (data['link']) {
          <div class="review-item">
            <span class="review-label">Link</span>
            <span class="review-value">{{ data['link'] }}</span>
          </div>
          }
        </div>
      </div>

      <!-- Registration Instructions -->
      <div class="review-section">
        <div class="review-header" (click)="onEdit('sec-registration')">
          <h3>Registration Instructions</h3>
          <span class="review-edit">Edit</span>
        </div>
        @if (data['registrationInstructions']) {
        <p class="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line">{{ data['registrationInstructions'] }}</p>
        } @else {
        <p class="text-sm text-slate-400 mt-2">No registration instructions specified.</p>
        }
      </div>

      <!-- Eligibility -->
      <div class="review-section">
        <div class="review-header" (click)="onEdit('sec-eligibility')">
          <h3>Eligibility</h3>
          <span class="review-edit">Edit</span>
        </div>
        @if (data['eligibility']?.length) {
        <ul class="space-y-1 mt-2">
          @for (req of data['eligibility']; track req) {
          <li class="text-sm flex items-start gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0"></span>
            {{ req }}
          </li>
          }
        </ul>
        } @else {
        <p class="text-sm text-slate-400 mt-2">No eligibility requirements specified.</p>
        }
      </div>

      <!-- Prizes -->
      <div class="review-section">
        <div class="review-header" (click)="onEdit('sec-prizes')">
          <h3>Prizes</h3>
          <span class="review-edit">Edit</span>
        </div>
        @if (data['categories']) {
        @for (cat of (data['categories'] | keyvalue); track cat.key) {
        <div class="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h4 class="font-bold mb-2 capitalize">{{ cat.key.toString().replace('_', ' ') }}</h4>
          <table class="w-full text-sm">
            <tbody>
              @for (prize of (cat.value['prizes'] | keyvalue: comparePrizeKeys); track prize.key) {
              <tr class="border-t border-border-theme first:border-0">
                <td class="py-1.5 font-semibold capitalize">{{ prize.key.replace('_', ' ') }}</td>
                <td class="py-1.5 text-right text-slate-600 dark:text-slate-400">{{ prize.value }}</td>
              </tr>
              }
            </tbody>
          </table>
        </div>
        }
        } @else {
        <p class="text-sm text-slate-400 mt-2">No prize categories specified.</p>
        }
      </div>

      <!-- Schedule -->
      <div class="review-section">
        <div class="review-header" (click)="onEdit('sec-schedule')">
          <h3>Schedule</h3>
          <span class="review-edit">Edit</span>
        </div>
        @if (data['schedule']) {
        @for (day of (data['schedule'] | keyvalue); track day.key) {
        <div class="mt-3 border border-border-theme rounded-lg overflow-hidden">
          <div class="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-border-theme">
            <span class="text-xs font-bold text-cyan-500 uppercase">{{ day.key.toString().replace('_', ' ') }}</span>
            <span class="text-sm text-slate-600 dark:text-slate-400 ml-2">{{ formatDate(day.value.date) }}</span>
          </div>
          <table class="w-full text-sm">
            <tbody>
              @for (event of day.value.events; track event.name) {
              <tr class="border-t border-border-theme first:border-0">
                <td class="px-4 py-1.5 font-semibold">{{ event.name }}</td>
                <td class="px-4 py-1.5 text-right text-slate-600 dark:text-slate-400">{{ event.time }}</td>
              </tr>
              }
            </tbody>
          </table>
        </div>
        }
        } @else {
        <p class="text-sm text-slate-400 mt-2">No schedule specified.</p>
        }
      </div>
    </div>
  `
})
export class ReviewSectionComponent {
  @Input() data!: Record<string, any>;
  @Input() comparePrizeKeys!: (a: { key: string }, b: { key: string }) => number;
  @Output() editSection = new EventEmitter<string>();

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  onEdit(sectionId: string) {
    this.editSection.emit(sectionId);
  }
}

