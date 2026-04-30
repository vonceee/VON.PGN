import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { LichessExplorerResponse, TablebaseResponse } from '../models/opening.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OpeningExplorerService {
  private http = inject(HttpClient);
  private readonly API_BASE = `${environment.apiUrl}/lichess`;

  getExploration(fen: string, db: 'masters' | 'lichess' | 'player' = 'lichess'): Observable<LichessExplorerResponse> {
    const url = `${this.API_BASE}/explorer/${db}`;
    const params = new HttpParams().set('fen', fen);

    return this.http.get<LichessExplorerResponse>(url, { params }).pipe(
      map(data => ({ ...data, isOpening: true }))
    );
  }

  getTablebase(fen: string, variant: string = 'standard'): Observable<TablebaseResponse> {
    const url = `${this.API_BASE}/tablebase/${variant}`;
    const params = new HttpParams().set('fen', fen);

    return this.http.get<TablebaseResponse>(url, { params }).pipe(
      map(data => ({ ...data, isTablebase: true }))
    );
  }
}