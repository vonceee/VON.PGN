import { Injectable, signal } from '@angular/core';
import { Course, LessonDetail } from '../models/course.model';

@Injectable({
  providedIn: 'root',
})
export class LessonService {
  activeCourse = signal<Course>(MOCK_COURSE);
  currentLesson = signal<LessonDetail | null>(null);

  constructor() {
    this.loadLesson('rook-01');
  }

  loadLesson(lessonId: string) {
    // in a real app, this would be an HTTP GET request to your database:
    // this.http.get<LessonDetail>(`/api/lessons/${lessonId}`).subscribe(...)

    const fetchedLesson = MOCK_LESSON_DATABASE[lessonId];

    if (fetchedLesson) {
      // .set() updates the Signal. Any component reading it instantly re-renders!
      this.currentLesson.set(fetchedLesson);
    } else {
      this.currentLesson.set(null);
    }
  }
}

const MOCK_COURSE: Course = {
  id: 'basics-101',
  title: 'Chess Basics',
  description: 'master the basic rules and movements of the pieces.',
  chapters: [
    {
      id: 'chap-1',
      title: 'How Pieces Move',
      order: 1,
      lessons: [
        { id: 'rook-01', title: 'The Rook', isCompleted: true },
        { id: 'bishop-01', title: 'The Bishop', isCompleted: false },
        { id: 'queen-01', title: 'The Queen', isCompleted: false },
        { id: 'king-01', title: 'The King', isCompleted: false },
        { id: 'knight-01', title: 'The Knight', isCompleted: false },
        { id: 'pawn-01', title: 'The Pawn', isCompleted: false },
      ],
    },
    {
      id: 'chap-2',
      title: 'Chess Fundamentals',
      order: 1,
      lessons: [
        { id: 'attack-01', title: 'Attack', isCompleted: true },
        { id: 'capture-01', title: 'Capture', isCompleted: false },
        { id: 'defend-01', title: 'Defend', isCompleted: false },
        { id: 'evade-01', title: 'Evade', isCompleted: false },
        { id: 'check-01', title: 'Check', isCompleted: false },
        { id: 'checkmate-01', title: 'Checkmate', isCompleted: false },
      ],
    },
  ],
};

// a simulated database mapping lesson IDs to their full content
const MOCK_LESSON_DATABASE: Record<string, LessonDetail> = {
  'rook-01': {
    id: 'rook-01',
    title: 'The Rook',
    isCompleted: true,
    contentHtml: `
    <p class="mb-4 text-lg">the rook moves on a straight line.</p>
    <img 
      src="/assets/rooks-001.png" 
      alt="How the Rook moves" 
      class="rounded shadow-lg border border-gray-400 max-w-md my-6"
    >
    `,
  },
  'bishop-01': {
    id: 'bishop-01',
    title: 'The Bishop',
    isCompleted: false,
    contentHtml: `
    <p class="mb-4 text-lg">the bishop moves diagonally.</p>
    <img 
      src="/assets/bishop-001.png" 
      alt="How the Bishop moves" 
      class="rounded shadow-lg border border-gray-400 max-w-md my-6"
    >
    `,
  },
  'queen-01': {
    id: 'queen-01',
    title: 'The Queen',
    isCompleted: false,
    contentHtml: `
    <p class="mb-4 text-lg">the queen is the most powerful piece on the board. she moves horizontally, vertically, or diagonally.</p>
    <img 
      src="/assets/queen-001.png" 
      alt="How the Queen moves" 
      class="rounded shadow-lg border border-gray-400 max-w-md my-6"
    >
    <p>Think of the Queen as a Rook and a Bishop combined into one piece.</p>
    `,
  },
  'king-01': {
    id: 'king-01',
    title: 'The King',
    isCompleted: false,
    contentHtml: `
    <p class="mb-4 text-lg">the king is the most important piece. he moves exactly one square in any direction.</p>
    <img 
      src="/assets/king-001.png" 
      alt="How the King moves" 
      class="rounded shadow-lg border border-gray-400 max-w-md my-6"
    >
    <p>While he moves slowly, the entire game revolves around keeping him safe. If your king is trapped and under attack, the game is over!</p>
    `,
  },
  'knight-01': {
    id: 'knight-01',
    title: 'The Knight',
    isCompleted: false,
    contentHtml: `
    <p class="mb-4 text-lg">the knight moves in a unique "L" shape: two squares in one direction, and then one square perpendicular to that.</p>
    <img 
      src="/assets/knight-001.png" 
      alt="How the Knight moves" 
      class="rounded shadow-lg border border-gray-400 max-w-md my-6"
    >
    <p>The Knight is also the only piece on the board that can "jump" over other pieces to get to its destination.</p>
    `,
  },
  'pawn-01': {
    id: 'pawn-01',
    title: 'The Pawn',
    isCompleted: false,
    contentHtml: `
    <p class="mb-4 text-lg">the pawn moves forward. it can never move backwards.</p>
    <img 
      src="/assets/pawn-001.png" 
      alt="How the Pawn moves" 
      class="rounded shadow-lg border border-gray-400 max-w-md my-6"
    >
    `,
  }
};