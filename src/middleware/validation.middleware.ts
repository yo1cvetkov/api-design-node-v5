import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';

export const validateBody =
  (schema: ZodSchema) =>
  (request: Request, response: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(request.body);
      request.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return response.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      next(error);
    }
  };

export const validateParams =
  (schema: ZodSchema) =>
  (request: Request, response: Response, next: NextFunction) => {
    try {
      schema.parse(request.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return response.status(400).json({
          error: 'Invalid params',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      next(error);
    }
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (request: Request, response: Response, next: NextFunction) => {
    try {
      schema.parse(request.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return response.status(400).json({
          error: 'Invalid params',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      next(error);
    }
  };
