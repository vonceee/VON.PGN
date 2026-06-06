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
  private apiUrl = environment.apiUrl + '/admin';

  // Courses
  getCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/courses`);
  }

  getCourse(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses/${id}`);
  }

  createCourse(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/courses`, data);
  }

  updateCourse(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/courses/${id}`, data);
  }

  deleteCourse(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/courses/${id}`);
  }

  // Chapters
  getChapter(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/chapters/${id}`);
  }

  createChapter(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/chapters`, data);
  }

  updateChapter(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/chapters/${id}`, data);
  }

  deleteChapter(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/chapters/${id}`);
  }

  // Lessons
  getLesson(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/lessons/${id}`);
  }

  createLesson(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/lessons`, data);
  }

  updateLesson(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/lessons/${id}`, data);
  }

  deleteLesson(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/lessons/${id}`);
  }

  // Tournaments
  getTournaments(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tournaments`);
  }

  getTournament(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tournaments/${id}`);
  }

  createTournament(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tournaments`, data);
  }

  updateTournament(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tournaments/${id}`, data);
  }

  deleteTournament(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tournaments/${id}`);
  }


  // Academy Enrollments
  getAcademyEnrollments(params: any = {}): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/academy/enrollments`, { params });
  }

  updateAcademyEnrollmentStatus(id: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/academy/enrollments/${id}`, { status });
  }

  deleteAcademyEnrollment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/academy/enrollments/${id}`);
  }

  getUsers(params: any = {}): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users`, { params });
  }

  toggleAdmin(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/${id}/toggle-admin`, {});
  }

  toggleOrganizer(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/${id}/toggle-organizer`, {});
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${id}`);
  }
}
