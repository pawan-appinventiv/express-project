# Express project

School records API for students and their exam marks. Users stay in memory. Students and marks are stored in PostgreSQL.

## 1. Configuration

`src/config/env.ts` is the only place configuration is checked. `validateConfig()` parses the environment with one Zod schema. On failure it throws an `Error` whose message names the variable and says what is wrong. Loading the module prints that message and exits with code 1, so `npm run dev` will not listen.

Required, with no default:

- `PASS_PERCENTAGE` is a number from 0 to 100. Decimals are allowed. `"33.5"` becomes the number `33.5`. An empty value is treated as missing: `PASS_PERCENTAGE is required but missing`.
- `ACADEMIC_YEAR` uses `YYYY-YY`, and the second year must be the first year plus one. `"2026-27"` is valid. `"26-27"` does not match the pattern. `"2026-28"` fails the cross-check: `ACADEMIC_YEAR: second year must follow the first (received "2026-28")`.

Copy `.env.example` to `.env` and fill in the database values. `vitest.config.ts` supplies the same variables for tests, so `npm test` does not need a `.env` file.

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

`npm run db:migrate` applies `db/schema.sql`. Startup applies that file again; both are safe to repeat.

## 2. Validation and input sanitisation

Request schemas live in each module's `*.dto.ts` and are built from `src/utils/validators.ts`.

- `safeText` trims, NFC-normalises, and rejects control characters, null bytes, and `<` `>`.
- `personName`, `rollNo`, `phone`, `section`, `tag`, `className`, and `dateOfBirth` are the field rules.
- `idParam` checks a route id. `pagination` checks `limit` (1 to 100, default 20) and `offset`.
- `escapeLike` makes `%`, `_`, and `\` literal before they are used in `ILIKE`.

`validateBody`, `validateQuery`, and `validateParams` run the schema before the handler. Query objects ignore unknown keys. JSON bodies use `z.strictObject` at every level, including `guardian` and each item of `marks`, so extra keys such as `id` or `createdAt` are rejected.

`rejectDangerousPayload` reads the raw JSON body and rejects `__proto__`, `constructor`, and `prototype` before a repository function can run. Zod failures become HTTP 400. `details` is a list of `{ path, message }` with dotted paths such as `guardian.phone` and `marks.0.score`.

`POST /api/students/:id/marks` checks that each score is at most `maxScore` and that subjects are unique. The path of a bad score is `marks.<index>.score`. The path of a duplicate subject list is `marks`. `maxScore` defaults to 100. The batch is one transaction: all rows are stored, or none are.

A mark update sends `score` and/or `maxScore`. The service merges that with the stored row and rejects the update when the merged score is above the merged maximum. The DTO cannot see the stored row, so that check is not in the schema.

## 3. Repository mapping

Repositories are the only files that see database rows.

`toDomain` turns a snake_case row into the camelCase domain object. The three `guardian_*` columns become `guardian`. `date_of_birth` stays a `Date`. `score` and `max_score` arrive as NUMERIC strings such as `"78.50"` and become numbers; a value that is not numeric throws. An unknown `guardian_relation` throws.

`toPersistence` does the reverse and copies only fields that were provided, so a partial update does not overwrite the rest. A `guardian` object becomes the three flat columns.

Services call `toResponseDto`. Dates become ISO strings, and `dateOfBirth` becomes `YYYY-MM-DD`. Subject averages are the SQL mean of `score / max_score * 100`, rounded to two decimal places in the service. `passed` is true when that percentage is at least `PASS_PERCENTAGE`. Subjects with no rows are omitted.

Duplicate roll numbers and duplicate `(student, exam, subject)` marks become HTTP 409. A mark whose student id does not exist becomes HTTP 404. Deleting a student deletes that student's marks through `ON DELETE CASCADE`.

SQL values are always `$1`, `$2`, and so on. Search text is bound as a parameter after `escapeLike()`.

## API

Successful responses use `{ "data": ... }` from `sendSuccess()`. Deletes return HTTP 204. Expected errors use `{ "error": { "message", "details" } }`.

### Students

| Method | Path | Success |
| --- | --- | --- |
| `POST` | `/api/students` | 201 |
| `GET` | `/api/students` | 200 |
| `GET` | `/api/students/:id` | 200 |
| `PATCH` | `/api/students/:id` | 200 |
| `DELETE` | `/api/students/:id` | 204 |
| `POST` | `/api/students/:id/marks` | 201 |

`GET /api/students` accepts `className`, `section`, `search`, `limit`, and `offset`. `search` matches first name, last name, and roll number.

```bash
curl -X POST http://localhost:3000/api/students \
  -H 'content-type: application/json' \
  -d '{
    "rollNo": "2026-10A-017",
    "firstName": "Asha",
    "lastName": "Sharma",
    "dateOfBirth": "2014-05-01",
    "className": "10",
    "section": "A",
    "guardian": { "name": "Ravi Sharma", "phone": "+919876543210", "relation": "father" }
  }'
```

`className` may also be the JSON number `7`, which is stored as `"7"`. `section` and `rollNo` are uppercased. `relation` is lowercased. Phone numbers lose spaces and dashes before the E.164 check. A student must be between 3 and 25 years old, and `dateOfBirth` must be a real calendar day.

### Marks

| Method | Path | Success |
| --- | --- | --- |
| `POST` | `/api/students/:id/marks` | 201 |
| `PATCH` | `/api/marks/:id` | 200 |
| `DELETE` | `/api/marks/:id` | 204 |
| `GET` | `/api/marks/averages` | 200 |

```bash
curl -X POST http://localhost:3000/api/students/1/marks \
  -H 'content-type: application/json' \
  -d '{
    "exam": "final",
    "marks": [{ "subject": "maths", "score": 78.5, "maxScore": 100 }]
  }'
```

`exam` is `unit-1`, `midterm`, `unit-2`, or `final`. `subject` is a lowercase slug. `score` is at least 0, at most `maxScore`, and has at most two decimal places. `maxScore` is from 1 to 200.

`GET /api/marks/averages?className=10&exam=final&section=A` requires `className`. `exam` and `section` are optional.

```json
{
  "data": [
    { "subject": "maths", "averagePercentage": 72.35, "students": 31, "passed": true }
  ]
}
```

`passed` uses `PASS_PERCENTAGE` from the environment.
