import { describe, expect, it } from 'vitest';
import { toSubjectAverageDto, resolveMarkScores } from '../src/modules/mark/mark.service';
import { toDomain as markToDomain, toPersistence as markToPersistence } from '../src/modules/mark/mark.repository';
import type { MarkRow } from '../src/modules/mark/mark.interface';
import { toDomain, toPersistence } from '../src/modules/student/student.repository';
import type { Student, StudentRow } from '../src/modules/student/student.interface';

const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-06-01T00:00:00.000Z');
const dateOfBirth = new Date(2014, 4, 1);

const studentRow = (): StudentRow => ({
  id: 4,
  roll_no: '2026-10A-017',
  first_name: 'Asha',
  last_name: 'Sharma',
  date_of_birth: dateOfBirth,
  class_name: '10',
  section: 'A',
  guardian_name: 'Ravi Sharma',
  guardian_phone: '+919876543210',
  guardian_relation: 'father',
  created_at: createdAt,
  updated_at: updatedAt,
});

const student = (): Student => toDomain(studentRow());

describe('student mapping', () => {
  it('nests the flat guardian columns', () => {
    expect(student().guardian).toEqual({
      name: 'Ravi Sharma',
      phone: '+919876543210',
      relation: 'father',
    });
    expect(student().dateOfBirth).toBe(dateOfBirth);
  });

  it('flattens a guardian and keeps a partial update partial', () => {
    expect(toPersistence({ firstName: 'Ada' })).toEqual({ first_name: 'Ada' });
    expect(
      toPersistence({
        guardian: { name: 'Meera Sharma', phone: '+919800000000', relation: 'mother' },
      }),
    ).toEqual({
      guardian_name: 'Meera Sharma',
      guardian_phone: '+919800000000',
      guardian_relation: 'mother',
    });
  });

  it('throws when guardian_relation is not part of the domain', () => {
    expect(() => toDomain({ ...studentRow(), guardian_relation: 'uncle' })).toThrow(/guardian_relation/);
  });

  it('round-trips a student through persistence columns', () => {
    const domain = student();
    const columns = toPersistence({
      rollNo: domain.rollNo,
      firstName: domain.firstName,
      lastName: domain.lastName,
      dateOfBirth: domain.dateOfBirth,
      className: domain.className,
      section: domain.section,
      guardian: domain.guardian,
    });
    const again = toDomain({
      ...studentRow(),
      roll_no: columns.roll_no ?? '',
      first_name: columns.first_name ?? '',
      last_name: columns.last_name ?? '',
      date_of_birth: columns.date_of_birth ?? dateOfBirth,
      class_name: columns.class_name ?? '',
      section: columns.section ?? '',
      guardian_name: columns.guardian_name ?? '',
      guardian_phone: columns.guardian_phone ?? '',
      guardian_relation: columns.guardian_relation ?? '',
    });
    expect(again).toEqual(domain);
  });
});

describe('mark mapping', () => {
  const markRow = (): MarkRow => ({
    id: 8,
    student_id: 4,
    exam: 'final',
    subject: 'maths',
    score: '78.50',
    max_score: '100.00',
    created_at: createdAt,
    updated_at: updatedAt,
  });

  it('converts NUMERIC strings to numbers', () => {
    const mark = markToDomain(markRow());
    expect(mark.score).toBe(78.5);
    expect(mark.maxScore).toBe(100);
    expect(mark.studentId).toBe(4);
  });

  it('throws on an invalid NUMERIC string', () => {
    expect(() => markToDomain({ ...markRow(), score: 'nope' })).toThrow(/NUMERIC score/);
  });

  it('maps only the score fields present on a partial update', () => {
    expect(markToPersistence({ score: 61 })).toEqual({ score: 61 });
    expect(markToPersistence({ maxScore: 80 })).toEqual({ max_score: 80 });
  });

  it('round-trips a mark through the persistence shape', () => {
    const columns = markToPersistence({ exam: 'final', subject: 'maths', score: 78.5, maxScore: 100 });
    const again = markToDomain({
      ...markRow(),
      exam: columns.exam ?? '',
      subject: columns.subject ?? '',
      score: columns.score?.toFixed(2) ?? '',
      max_score: columns.max_score?.toFixed(2) ?? '',
    });
    expect(again.exam).toBe('final');
    expect(again.subject).toBe('maths');
    expect(again.score).toBe(78.5);
    expect(again.maxScore).toBe(100);
  });
});

describe('subject average pass mark', () => {
  it('rounds to 2 decimals and compares with PASS_PERCENTAGE', () => {
    expect(toSubjectAverageDto({ subject: 'maths', averagePercentage: 72.345, students: 31 })).toEqual({
      subject: 'maths',
      averagePercentage: 72.35,
      students: 31,
      passed: true,
    });
    expect(toSubjectAverageDto({ subject: 'english', averagePercentage: 10, students: 4 })).toMatchObject({
      averagePercentage: 10,
      passed: false,
    });
  });

  it('rejects an update whose merged score is above maxScore', () => {
    expect(() => resolveMarkScores({ score: 40, maxScore: 100 }, { maxScore: 30 })).toThrow(
      /score must be less than or equal to maxScore/,
    );
    expect(resolveMarkScores({ score: 40, maxScore: 100 }, { score: 55 })).toEqual({ score: 55, maxScore: 100 });
  });
});
