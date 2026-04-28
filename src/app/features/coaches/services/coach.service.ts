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

  createCoach(coach: Partial<Coach>): Observable<Coach> {
    const data = this.mapToFormData(coach);
    return this.http.post<{data: Coach}>(`${environment.apiUrl}/admin/coaches`, data).pipe(
      map(res => res.data)
    );
  }

  updateCoach(id: string, coach: Partial<Coach>): Observable<Coach> {
    const data = this.mapToFormData(coach);
    data.append('_method', 'PUT'); // Laravel requirement for multipart/form-data with PUT
    
    return this.http.post<{data: Coach}>(`${environment.apiUrl}/admin/coaches/${id}`, data).pipe(
      map(res => res.data)
    );
  }

  deleteCoach(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/admin/coaches/${id}`);
  }

  private mapToFormData(coach: Partial<Coach>): FormData {
    const formData = new FormData();
    
    if (coach.id) formData.append('id', coach.id);
    if (coach.name) formData.append('name', coach.name);
    if (coach.title) formData.append('title', coach.title);
    if (coach.shortInfo) formData.append('short_info', coach.shortInfo);
    if (coach.fideRating !== undefined) formData.append('fide_rating', coach.fideRating?.toString() || '');
    
    // profilePicture can be a File or a string URL
    if (coach.profilePicture) {
      formData.append('profile_picture', coach.profilePicture);
    }

    formData.append('is_academy_instructor', coach.isAcademyInstructor ? '1' : '0');
    formData.append('bio', coach.bio || '');
    formData.append('location', coach.location || '');
    formData.append('availability', coach.availability || '');
    formData.append('coaching_type', coach.coachingType || 'Online');

    // Handle arrays and objects by stringifying them or appending individually
    // Laravel expects arrays as field[]
    coach.playingExperience?.forEach(exp => formData.append('playing_experience[]', exp));
    coach.teachingExperience?.forEach(exp => formData.append('teaching_experience[]', exp));
    coach.teachingMethods?.forEach(method => formData.append('teaching_methods[]', method));
    
    if (coach.socialMedia) {
      Object.entries(coach.socialMedia).forEach(([key, value]) => {
        formData.append(`social_media[${key}]`, value || '');
      });
    }

    return formData;
  }
}