/**
 * COLIN Redis & Rate Limiting Infrastructure - Errors
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 */

export class RedisError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'REDIS_ERROR') {
    super(message);
    this.name = 'RedisError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RedisConnectionError extends RedisError {
  constructor(message = 'Failed to connect to Redis server') {
    super(message, 'REDIS_CONNECTION_ERROR');
    this.name = 'RedisConnectionError';
  }
}

export class RedisTimeoutError extends RedisError {
  constructor(message = 'Redis command timed out') {
    super(message, 'REDIS_TIMEOUT_ERROR');
    this.name = 'RedisTimeoutError';
  }
}

export class RedisOperationError extends RedisError {
  constructor(message: string) {
    super(message, 'REDIS_OPERATION_ERROR');
    this.name = 'RedisOperationError';
  }
}

export class RateLimitExceededError extends Error {
  public readonly statusCode = 429;
  public readonly code = 'TOO_MANY_REQUESTS';
  public readonly retryAfterSeconds: number;
  public readonly resetMs: number;
  public readonly limit: number;
  public readonly remaining: number;

  constructor(
    message = 'Too many requests. Please wait before retrying.',
    options?: {
      retryAfterSeconds?: number;
      resetMs?: number;
      limit?: number;
      remaining?: number;
    }
  ) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.retryAfterSeconds = options?.retryAfterSeconds ?? 60;
    this.resetMs = options?.resetMs ?? 60000;
    this.limit = options?.limit ?? 0;
    this.remaining = options?.remaining ?? 0;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
