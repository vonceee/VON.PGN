import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
        title: 'Admin Dashboard - CHESS.PGN',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./user-list/user-list.component').then((m) => m.UserListComponent),
        title: 'User Management - CHESS.PGN',
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./course-list/course-list').then((m) => m.CourseListComponent),
        title: 'Course Management - CHESS.PGN',
      },
      {
        path: 'course/new',
        loadComponent: () =>
          import('./course-editor/course-editor').then((m) => m.CourseEditorComponent),
        title: 'New Course',
      },
      {
        path: 'course/:courseId',
        loadComponent: () =>
          import('./course-editor/course-editor').then((m) => m.CourseEditorComponent),
        title: 'Edit Course',
      },
      {
        path: 'course/:courseId/chapter/new',
        loadComponent: () =>
          import('./chapter-editor/chapter-editor').then((m) => m.ChapterEditorComponent),
        title: 'New Chapter',
      },
      {
        path: 'course/:courseId/chapter/:chapterId',
        loadComponent: () =>
          import('./chapter-editor/chapter-editor').then((m) => m.ChapterEditorComponent),
        title: 'Edit Chapter',
      },
      {
        path: 'chapter/:chapterId/lesson/new',
        loadComponent: () =>
          import('./lesson-editor/lesson-editor').then((m) => m.LessonEditorComponent),
        title: 'New Lesson',
      },
      {
        path: 'chapter/:chapterId/lesson/:lessonId',
        loadComponent: () =>
          import('./lesson-editor/lesson-editor').then((m) => m.LessonEditorComponent),
        title: 'Edit Lesson',
      },
      {
        path: 'coaches',
        loadComponent: () =>
          import('./coach-management/coach-management.component').then((m) => m.CoachManagementComponent),
        title: 'Coach Management - CHESS.PGN',
      },
      {
        path: 'coach/new',
        loadComponent: () =>
          import('./coach-editor/coach-editor.component').then((m) => m.CoachEditorComponent),
        title: 'New Coach Profile',
      },
      {
        path: 'coach/:coachId',
        loadComponent: () =>
          import('./coach-editor/coach-editor.component').then((m) => m.CoachEditorComponent),
        title: 'Edit Coach Profile',
      },

      {
        path: 'academy-enrollments',
        loadComponent: () =>
          import('./academy-enrollments/academy-enrollments.component').then((m) => m.AcademyEnrollmentsComponent),
        title: 'Academy Enrollments - CHESS.PGN',
      },
    ],
  },
];