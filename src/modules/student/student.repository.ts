import { pool } from '../../config/db';
import { isUniqueViolation } from '../../errors/dbError';
import { conflict } from '../../errors/AppError';
import { searchPattern } from '../../utils/validators';
import {
  GUARDIAN_RELATIONS,
  type GuardianRelation,
  type Student,
  type StudentChanges,
  type StudentListFilter,
  type StudentRow,
  type StudentWritableColumns,
} from './student.interface';

const STUDENT_COLUMNS = `id, roll_no, first_name, last_name, date_of_birth, class_name, section,
  guardian_name, guardian_phone, guardian_relation, created_at, updated_at`;

const WRITABLE = [
  'roll_no',
  'first_name',
  'last_name',
  'date_of_birth',
  'class_name',
  'section',
  'guardian_name',
  'guardian_phone',
  'guardian_relation',
] as const;

const isGuardianRelation = (value: string): value is GuardianRelation =>
  (GUARDIAN_RELATIONS as readonly string[]).includes(value);

export const toDomain = (row: StudentRow): Student => {
  if (!isGuardianRelation(row.guardian_relation)) {
    throw new Error(`Unknown guardian_relation "${row.guardian_relation}"`);
  }
  if (!(row.date_of_birth instanceof Date) || Number.isNaN(row.date_of_birth.getTime())) {
    throw new Error('date_of_birth must be a Date');
  }

  return {
    id: row.id,
    rollNo: row.roll_no,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    className: row.class_name,
    section: row.section,
    guardian: {
      name: row.guardian_name,
      phone: row.guardian_phone,
      relation: row.guardian_relation,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/** Maps only the fields that are present. Guardian is flattened into three columns. */
export const toPersistence = (changes: StudentChanges): StudentWritableColumns => {
  const columns: StudentWritableColumns = {};
  if (changes.rollNo !== undefined) columns.roll_no = changes.rollNo;
  if (changes.firstName !== undefined) columns.first_name = changes.firstName;
  if (changes.lastName !== undefined) columns.last_name = changes.lastName;
  if (changes.dateOfBirth !== undefined) columns.date_of_birth = changes.dateOfBirth;
  if (changes.className !== undefined) columns.class_name = changes.className;
  if (changes.section !== undefined) columns.section = changes.section;
  if (changes.guardian !== undefined) {
    columns.guardian_name = changes.guardian.name;
    columns.guardian_phone = changes.guardian.phone;
    columns.guardian_relation = changes.guardian.relation;
  }
  return columns;
};

const mapWriteError = (err: unknown): Error => {
  if (isUniqueViolation(err)) return conflict('A student with that roll number already exists');
  return err instanceof Error ? err : new Error('Unexpected database error');
};

export const findMany = async (filter: StudentListFilter): Promise<Student[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.className !== undefined) {
    params.push(filter.className);
    conditions.push(`class_name = $${params.length}`);
  }
  if (filter.section !== undefined) {
    params.push(filter.section);
    conditions.push(`section = $${params.length}`);
  }
  if (filter.search !== undefined) {
    params.push(searchPattern(filter.search));
    const pattern = `$${params.length}`;
    conditions.push(
      `(first_name ILIKE ${pattern} ESCAPE '\\' OR last_name ILIKE ${pattern} ESCAPE '\\' OR roll_no ILIKE ${pattern} ESCAPE '\\')`,
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(filter.limit);
  const limit = `$${params.length}`;
  params.push(filter.offset);
  const offset = `$${params.length}`;

  const { rows } = await pool.query<StudentRow>(
    `SELECT ${STUDENT_COLUMNS} FROM students ${where} ORDER BY id LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return rows.map(toDomain);
};

export const findById = async (id: number): Promise<Student | null> => {
  const { rows } = await pool.query<StudentRow>(`SELECT ${STUDENT_COLUMNS} FROM students WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? toDomain(row) : null;
};

export const insert = async (changes: StudentChanges): Promise<Student> => {
  const columns = toPersistence(changes);
  try {
    const { rows } = await pool.query<StudentRow>(
      `INSERT INTO students (
         roll_no, first_name, last_name, date_of_birth, class_name, section,
         guardian_name, guardian_phone, guardian_relation
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${STUDENT_COLUMNS}`,
      [
        columns.roll_no,
        columns.first_name,
        columns.last_name,
        columns.date_of_birth,
        columns.class_name,
        columns.section,
        columns.guardian_name,
        columns.guardian_phone,
        columns.guardian_relation,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error('Insert did not return a student');
    return toDomain(row);
  } catch (err) {
    throw mapWriteError(err);
  }
};

export const update = async (id: number, changes: StudentChanges): Promise<Student | null> => {
  const columns = toPersistence(changes);
  const assignments: string[] = [];
  const params: unknown[] = [];

  for (const column of WRITABLE) {
    if (columns[column] !== undefined) {
      params.push(columns[column]);
      assignments.push(`${column} = $${params.length}`);
    }
  }

  if (assignments.length === 0) return findById(id);

  assignments.push('updated_at = NOW()');
  params.push(id);

  try {
    const { rows } = await pool.query<StudentRow>(
      `UPDATE students SET ${assignments.join(', ')} WHERE id = $${params.length} RETURNING ${STUDENT_COLUMNS}`,
      params,
    );
    const row = rows[0];
    return row ? toDomain(row) : null;
  } catch (err) {
    throw mapWriteError(err);
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM students WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
