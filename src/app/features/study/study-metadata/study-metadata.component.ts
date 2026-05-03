import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyChapter } from '../../../core/models/study.model';

@Component({
  selector: 'app-study-metadata',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './study-metadata.component.html',
})
export class StudyMetadataComponent {
  chapter = input<StudyChapter | null>(null);

  tags = computed(() => this.chapter()?.pgn_tags || {});

  event = computed(() => this.tags()['Event'] || 'Casual Game');
  date = computed(() => this.tags()['Date'] || '');
  round = computed(() => this.tags()['Round'] || '');
  result = computed(() => this.tags()['Result'] || '*');

  whitePlayer = computed(() => {
    const name = this.tags()['White'] || 'White';
    const elo = this.tags()['WhiteElo'];
    const title = this.tags()['WhiteTitle'];
    return { name, elo, title };
  });

  blackPlayer = computed(() => {
    const name = this.tags()['Black'] || 'Black';
    const elo = this.tags()['BlackElo'];
    const title = this.tags()['BlackTitle'];
    return { name, elo, title };
  });

  hasMetadata = computed(() => {
    const t = this.tags();
    return Object.keys(t).length > 0 && (t['White'] || t['Black'] || t['Event']);
  });
}
