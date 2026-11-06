# COLIN — API ERROR HANDLING AND RESPONSE REPORT

**Phase:** Phase 4A.2.2.3 — Backend Core Service & API Architecture  
**Component Modules:** `src/server/types/api.ts`, `src/server/middleware/errorHandler.ts`  
**Standard:** Canonical API Contracts & Secure Centralized Error Translation  
**Status:** FULL PASS  

---

## 1. Executive Summary

A predictable API contract is essential for client integration and frontend stability. Disparate error formats, raw unhandled exceptions, and leaked stack traces create security vulnerabilities and degrade user experience.

Phase 4A.2.2.3 establishes:
1. Canonical API success and error JSON contracts with mandatory request correlation IDs.
2. A centralized error-handling pipeline mapping validation, authentication, authorization, and database exceptions to standard HTTP status codes.
3. Strict information-leakage prevention ensuring database queries, passwords, and internal paths are never exposed to clients.

---

## 2. Standardized Response Contracts

Defined in `src/server/types/api.ts`:

### 2.1 Success Response Contract
```typescript
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

### 2.2 Error Response Contract
```typescript
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}
```

---

## 3. Centralized Error Translation Pipeline

Located in `src/server/middleware/errorHandler.ts`, the error handler traps all exceptions thrown anywhere in the HTTP pipeline:

```typescript
export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.id || 'unknown';
  const timestamp = new Date().toISOString();

  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal server error occurred.';
  let details: unknown = undefined;

  // Pattern matching & translation
  ...
}
```

### 3.1 Comprehensive Error Mapping Matrix

| Exception Class | Trigger Condition | HTTP Status | Assigned Error Code | Details Payload |
| :--- | :--- | :---: | :--- | :--- |
| `RequestValidationError` | Zod schema validation failed | `400 Bad Request` | `VALIDATION_ERROR` | Array of `{ field, message, code }` |
| `SyntaxError` (Malformed JSON) | Client sent invalid JSON body | `400 Bad Request` | `MALFORMED_JSON` | N/A |
| `AuthenticationError` | Missing/invalid bearer token | `401 Unauthorized` | `UNAUTHENTICATED` | N/A |
| `AuthorizationError` | Insufficient role or permissions | `403 Forbidden` | `FORBIDDEN` | N/A |
| `CORS Error` | Origin not on whitelist | `403 Forbidden` | `CORS_FORBIDDEN` | N/A |
| `DatabaseAuthorizationError` | Role denied table grant (42501) | `403 Forbidden` | `DATABASE_AUTHORIZATION_DENIED` | N/A |
| `RecordNotFoundError` | Entity UUID does not exist (P2025) | `404 Not Found` | `RECORD_NOT_FOUND` | N/A |
| `UniqueConstraintViolationError` | Duplicate key (P2002 / 23505) | `409 Conflict` | `UNIQUE_CONSTRAINT_VIOLATION` | `{ field: targetField }` |
| `TransactionConflictError` | Lock timeout / deadlock (P2028) | `409 Conflict` | `TRANSACTION_CONFLICT` | N/A |
| `PayloadTooLargeError` | Request body exceeds 1MB | `413 Payload Too Large` | `PAYLOAD_TOO_LARGE` | N/A |
| `ValidationConstraintError` | PG trigger exception raised | `422 Unprocessable` | `VALIDATION_CONSTRAINT_VIOLATION` | Constraint name / description |
| `DatabaseUnavailableError` | Connection refused / pool timeout | `503 Service Unavailable`| `DATABASE_UNAVAILABLE` | N/A |
| Unhandled `Error` | Unexpected runtime exception | `500 Internal Error` | `INTERNAL_SERVER_ERROR` | Sanitized generic message |

---

## 4. Information Disclosure Defenses

1. **Stack Trace Stripping**: Stack traces (`err.stack`) are never included in the JSON response body.
2. **SQL Query Sanitization**: Raw PostgreSQL statements and schema column definitions are filtered out.
3. **Correlation ID Tracking**: Every response includes `meta.requestId`. Developers can trace the exact server-side error in server logs without exposing error details to users.

---

## 5. Verification Results

In `src/test/api/backend-core-api.integration.test.ts`:
- All mapped error classes were tested and verified against their respective HTTP status codes.
- Oversized payloads triggered HTTP 413 `PAYLOAD_TOO_LARGE`.
- Malformed JSON triggered HTTP 400 `MALFORMED_JSON`.
- Zero credentials or stack traces were leaked in error bodies.
