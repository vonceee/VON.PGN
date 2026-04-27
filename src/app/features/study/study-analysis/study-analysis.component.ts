import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EngineService, type SearchMode } from '../../../core/services/engine.service';
import { computed } from '@angular/core';

@Component({
  selector: 'app-study-analysis',
  standalone: true,
  imports: [CommonModule, MatSlideToggleModule],
  templateUrl: './study-analysis.component.html',
})
export class StudyAnalysisComponent {
  private engineService = inject(EngineService);

  // Inputs
  isEngineActive = input.required<boolean>();
  isEngineError = input.required<boolean>();
  engineEval = input.required<string | null>();
  engineDepth = input.required<number>();
  formattedNps = input.required<string>();
  showEngineSettings = input.required<boolean>();
  multiPvCount = input.required<number>();
  searchMode = input.required<SearchMode>();
  enginePvLines = input.required<{ eval: string; pv: string[]; pvIndex: number }[]>();
  currentPly = input.required<number>();

  // Outputs
  toggleEngine = output<void>();
  retryEngine = output<void>();
  toggleSettings = output<void>();
  multiPvChange = output<number>();

  onToggleEngine() {
    this.toggleEngine.emit();
  }

  onRetryEngine() {
    this.retryEngine.emit();
  }

  onToggleSettings() {
    this.toggleSettings.emit();
  }

  onMultiPvChange(count: number) {
    this.multiPvChange.emit(count);
  }
}
