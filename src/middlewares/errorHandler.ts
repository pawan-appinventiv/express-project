import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { isAppError } from '../errors/AppError';

interface IssueLike {
  code: string;
  message: string;
  path: PropertyKey[];
  keys?: unknown;
}

const dotted = (path: PropertyKey[]): string => path.map(String).join('.');

/** Nested Zod issues become dotted paths such as "guardian.phone" and "marks.2.score". */
export const zodErrorDetails = (error: ZodError): { path: string; message: string }[] => {
  const details: { path: string; message: string }[] = [];
  for (const issue of error.issues as IssueLike[]) {
    if (issue.code === 'unrecognized_keys' && Array.isArray(issue.keys)) {
      for (const key of issue.keys) {
        details.push({ path: dotted([...issue.path, String(key)]), message: 'Unknown field' });
      }
      continue;
    }
    details.push({ path: dotted(issue.path), message: issue.message });
  }
  return details;
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (isAppError(err)) {
    res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: 'Validation failed', details: zodErrorDetails(err) } });
    return;
  }

  // Malformed JSON body from express.json()
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'Malformed JSON body' } });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { message: isProduction ? 'Internal Server Error' : (err as Error).message },
  });
};