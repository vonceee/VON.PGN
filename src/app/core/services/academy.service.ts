import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AcademyEnrollment {
  id?: number;
  full_name: string | null | undefined;
  email: string | null | undefined;
  contact_number: string | null | undefined;
  chess_level: string | null | undefined;
  experience?: string | null | undefined;
  status: 'pending' | 'contacted' | 'confirmed' | 'paid' | 'cancelled';
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AcademyService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  enroll(data: Partial<AcademyEnrollment>): Observable<any> {
    return this.http.post(`${this.apiUrl}/academy/enroll`, data);
  }
}
