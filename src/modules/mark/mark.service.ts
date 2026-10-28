import { env } from '../../config/env';
import { badRequest, notFound } from '../../errors/AppError';
import * as studentService from '../student/student.service';
import type { AveragesQueryDto, CreateMarksDto, MarkResponseDto, SubjectAverageDto, UpdateMarkDto } from './mark.dto';
import type { Mark, SubjectAverage } from './mark.interface';
import * as markRepository from './mark.repository';

export const roundToTwo = (value: number): number => Math.round(value * 100) / 100;

export const toResponseDto = (mark: Mark): MarkResponseDto => ({
  id: mark.id,
  studentId: mark.studentId,
  exam: mark.exam,
  subject: mark.subject,
  score: mark.score,
  maxScore: mark.maxScore,
  createdAt: mark.createdAt.toISOString(),
  updatedAt: mark.updatedAt.toISOString(),
});

export const toSubjectAverageDto = (average: SubjectAverage): SubjectAverageDto => {
  const averagePercentage = roundToTwo(average.averagePercentage);
  return {
    subject: average.subject,
    averagePercentage,
    students: average.students,
    passed: averagePercentage >= env.PASS_PERCENTAGE,
  };
};

/** Merges a partial update onto the stored mark and enforces score <= maxScore. */
export const resolveMarkScores = (
  existing: { score: number; maxScore: number },
  changes: { score?: number; maxScore?: number },
): { score: number; maxScore: number } => {
  const score = changes.score ?? existing.score;
  const maxScore = changes.maxScore ?? existing.maxScore;
  if (score > maxScore) {
    throw badRequest('score must be less than or equal to maxScore', [
      { path: 'score', message: 'score must be less than or equal to maxScore' },
    ]);
  }
  return { score, maxScore };
};

export const addMarks = async (studentId: number, dto: CreateMarksDto): Promise<MarkResponseDto[]> => {
  await studentService.getStudent(studentId);
  const marks = await markRepository.insertMany(studentId, dto.exam, dto.marks);
  return marks.map(toResponseDto);
};

export const updateMark = async (id: number, dto: UpdateMarkDto): Promise<MarkResponseDto> => {
  const existing = await markRepository.findById(id);
  if (!existing) throw notFound(`Mark ${id} not found`);
  resolveMarkScores(existing, dto);
  const mark = await markRepository.update(id, dto);
  if (!mark) throw notFound(`Mark ${id} not found`);
  return toResponseDto(mark);
};

export const deleteMark = async (id: number): Promise<void> => {
  const removed = await markRepository.remove(id);
  if (!removed) throw notFound(`Mark ${id} not found`);
};

export const getSubjectAverages = async (query: AveragesQueryDto): Promise<SubjectAverageDto[]> => {
  const averages = await markRepository.subjectAverages({
    className: query.className,
    exam: query.exam,
    section: query.section,
  });
  return averages.map(toSubjectAverageDto);
};
