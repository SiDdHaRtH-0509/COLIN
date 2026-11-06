/**
 * COLIN Central Database Error Handling & Translation Module
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Maps Prisma and PostgreSQL database errors into safe domain error classes,
 * ensuring internal SQL strings, schemas, and credentials are never exposed.
 */

export class DatabaseError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly statusCode: number;

  constructor(message: string, code = 'DB_ERROR', statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UniqueConstraintViolationError extends DatabaseError {
  public readonly targetField?: string;

  constructor(message: string, targetField?: string) {
    super(message, 'UNIQUE_CONSTRAINT_VIOLATION', 409);
    this.targetField = targetField;
  }
}

export class ForeignKeyViolationError extends DatabaseError {
  public readonly relationField?: string;

  constructor(message: string, relationField?: string) {
    super(message, 'FOREIGN_KEY_VIOLATION', 400);
    this.relationField = relationField;
  }
}

export class RecordNotFoundError extends DatabaseError {
  public readonly entityName?: string;

  constructor(message = 'Requested database record was not found.', entityName?: string) {
    super(message, 'RECORD_NOT_FOUND', 404);
    this.entityName = entityName;
  }
}

export class TransactionConflictError extends DatabaseError {
  constructor(message = 'The database transaction could not be completed due to a concurrent conflict. Please retry.') {
    super(message, 'TRANSACTION_CONFLICT', 409);
  }
}

export class DatabaseUnavailableError extends DatabaseError {
  constructor(message = 'Database service is temporarily unavailable. Please try again shortly.') {
    super(message, 'DATABASE_UNAVAILABLE', 503);
  }
}

export class DatabaseAuthorizationError extends DatabaseError {
  constructor(message = 'Access denied: database runtime role lacks sufficient privileges for this operation.') {
    super(message, 'DATABASE_AUTHORIZATION_DENIED', 403);
  }
}

export class ValidationConstraintError extends DatabaseError {
  public readonly constraintName?: string;

  constructor(message: string, constraintName?: string) {
    super(message, 'VALIDATION_CONSTRAINT_VIOLATION', 422);
    this.constraintName = constraintName;
  }
}

/**
 * Translates low-level Prisma or PostgreSQL engine errors into safe, client-facing domain errors.
 */
export function translateDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  const errObj = error as Record<string, unknown> | null;
  const rawMsg = errObj && typeof errObj.message === 'string' ? errObj.message : String(error);

  // 1. Prisma Known Request Errors
  if (errObj && typeof errObj.code === 'string') {
    const code = errObj.code;
    const meta = errObj.meta as Record<string, unknown> | undefined;

    switch (code) {
      case 'P2002': {
        const target = Array.isArray(meta?.target) ? (meta.target as string[]).join(', ') : 'field';
        return new UniqueConstraintViolationError(`A record with this ${target} already exists.`, target);
      }
      case 'P2003': {
        const field = typeof meta?.field_name === 'string' ? meta.field_name : 'referenced record';
        return new ForeignKeyViolationError(`Operation failed: referenced ${field} does not exist.`, field);
      }
      case 'P2025': {
        return new RecordNotFoundError('The target database record does not exist or has been removed.');
      }
      case 'P2028':
      case 'P2034': {
        return new TransactionConflictError('Concurrent database conflict detected during transaction.');
      }
      case 'P2024': {
        return new DatabaseUnavailableError('Database connection pool timeout: server is under high load.');
      }
    }
  }

  // 2. PostgreSQL Engine Error Codes & PL/pgSQL RAISE EXCEPTION matches
  if (
    rawMsg.includes('COLIN Constraint Violation') ||
    rawMsg.includes('Accounting Balance Violation') ||
    rawMsg.includes('Accounting Invariant Violation') ||
    rawMsg.includes('Cross-Property Violation') ||
    rawMsg.includes('Student Mismatch') ||
    rawMsg.includes('Bed Mismatch') ||
    rawMsg.includes('Payout Safety Violation')
  ) {
    // Cleanly extract the user-friendly exception string
    const match = rawMsg.match(/(?:ERROR:\s*|message:\s*")([^"]+?)(?:\s*CONTEXT:|\s*LINE|\s*STATEMENT:|",|$)/i);
    const cleanMsg = match ? match[1].trim() : rawMsg;
    return new ValidationConstraintError(cleanMsg);
  }

  if (rawMsg.includes('Accounting Immutability Violation') || rawMsg.includes('Audit Immutability Violation') || rawMsg.includes('Terminal Decision Immutability')) {
    const match = rawMsg.match(/(?:ERROR:\s*)([^]+?)(?:\s*CONTEXT:|\s*LINE|\s*STATEMENT:|$)/i);
    const cleanMsg = match ? match[1].trim() : rawMsg;
    return new ValidationConstraintError(cleanMsg, 'IMMUTABILITY_VIOLATION');
  }

  if (rawMsg.includes('permission denied') || rawMsg.includes('42501') || rawMsg.includes('must be superuser')) {
    return new DatabaseAuthorizationError('Database runtime role is prohibited from performing this administrative action.');
  }

  if (rawMsg.includes('duplicate key value') || rawMsg.includes('23505') || rawMsg.includes('uq_')) {
    return new UniqueConstraintViolationError('Unique constraint violation: duplicate record detected.');
  }

  if (rawMsg.includes('violates foreign key constraint') || rawMsg.includes('23503')) {
    return new ForeignKeyViolationError('Referenced entity does not exist.');
  }

  if (rawMsg.includes('violates check constraint') || rawMsg.includes('23514')) {
    return new ValidationConstraintError('Data violates relational check constraint validation.');
  }

  if (rawMsg.includes('ECONNREFUSED') || rawMsg.includes('EACCES') || rawMsg.includes('connection refused') || rawMsg.includes('57P01')) {
    return new DatabaseUnavailableError('Could not establish connection to the central database server.');
  }

  return new DatabaseError('An unexpected database error occurred.', 'INTERNAL_DATABASE_ERROR', 500, false);
}
