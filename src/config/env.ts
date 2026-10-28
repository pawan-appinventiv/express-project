import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const blankToEmpty = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const passPercentageSchema = z.preprocess(
  blankToEmpty,
  z
    .string()
    .superRefine((value, ctx) => {
      if (value === '') {
        ctx.addIssue({ code: 'custom', message: 'PASS_PERCENTAGE is required but missing' });
        return;
      }
      if (!/^\d+(\.\d+)?$/.test(value)) {
        ctx.addIssue({
          code: 'custom',
          message: `PASS_PERCENTAGE must be a number from 0 to 100 (received "${value}")`,
        });
        return;
      }
      const parsed = Number(value);
      if (parsed < 0 || parsed > 100) {
        ctx.addIssue({
          code: 'custom',
          message: `PASS_PERCENTAGE must be a number from 0 to 100 (received "${value}")`,
        });
      }
    })
    .transform((value) => Number(value)),
);

const academicYearSchema = z.preprocess(
  blankToEmpty,
  z.string().superRefine((value, ctx) => {
    if (value === '') {
      ctx.addIssue({ code: 'custom', message: 'ACADEMIC_YEAR is required but missing' });
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(value)) {
      ctx.addIssue({
        code: 'custom',
        message: `ACADEMIC_YEAR must use YYYY-YY (received "${value}")`,
      });
      return;
    }
    const [startText, endText] = value.split('-');
    const start = Number(startText);
    const end = Number(endText);
    if (end !== (start + 1) % 100) {
      ctx.addIssue({
        code: 'custom',
        message: `ACADEMIC_YEAR: second year must follow the first (received "${value}")`,
      });
    }
  }),
);

const envSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    PORT: z.string().optional(),
    DB_HOST: z.string().optional(),
    DB_PORT: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    DB_NAME: z.string().optional(),
    PASS_PERCENTAGE: passPercentageSchema,
    ACADEMIC_YEAR: academicYearSchema,
  })
  .transform((value) => ({
    NODE_ENV: value.NODE_ENV && value.NODE_ENV.length > 0 ? value.NODE_ENV : 'development',
    PORT: value.PORT && value.PORT.length > 0 ? Number(value.PORT) : 3000,
    DB_HOST: value.DB_HOST && value.DB_HOST.length > 0 ? value.DB_HOST : 'localhost',
    DB_PORT: value.DB_PORT && value.DB_PORT.length > 0 ? Number(value.DB_PORT) : 5432,
    DB_USER: value.DB_USER && value.DB_USER.length > 0 ? value.DB_USER : 'postgres',
    DB_PASSWORD: value.DB_PASSWORD ?? 'pawan',
    DB_NAME: value.DB_NAME && value.DB_NAME.length > 0 ? value.DB_NAME : 'local_db',
    PASS_PERCENTAGE: value.PASS_PERCENTAGE,
    ACADEMIC_YEAR: value.ACADEMIC_YEAR,
  }));

export type Env = z.infer<typeof envSchema>;

const formatConfigError = (error: z.ZodError): string => error.issues.map((issue) => issue.message).join('\n');

/** The only configuration check. Throws an Error whose message names the bad variable. */
export const validateConfig = (source: Record<string, string | undefined> = process.env): Env => {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(formatConfigError(parsed.error));
  }
  return parsed.data;
};

const loadEnv = (): Env => {
  try {
    return validateConfig(process.env);
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Invalid configuration');
    process.exit(1);
  }
};

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
