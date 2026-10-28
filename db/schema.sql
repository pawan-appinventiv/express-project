-- School records. The nested guardian is stored as three flat columns.
-- Re-running this file keeps existing tables. A leftover shape from the
-- earlier name/email student table is replaced once.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'email'
  ) OR EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'marks'
      AND column_name = 'marks'
  ) THEN
    DROP TABLE IF EXISTS marks;
    DROP TABLE IF EXISTS students;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS students (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  roll_no VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  class_name VARCHAR(2) NOT NULL,
  section VARCHAR(1) NOT NULL,
  guardian_name VARCHAR(100) NOT NULL,
  guardian_phone VARCHAR(16) NOT NULL,
  guardian_relation VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT students_roll_no_unique UNIQUE (roll_no),
  CONSTRAINT students_class_name_check CHECK (class_name ~ '^(?:[1-9]|1[0-2])$'),
  CONSTRAINT students_section_check CHECK (section ~ '^[A-F]$'),
  CONSTRAINT students_guardian_relation_check CHECK (guardian_relation IN ('father', 'mother', 'guardian'))
);

CREATE TABLE IF NOT EXISTS marks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id INTEGER NOT NULL,
  exam VARCHAR(10) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  score NUMERIC(5, 2) NOT NULL,
  max_score NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marks_student_fk FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT marks_student_exam_subject_unique UNIQUE (student_id, exam, subject),
  CONSTRAINT marks_exam_check CHECK (exam IN ('unit-1', 'midterm', 'unit-2', 'final')),
  CONSTRAINT marks_score_check CHECK (
    score >= 0 AND max_score >= 1 AND max_score <= 200 AND score <= max_score
  )
);
