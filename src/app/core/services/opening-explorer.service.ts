import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LichessExplorerResponse } from '../models/opening.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OpeningExplorerService {
  private readonly MASTERS_API_URL = 'https://explorer.lichess.ovh/masters';
  private readonly LICHESS_API_URL = 'https://explorer.lichess.ovh/lichess';

  constructor(private http: HttpClient) {}

  getExploration(fen: string, useMasterDb: boolean = true): Observable<LichessExplorerResponse> {
    const url = useMasterDb ? this.MASTERS_API_URL : this.LICHESS_API_URL;

    const params = new HttpParams()
      .set('fen', fen)
      .set('moves', '10');

    const headers = new HttpHeaders(
      environment.lichessToken
        ? { Authorization: `Bearer ${environment.lichessToken}` }
        : {}
    );

    return this.http.get<LichessExplorerResponse>(url, { params, headers });
  }
}