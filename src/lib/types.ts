export interface Question {
  id: string;
  chapterId: number;
  chapterName: string;
  question: string;
  options: [string, string, string, string];
  answer: number; // 1-4
}

export interface ChapterMeta {
  id: number;
  name: string;
  questionCount: number;
}

export interface QuizData {
  chapters: ChapterMeta[];
  questions: Question[];
}

export interface QuizState {
  phase: 'setup' | 'answering' | 'results';
  selectedChapters: number[];
  questionCount: number;
  questions: Question[];
  currentIndex: number;
  answers: (number | null)[];
  answeredCurrent: boolean;
}
