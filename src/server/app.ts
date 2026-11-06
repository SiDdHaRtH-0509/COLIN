/**
 * COLIN Central Express Application Factory
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Configures the complete HTTP pipeline, middleware chain, API routes, and error handling.
 * Explicitly separates application instantiation from network port binding.
 */

import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { getServerConfig } from './config/serverConfig';
import {
  requestIdMiddleware,
  securityHeadersMiddleware,
  createCorsMiddleware,
  requestLoggerMiddleware,
  authContextMiddleware,
  csrfProtectionMiddleware,
  errorHandlerMiddleware,
} from './middleware';
import v1Router from './api/v1';
import { healthController } from './api/v1/controllers/health.controller';
import { ApiErrorResponse } from './types/api';

export function createApp(): Express {
  const app = express();
  const config = getServerConfig();

  // 1. Request correlation ID
  app.use(requestIdMiddleware);

  // 2. Production HTTP security headers
  app.use(securityHeadersMiddleware);

  // 3. Strict CORS origin policy
  app.use(createCorsMiddleware());

  // 4. Request payload parsers with bounded memory ceiling
  app.use(express.json({ limit: config.bodySizeLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodySizeLimit }));
  app.use(cookieParser());

  // 5. Redacted request logging
  app.use(requestLoggerMiddleware);

  // 6. Security & authentication context extraction
  app.use(authContextMiddleware);

  // 6b. Cross-Site Request Forgery (CSRF) defense for cookie-authenticated mutations
  app.use(csrfProtectionMiddleware);

  // 7. Root-level observability probe aliases for container orchestration (k8s/docker)
  app.get('/health/live', healthController.getLive);
  app.get('/health/ready', healthController.getReady);

  // 8. Versioned API namespaces
  app.use(config.apiPrefix, v1Router);

  // 9. Standardized 404 Not Found catch-all handler
  app.use((req: Request, res: Response) => {
    const notFoundResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `The requested endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
      },
      meta: {
        requestId: req.id || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
    res.status(404).json(notFoundResponse);
  });

  // 10. Centralized error handling pipeline
  app.use(errorHandlerMiddleware);

  return app;
}
