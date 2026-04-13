import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { MapCoordinates } from '../models/tournament-editor.models';

@Injectable({
  providedIn: 'root',
})
export class TournamentMapsService {
  private http = inject(HttpClient);

  extractCoords(url: string): MapCoordinates | null {
    let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      const name = this.extractPlaceName(url);
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]), name: name ?? undefined };
    }

    match = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }

    match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (match) {
      const name = this.extractPlaceName(url);
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]), name: name ?? undefined };
    }

    return null;
  }

  private extractPlaceName(url: string): string | null {
    const match = url.match(/\/place\/([^/@]+)/);
    if (match) {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
    return null;
  }

  isShortenedUrl(url: string): boolean {
    return /maps\.app\.goo\.gl|goo\.gl\/maps/.test(url);
  }

  resolveShortenedUrl(url: string): Observable<MapCoordinates | null> {
    return this.http
      .post<{ url: string }>(`${environment.apiUrl}/admin/resolve-maps-url`, { url })
      .pipe(
        map((res) => this.extractCoords(res.url))
      );
  }
}
