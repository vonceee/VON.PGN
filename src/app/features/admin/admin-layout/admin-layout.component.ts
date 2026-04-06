import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import '../admin-styles.css';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-header">
          <h1>ADMIN PANEL</h1>
        </div>
        <ul class="admin-sidebar-nav">
          <li><a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Dashboard</a></li>
          <li><a routerLink="/admin/courses" routerLinkActive="active">Courses</a></li>
          <li><a routerLink="/admin/feedback" routerLinkActive="active">Feedback</a></li>
          <li><a routerLink="/admin/coach-applications" routerLinkActive="active">Coach Applications</a></li>
        </ul>
      </aside>
      <main class="admin-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {}