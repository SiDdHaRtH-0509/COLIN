/**
 * COLIN Request Correlation ID Middleware
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import '../types/auth'; // Ensure Request augmentation is loaded

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.trim() !== ''
    ? incomingId.trim()
    : crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
