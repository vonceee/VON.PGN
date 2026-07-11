import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  games?: BlogGame[];
}

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getBlogs(page = 1): Observable<any> {
    return this.http.get(`${this.apiUrl}/blogs?page=${page}`);
  }

  getMyBlogs(page = 1): Observable<any> {
    return this.http.get(`${this.apiUrl}/my/blogs?page=${page}`);
  }

  getBlog(slug: string): Observable<{ data: Blog }> {
    return this.http.get<{ data: Blog }>(`${this.apiUrl}/blogs/${slug}`);
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
