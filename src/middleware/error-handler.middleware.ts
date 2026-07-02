import type { NextFunction, Request, Response } from 'express';
import env from '../../env.ts';

export class ApiError extends Error {
  status: number;
  name: string;
  message: string;

  constructor(message: string, name: string, status: number) {
    super();

    this.status = status;
    this.name = name;
    this.message = message;
  }
}

export const errorHandler = (
  error: ApiError,
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.log(error.stack);
  let status = error.status || 500;
  let message = error.message || 'Internal Server Error';

  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
  }

  if (error.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  }

  return response.status(status).json({
    error: message,
    ...(env.APP_STAGE === 'dev' && {
      stack: error.stack,
      details: error.message,
    }),
  });
};
