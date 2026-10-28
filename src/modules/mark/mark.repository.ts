import type { PoolClient } from 'pg';
import { pool } from '../../config/db';
import { isForeignKeyViolation, isUniqueViolation } from '../../errors/dbError';
import { conflict, notFound } from '../../errors/AppError';
import {
  EXAMS,
  type AverageFilter,
  type Exam,
  type Mark,
  type MarkChanges,
  type MarkDraft,
  type MarkRow,
  type MarkWritableColumns,
  type SubjectAverage,
} from './mark.interface';

const MARK_COLUMNS = 'id, student_id, exam, subject, score::text AS score, max_score::text AS max_score, created_at, updated_at';

const UPDATABLE = ['score', 'max_score'] as const;

const isExam = (value: string): value is Exam => (EXAMS as readonly string[]).includes(value);

const numericToNumber = (value: string, label: string): number => {
  if (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value.trim())) {
    throw new Error(`Invalid NUMERIC ${label}: ${String(value)}`);
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new Error(`Invalid NUMERIC ${label}: ${value}`);
  return parsed;
};

export const toDomain = (row: MarkRow): Mark => {
  if (!isExam(row.exam)) throw new Error(`Unknown exam "${row.exam}"`);
  return {
    id: row.id,
    studentId: row.student_id,
    exam: row.exam,
    subject: row.subject,
    score: numericToNumber(row.score, 'score'),
    maxScore: numericToNumber(row.max_score, 'max_score'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const toPersistence = (changes: MarkChanges): MarkWritableColumns => {
  const columns: MarkWritableColumns = {};
  if (changes.exam !== undefined) columns.exam = changes.exam;
  if (changes.subject !== undefined) columns.subject = changes.subject;
  if (changes.score !== undefined) columns.score = changes.score;
  if (changes.maxScore !== undefined) columns.max_score = changes.maxScore;
  return columns;
};

const mapWriteError = (err: unknown, studentId: number): Error => {
  if (isUniqueViolation(err)) return conflict('A mark for that student, exam, and subject already exists');
  if (isForeignKeyViolation(err)) return notFound(`Student ${studentId} not found`);
  return err instanceof Error ? err : new Error('Unexpected database error');
};

export const findById = async (id: number): Promise<Mark | null> => {
  const { rows } = await pool.query<MarkRow>(`SELECT ${MARK_COLUMNS} FROM marks WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? toDomain(row) : null;
};

/** Inserts every mark on one client. A failure rolls the whole batch back. */
export const insertMany = async (studentId: number, exam: Exam, marks: MarkDraft[]): Promise<Mark[]> => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const saved: Mark[] = [];
    for (const mark of marks) {
      const columns = toPersistence({ exam, subject: mark.subject, score: mark.score, maxScore: mark.maxScore });
      const { rows } = await client.query<MarkRow>(
        `INSERT INTO marks (student_id, exam, subject, score, max_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${MARK_COLUMNS}`,
        [studentId, columns.exam, columns.subject, columns.score, columns.max_score],
      );
      const row = rows[0];
      if (!row) throw new Error('Insert did not return a mark');
      saved.push(toDomain(row));
    }
    await client.query('COMMIT');
    return saved;
  } catch (err) {
    await client.query('ROLLBACK');
    throw mapWriteError(err, studentId);
  } finally {
    client.release();
  }
};

export const update = async (id: number, changes: MarkChanges): Promise<Mark | null> => {
  const columns = toPersistence(changes);
  const assignments: string[] = [];
  const params: unknown[] = [];

  for (const column of UPDATABLE) {
    if (columns[column] !== undefined) {
      params.push(columns[column]);
      assignments.push(`${column} = $${params.length}`);
    }
  }

  if (assignments.length === 0) return findById(id);

  assignments.push('updated_at = NOW()');
  params.push(id);
  const { rows } = await pool.query<MarkRow>(
    `UPDATE marks SET ${assignments.join(', ')} WHERE id = $${params.length} RETURNING ${MARK_COLUMNS}`,
    params,
  );
  const row = rows[0];
  return row ? toDomain(row) : null;
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM marks WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

export const subjectAverages = async (filter: AverageFilter): Promise<SubjectAverage[]> => {
  const { rows } = await pool.query<{ subject: string; average_percentage: string; students: number }>(
    `SELECT m.subject,
            AVG((m.score / m.max_score) * 100)::text AS average_percentage,
            COUNT(DISTINCT m.student_id)::int AS students
     FROM marks m
     JOIN students s ON s.id = m.student_id
     WHERE s.class_name = $1
       AND ($2::text IS NULL OR m.exam = $2)
       AND ($3::text IS NULL OR s.section = $3)
     GROUP BY m.subject
     ORDER BY m.subject`,
    [filter.className, filter.exam ?? null, filter.section ?? null],
  );

  return rows.map((row) => ({
    subject: row.subject,
    averagePercentage: numericToNumber(row.average_percentage, 'average_percentage'),
    students: row.students,
  }));
};
