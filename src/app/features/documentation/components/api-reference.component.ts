import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-docs-api-reference',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="text-3xl font-semibold mb-6 border-b border-border-base pb-4">
      API Reference
    </h2>
    <div class="prose prose-slate max-w-none text-gray-500">
      <p class="text-lg leading-relaxed mb-6">
        Developers can programmatically integrate with the vonchess platform to fetch player stats, studies, and
        repertoires.
      </p>

      <h3 id="core-endpoints" class="text-xl font-semibold text-slate-900 mb-4">Core endpoints</h3>
      <div class="overflow-x-auto border border-border-base rounded-2xl bg-white mb-8">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-border-base bg-slate-200/50 text-slate-900">
              <th class="p-4 font-semibold">Method</th>
              <th class="p-4 font-semibold">Endpoint</th>
              <th class="p-4 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-base text-gray-500">
            <tr>
              <td class="p-4 font-mono text-slate-900">GET</td>
              <td class="p-4 font-mono">/api/v1/profile</td>
              <td class="p-4">Retrieve current authenticated user profiles and ratings.</td>
            </tr>
            <tr>
              <td class="p-4 font-mono text-slate-900">GET</td>
              <td class="p-4 font-mono">/api/v1/studies</td>
              <td class="p-4">List collaborative chess studies owned by the user.</td>
            </tr>
            <tr>
              <td class="p-4 font-mono text-slate-900">GET</td>
              <td class="p-4 font-mono">/api/v1/drills</td>
              <td class="p-4">Retrieve user's custom opening repertoire moves and drill states.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 id="sample-response" class="text-xl font-semibold text-slate-900 mb-4">Sample JSON response</h3>
      <pre class="bg-white border border-border-base rounded-2xl p-6 font-mono text-xs text-slate-900 overflow-x-auto leading-relaxed shadow-sm"><code>{{ '{' }}
  "status": "success",
  "data": {{ '{' }}
    "id": "std_8f93j2a",
    "title": "My Spanish Repertoire Study",
    "chapters_count": 3,
    "created_at": "2026-08-03T11:47:13Z"
  {{ '}' }}
{{ '}' }}</code></pre>
    </div>
  `
})
export class ApiReferenceComponent { }
