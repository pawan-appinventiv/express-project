import type { RequestHandler } from 'express';
import { badRequest } from '../errors/AppError';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const rejectKey = (path: string): Error =>
  badRequest('Validation failed', [{ path, message: 'Dangerous key is not allowed' }]);

/** Rejects prototype-pollution keys before a controller or repository runs. */
export const rejectDangerousPayload: RequestHandler = (req, _res, next) => {
  if (!req.rawBody) {
    next();
    return;
  }

  try {
    JSON.parse(req.rawBody, (key, value: unknown) => {
      if (DANGEROUS_KEYS.has(key)) {
        throw rejectKey(key);
      }
      return value;
    });
    next();
  } catch (err) {
    next(err instanceof Error && 'isAppError' in err ? err : err);
  }
};
