import { Injectable, inject, signal, computed } from '@angular/core';
import { StudyApiService } from './study-api.service';
import { WORLD_CHAMPIONSHIP_MATCHES } from '../data/world-championships.data';
import { WorldChampionshipMatch, WorldChampionshipEra } from '../models/world-championship.model';
import { DevLogger } from '../utils/dev-logger';

@Injectable({
  providedIn: 'root',
})
export class WorldChampionshipService {
  private studyApiService = inject(StudyApiService);

  private readonly matchesList = signal<WorldChampionshipMatch[]>(WORLD_CHAMPIONSHIP_MATCHES);
  private readonly studiesMap = signal<Map<number, number | string>>(new Map()); // year -> studyId
  readonly isFetchingStudies = signal<boolean>(false);

  readonly allMatches = computed(() => {
    const map = this.studiesMap();
    return this.matchesList().map((match) => {
      const studyId = map.get(match.year);
      return studyId ? { ...match, studyId } : match;
    });
  });

  constructor() {
    this.loadStudiesAndMatch();
  }

  loadStudiesAndMatch(): void {
    this.isFetchingStudies.set(true);
    // Fetch public studies including owner info
    this.studyApiService.getStudies(false, undefined, true, undefined, undefined, 'owner').subscribe({
      next: (res) => {
        this.isFetchingStudies.set(false);
        const studies: any[] = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const yearMap = new Map<number, number | string>();

        studies.forEach((study) => {
          const ownerName = (study.owner?.username || study.owner?.name || study.owner_name || '').toLowerCase();
          const title = (study.name || '').trim();

          // Check if study is created by account vonchess or starts/contains <Year> World Chess Championship
          const isVonchess = ownerName.includes('vonchess');
          
          // Match year pattern e.g. "1886 World Chess Championship" or "2024 World Chess Championship"
          const matchYear = title.match(/(\d{4})\s*World\s*Chess\s*Championship/i);
          if (matchYear && matchYear[1]) {
            const year = parseInt(matchYear[1], 10);
            // If study is created by vonchess, or if no study assigned for that year yet
            if (isVonchess || !yearMap.has(year)) {
              yearMap.set(year, study.id);
            }
          }
        });

        DevLogger.log('[WorldChampionshipService] Resolved study links count:', yearMap.size);
        this.studiesMap.set(yearMap);
      },
      error: (err) => {
        this.isFetchingStudies.set(false);
        DevLogger.error('[WorldChampionshipService] Error loading public studies:', err);
      },
    });
  }

  getMatchById(id: string): WorldChampionshipMatch | undefined {
    return this.allMatches().find((m) => m.id === id);
  }

  getMatchesByEra(era: WorldChampionshipEra): WorldChampionshipMatch[] {
    return this.allMatches().filter((m) => m.era === era);
  }
}
