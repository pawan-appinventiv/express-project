export const EXAMS = ['unit-1', 'midterm', 'unit-2', 'final'] as const;

export type Exam = (typeof EXAMS)[number];

export interface Mark {
  id: number;
  studentId: number;
  exam: Exam;
  subject: string;
  score: number;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarkRow {
  id: number;
  student_id: number;
  exam: string;
  subject: string;
  score: string;
  max_score: string;
  created_at: Date;
  updated_at: Date;
}

export interface MarkDraft {
  subject: string;
  score: number;
  maxScore: number;
}

export interface MarkChanges {
  exam?: Exam;
  subject?: string;
  score?: number;
  maxScore?: number;
}

export interface MarkWritableColumns {
  exam?: Exam;
  subject?: string;
  score?: number;
  max_score?: number;
}

export interface SubjectAverage {
  subject: string;
  averagePercentage: number;
  students: number;
}

export interface AverageFilter {
  className: string;
  exam?: Exam;
  section?: string;
}
