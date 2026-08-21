import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-review-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-section.component.html'
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

