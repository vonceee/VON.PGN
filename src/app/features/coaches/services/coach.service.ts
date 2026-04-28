import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Coach } from '../models/coach.model';
import { environment } from '../../../../environments/environment';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CoachService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/coaches`;

  private coaches$ = this.http.get<{data: Coach[]}>(this.apiUrl).pipe(
    map(res => res.data)
  );

  coaches = toSignal(this.coaches$, { initialValue: [] });

  getCoachById(id: string): Observable<Coach> {
    return this.http.get<{data: Coach}>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }
}