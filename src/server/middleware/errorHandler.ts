/**
 * COLIN Centralized Error Handling Pipeline
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Maps domain database errors, validation failures, and authorization exceptions
 * into standardized API error responses without leaking internal server secrets.
 */

import { Request, Response, NextFunction } from 'express';
import {
  DatabaseError,
  DatabaseAuthorizationError,
  UniqueConstraintViolationError,
  ForeignKeyViolationError,
  RecordNotFoundError,
  TransactionConflictError,
  DatabaseUnavailableError,
  ValidationConstraintError,
} from '../database/errors';
import { RequestValidationError } from './validateRequest';
import { AuthenticationError, AuthorizationError } from './authContext';
import { RateLimitError } from './rateLimiter';
import { StorageValidationError } from '../storage/storage.types';
import { ApiErrorResponse } from '../types/api';

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId = req.id || 'unknown';
  const timestamp = new Date().toISOString();

  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal server error occurred.';
  let details: unknown = undefined;

  // 1. Request Validation Errors (Zod)
  if (err instanceof RequestValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
    details = err.issues;
  }
  // 1.1 Storage and Image Validation Errors
  else if (err instanceof StorageValidationError) {
    statusCode = 400;
    errorCode = err.code || 'INVALID_IMAGE_FILE';
    message = err.message;
  }
  // 2. Authentication Errors
  else if (err instanceof AuthenticationError) {
    statusCode = 401;
    errorCode = err.code;
    message = err.message;
  }
  // 3. Authorization Errors
  else if (err instanceof AuthorizationError) {
    statusCode = 403;
    errorCode = err.code;
    message = err.message;
  }
  // 4. Rate Limiting Errors
  else if (err instanceof RateLimitError) {
    statusCode = 429;
    errorCode = err.code;
    message = err.message;
  }
  // 5. Database Errors from Central Database Layer
  else if (err instanceof DatabaseAuthorizationError) {
    statusCode = 403;
    errorCode = err.code;
    message = err.message;
  } else if (err instanceof UniqueConstraintViolationError) {
    statusCode = 409;
    errorCode = err.code;
    message = err.message;
    details = err.targetField ? { field: err.targetField } : undefined;
  } else if (err instanceof ForeignKeyViolationError) {
    statusCode = 400;
    errorCode = err.code;
    message = err.message;
  } else if (err instanceof RecordNotFoundError) {
    statusCode = 404;
    errorCode = err.code;
    message = err.message;
  } else if (err instanceof TransactionConflictError) {
    statusCode = 409;
    errorCode = err.code;
    message = err.message;
  } else if (err instanceof DatabaseUnavailableError) {
    statusCode = 503;
    errorCode = err.code;
    message = err.message;
  } else if (err instanceof ValidationConstraintError) {
    statusCode = 422;
    errorCode = err.code;
    message = err.message;
  } else if (err instanceof DatabaseError) {
    statusCode = err.statusCode || 500;
    errorCode = err.code || 'DATABASE_ERROR';
    message = err.isOperational ? err.message : 'Database operation failed.';
  }
  // 5. Malformed JSON Body
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    errorCode = 'MALFORMED_JSON';
    message = 'Request body contains invalid JSON formatting.';
  }
  // 6. Request Payload Too Large (Express body parser limit)
  else if (
    (typeof err === 'object' && err !== null && ('type' in err && (err as Record<string, unknown>).type === 'entity.too.large')) ||
    (typeof err === 'object' && err !== null && ('status' in err && (err as Record<string, unknown>).status === 413)) ||
    (typeof err === 'object' && err !== null && ('statusCode' in err && (err as Record<string, unknown>).statusCode === 413))
  ) {
    statusCode = 413;
    errorCode = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload exceeds the maximum allowed body size limit (1MB).';
  }
  // 6. Generic or Unhandled Errors
  else if (err instanceof Error) {
    // Only log unhandled errors in non-test mode
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[UNHANDLED ERROR] [${requestId}]:`, err.message);
    }
    // Never expose stack trace or raw SQL in message
    if (err.message.includes('CORS Error')) {
      statusCode = 403;
      errorCode = 'CORS_FORBIDDEN';
      message = err.message;
    }
  }

  const responseBody: ApiErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
    },
    meta: {
      requestId,
      timestamp,
    },
  };

  res.status(statusCode).json(responseBody);
}
