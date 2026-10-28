import { z } from 'zod';
import { classNameQuery, maxScoreValue, scoreValue, section, tag } from '../../utils/validators';
import { EXAMS } from './mark.interface';

const examSchema = z.enum(EXAMS);

const markItemDto = z.strictObject({
  subject: tag,
  score: scoreValue,
  maxScore: maxScoreValue.default(100),
});

export const createMarksDto = z
  .strictObject({
    exam: examSchema,
    marks: z.array(markItemDto).min(1).max(15),
  })
  .superRefine((body, ctx) => {
    body.marks.forEach((mark, index) => {
      if (mark.score > mark.maxScore) {
        ctx.addIssue({
          code: 'custom',
          path: ['marks', index, 'score'],
          message: 'score must be less than or equal to maxScore',
        });
      }
    });

    const subjects = body.marks.map((mark) => mark.subject);
    if (new Set(subjects).size !== subjects.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['marks'],
        message: 'subjects must be unique',
      });
    }
  });
export type CreateMarksDto = z.infer<typeof createMarksDto>;

export const updateMarkDto = z
  .strictObject({
    score: scoreValue.optional(),
    maxScore: maxScoreValue.optional(),
  })
  .refine((body) => body.score !== undefined || body.maxScore !== undefined, {
    message: 'Provide score and/or maxScore',
    path: ['score'],
  });
export type UpdateMarkDto = z.infer<typeof updateMarkDto>;

const emptyToUndefined = (value: unknown): unknown => (value === undefined || value === '' ? undefined : value);

export const averagesQueryDto = z.object({
  className: classNameQuery,
  exam: z.preprocess(emptyToUndefined, examSchema.optional()),
  section: z.preprocess(emptyToUndefined, section.optional()),
});

export interface AveragesQueryDto {
  className: string;
  exam?: 'unit-1' | 'midterm' | 'unit-2' | 'final';
  section?: string;
}

export interface MarkResponseDto {
  id: number;
  studentId: number;
  exam: (typeof EXAMS)[number];
  subject: string;
  score: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectAverageDto {
  subject: string;
  averagePercentage: number;
  students: number;
  passed: boolean;
}
