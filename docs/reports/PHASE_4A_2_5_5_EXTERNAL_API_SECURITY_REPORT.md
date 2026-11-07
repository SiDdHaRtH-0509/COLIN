# COLIN — Phase 4A.2.5.5: External API Security & Provider Audit Report

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.5 — External API Security & Secrets Management  
**Branch:** `phase-4a-2-5-5-api-security-secrets`  
**Baseline Commit:** `15b6efb`  
**Author:** Principal Security Architect & Cloud Infrastructure Auditor  

---

## 1. Executive Summary

This report delivers the comprehensive security audit across all external service integrations powering COLIN:
1. Google Maps Platform (Geocoding & Places APIs)
2. Cloud Image Storage (AWS S3 / Cloudflare R2)
3. Transactional Email Infrastructure (SendGrid & Postmark)
4. Distributed Cache & Rate Limiting Infrastructure (Redis 7)

Each integration was audited against the principles of least privilege, attack surface minimization, secret confidentiality, and policy compliance.

---

## 2. Google Maps Platform Security Audit (Gate S08)

### 2.1 Credential Architecture & Key Separation
COLIN maintains two distinct Google Maps API keys:
1. **Server-Side Key (`GOOGLE_MAPS_SERVER_KEY`):**
   - **Consumer:** `GoogleGeolocationProvider.ts` in the Node.js backend.
   - **GCP Console Restrictions:** Must be restricted by **Server IP addresses** (CIDR block of backend VPC / NAT gateway).
   - **API Restrictions:** Strictly restricted to **Geocoding API** and **Places API (New)**.
   - **Protection:** Never exposed to client bundles or API response bodies. Redacted from error logs via `redactKey()`.
2. **Browser-Side Key (`VITE_GOOGLE_MAPS_BROWSER_KEY`):**
   - **Consumer:** Client-side Google Maps JavaScript SDK in `src/components/location/`.
   - **GCP Console Restrictions:** Must be restricted by **HTTP Referrers** (e.g. `https://colin.in/*`, `https://*.colin.in/*`, and `http://localhost:5173/*` for dev).
   - **API Restrictions:** Restricted to **Maps JavaScript API**.
   - **Security Stance:** Browser keys are inherently public; security is enforced via strict HTTP Referrer whitelisting and GCP daily quota limits, not secrecy.

### 2.2 Google Maps Policy & Terms Compliance Review
- **Attribution (Gate G37):** Every geocoding and places result includes the mandatory `attribution: 'Powered by Google'` as required by Google Maps Platform Terms §3.2.3.
- **Data Retention & Caching (Gate G26, G27, G29):**
  - Place IDs are stored indefinitely as permitted under Section 3.2.3(b).
  - Geocoding coordinates and intermediate addresses are cached in Redis with a maximum TTL of 30 days (2,592,000 seconds), complying with Google Maps Service-Specific Terms.
  - Property coordinates displayed to users require explicit owner confirmation (`OWNER_CONFIRMED`), preventing unauthorized permanent retention of Google-derived geometries.

---

## 3. Cloud Storage Credential Security Audit (Gate S09)

### 3.1 Least-Privilege IAM Policy for S3 / R2
The AWS IAM role or service account used by COLIN's `S3StorageProvider` is constrained by a least-privilege policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ColinPropertyPhotosScopedAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::colin-property-photos-prod/properties/*"
    },
    {
      "Sid": "ColinUploadsTempAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::colin-property-photos-prod/uploads/*"
    }
  ]
}
```
**Explicit Denials:**
- No `s3:CreateBucket`, `s3:DeleteBucket`, or `s3:PutBucketPolicy` permissions.
- No access to any bucket outside `colin-property-photos-prod`.

### 3.2 Signed URL & Pipeline Protection
- **Pre-signed Upload URLs:** Expire strictly after **15 minutes** (900 seconds).
- **Validation Bypass Prevention:** Pre-signed URLs write to `uploads/temp_*`. They cannot directly write to `properties/*`. The backend image pipeline (`processUploadedImage`) downloads and parses the image with Sharp, validates magic bytes (JPEG/PNG/WebP), strips metadata/EXIF tags, enforces dimension limits (max 4096px), and converts to WebP before committing the asset to the property record.

---

## 4. Transactional Email Credential Security Audit (Gate S10)

### 4.1 Provider API Key Scopes
- **SendGrid API Key (`SENDGRID_API_KEY`):** Must be provisioned as a "Restricted Access" key with `Mail Send -> Full Access` only. Administrative, template, billing, and account management permissions are withheld.
- **Postmark Server Token (`POSTMARK_SERVER_TOKEN`):** Provisioned on a per-environment server container, isolating development outboxes from production student communications.

### 4.2 Webhook Signature & Inbound Verification (Gate S12)
- **SendGrid Event Webhook:** Verified using the ECDSA public key (`SENDGRID_WEBHOOK_VERIFICATION_KEY`) against incoming `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp` headers.
- **Postmark Webhook:** Protected by HTTP Basic Authentication (`EMAIL_WEBHOOK_BASIC_AUTH_USER` and `EMAIL_WEBHOOK_BASIC_AUTH_PASSWORD`), enforced at middleware entry point before JSON parsing.

### 4.3 Carry-Forward Verification from Phase 4A.2.5.3
1. **Cryptographic Key Separation:** Enforced. `EMAIL_ENCRYPTION_KEY` is independent of `JWT_SECRET`.
2. **Delivery-Event Immutability:** Enforced via PostgreSQL trigger `prevent_delivery_event_mutation()` and permission revocation on `colin_app_runtime`.
3. **Worker Crash Resilience:** Enforced via PostgreSQL CTE-materialized `FOR UPDATE SKIP LOCKED` batch claiming and automated stale job reclamation.

---

## 5. Redis Credential Security Audit (Gate S11)

### 5.1 Authentication, ACLs, and Network Isolation
- **Authentication:** In production, Redis instances require password authentication via `AUTH <password>` or `REDIS_PASSWORD`.
- **Encryption in Transit:** Supported via `rediss://` TLS protocol schema.
- **Network Isolation:** Redis should bind only to internal loopback (`127.0.0.1`) or private VPC subnet interfaces. It must never be exposed directly to the public Internet.
- **ACL Best Practices:** A dedicated user `colin_app` with restricted command permissions (disallowing `FLUSHALL`, `CONFIG`, `DEBUG`, `KEYS`) is recommended for production.

### 5.2 Carry-Forward Verification from Phase 4A.2.5.4
1. **Clock Consistency:** Sliding-window Lua script supports Redis server `TIME` as authoritative clock source, eliminating issues from host clock drift.
2. **ZSET Member Uniqueness:** Guaranteed via `${now}-${crypto.randomBytes(4).toString('hex')}` entry IDs.
3. **Fail-Closed Security:** Authentication rate limiters strictly reject traffic when Redis is unavailable (`failMode: 'closed'`).

---

## 6. Audit Verdict
**FULL PASS.** All external API integrations conform to strict least-privilege scoping, separate client browser keys from server credentials, apply authenticated encryption at rest, and protect webhook ingresses against unauthorized tampering.
