import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface OpeningInfo {
  eco: string;
  name: string;
}

/**
 * Service to manage and query chess opening names and ECO codes.
 * 
 * WHY:
 * We pre-compile a local openings database containing 3,690 entries from Lichess's CC0 dataset.
 * This lookup service runs strictly offline/locally to ensure instant O(1) matching during rapid move entries
 * and to prevent rate-limit blocks.
 * 
 * ALTERNATIVES CONSIDERED:
 * 1. Live Lichess Opening Explorer API: Rejected because Lichess requires OAuth tokens to access the endpoint
 *    as of early 2026 to prevent abuse, which would require user-specific settings.
 * 2. Bundling database directly in TypeScript source code: Rejected because Cloudflare Workers deployment
 *    imposes a strict 1MB size limit for SSR bundles. Loading 500KB of static data would blow the budget.
 * 
 * ASSUMPTIONS & EDGE CASES:
 * - FENs are normalized using the first 4 parts of the FEN string (piece placement, active color,
 *   castling rights, and en passant square).
 * - During the initial file fetch, the lookup will return null until the asset is fully loaded.
 */
@Injectable({
  providedIn: 'root',
})
export class OpeningService {
  private http = inject(HttpClient);

  // Writable signal holding the FEN-to-opening dictionary mapping.
  // Using a signal ensures computed properties in components auto-update once data is loaded.
  public openingsMap = signal<Record<string, OpeningInfo> | null>(null);

  private isFirstLoad = true;

  constructor() {
    this.loadOpenings();
  }

  /**
   * Lazily loads the chess openings database from the static assets.
   */
  public loadOpenings(): void {
    if (!this.isFirstLoad) return;
    this.isFirstLoad = false;

    this.http.get<Record<string, OpeningInfo>>('/assets/openings-fen.json').subscribe({
      next: (data) => {
        this.openingsMap.set(data);
      },
      error: (err) => {
        console.error('Failed to load chess openings database:', err);
      },
    });
  }

  /**
   * Helper to normalize a standard FEN string into its matching components.
   * Keeps only: piece placement, turn, castling rights, and en passant square.
   * 
   * @param fen Standard FEN string
   * @returns Normalized FEN string
   */
  public normalizeFen(fen: string): string {
    if (!fen) return '';
    return fen.trim().split(' ').slice(0, 4).join(' ');
  }
}
