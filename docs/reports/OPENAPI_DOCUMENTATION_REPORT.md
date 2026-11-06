# COLIN — OPENAPI DOCUMENTATION REPORT

**Phase:** Phase 4A.2.2.3 — Backend Core Service & API Architecture  
**Specification Standard:** OpenAPI 3.1.0  
**Endpoint:** `GET /api/v1/system/openapi.json`  
**Status:** FULL PASS  

---

## 1. Executive Summary

Phase 4A.2.2.3 establishes OpenAPI 3.1 documentation for COLIN's centralized API architecture. The specification provides a single source of truth for frontend API integration, contract testing, and third-party partner documentation without requiring heavy external reflection engines or leaking infrastructure secrets.

---

## 2. OpenAPI 3.1 Specification Structure

Generated via `systemService.getOpenApiDocument()` in `src/server/services/SystemService.ts`:

### 2.1 Specification Metadata
- **`openapi`**: `3.1.0`
- **`info.title`**: `COLIN Central Marketplace API`
- **`info.version`**: `1.0.0`
- **`info.description`**: Core backend API architecture for verified student living accommodation, bookings, and governance.
- **`servers`**: Array configuring base URL `/api/v1`.

### 2.2 Tags & Functional Grouping
1. **`Health & Observability`**: Liveness, readiness, and database probe endpoints.
2. **`System`**: System metadata, versioning, diagnostics, validation demonstrations, and administrative access guards.

---

## 3. Documented Endpoints

| Route Path | Method | Tag | Summary | Documented Status Codes |
| :--- | :---: | :--- | :--- | :--- |
| `/health/live` | `GET` | Health & Observability | Liveness Probe | 200 |
| `/health/ready` | `GET` | Health & Observability | Readiness Probe | 200, 503 |
| `/system/info` | `GET` | System | System Metadata | 200, 400 |
| `/system/validate-test` | `POST` | System | Zod Request Validation Demo | 200, 400, 413 |
| `/system/admin-test` | `GET` | System | Admin Authorization Demo | 200, 401, 403 |

---

## 4. Delivery Endpoints & Developer Ergonomics

The documentation is served through `GET /api/v1/system/openapi.json` supporting two response modes:
1. **Standard API Wrapper**: Returns OpenAPI document embedded in the canonical `ApiSuccessResponse` object.
2. **Raw JSON Delivery (`?format=json`)**: Directly returns the OpenAPI 3.1 JSON document, enabling one-click import into Swagger UI, Postman, Insomnia, or code generation tools.

---

## 5. Security Scheme Definition

The specification formally declares the standard bearer authentication scheme:

```json
"components": {
  "securitySchemes": {
    "BearerAuth": {
      "type": "http",
      "scheme": "bearer",
      "bearerFormat": "JWT"
    }
  }
}
```

Administrative and protected endpoints explicitly declare `"security": [{ "BearerAuth": [] }]`.

---

## 6. Verification Status

In `src/test/api/backend-core-api.integration.test.ts`:
- `GET /api/v1/system/openapi.json` responded with HTTP 200 and valid OpenAPI 3.1 structure.
- `GET /api/v1/system/openapi.json?format=json` directly returned raw OpenAPI 3.1 specification.
- All documented routes, methods, tags, and security components were validated.
- Zero secrets or internal database connection details were exposed.
