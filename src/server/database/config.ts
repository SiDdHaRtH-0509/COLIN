/**
 * COLIN Central Database Configuration Module
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Enforces runtime role separation (colin_app_runtime vs colin_admin_runtime),
 * connection pool boundaries, timeouts, and safe credential redaction.
 */

export interface DatabaseConfig {
  appDatabaseUrl: string;
  adminDatabaseUrl: string;
  nodeEnv: 'development' | 'test' | 'production';
  poolMax: number;
  connectionTimeoutMs: number;
}

let cachedConfig: DatabaseConfig | null = null;

/**
 * Parses and redacts any database connection string so passwords or credentials
 * are never exposed in logs, error traces, or diagnostic endpoints.
 */
export function redactDatabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const user = url.username || 'postgres';
    const host = url.hostname || '127.0.0.1';
    const port = url.port || '5432';
    const dbName = url.pathname || '/colin_test';
    return `postgresql://${user}:<REDACTED>@${host}:${port}${dbName}${url.search}`;
  } catch {
    return 'postgresql://<REDACTED>@127.0.0.1:5433/colin_test';
  }
}

/**
 * Validates and retrieves the central database configuration.
 * Throws a clear ConfigurationError if required settings are invalid.
 */
export function getDatabaseConfig(): DatabaseConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';
  
  // Base connection string from environment or standard test port 5433
  const rawBaseUrl = process.env.DATABASE_URL || 'postgresql://colin_app_runtime@127.0.0.1:5433/colin_test?schema=public';
  
  // Derive app runtime URL ensuring role is colin_app_runtime if not specified in local dev
  let appUrl = process.env.DATABASE_APP_URL || rawBaseUrl;
  if (!process.env.DATABASE_APP_URL && !appUrl.includes('colin_app_runtime') && !appUrl.includes('postgres:')) {
    // Only map to colin_app_runtime on local dev/test databases
    if (appUrl.includes('127.0.0.1') || appUrl.includes('localhost')) {
      try {
        const parsed = new URL(appUrl);
        parsed.username = 'colin_app_runtime';
        parsed.password = '';
        appUrl = parsed.toString();
      } catch {
        appUrl = 'postgresql://colin_app_runtime@127.0.0.1:5433/colin_test?schema=public';
      }
    }
  }

  // Derive admin runtime URL ensuring role is colin_admin_runtime
  let adminUrl = process.env.DATABASE_ADMIN_URL || '';
  if (!adminUrl) {
    if (rawBaseUrl.includes('127.0.0.1') || rawBaseUrl.includes('localhost')) {
      try {
        const parsed = new URL(rawBaseUrl);
        parsed.username = 'colin_admin_runtime';
        parsed.password = '';
        adminUrl = parsed.toString();
      } catch {
        adminUrl = 'postgresql://colin_admin_runtime@127.0.0.1:5433/colin_test?schema=public';
      }
    } else {
      adminUrl = rawBaseUrl;
    }
  }

  const poolMax = parseInt(process.env.DATABASE_POOL_MAX || '10', 10);
  if (isNaN(poolMax) || poolMax <= 0) {
    throw new Error('Invalid DATABASE_POOL_MAX configuration: must be a positive integer.');
  }

  const connectionTimeoutMs = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000', 10);
  if (isNaN(connectionTimeoutMs) || connectionTimeoutMs <= 0) {
    throw new Error('Invalid DATABASE_CONNECTION_TIMEOUT configuration: must be a positive integer in milliseconds.');
  }

  cachedConfig = {
    appDatabaseUrl: appUrl,
    adminDatabaseUrl: adminUrl,
    nodeEnv,
    poolMax,
    connectionTimeoutMs,
  };

  return cachedConfig;
}

/**
 * Resets configuration cache (useful for dynamic test environments).
 */
export function resetDatabaseConfigCache(): void {
  cachedConfig = null;
}
