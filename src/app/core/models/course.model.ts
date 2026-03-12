export interface Course {
  id: string;
  title: string; // e.g., "Chess Basics"
  description: string; // e.g., "Learn Chess from Zero"
  prerequisites?: string[];
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

export interface ContentBlock {
  type: 'text' | 'board';
  content?: string; // Only present if type === 'text'
  task?: InteractiveTask; // Only present if type === 'board'
}

export interface LessonDetail extends LessonSummary {
  contentBlocks: ContentBlock[];
}

export interface InteractiveTask {
  lichessUrl: string; // e.g., "https://lichess.org/study/embed/DKy0YYJs/ZK3XhnhN"
  instructions: string; // e.g., "move the pawn forward two squares."
}
