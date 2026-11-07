# COLIN — Phase 4A.2.5.3: Email Provider Configuration Guide

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.3 — Transactional Email Integration  
**Audience:** Platform Engineers, DevOps, Site Reliability Engineers  

---

## 1. Overview & Provider Strategy

COLIN's transactional email architecture abstracts dispatch across three providers:
1. **Mock (`mock`)**: Zero-dependency in-memory delivery engine for local development, CI/CD, and automated integration tests.
2. **SendGrid (`sendgrid`)**: Twilio SendGrid v3 Mail Send REST API for high-volume delivery.
3. **Postmark (`postmark`)**: ActiveCampaign Postmark Server API dedicated specifically to mission-critical transactional delivery.

The provider is selected via the `EMAIL_PROVIDER` environment variable.

---

## 2. Environment Variables Reference

| Variable Name | Type | Allowed Values | Default | Description |
|---|---|---|---|---|
| `EMAIL_PROVIDER` | String | `mock`, `sendgrid`, `postmark` | `mock` | Active delivery provider adapter. |
| `EMAIL_FROM_ADDRESS` | Email | Valid RFC 5322 email | `noreply@colin.in` | Verified system sender address. |
| `EMAIL_FROM_NAME` | String | UTF-8 text | `COLIN Campus Living` | Friendly display name for sender. |
| `EMAIL_REPLY_TO` | Email | Valid RFC 5322 email | `support@colin.in` | Inbound support response address. |
| `EMAIL_TOKEN_ENCRYPTION_KEY` | Hex String | 64 hex chars (32 bytes) | *Required in Prod* | AES-256-GCM master encryption key for outbox tokens. |
| `PUBLIC_BASE_URL` | URL | Valid HTTP/HTTPS URL | `http://localhost:5173` | Frontend root URL for action link generation. |
| `SENDGRID_API_KEY` | String | `SG.***` format | Optional | SendGrid REST API key with Mail Send permissions. |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | String | Base64 ECDSA public key | Optional | SendGrid Event Webhook verification key. |
| `POSTMARK_SERVER_TOKEN` | UUID / String | Valid Postmark token | Optional | Postmark transactional server API token. |
| `POSTMARK_WEBHOOK_USER` | String | Alphanumeric | Optional | HTTP Basic Auth username for Postmark webhooks. |
| `POSTMARK_WEBHOOK_PASSWORD` | String | Alphanumeric | Optional | HTTP Basic Auth password for Postmark webhooks. |
| `ALLOW_MOCK_EMAIL_IN_PRODUCTION` | Boolean | `true`, `false` | `false` | Safety override allowing mock provider in production. |

---

## 3. Provider Setup & Onboarding Workflows

### 3.1 SendGrid Onboarding Workflow
1. **API Key Generation:**
   - Log into Twilio SendGrid Console -> Settings -> API Keys.
   - Click "Create API Key".
   - Select "Restricted Access".
   - Grant **Full Access** to `Mail Send` permissions. Revoke all other administrative permissions.
   - Set environment variable:
     ```bash
     SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
     ```

2. **Tracking Settings (Crucial for Auth):**
   - In SendGrid Settings -> Tracking:
   - Ensure **Click Tracking is DISABLED** or configure domain bypass.
   - *Rationale:* Click tracking rewrites verification URLs through `ct.sendgrid.net`. If the verification link contains sensitive cryptographic tokens, third-party redirects can leak tokens via Referer headers or cause signature mismatches.

3. **Event Webhook Configuration:**
   - Go to Settings -> Mail Settings -> Event Webhook.
   - Set HTTP POST URL: `https://api.colin.in/api/v1/webhooks/email/sendgrid`
   - Select Event Types: `Processed`, `Dropped`, `Delivered`, `Deferred`, `Bounce`, `Spam Report`.
   - Toggle **Signature Verification: ON**.
   - Copy the ECDSA Public Key into:
     ```bash
     SENDGRID_WEBHOOK_VERIFICATION_KEY="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE..."
     ```

---

### 3.2 Postmark Onboarding Workflow
1. **Server API Token Generation:**
   - Log into Postmark Console -> Servers.
   - Select or create the "COLIN Transactional" server.
   - Navigate to API Tokens -> Copy the **Server API Token**.
   - Set environment variable:
     ```bash
     POSTMARK_SERVER_TOKEN="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
     ```

2. **Sender Signature Verification:**
   - In Sender Signatures, verify domain `colin.in` and sender `noreply@colin.in`.

3. **Webhook Setup:**
   - In Server -> Webhooks -> Add Webhook.
   - Set Webhook URL: `https://api.colin.in/api/v1/webhooks/email/postmark`
   - Configure HTTP Basic Authentication:
     - User: `colin-webhook-ingress`
     - Password: `<generate-high-entropy-secret>`
   - Set environment variables:
     ```bash
     POSTMARK_WEBHOOK_USER="colin-webhook-ingress"
     POSTMARK_WEBHOOK_PASSWORD="<high-entropy-secret>"
     ```
   - Check events: `Delivery`, `Bounce`, `Spam Complaint`.

---

## 4. Production Guardrails & Secret Redaction

### 4.1 Production Mock Guardrail
If `NODE_ENV=production` and `EMAIL_PROVIDER=mock`, the application server will throw a fatal `EmailConfigurationError` on startup:
```
Mock email provider is strictly prohibited in production mode.
Configure a valid provider (sendgrid or postmark) or explicitly set ALLOW_MOCK_EMAIL_IN_PRODUCTION=true for staging tests.
```

### 4.2 Credential Redaction Policy
Health check endpoints (`GET /health`) or configuration dumps never expose raw credentials:
- API Keys: Redacted to `SG.***...[REDACTED]` or `[REDACTED]`.
- Webhook Secrets: Redacted completely.
- Token Encryption Key: Never included in any diagnostics DTO.
