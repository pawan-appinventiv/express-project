import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateQuery =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    // Express 5 exposes req.query through a getter, so the parsed value is stored separately.
    res.locals.validatedQuery = schema.parse(req.query);
    next();
  };

export const validateParams =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.params = schema.parse(req.params) as typeof req.params;
    next();
  };