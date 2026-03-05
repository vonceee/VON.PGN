export interface Course {
  id: string;
  title: string; // e.g., "Chess Basics"
  description: string; // e.g., "Learn Chess from Zero"
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string; // e.g., "How Pieces Move?, Special Moves, ..."
  order: number; // e.g., for ensure they sort correctly in the UI
  lessons: LessonSummary[];
}

export interface LessonSummary {
  id: string;
  title: string; // e.g., "Pawn Movement, Rook Movement, Bishop Movement, ..."
  isCompleted: boolean; // e.g., true if the user has completed the lesson
}

export interface LessonDetail extends LessonSummary {
  contentHtml: string; // e.g., "<p>pawns move forward one square at a time, but capture diagonally.</p>"
  interactiveTask?: InteractiveTask;
}

export interface InteractiveTask {
  startingFen: string; // e.g., "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  instructions: string; // e.g., "move the pawn forward two squares."
  expectedMoves?: string[]; // e.g., ["e2e4"]
  successMessage?: string; // e.g., "correct! you moved the pawn forward two squares."
}
