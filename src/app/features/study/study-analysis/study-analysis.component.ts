import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EngineService } from '../../../core/services/engine.service';
import { ToggleComponent } from '@shared/ui';

@Component({
  selector: 'app-study-analysis',
  standalone: true,
  imports: [CommonModule, ToggleComponent],
  templateUrl: './study-analysis.component.html',
})
export class StudyAnalysisComponent {
  private engineService = inject(EngineService);

  // Inputs
  showToggle = input<boolean>(true);
  isEngineActive = input.required<boolean>();
  isEngineError = input.required<boolean>();
  engineEval = input.required<string | null>();
  enginePvLines = input.required<{
    eval: string;
    pvIndex: number;
    moves: { san: string; uci: string; moveNumber: number; showMoveNumber: boolean; isBlack: boolean }[];
  }[]>();
  currentPly = input.required<number>();

  // Outputs
  toggleEngine = output<void>();
  retryEngine = output<void>();

  onToggleEngine() {
    this.toggleEngine.emit();
  }

  onRetryEngine() {
    this.retryEngine.emit();
  }
}
