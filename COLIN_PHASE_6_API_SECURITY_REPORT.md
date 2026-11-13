# COLIN — PHASE 6 API SECURITY REPORT
## API Perimeter Protection, Binary Upload Inspection & Defensive Security Headers

**Platform:** COLIN Student Accommodation Platform  
**Target Environments:** Staging & Production  
**Compliance Standards:** OWASP API Security Top 10 (2023), ASVS Level 2  
**Report Date:** November 2026  
**Status:** FULL PASS — DEFENSIVE MEASURES OPERATIONAL  

---

## 1. Executive Summary

This report documents the perimeter defenses, request sanitization, binary inspection protocols, and HTTP security headers established under **Phase 6F (API Security Hardening)** for the COLIN platform.

The API server implements defensive-in-depth measures against common web vulnerabilities including Remote Code Execution (RCE), Insecure File Uploads, Denial of Service (DoS), Cross-Site Scripting (XSS), Clickjacking, MIME-sniffing, and Cross-Origin Resource Sharing (CORS) misconfigurations.

---

## 2. Defensive HTTP Security Headers

COLIN configures comprehensive HTTP security headers via `helmet` and custom middleware in `src/server/app.ts`:

| Header Name | Configured Directive / Value | Defensive Objective |
| :--- | :--- | :--- |
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS communication; prevents SSL-stripping and MITM attacks. |
| **X-Content-Type-Options** | `nosniff` | Disables browser MIME-type sniffing; enforces declared Content-Type. |
| **X-Frame-Options** | `DENY` | Prevents framing in `<frame>`, `<iframe>`, or `<embed>`; eliminates clickjacking attacks. |
| **Content-Security-Policy** | `default-src 'self'; script-src 'self' ...; frame-ancestors 'none';` | Restricts script sources, resource loading, and framing. |
| **X-XSS-Protection** | `0` (Modern standard) / sanitized via CSP | Prevents legacy XSS auditor vulnerabilities. |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Protects privacy by redacting path and query parameters in cross-origin requests. |
| **X-Download-Options** | `noopen` | Prevents Internet Explorer from opening HTML downloads directly. |
| **X-DNS-Prefetch-Control**| `off` | Prevents browser DNS prefetching of external URLs. |

---

## 3. Cross-Origin Resource Sharing (CORS) Policy

### 3.1 Strict Origin Whitelist
Wildcard CORS (`*`) with credentials is fundamentally prohibited. The server enforces a dynamic whitelist matching approved deployment domains:

```typescript
const allowedOrigins = [
  'http://localhost:5173', // Vite Frontend (Development)
  'http://localhost:3000', // Alternative Local Port
  'https://colin.in',       // Staging & Production Domain
  'https://app.colin.in',   // Customer Web Application
  'https://admin.colin.in', // Admin Control Centre
];
```

### 3.2 Request Evaluation Invariant
- Requests originating from unlisted origins are blocked at the middleware layer.
- `Access-Control-Allow-Credentials: true` is strictly paired only with explicit whitelisted origins.
- Pre-flight `OPTIONS` requests are cached for 600 seconds (`maxAge: 600`) to optimize network traffic without compromising security.

---

## 4. Input Validation & Request Size Limits

### 4.1 Strict Schema Enforcement
Every route utilizes `validateRequest({ body, query, params })` backed by `Zod` schemas:
- **Type Checking:** Coerces and validates primitive types, UUID formats, email formats, and enum values.
- **Unexpected Keys:** Strips or rejects unexpected payload parameters, neutralizing Mass Assignment and Parameter Pollution attacks.
- **Fail-Fast Semantics:** Invalid payloads return structured `400 Bad Request` responses before database or business layer execution:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters.",
    "details": [
      {
        "path": "email",
        "message": "Invalid email address format"
      }
    ]
  }
}
```

### 4.2 Body Size Limiting (Denial of Service Defense)
Payload size limits prevent memory exhaustion attacks:
- **JSON & URL-Encoded Bodies:** Strictly capped at `100kb`.
- **Multipart Uploads:** Handled exclusively via dedicated streaming upload endpoints with explicit per-file caps (10MB for photos, 5MB for KYC PDFs).

---

## 5. File Upload Security & Magic-Byte Inspection

### 5.1 The Danger of Extension-Only Validation
Validating uploads by MIME-type headers or file extensions alone exposes the application to Remote Code Execution (RCE) via polyglot files, embedded scripts, and renamed executables (e.g., `exploit.php.jpg` or an ELF binary disguised as `.pdf`).

### 5.2 Deep Magic-Byte Binary Inspection
COLIN implements `UploadValidator` (`src/server/storage/uploadValidator.ts`) which examines the raw binary header bytes of every uploaded file:

| File Type | Allowed Extension | Magic Byte Signature (Hexadecimal) |
| :--- | :---: | :--- |
| **JPEG / JPG** | `.jpg`, `.jpeg` | `FF D8 FF` |
| **PNG** | `.png` | `89 50 4E 47 0D 0A 1A 0A` |
| **WebP** | `.webp` | `52 49 46 46` ... `57 45 42 50` |
| **PDF** | `.pdf` | `25 50 44 46` (`%PDF`) |

### 5.3 Prohibited Executable Blacklist
Any file matching the following executable extensions is rejected immediately regardless of magic bytes:
`.exe`, `.sh`, `.bat`, `.cmd`, `.js`, `.ts`, `.php`, `.phtml`, `.py`, `.rb`, `.pl`, `.cgi`, `.vbs`, `.ps1`, `.jar`, `.msi`, `.dll`, `.so`.

### 5.4 Sanitized Filename Generation
User-provided filenames are completely discarded for storage. Files are persisted under cryptographically random UUIDv4 identifiers:
```typescript
const safeFilename = `${crypto.randomUUID()}${detectedExtension}`;
```
This eliminates:
- Path traversal attacks (`../../etc/passwd` or `..\windows\system32`)
- Null-byte injection (`file.png\0.php`)
- Unicode homoglyph collisions

---

## 6. Distributed Rate Limiting Architecture

Sensitive endpoints are protected by Redis-backed sliding-window rate limiters with fail-closed security and client IP anti-spoofing (`trustedProxy.ts`):

```
Client Request -> Socket Peer IP -> Trusted Proxy Verification -> Client IP Extraction -> Redis Sliding Window (Lua)
```

- **Authentication Endpoints:** 10 requests / 15 minutes
- **Password Reset Endpoints:** 5 requests / 15 minutes
- **Public API Endpoints:** 100 requests / 1 minute

---

## 7. Automated Test Evidence

Verified in `src/test/security/phase6_security_hardening.integration.test.ts`:

| Test ID | Test Scenario | Verified Outcome | Status |
| :--- | :--- | :--- | :--- |
| **SEC-6.1** | Valid JPEG magic-byte verification | Valid `FF D8 FF` header accepted; safe UUID filename returned | PASS |
| **SEC-6.2** | Valid PNG magic-byte verification | Valid `89 50 4E 47` header accepted; safe UUID filename returned | PASS |
| **SEC-6.3** | Valid PDF magic-byte verification | Valid `%PDF` (`25 50 44 46`) header accepted | PASS |
| **SEC-6.4** | Fake JPEG containing PHP executable script | Spoofed file with PHP script rejected as `INVALID_FILE_TYPE` | PASS |
| **SEC-6.5** | Executable file extension rejection (`.sh`, `.exe`) | Malicious extension blocked immediately as `FORBIDDEN_FILE_EXTENSION` | PASS |
| **SEC-6.6** | Path traversal in upload filename | `../../malicious.png` sanitized to safe UUID filename | PASS |

---

## 8. Conclusion
Perimeter defenses, schema validation, binary magic-byte inspection, and cryptographic filename isolation are active across all COLIN API endpoints.
