import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-docs-core-concepts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h2 class="text-3xl font-semibold mb-6 border-b border-border-base pb-4">
      Core Concepts
    </h2>
    <div class="prose prose-slate max-w-none text-gray-500">
      <p class="text-lg leading-relaxed mb-6">
        Learn about the core features that power the vonchess ecosystem, including collaborative studies, opening
        drills, and our historical database.
      </p>

      <div class="space-y-8 my-8">
        <div id="collaborative-studies" class="border-l-4 border-accent pl-6 py-1">
          <h3 class="text-xl font-semibold text-content mb-2">Collaborative studies</h3>
          <p class="text-sm leading-relaxed text-gray-500">
            Studies are interactive, multiplayer boards where you can import PGNs, play through variations, and
            analyze with friends in real-time. Simply create a study from the <a routerLink="/study"
              class="text-accent underline">Studies list</a> and share the link.
          </p>
        </div>

        <div id="opening-drills" class="border-l-4 border-accent pl-6 py-1">
          <h3 class="text-xl font-semibold text-content mb-2">Opening Drills</h3>
          <p class="text-sm leading-relaxed text-gray-500">
            Build muscle memory for your opening repertoire. In the <a routerLink="/study/drills"
              class="text-accent underline">Drills section</a>, you can practice your white and black repertoires.
            The system simulates computer responses based on your loaded moves to test your knowledge.
          </p>
        </div>

        <div id="world-championships-database" class="border-l-4 border-accent pl-6 py-1">
          <h3 class="text-xl font-semibold text-content mb-2">World championships database</h3>
          <p class="text-sm leading-relaxed text-gray-500">
            Access every game played in FIDE World Chess Championships from 1886 to the present. You can view
            tournament statistics, venues, and dive directly into interactive boards for any historic matchup
            under the <a routerLink="/world-championships" class="text-accent underline">World Championships
              archive</a>.
          </p>
        </div>
      </div>
    </div>
  `
})
export class CoreConceptsComponent { }
