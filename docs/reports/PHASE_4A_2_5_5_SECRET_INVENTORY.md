# COLIN — Phase 4A.2.5.5: Credential Inventory & Risk Register

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.5 — External API Security & Secrets Management  
**Branch:** `phase-4a-2-5-5-api-security-secrets`  
**Baseline Commit:** `15b6efb`  
**Author:** Application Security Auditor & Infrastructure Engineer  

---

## 1. Complete Credential Classification Matrix

Credentials across the COLIN platform are classified into six security categories:
- **Category A:** Public Browser Configuration (Client-side bundles, restricted by HTTP referrer/origin)
- **Category B:** Server-Side API Credentials (Privileged 3rd-party SaaS integrations)
- **Category C:** Authentication Signing Keys (Symmetric/Asymmetric JWT tokens)
- **Category D:** Encryption Keys (At-rest data protection, AES-256-GCM tokens)
- **Category E:** Webhook Verification Secrets (Inbound event verification)
- **Category F:** Infrastructure Credentials (Database, cache, message broker connections)

| Category | Environment Variable | Purpose / Consumer | Sensitivity | Scope | Hardcoded Default in Dev? | Production Requirement |
|---|---|---|:---:|:---:|:---:|:---:|
| **A** | `VITE_GOOGLE_MAPS_BROWSER_KEY` | Client Google Maps JavaScript SDK (`src/components/location/`) | Low | Client / Browser | Optional | Required if Google provider active (Must be restricted by HTTP Referrer in GCP) |
| **A** | `STORAGE_PUBLIC_BASE_URL` | Public CDN base URL for rendered images | Low | Client / Server | None | Optional CDN endpoint |
| **A** | `EMAIL_PUBLIC_BASE_URL` | Base URL embedded in email action links | Low | Email Templates | `http://localhost:5173` | Required public domain (e.g. `https://colin.in`) |
| **B** | `GOOGLE_MAPS_SERVER_KEY` | Google Geocoding & Places (New) API (`GoogleGeolocationProvider.ts`) | Critical | Server only | None | Required if `GEOLOCATION_PROVIDER="google"` (Must be restricted by Server IP in GCP) |
| **B** | `S3_ACCESS_KEY_ID` | AWS / R2 IAM Access Key for S3 SDK (`storage.service.ts`) | Critical | Server only | None | Required if `STORAGE_PROVIDER="s3"` (Least-privilege S3 bucket scope) |
| **B** | `S3_SECRET_ACCESS_KEY` | AWS / R2 IAM Secret Access Key (`storage.service.ts`) | Critical | Server only | None | Required if `STORAGE_PROVIDER="s3"` (Never exposed to client) |
| **B** | `SENDGRID_API_KEY` | SendGrid Mail Send v3 API (`SendGridProvider.ts`) | Critical | Server only | None | Required if `EMAIL_PROVIDER="sendgrid"` (`Mail.Send` scope only) |
| **B** | `POSTMARK_SERVER_TOKEN` | Postmark Server API Token (`PostmarkProvider.ts`) | Critical | Server only | None | Required if `EMAIL_PROVIDER="postmark"` (Single-server scope) |
| **C** | `JWT_SECRET` | HS256 JWT access & refresh token signing (`TokenService.ts`) | Critical | Server only | Dev fallback only | **Mandatory** in production (Min 32 characters, cryptographically random) |
| **D** | `EMAIL_ENCRYPTION_KEY` | AES-256-GCM outbox token encryption at rest (`email.crypto.ts`) | Critical | Server only | Dev fallback only | **Mandatory** in production (Min 32 bytes, distinct from `JWT_SECRET`) |
| **D** | `EMAIL_ENCRYPTION_KEY_FALLBACK`| Dual-key rotation fallback decryption (`email.crypto.ts`) | Critical | Server only | None | Optional during active key rotation windows |
| **E** | `SENDGRID_WEBHOOK_VERIFICATION_KEY` | ECDSA public key for verifying inbound SendGrid webhooks | High | Server only | None | Required if SendGrid event webhooks active |
| **E** | `EMAIL_WEBHOOK_BASIC_AUTH_USER` | HTTP Basic Auth user for Postmark webhooks | High | Server only | `colin-webhook-admin` | Configurable |
| **E** | `EMAIL_WEBHOOK_BASIC_AUTH_PASSWORD` | HTTP Basic Auth password for Postmark webhooks | High | Server only | Dev fallback only | **Mandatory** strong secret in production (Min 16 chars) |
| **F** | `DATABASE_URL` | PostgreSQL connection string for `colin_app_runtime` | Critical | Server only | Local test DB | **Mandatory** connection URI with least-privilege credentials |
| **F** | `DATABASE_ADMIN_URL` | PostgreSQL connection string for `colin_admin_runtime` | Critical | Server only | Local test DB | **Mandatory** connection URI with admin-audit credentials |
| **F** | `REDIS_PASSWORD` | Redis authentication password (`redis.client.ts`) | Critical | Server only | None | **Mandatory** in production when Redis requires auth |
| **F** | `REDIS_URL` | Optional full Redis connection string with TLS/auth | Critical | Server only | None | Optional (Alternative to host/port/password) |
| **F** | `RATE_LIMIT_IDENTITY_HMAC_SECRET` | HMAC-SHA256 secret for anonymizing email identifiers in Redis | Critical | Server only | Dev fallback only | **Mandatory** in production (Min 16 chars, independent key) |

---

## 2. Secrets Risk Register

| Risk ID | Credential | Potential Threat / Impact | Likelihood | Impact | Existing Defense | Gap / Required Action in Phase 4A.2.5.5 |
|---|---|---|:---:|:---:|---|---|
| **RR-01** | `JWT_SECRET` & `EMAIL_ENCRYPTION_KEY` | Key reuse across signing and encryption domains (Cryptographic cross-protocol attacks). | Medium | Critical | Separate modules | **Enforce distinct keys:** Block `EMAIL_ENCRYPTION_KEY === JWT_SECRET` in production validator. |
| **RR-02** | `GOOGLE_MAPS_SERVER_KEY` | Accidental leak in frontend code bundles leading to unmetered billing or unauthorized geocoding calls. | Medium | High | Server-side only | Add automated scanner verifying server key is not present in `dist/` client bundles. |
| **RR-03** | `S3_SECRET_ACCESS_KEY` | Excessive IAM permissions allowing bucket deletion or arbitrary file modification. | Low | Critical | Local/S3 adapter | Document least-privilege IAM policy restricting actions to `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`. |
| **RR-04** | `EMAIL_ENCRYPTION_KEY` | Data loss / token invalidation during key rotation. | Low | High | Dual-key fallback | Verify `EMAIL_ENCRYPTION_KEY_FALLBACK` decrypts legacy tokens seamlessly in automated tests. |
| **RR-05** | `REDIS_PASSWORD` & `DATABASE_URL` | Credentials logged to stdout or error tracking during connection failures. | Medium | High | `redactRedisConfig()` | Generalize redaction across all configuration outputs (`redactSecrets()`). |
| **RR-06** | Insecure Dev Fallback in Prod | Deployment team forgets to set `JWT_SECRET` or `EMAIL_ENCRYPTION_KEY` and app uses dev fallback. | High | Critical | Startup checks | Implement unified `validateProductionStartupEnvironment()` that crashes immediately if fallbacks are detected. |

---

## 3. Storage & Transmission Safeguards

1. **No Credentials in Source Control:** `.env` is explicitly ignored in `.gitignore`. `.env.example` contains sanitized placeholders (`<REDACTED_PASSWORD>`, `your-...`).
2. **In-Flight Encryption:**
   - Database connections require TLS (`sslmode=require` / `sslmode=verify-full`) in production environments.
   - Redis supports `rediss://` (TLS) via standard `ioredis` TLS options.
   - S3 and Google Maps API calls execute exclusively over HTTPS (TLS 1.3/1.2).
3. **Log Sanitization:** All server logging interceptors mask sensitive header tokens (`Authorization: Bearer ***`, `Cookie: ***`, `X-Api-Key: ***`).
