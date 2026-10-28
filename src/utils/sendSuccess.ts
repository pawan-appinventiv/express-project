import type { Response } from 'express';

export const sendSuccess = (res: Response, data: unknown, statusCode = 200): void => {
  if (statusCode === 204) {
    res.status(204).end();
    return;
  }
  res.status(statusCode).json({ data });
};
