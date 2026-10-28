import { z } from 'zod';

const FORBIDDEN_TEXT = /[\u0000-\u001F\u007F<>]/;

/** Trimmed, NFC-normalised text. Rejects control characters, null bytes, and < >. */
export const safeText = (maxLength = 100) =>
  z
    .string()
    .trim()
    .normalize('NFC')
    .min(1, 'is required')
    .max(maxLength)
    .refine((value) => !FORBIDDEN_TEXT.test(value), 'must not contain control characters or < >');

const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

export const personName = safeText(100).refine((value) => PERSON_NAME.test(value), 'must be a person name');

/** Lowercase slug such as "maths" or "computer-science". */
export const tag = z
  .string()
  .trim()
  .normalize('NFC')
  .toLowerCase()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug');

export const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

const optionalQueryNumber = (fallback: number, min: number, max: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : value),
    z.coerce.number().int().min(min).max(max).default(fallback),
  );

/** limit defaults to 20 and cannot exceed 100. offset defaults to 0. */
export const pagination = z.object({
  limit: optionalQueryNumber(20, 1, 100),
  offset: optionalQueryNumber(0, 0, 100_000),
});

export const classNameQuery = z
  .string()
  .trim()
  .regex(/^(?:[1-9]|1[0-2])$/, 'must be a class from 1 to 12');

/** Accepts the number 7 or the string "7" and stores "7". */
export const className = z
  .union([z.number().int(), z.string().trim()])
  .transform((value) => String(value))
  .refine((value) => /^(?:[1-9]|1[0-2])$/.test(value), 'must be a class from 1 to 12');

export const section = z
  .string()
  .trim()
  .normalize('NFC')
  .toUpperCase()
  .regex(/^[A-F]$/, 'must be a section from A to F');

export const rollNo = z
  .string()
  .trim()
  .normalize('NFC')
  .toUpperCase()
  .refine((value) => !FORBIDDEN_TEXT.test(value), 'must not contain control characters or < >')
  .regex(/^\d{4}-\d{1,2}[A-F]-\d{3}$/, 'must look like 2026-10A-017');

export const phone = z
  .string()
  .trim()
  .normalize('NFC')
  .refine((value) => !FORBIDDEN_TEXT.test(value), 'must not contain control characters or < >')
  .overwrite((value) => value.replace(/[\s-]/g, ''))
  .regex(/^\+[1-9]\d{7,14}$/, 'must be an E.164 phone number');

export const guardianRelation = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.enum(['father', 'mother', 'guardian']));

const ageOn = (year: number, month: number, day: number, today: Date): number => {
  let age = today.getFullYear() - year;
  const monthNow = today.getMonth() + 1;
  const dayNow = today.getDate();
  if (monthNow < month || (monthNow === month && dayNow < day)) age -= 1;
  return age;
};

export const dateOfBirth = z.string().trim().superRefine((value, ctx) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    ctx.addIssue({ code: 'custom', message: 'must be a real date in YYYY-MM-DD form' });
    return;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const real = utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
  if (!real) {
    ctx.addIssue({ code: 'custom', message: 'must be a real calendar date' });
    return;
  }
  const age = ageOn(year, month, day, new Date());
  if (age < 3 || age > 25) {
    ctx.addIssue({ code: 'custom', message: 'student must be between 3 and 25 years old' });
  }
});

export const atMostTwoDecimals = (value: number): boolean =>
  Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const scoreValue = z
  .number()
  .min(0)
  .refine(atMostTwoDecimals, 'must have at most 2 decimal places');

export const maxScoreValue = z
  .number()
  .min(1)
  .max(200)
  .refine(atMostTwoDecimals, 'must have at most 2 decimal places');

/** Escapes `\`, `%`, and `_` so the value is matched literally inside ILIKE. */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export const searchPattern = (value: string): string => `%${escapeLike(value)}%`;
