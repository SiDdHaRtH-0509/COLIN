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
  storageProvider: 'local' | 's3';
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  storagePublicBaseUrl?: string;
  maxUploadSizeBytes: number;
  geolocationProvider: 'mock' | 'google';
  googleMapsServerKey?: string;
  googleMapsBrowserKey?: string;
  emailProvider: 'mock' | 'sendgrid' | 'postmark';
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

  let jwtSecret = process.env.JWT_SECRET;
  if (nodeEnv === 'production') {
    if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('colin-super-secure-production-ready-jwt-secret-key-32chars!')) {
      throw new Error(
        'SECURITY VIOLATION: Production environment requires a dedicated, cryptographically strong JWT_SECRET with at least 32 characters.'
      );
    }
  } else {
    jwtSecret = jwtSecret || 'colin-super-secure-production-ready-jwt-secret-key-32chars!';
  }
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const refreshTokenExpiresInDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10);
  const bcryptSaltRounds = process.env.BCRYPT_ROUNDS
    ? parseInt(process.env.BCRYPT_ROUNDS, 10)
    : (nodeEnv === 'test' ? 10 : 12);

  // Storage configuration
  const storageProvider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase() as 'local' | 's3';
  const s3Bucket = process.env.S3_BUCKET;
  const s3Region = process.env.S3_REGION || 'us-east-1';
  const s3Endpoint = process.env.S3_ENDPOINT;
  const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
  const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const storagePublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
  const maxUploadSizeBytes = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || '5242880', 10); // 5 MB

  if (nodeEnv === 'production' && storageProvider === 's3') {
    if (!s3Bucket || !s3AccessKeyId || !s3SecretAccessKey) {
      throw new Error(
        'SECURITY & INFRASTRUCTURE ERROR: Production with S3 storage requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.'
      );
    }
  }

  // Geolocation configuration
  const geolocationProvider = (process.env.GEOLOCATION_PROVIDER || 'mock').toLowerCase() as 'mock' | 'google';
  const googleMapsServerKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  const googleMapsBrowserKey = process.env.GOOGLE_MAPS_BROWSER_KEY || process.env.VITE_GOOGLE_MAPS_BROWSER_KEY;

  if (nodeEnv === 'production' && geolocationProvider === 'google') {
    if (!googleMapsServerKey) {
      throw new Error(
        'SECURITY & INFRASTRUCTURE ERROR: Production with Google geolocation requires GOOGLE_MAPS_SERVER_KEY.'
      );
    }
  }

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
    storageProvider,
    s3Bucket,
    s3Region,
    s3Endpoint,
    s3AccessKeyId,
    s3SecretAccessKey,
    storagePublicBaseUrl,
    maxUploadSizeBytes,
    geolocationProvider,
    googleMapsServerKey,
    googleMapsBrowserKey,
    emailProvider: (process.env.EMAIL_PROVIDER || 'mock').toLowerCase() as 'mock' | 'sendgrid' | 'postmark',
  };
}
