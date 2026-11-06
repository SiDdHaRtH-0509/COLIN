# COLIN — REQUEST VALIDATION ARCHITECTURE REPORT

**Phase:** Phase 4A.2.2.3 — Backend Core Service & API Architecture  
**Component Module:** `src/server/middleware/validateRequest.ts`  
**Schema Validation Engine:** Zod 4.6.7  
**Security Standard:** Strict Input Validation Prior to Controller Execution  
**Status:** FULL PASS  

---

## 1. Executive Summary

Client-supplied data represents the primary attack vector for backend web applications. Relying exclusively on frontend client validation is an antipattern; all inputs must be strictly validated on the server prior to controller execution.

Phase 4A.2.2.3 establishes a centralized, reusable schema-validation middleware utilizing Zod 4.6.7. The validation pipeline enforces type safety, field existence, enumeration whitelisting, numerical range bounds, and payload size ceilings.

---

## 2. Validation Middleware Design

Located in `src/server/middleware/validateRequest.ts`, `validateRequest` accepts composable Zod schemas for `body`, `query`, and `params`:

```typescript
export interface ValidationSchema {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

export function validateRequest(schema: ValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) throw new RequestValidationError(result.error);
        req.params = result.data as Record<string, string>;
      }

      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) throw new RequestValidationError(result.error);
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }

      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) throw new RequestValidationError(result.error);
        req.body = result.data;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
```

### 2.1 Compatibility with Express 5
In Express 5, `req.query` is defined as a prototype getter on `IncomingMessage`. Directly assigning `req.query = result.data` triggers a `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter`. The validation middleware overcomes this using `Object.defineProperty`, safely attaching the validated query dictionary without breaking Express 5 internals.

---

## 3. Structured Validation Error Responses

When validation fails, `RequestValidationError` aggregates Zod issues into a standardized error contract:

```typescript
export class RequestValidationError extends Error {
  public readonly statusCode = 400;
  public readonly code = 'VALIDATION_ERROR';
  public readonly issues: Array<{ field: string; message: string; code: string }>;

  constructor(zodError: ZodError) {
    super('The request contains invalid or malformed parameters.');
    this.name = 'RequestValidationError';
    this.issues = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
  }
}
```

### 3.1 JSON Error Response Example
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid or malformed parameters.",
    "details": [
      {
        "field": "title",
        "message": "Title must be at least 3 characters long",
        "code": "too_small"
      },
      {
        "field": "category",
        "message": "Category must be one of 'PG', 'HOSTEL', or 'COLIVING'",
        "code": "invalid_value"
      }
    ]
  },
  "meta": {
    "requestId": "2f42a6c1-a583-4a12-8509-df63b2184bb2",
    "timestamp": "2026-11-06T17:45:00.000Z"
  }
}
```

---

## 4. Security & Robustness Defenses

1. **Enum Injection Defense**: Enumerations (such as accommodation categories or property policies) reject unrecognized values with explicit error messages.
2. **Numerical Range Bounds**: Numerical inputs (e.g. `slots`, `page`, `limit`) are checked with `.int().min(1).max(...)` to prevent negative values, infinite loops, and database allocation spikes.
3. **Payload Ceiling Defense**: Express body parsers enforce a strict `1MB` ceiling. Oversized payloads are caught by the error pipeline and returned as HTTP 413 `PAYLOAD_TOO_LARGE`.
4. **Malformed JSON Body Defense**: Unclosed brackets or syntax errors in incoming request bodies are trapped before reaching routes, returning HTTP 400 `MALFORMED_JSON`.

---

## 5. Verification Matrix

| Validation Test Case | Input Condition | Expected Status | Result |
| :--- | :--- | :--- | :--- |
| Valid Payload | All fields present and compliant | HTTP 200 OK | **PASS** |
| Missing Mandatory Fields | Missing `title` and `category` | HTTP 400 VALIDATION_ERROR | **PASS** |
| Invalid Enum Value | `category: 'RESORT'` | HTTP 400 VALIDATION_ERROR | **PASS** |
| Out-of-Range Number | `slots: 500` (>100 limit) | HTTP 400 VALIDATION_ERROR | **PASS** |
| Invalid Query Parameters | `?format=unsupported` | HTTP 400 VALIDATION_ERROR | **PASS** |
| Malformed JSON Body | `{"title": "Unclosed...` | HTTP 400 MALFORMED_JSON | **PASS** |
| Oversized Payload | 1.5MB JSON payload (>1MB limit) | HTTP 413 PAYLOAD_TOO_LARGE | **PASS** |
