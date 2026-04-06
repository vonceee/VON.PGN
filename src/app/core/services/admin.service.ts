import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = environment.apiUrl + '/admin';

  private get headers() {
    return {
      Authorization: `Bearer ${this.auth.getToken()}`
    };
  }

  // Courses
  getCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/courses`, { headers: this.headers });
  }

  getCourse(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses/${id}`, { headers: this.headers });
  }

  createCourse(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/courses`, data, { headers: this.headers });
  }

  updateCourse(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/courses/${id}`, data, { headers: this.headers });
  }

  deleteCourse(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/courses/${id}`, { headers: this.headers });
  }

  // Chapters
  getChapter(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/chapters/${id}`, { headers: this.headers });
  }

  createChapter(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/chapters`, data, { headers: this.headers });
  }

  updateChapter(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/chapters/${id}`, data, { headers: this.headers });
  }

  deleteChapter(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/chapters/${id}`, { headers: this.headers });
  }

  // Lessons
  getLesson(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/lessons/${id}`, { headers: this.headers });
  }

  createLesson(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/lessons`, data, { headers: this.headers });
  }

  updateLesson(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/lessons/${id}`, data, { headers: this.headers });
  }

  deleteLesson(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/lessons/${id}`, { headers: this.headers });
  }

  // Tournaments
  getTournaments(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tournaments`, { headers: this.headers });
  }

  getTournament(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tournaments/${id}`, { headers: this.headers });
  }

  createTournament(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tournaments`, data, { headers: this.headers });
  }

  updateTournament(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tournaments/${id}`, data, { headers: this.headers });
  }

  deleteTournament(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tournaments/${id}`, { headers: this.headers });
  }

  // Coach Applications
  getCoachApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/coach-applications`, { headers: this.headers });
  }
}
