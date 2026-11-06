# PHASE 4A.2.3 — AUTHENTICATION & AUTHORIZATION API CONTRACT REPORT

**Project:** COLIN — Campus Living Verified  
**Phase:** Phase 4A.2.3 (Authentication & Authorization Integration)  
**Standard:** OpenAPI 3.1 & Standardized Express 5 REST Contracts  
**Status:** COMPLETE & VERIFIED  
**Date:** 2026-11-06  

---

## 1. Global Request & Response Conventions

All endpoints under `/api/v1/auth` follow strict contract standards:

### 1.1 Success Response Envelope
```json
{
  "success": true,
  "message": "Human-readable operational status message.",
  "data": { ... },
  "meta": {
    "requestId": "uuid-v4-or-client-trace",
    "timestamp": "2026-11-06T18:00:00.000Z"
  }
}
```

### 1.2 Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Sanitized error explanation.",
    "details": { ... }
  },
  "meta": {
    "requestId": "uuid-v4-or-client-trace",
    "timestamp": "2026-11-06T18:00:00.000Z"
  }
}
```

### 1.3 Cookie Specifications
| Cookie Name | Scope | HttpOnly | Secure | SameSite | Max Age | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `accessToken` | `/` | Yes | Yes (in prod) | `Lax` | 900s (15m) | Short-lived JWT bearer token |
| `refreshToken` | `/api/v1/auth` | Yes | Yes (in prod) | `Lax` | 604,800s (7d) | Long-lived rotating session refresh token |

---

## 2. Comprehensive Endpoint Catalog

### 2.1 `POST /api/v1/auth/register`
* **Access:** Public (Rate Limited: 10 requests / 15m)
* **Description:** Creates a new student or owner account and establishes an authenticated session.
* **Request Body:**
  ```json
  {
    "email": "student@campus.edu",
    "password": "SecurePassword123!",
    "firstName": "Aarav",
    "lastName": "Sharma",
    "phone": "+919876543210",
    "role": "STUDENT",
    "collegeName": "IIT Delhi"
  }
  ```
* **Success Status:** `201 Created`
* **Response Body (`data`):**
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "student@campus.edu",
      "phone": "+919876543210",
      "role": "STUDENT",
      "status": "ACTIVE",
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "createdAt": "2026-11-06T...",
      "profile": { "firstName": "Aarav", "lastName": "Sharma" },
      "studentProfile": { "collegeName": "IIT Delhi" }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "refreshToken": "64-char-hex-string",
      "expiresIn": 900
    },
    "sessionId": "uuid"
  }
  ```
* **Error Statuses:**
  - `400 VALIDATION_ERROR`: Missing fields, short password, or role `'ADMIN'`.
  - `409 UNIQUE_CONSTRAINT_VIOLATION`: Email address already registered.

### 2.2 `POST /api/v1/auth/login`
* **Access:** Public (Rate Limited: 10 requests / 15m)
* **Description:** Verifies credentials and issues a fresh access/refresh token pair.
* **Request Body:**
  ```json
  {
    "email": "student@campus.edu",
    "password": "SecurePassword123!"
  }
  ```
* **Success Status:** `200 OK`
* **Response Body:** Identical to registration payload (user profile, token pair, session ID).
* **Error Statuses:**
  - `401 UNAUTHENTICATED`: Invalid email or incorrect password.
  - `403 FORBIDDEN`: Account status is `SUSPENDED` or `DELETED`.

### 2.3 `POST /api/v1/auth/refresh`
* **Access:** Public (or via Cookie)
* **Description:** Consumes a valid refresh token, rotates the token in PostgreSQL, and issues a new token pair.
* **Request Body (Optional if using Cookie):**
  ```json
  {
    "refreshToken": "64-char-hex-string"
  }
  ```
* **Success Status:** `200 OK`
* **Response Body (`data`):**
  ```json
  {
    "tokens": {
      "accessToken": "new-eyJhbGci...",
      "refreshToken": "new-64-char-hex-string",
      "expiresIn": 900
    }
  }
  ```
* **Error Statuses:**
  - `401 UNAUTHENTICATED`: Expired refresh token, non-existent token, or **reuse detection triggered** (which invalidates all user sessions).

### 2.4 `POST /api/v1/auth/logout`
* **Access:** Public / Authenticated
* **Description:** Invalidates active session in PostgreSQL and clears authentication cookies.
* **Request Body (Optional):** `{ "refreshToken": "..." }`
* **Success Status:** `200 OK`
* **Response Body:** `{ "message": "Logged out successfully." }`

### 2.5 `GET /api/v1/auth/me`
* **Access:** Authenticated (`requireAuth()`)
* **Headers:** `Authorization: Bearer <accessToken>` (or `accessToken` cookie)
* **Description:** Returns the authenticated user's profile and active session context.
* **Success Status:** `200 OK`
* **Response Body (`data`):**
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "student@campus.edu",
      "phone": "+919876543210",
      "role": "STUDENT",
      "status": "ACTIVE",
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "profile": { "firstName": "Aarav", "lastName": "Sharma" },
      "studentProfile": { "collegeName": "IIT Delhi" }
    },
    "sessionId": "uuid"
  }
  ```
* **Error Statuses:** `401 UNAUTHENTICATED`: Missing or invalid token.

### 2.6 `POST /api/v1/auth/password/change`
* **Access:** Authenticated (`requireAuth()`)
* **Request Body:**
  ```json
  {
    "currentPassword": "SecurePassword123!",
    "newPassword": "NewStrongPassword2026!"
  }
  ```
* **Success Status:** `200 OK`
* **Response Body:** `{ "message": "Password updated successfully. All existing sessions have been terminated. Please log in again." }`
* **Error Statuses:** `401 UNAUTHENTICATED`: Current password mismatch; `422 VALIDATION_CONSTRAINT_ERROR`: Weak new password.

### 2.7 `POST /api/v1/auth/password/forgot`
* **Access:** Public (Rate Limited: 5 requests / 15m)
* **Description:** Dispatches a secure password reset token (1-hour validity). Prevents account enumeration by returning an identical success response for both existent and non-existent emails.
* **Request Body:** `{ "email": "student@campus.edu" }`
* **Success Status:** `200 OK`
* **Response Body:** `{ "message": "If the provided email is associated with an active account, a password reset link has been dispatched." }`

### 2.8 `POST /api/v1/auth/password/reset`
* **Access:** Public (Rate Limited: 5 requests / 15m)
* **Request Body:**
  ```json
  {
    "token": "64-char-hex-reset-token",
    "newPassword": "NewStrongPassword2026!"
  }
  ```
* **Success Status:** `200 OK`
* **Response Body:** `{ "message": "Password has been reset successfully. You may now log in." }`
* **Error Statuses:** `401 UNAUTHENTICATED`: Token expired, invalid, or already consumed.

### 2.9 `POST /api/v1/auth/email/verify`
* **Access:** Public / Authenticated
* **Request Body:** `{ "token": "64-char-hex-verification-token" }`
* **Success Status:** `200 OK`
* **Response Body:** `{ "message": "Email address verified successfully." }`

### 2.10 `POST /api/v1/auth/email/resend-verification`
* **Access:** Authenticated (`requireAuth()`)
* **Success Status:** `200 OK`
* **Response Body:** `{ "message": "Verification link dispatched to your registered email address." }`

### 2.11 `GET /api/v1/auth/sessions`
* **Access:** Authenticated (`requireAuth()`)
* **Description:** Lists all active, non-revoked sessions for the authenticated user with masked IP addresses.
* **Success Status:** `200 OK`
* **Response Body (`data`):**
  ```json
  {
    "sessions": [
      {
        "id": "uuid",
        "ipAddress": "192.168.***.***",
        "userAgent": "Mozilla/5.0 ...",
        "createdAt": "2026-11-06T...",
        "lastActivityAt": "2026-11-06T...",
        "isCurrent": true
      }
    ]
  }
  ```

### 2.12 `DELETE /api/v1/auth/sessions/:sessionId`
* **Access:** Authenticated (`requireAuth()`, Resource Owner)
* **Description:** Terminates a specific active session belonging to the user.
* **Success Status:** `200 OK`
* **Response Body:** `{ "message": "Session revoked successfully." }`
* **Error Statuses:** `403 FORBIDDEN`: Attempting to revoke a session belonging to another user.
