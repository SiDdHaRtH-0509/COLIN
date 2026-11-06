/**
 * COLIN Central Backend Server Configuration
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 */

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'test' | 'production';
  apiPrefix: string;
  corsAllowedOrigins: string[];
  bodySizeLimit: string;
}

export function getServerConfig(): ServerConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';
  const apiPrefix = '/api/v1';
  const bodySizeLimit = process.env.BODY_SIZE_LIMIT || '1mb';

  // Configured origins for CORS
  const rawOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '';
  const corsAllowedOrigins = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
      ];

  return {
    port,
    host,
    nodeEnv,
    apiPrefix,
    corsAllowedOrigins,
    bodySizeLimit,
  };
}
