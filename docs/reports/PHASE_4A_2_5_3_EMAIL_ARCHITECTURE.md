# COLIN — Phase 4A.2.5.3: Transactional Email Architecture Specification

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.3 — Transactional Email Integration  
**Feature Branch:** `phase-4a-2-5-3-transactional-email`  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary & Design Philosophy

Transactional email is a mission-critical infrastructure component of COLIN. It drives student account verification, password resets, security notifications, and marketplace alerts. If an external email provider suffers an outage or rate limit, student registration and authentication workflows must **never fail, lock, or corrupt**.

To achieve carrier-grade resilience, COLIN implements a **Transactional Outbox Architecture** backed by PostgreSQL 18. Emails are written atomically within the same database transaction as the business operation that triggers them. A dedicated background worker continuously claims batches using `FOR UPDATE SKIP LOCKED`, executes delivery via a provider abstraction layer (SendGrid, Postmark, or Mock), applies exponential backoff with jitter upon failure, and processes delivery/bounce events via cryptographic webhooks.

```
+-------------------------------------------------------------------------------+
|                             COLIN APPLICATION LAYER                           |
| (AuthService, Registration, Password Management, Security Event Triggers)    |
+-------------------------------------------------------------------------------+
                                      |
                     Atomically enqueues outbox record
                     within business transaction (tx)
                                      v
+-------------------------------------------------------------------------------+
|                           POSTGRESQL 18 ENGINE                                |
|  - email_outbox (status, retry counter, encrypted token, idempotency_key)     |
|  - email_delivery_events (provider events, webhooks, timestamps)              |
|  - email_suppressions (hard bounces, spam complaints, blacklists)             |
+-------------------------------------------------------------------------------+
                                      |
                    Atomic Claim: FOR UPDATE SKIP LOCKED
                                      v
+-------------------------------------------------------------------------------+
|                             EMAIL WORKER ENGINE                               |
|  - Batch size: 20 records                                                     |
|  - Stale worker recovery: > 5 minutes                                         |
|  - Exponential Backoff with Decorrelated Jitter: 2^attempt * 10s + rand()      |
|  - AES-256-GCM token decryption just-in-time for dispatch                     |
+-------------------------------------------------------------------------------+
                                      |
                        Dispatches to Provider Interface
                                      v
+-------------------------------------------------------------------------------+
|                          EMAIL PROVIDER ABSTRACTION                           |
|       +---------------------+-------------------+---------------------+       |
|       |  MockEmailProvider  | SendGridProvider  |  PostmarkProvider   |       |
|       +---------------------+-------------------+---------------------+       |
+-------------------------------------------------------------------------------+
                                      |
                          External Webhook Feedback
                                      v
+-------------------------------------------------------------------------------+
|                            WEBHOOK INGESTION PIPELINE                         |
|  - SendGrid: ECDSA P-256 / SHA-256 Signature Verification                     |
|  - Postmark: Timing-Safe HTTP Basic Authentication                            |
|  - Auto-records Hard Bounces & Spam Complaints into email_suppressions        |
+-------------------------------------------------------------------------------+
```

---

## 2. Database Models & Schema Design

The transactional email subsystem is managed through three core relational models in `prisma/schema.prisma`:

### 2.1 `EmailOutbox` Table (`email_outbox`)
The central asynchronous queue table:
* `id`: UUID Primary Key.
* `event_type`: `EmailEventType` enum (`VERIFICATION_EMAIL`, `PASSWORD_RESET`, `PASSWORD_CHANGED`, `ACCOUNT_SECURITY`, `OWNER_VERIFICATION`, `MARKETPLACE_NOTIFICATION`).
* `recipient`: Target email address (`VARCHAR(255)`).
* `subject`: Subject line (`VARCHAR(255)`).
* `template_alias`: Template key (`VARCHAR(100)`).
* `template_data_json`: JSON payload storing parameters and the encrypted token (`encryptedToken`).
* `status`: `EmailOutboxStatus` enum (`PENDING`, `PROCESSING`, `ACCEPTED`, `DELIVERED`, `DEFERRED`, `BOUNCED`, `FAILED`, `SUPPRESSED`).
* `idempotency_key`: Unique string (`VARCHAR(255)`) preventing duplicate message scheduling.
* `attempts`: Integer count of dispatch attempts (default `0`).
* `max_retries`: Maximum allowed retry attempts (default `5`).
* `scheduled_at`, `next_attempt_at`, `last_attempt_at`: Timestamps controlling scheduling and retry intervals.
* `provider`, `provider_message_id`: Dispatch references returned by external APIs.

### 2.2 `EmailDeliveryEvent` Table (`email_delivery_events`)
Immutable audit log of all provider delivery webhooks:
* `id`: UUID Primary Key.
* `email_outbox_id`: Foreign key referencing `email_outbox(id)` (`ON DELETE SET NULL`).
* `provider`: Provider identifier (`VARCHAR(50)`).
* `provider_event_id`: Unique external event ID (`VARCHAR(255)`).
* `provider_message_id`: Message ID cross-referencing outbox dispatch.
* `event_type`: `EmailDeliveryEventType` (`ACCEPTED`, `DELIVERED`, `DEFERRED`, `BOUNCED`, `SPAM_COMPLAINT`, `FAILED`, `REJECTED`).
* `event_timestamp`: Timestamp when event occurred at the provider.
* `recipient`: Recipient email address.
* `metadata_json`: Full webhook event payload.

### 2.3 `EmailSuppression` Table (`email_suppressions`)
Persistent suppression list protecting sender reputation:
* `id`: UUID Primary Key.
* `email`: Suppressed recipient email (`VARCHAR(255)` unique).
* `reason`: Suppression cause (`HARD_BOUNCE`, `SPAM_COMPLAINT`, `MANUAL`).
* `source`: Ingestion source (`WEBHOOK`, `ADMIN`, `API`).
* `provider`: Reporting provider.
* `created_at`: Ingestion timestamp.

---

## 3. Worker Concurrency & Atomic Locking

The `EmailWorker` is engineered to operate safely in multi-instance horizontally scaled deployments without external coordination services (such as Redis or ZooKeeper).

### 3.1 Row-Level Atomic Batch Claim
To guarantee that two concurrent worker instances never claim the same outbox record, claiming is executed via PostgreSQL row-level locks:
```sql
UPDATE email_outbox
SET 
  status = 'PROCESSING'::"EmailOutboxStatus",
  last_attempt_at = NOW(),
  attempts = attempts + 1,
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM email_outbox
  WHERE (status IN ('PENDING'::"EmailOutboxStatus", 'DEFERRED'::"EmailOutboxStatus") AND next_attempt_at <= NOW())
     OR (status = 'PROCESSING'::"EmailOutboxStatus" AND last_attempt_at < NOW() - (5 * INTERVAL '1 minute'))
  ORDER BY next_attempt_at ASC
  LIMIT 20
  FOR UPDATE SKIP LOCKED
)
RETURNING id;
```
1. `FOR UPDATE SKIP LOCKED` skips rows currently locked by another transaction, preventing thread contention or deadlock.
2. The subquery atomically transitions claimed rows to `PROCESSING` status.
3. Once claimed IDs are returned, the worker fetches strongly-typed Prisma models to execute templating and dispatch.

### 3.2 Stale Processing Recovery
If a worker crashes or encounters an unhandled exception while sending an email, rows would remain stuck in `PROCESSING` status. The query explicitly reclaims rows where:
`status = 'PROCESSING' AND last_attempt_at < NOW() - INTERVAL '5 minutes'`
This guarantees automatic self-healing without manual database intervention.

### 3.3 Retry Policy with Exponential Backoff and Jitter
Dispatches that fail due to transient network or provider errors are retried according to `EmailRetryPolicy`:
$$\text{delay} = \min(\text{maxBackoffSeconds}, \text{baseDelaySeconds} \times 2^{\text{attempt}}) + \text{uniform}(0, \text{jitterSeconds})$$
- Default base delay: 10 seconds.
- Max retries: 5 attempts.
- Max backoff: 3600 seconds (1 hour).
- Jitter: random 0–5 seconds to prevent thundering-herd spikes against provider APIs.

---

## 4. Provider Abstraction Architecture

All email dispatch is decoupled behind the `EmailProvider` TypeScript interface:
```typescript
export interface EmailProvider {
  readonly name: EmailProviderName;
  send(message: EmailMessage): Promise<EmailSendResult>;
  verifyCredentials(): Promise<boolean>;
}
```

### 4.1 MockEmailProvider
- Used in `development` and `test` environments.
- Maintains an in-memory sent ledger (`getSentMessages()`) for fast, zero-dependency integration assertions.
- Supports programmatic simulated delivery failures (`simulateFailureNext()`) for retry policy testing.
- **Production Guardrail:** Enforces that `mock` provider cannot be loaded in `production` unless explicit `ALLOW_MOCK_EMAIL_IN_PRODUCTION=true` is set.

### 4.2 SendGridProvider
- Integrates with Twilio SendGrid v3 Mail Send REST API (`POST https://api.sendgrid.com/v3/mail/send`).
- Validates API key formatting (`SG.` prefix).
- Sets `tracking_settings` with `click_tracking: false` for authentication emails to prevent URL rewriting that could break token verification.
- Returns `providerMessageId` from `X-Message-Id` response header.

### 4.3 PostmarkProvider
- Integrates with Postmark Server API (`POST https://api.postmarkapp.com/email`).
- Validates Postmark Server Token header (`X-Postmark-Server-Token`).
- Configures `TrackOpens: false` and `TrackLinks: "None"` for sensitive transactional emails.
- Returns `providerMessageId` from `MessageID` JSON response.

---

## 5. Templating Architecture & Design Palette

All emails are generated by `email.templates.ts`, producing dual-output HTML and plain-text versions.

### 5.1 Design Palette
Templates strictly conform to COLIN's visual identity:
- **Primary Navy:** `#142B45` (Headers, brand text)
- **Secondary Teal:** `#16B8A6` (Primary CTAs, links)
- **Accent Amber:** `#F4B860` (Alert banners, badges)
- **Off-white Background:** `#F8FAFC` (Card backgrounds)
- **Body Charcoal:** `#1E293B` (Typography)

### 5.2 XSS Safety & Escaping
All dynamic user inputs (`firstName`, `email`, `eventDescription`, `ipAddress`) are strictly escaped before interpolation into HTML:
```typescript
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```
HTML injection payloads (e.g. `<script>`, `<style>`, `onerror=`) are neutralized as inert HTML entities.

---

## 6. Webhook Ingestion & Cryptographic Verification

Webhooks deliver real-time feedback regarding email delivery, bounces, and complaints.

### 6.1 SendGrid Webhook
- Endpoint: `POST /api/v1/webhooks/email/sendgrid`
- Verification: Twilio SendGrid Event Webhook Signature Verification using public ECDSA P-256 keys (`X-Twilio-Email-Event-Webhook-Signature`, `X-Twilio-Email-Event-Webhook-Timestamp`).
- Ingestion: Idempotent processing using `provider_event_id` (`sg_event_id`).

### 6.2 Postmark Webhook
- Endpoint: `POST /api/v1/webhooks/email/postmark`
- Verification: HTTP Basic Authentication using timing-safe string comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
- Ingestion: Idempotent processing using Postmark `RecordType` and `MessageID`.

### 6.3 Automated Suppression
When a webhook reports `bounce` (hard bounce) or `spamreport` / `SpamComplaint`:
1. The outbox record status is updated to `BOUNCED` or `FAILED`.
2. An entry is upserted into `email_suppressions`.
3. Subsequent attempts to enqueue emails to this recipient are immediately rejected with status `SUPPRESSED`.
