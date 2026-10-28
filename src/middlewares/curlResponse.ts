import type { RequestHandler } from 'express';

/**
 * Mount hook for a feature module. Routes in src/routes/index.ts attach this
 * before the module router so every module response goes through the shared
 * success and error handlers.
 */
export const curlResponse: RequestHandler = (_req, _res, next) => {
  next();
};
