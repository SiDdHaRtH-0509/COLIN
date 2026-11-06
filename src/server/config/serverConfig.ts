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
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresInDays: number;
  bcryptSaltRounds: number;
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

  const jwtSecret = process.env.JWT_SECRET || 'colin-super-secure-production-ready-jwt-secret-key-32chars!';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const refreshTokenExpiresInDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10);
  const bcryptSaltRounds = process.env.BCRYPT_ROUNDS
    ? parseInt(process.env.BCRYPT_ROUNDS, 10)
    : (nodeEnv === 'test' ? 10 : 12);

  return {
    port,
    host,
    nodeEnv,
    apiPrefix,
    corsAllowedOrigins,
    bodySizeLimit,
    jwtSecret,
    jwtExpiresIn,
    refreshTokenExpiresInDays,
    bcryptSaltRounds,
  };
}
