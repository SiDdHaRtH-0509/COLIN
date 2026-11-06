/**
 * COLIN Centralized Request Validation Middleware
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Provides type-safe validation for request body, query parameters, and route parameters via Zod.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export class RequestValidationError extends Error {
  public readonly statusCode = 400;
  public readonly code = 'VALIDATION_ERROR';
  public readonly issues: Array<{ field: string; message: string; code: string }>;

  constructor(zodError: ZodError) {
    super('The request contains invalid or malformed parameters.');
    this.name = 'RequestValidationError';
    this.issues = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
  }
}

export interface ValidationSchema {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

export function validateRequest(schema: ValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) {
          throw new RequestValidationError(result.error);
        }
        req.params = result.data as Record<string, string>;
      }

      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) {
          throw new RequestValidationError(result.error);
        }
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }

      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) {
          throw new RequestValidationError(result.error);
        }
        req.body = result.data;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
