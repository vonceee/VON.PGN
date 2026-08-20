import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MONIKER_BLOGS_DATA } from '../data/moniker-blogs.data';

export interface BlogGame {
  id?: number;
  title: string | null;
  pgn: string;
  order: number;
}

export interface Blog {
  id?: number;
  user_id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    name: string;
    bio?: string;
  };
  cover_image?: string;
  games?: BlogGame[];
}

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getBlogs(page = 1): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/blogs?page=${page}`).pipe(
      catchError(() => {
        // If API fails, return an empty blogs feed
        return of({
          data: [],
          current_page: 1,
          last_page: 1,
          prev_page_url: null,
          next_page_url: null,
        });
      })
    );
  }

  getMyBlogs(page = 1): Observable<any> {
    return this.http.get(`${this.apiUrl}/my/blogs?page=${page}`);
  }

  getBlog(slug: string): Observable<{ data: Blog }> {
    // Check hardcoded moniker blogs dictionary first
    if (MONIKER_BLOGS_DATA[slug]) {
      return of({ data: MONIKER_BLOGS_DATA[slug] });
    }

    return this.http.get<{ data: Blog }>(`${this.apiUrl}/blogs/${slug}`).pipe(
      catchError((err) => {
        console.error('Error fetching blog from API:', err);
        throw err;
      })
    );
  }

  createBlog(data: {
    title: string;
    summary: string | null;
    content: string;
    status: 'draft' | 'published';
    games?: { title: string | null; pgn: string; order: number }[];
  }): Observable<{ data: Blog }> {
    return this.http.post<{ data: Blog }>(`${this.apiUrl}/blogs`, data);
  }

  updateBlog(
    id: number,
    data: {
      title: string;
      summary: string | null;
      content: string;
      status: 'draft' | 'published';
      games?: { title: string | null; pgn: string; order: number }[];
    }
  ): Observable<{ data: Blog }> {
    return this.http.put<{ data: Blog }>(`${this.apiUrl}/blogs/${id}`, data);
  }

  deleteBlog(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/blogs/${id}`);
  }
}
