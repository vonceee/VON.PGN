import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, concat } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Study, StudyChapter } from '../models/study.model';

@Injectable({
  providedIn: 'root',
})
export class StudyApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private studiesCache = new Map<string, any>();

  getStudies(
    my: boolean = false,
    category?: string,
    forceRefresh = false,
    search?: string,
    sort?: string
  ): Observable<any> {
    let params = my ? 'my=1' : '';
    if (category) {
      params += params ? `&category=${category}` : `category=${category}`;
    }
    if (search) {
      params += params ? `&search=${encodeURIComponent(search)}` : `search=${encodeURIComponent(search)}`;
    }
    if (sort) {
      params += params ? `&sort=${sort}` : `sort=${sort}`;
    }
    const queryString = params ? `?${params}` : '';
    const cacheKey = `${my}_${category || 'all'}_${search || ''}_${sort || ''}`;

    const apiCall = this.http.get<any>(`${this.apiUrl}/studies${queryString}`).pipe(
      tap((res) => this.studiesCache.set(cacheKey, res))
    );

    if (this.studiesCache.has(cacheKey) && !forceRefresh) {
      return concat(
        of(this.studiesCache.get(cacheKey)),
        apiCall
      );
    }

    return apiCall;
  }

  clearCache(): void {
    this.studiesCache.clear();
  }

  createStudy(
    name: string,
    description: string = '',
    visibility: string = 'public',
    category: string = 'general',
    orientation: string = 'white'
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies`, { name, description, visibility, category, orientation }).pipe(
      tap(() => this.clearCache())
    );
  }

  updateStudy(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/studies/${id}`, data).pipe(
      tap(() => this.clearCache())
    );
  }

  deleteStudy(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/studies/${id}`).pipe(
      tap(() => this.clearCache())
    );
  }

  getStudyRaw(id: number): Observable<{ data: Study }> {
    return this.http.get<{ data: Study }>(`${this.apiUrl}/studies/${id}`);
  }

  addChapter(studyId: number, name: string, fen?: string, orientation?: 'white' | 'black'): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/chapters`, { 
      name, 
      initial_fen: fen,
      orientation: orientation 
    });
  }

  updateChapter(studyId: number, chapterId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/studies/${studyId}/chapters/${chapterId}`, data);
  }

  deleteChapter(studyId: number, chapterId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/studies/${studyId}/chapters/${chapterId}`);
  }
  
  reorderChapters(studyId: number, chapterIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/chapters/reorder`, { 
      chapter_ids: chapterIds 
    });
  }

  addCollaborator(studyId: number, userId: string, canEdit?: boolean): Observable<any> {
    const body: any = { user_id: userId };
    if (canEdit !== undefined) {
      body.can_edit = canEdit;
    }
    return this.http.post(`${this.apiUrl}/studies/${studyId}/collaborators`, body);
  }

  removeCollaborator(studyId: number, userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/studies/${studyId}/collaborators/${userId}`);
  }

  updateCollaboratorPermission(studyId: number, userId: string, canEdit: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/studies/${studyId}/collaborators/${userId}`, { can_edit: canEdit });
  }

  getStudyMessages(studyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/studies/${studyId}/messages`);
  }

  sendMessageToDb(studyId: number, body: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/messages`, { body });
  }

  clearStudyChat(studyId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/studies/${studyId}/messages`);
  }

  importPgn(studyId: number, pgn: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/studies/${studyId}/import-pgn`, { pgn }).pipe(
      tap(() => this.clearCache())
    );
  }

  exportPgnBlob(studyId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/studies/${studyId}/export-pgn`, { 
      responseType: 'blob' 
    });
  }
}
