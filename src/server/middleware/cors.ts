/**
 * COLIN CORS Security Middleware
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Enforces strict origin whitelisting with credential support.
 * Rejects unrestricted wildcard origins (*).
 */

import cors, { CorsOptions } from 'cors';
import { getServerConfig } from '../config/serverConfig';

export function createCorsMiddleware() {
  const config = getServerConfig();

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, mobile native, or curl)
      if (!origin) {
        return callback(null, true);
      }

      if (
        config.corsAllowedOrigins.includes(origin) ||
        config.corsAllowedOrigins.some((allowed) => {
          if (allowed.startsWith('*.')) {
            const domain = allowed.slice(2);
            return origin.endsWith(domain) || origin === `https://${domain}`;
          }
          return false;
        })
      ) {
        return callback(null, true);
      }

      // Allow Vercel production and preview deployment URLs
      if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow Render production and preview deployment URLs
      if (/^https:\/\/[a-zA-Z0-9_-]+\.onrender\.com$/.test(origin)) {
        return callback(null, true);
      }

      // In development or test, allow localhost origins on common development ports
      if (config.nodeEnv !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS Error: Origin '${origin}' is not authorized by COLIN access policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-csrf-token', 'X-CSRF-Token'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400, // 24 hours
  };

  return cors(corsOptions);
}
