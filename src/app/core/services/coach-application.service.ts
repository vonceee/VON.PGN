import { inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CoachApplication } from '../models/coach-application.model';

@Injectable({
  providedIn: 'root',
})
export class CoachApplicationService {
  private readonly storageKey = 'vonpgn_coach_applications';
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  applications = signal<CoachApplication[]>(this.loadFromStorage());

  private loadFromStorage(): CoachApplication[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const items = JSON.parse(raw);
      return items.map((item: any) => ({
        ...item,
        submittedAt: new Date(item.submittedAt),
        // Map API response fields to local format
        profilePicture: item.profile_picture_url || item.profilePicture,
      }));
    } catch {
      return [];
    }
  }

  private saveToStorage() {
    if (!this.isBrowser) return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.applications()));
  }

  submitApplication(data: Omit<CoachApplication, 'id' | 'submittedAt' | 'status'>): CoachApplication {
    const application: CoachApplication = {
      id: Math.random().toString(36).substring(2, 11),
      ...data,
      submittedAt: new Date(),
      status: 'pending',
    };
    this.applications.update((items) => [application, ...items]);
    this.saveToStorage();
    return application;
  }

  updateApplicationStatus(id: string, status: CoachApplication['status']) {
    this.applications.update((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item))
    );
    this.saveToStorage();
  }

  deleteApplication(id: string) {
    this.applications.update((items) => items.filter((item) => item.id !== id));
    this.saveToStorage();
  }

  getApplicationById(id: string): CoachApplication | undefined {
    return this.applications().find(app => app.id === id);
  }

  get pendingCount(): number {
    return this.applications().filter((app) => app.status === 'pending').length;
  }
}