/**
 * COLIN Sanitized Request Logger Middleware
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Logs HTTP requests with duration and correlation ID,
 * ensuring credentials, passwords, and tokens are redacted.
 */

import { Request, Response, NextFunction } from 'express';

const SENSITIVE_FIELDS = ['password', 'passwordhash', 'token', 'secret', 'authorization', 'cookie', 'accesstoken', 'refreshtoken'];

export function redactSensitiveObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveObject);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '<REDACTED>';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.id || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Skip verbose logging in test mode unless debug flag set
    if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_HTTP) {
      return;
    }

    const logLine = `[HTTP] ${req.method} ${req.originalUrl || req.url} ${status} (${duration}ms) [reqId: ${requestId}]`;
    if (status >= 500) {
      console.error(logLine);
    } else if (status >= 400) {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }
  });

  next();
}
