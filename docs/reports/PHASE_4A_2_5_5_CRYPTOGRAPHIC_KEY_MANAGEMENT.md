# COLIN — Phase 4A.2.5.5: Cryptographic Key Management & Separation

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.5 — External API Security & Secrets Management  
**Branch:** `phase-4a-2-5-5-api-security-secrets`  
**Baseline Commit:** `15b6efb`  
**Author:** Principal Cryptographic Security Architect  

---

## 1. Cryptographic Key Inventory & Specifications

The COLIN platform operates five distinct cryptographic keys and verification secrets across separate operational domains:

| Key Name | Algorithm | Minimum Entropy | Primary Function | Consumer Modules | Rotation Strategy |
|---|---|---:|---|---|---|
| **`JWT_SECRET`** | HMAC-SHA256 (HS256) | 256 bits (32 bytes) | Access and refresh token signing & signature verification | `src/server/auth/TokenService.ts`, `src/server/middleware/authContext.ts` | Graceful expiration; refresh token re-issuance |
| **`EMAIL_ENCRYPTION_KEY`** | AES-256-GCM (Authenticated Encryption) | 256 bits (32 bytes) | At-rest encryption of sensitive verification and password-reset action tokens stored in `email_outbox` | `src/server/email/email.crypto.ts`, `src/server/email/outbox/EmailWorker.ts` | Dual-key rotation with zero downtime (`EMAIL_ENCRYPTION_KEY_FALLBACK`) |
| **`EMAIL_ENCRYPTION_KEY_FALLBACK`** | AES-256-GCM | 256 bits (32 bytes) | Decryption of existing in-flight tokens generated under the previous primary key | `src/server/email/email.crypto.ts` | Temporary; retained during active migration window (24–48 hours) |
| **`RATE_LIMIT_IDENTITY_HMAC_SECRET`** | HMAC-SHA256 | 256 bits (32 bytes) | Deterministic privacy-preserving hashing of user emails for Redis rate limiting | `src/server/redis/identity.ts` | Independent secret; rotation flushes rate-limiting buckets gracefully |
| **`SENDGRID_WEBHOOK_VERIFICATION_KEY`** | ECDSA (secp256r1) | Standard Public Key | Verification of SendGrid Event Webhook digital signatures | `src/server/email/webhooks/SendGridWebhookHandler.ts` | Update public key in env upon SendGrid key rotation |

---

## 2. Cryptographic Key Separation & Entropy Enforcement (Gate S05, S06, S07)

### 2.1 The Cross-Protocol Vulnerability & Audit Hardening
A common architectural flaw in web applications is the reuse of a single master secret across multiple cryptographic primitives. In Phase 4A.2.5.5, key separation was established and subsequently audited to enforce true cryptographic entropy across all symmetric keys:

1. **CSPRNG Key Generation:** All keys must be generated using cryptographically secure pseudorandom number generators (`crypto.randomBytes(32)` or `generateCryptographicKey()`).
2. **Distinguishing Key Length from Information Entropy:**
   Raw string length does not guarantee cryptographic security. For example:
   - `'abababababababababababababababab'` (length 32) has only 2 unique characters and a Shannon entropy of $1.00\text{ bit/char}$ ($32\text{ total bits}$), which is computationally trivial to brute-force.
   - `'0123456789abcdef0123456789abcdef'` (length 32) has 16 characters but a repeating cyclic structure.
   - A CSPRNG hex string from `crypto.randomBytes(32).toString('hex')` (length 64) exhibits Shannon entropy $\approx 3.9\text{ bits/char}$ and $> 240\text{ total entropy bits}$.

   The Shannon entropy calculation implemented in `src/server/config/secrets.config.ts`:
   $$H(X) = -\sum_{i=1}^{n} p(x_i) \log_2 p(x_i)$$
   Total information entropy is given by:
   $$E_{\text{total}} = \text{length} \times H(X)$$

3. **Rejection of Weak or Predictable Patterns:** `isWeakOrPredictableSecret()` enforces both structural pattern checks (repeating chunks, cyclic alphabetical or numeric sequences, keyboard walks) and statistical entropy thresholds:
   - Minimum unique characters: $\ge 10$ unique symbols for secrets $\ge 32$ characters.
   - Minimum Shannon entropy: $\ge 3.0\text{ bits/character}$.
4. **No Silent Fallbacks:** Neither `EMAIL_ENCRYPTION_KEY` nor `RATE_LIMIT_IDENTITY_HMAC_SECRET` falls back to `JWT_SECRET`.
5. **Complete Pairwise Independence:** `validateProductionStartupEnvironment()` strictly enforces that no two keys in the system are identical. The complete pairwise distinctness matrix is verified:

   | Key A | Key B | Distinction Enforced | Enforcement Mechanism |
   |---|---|:---:|---|
   | `JWT_SECRET` | `EMAIL_ENCRYPTION_KEY` | YES | Startup validation & `email.crypto.ts` assertKeySeparation |
   | `JWT_SECRET` | `RATE_LIMIT_IDENTITY_HMAC_SECRET` | YES | Startup validation check |
   | `EMAIL_ENCRYPTION_KEY` | `RATE_LIMIT_IDENTITY_HMAC_SECRET` | YES | Startup validation check |
   | `EMAIL_ENCRYPTION_KEY` | `EMAIL_ENCRYPTION_KEY_FALLBACK` | YES | Startup validation & `email.crypto.ts` |
   | `EMAIL_ENCRYPTION_KEY_FALLBACK` | `JWT_SECRET` | YES | Startup validation check |
   | `EMAIL_ENCRYPTION_KEY_FALLBACK` | `RATE_LIMIT_IDENTITY_HMAC_SECRET` | YES | Startup validation check |

6. **Fail-Fast Startup Guardrail:** In production, missing or identical keys throw `ConfigurationSecurityError` during bootstrap, halting execution before any HTTP traffic is accepted.

---

## 3. Key Rotation Procedures

### 3.1 Zero-Downtime Outbox Token Key Rotation (`EMAIL_ENCRYPTION_KEY`)
When rotating the AES-256-GCM outbox encryption key:
1. Generate a new cryptographically random 256-bit key (`openssl rand -hex 32`).
2. Update the environment configuration:
   - `EMAIL_ENCRYPTION_KEY_FALLBACK = <current_primary_key>`
   - `EMAIL_ENCRYPTION_KEY = <new_key>`
3. Restart or reload the backend workers.
   - Newly enqueued outbox records are immediately encrypted with the new primary key.
   - Any pending outbox records encrypted with the old key are decrypted transparently using the fallback key:
     ```typescript
     try {
       return decipher.update(ciphertext, 'hex', 'utf8') + decipher.final('utf8');
     } catch (primaryErr) {
       if (fallbackKey) {
         // Attempt decryption with fallback key
         const fallbackDecipher = crypto.createDecipheriv('aes-256-gcm', fallbackKey, iv);
         fallbackDecipher.setAuthTag(tag);
         return fallbackDecipher.update(ciphertext, 'hex', 'utf8') + fallbackDecipher.final('utf8');
       }
       throw primaryErr;
     }
     ```
4. After all pending outbox records have been delivered (or after outbox token expiration TTL of 24 hours), remove `EMAIL_ENCRYPTION_KEY_FALLBACK` from the environment.

### 3.2 JWT Secret Rotation (`JWT_SECRET`)
1. Generate a new cryptographically random secret (`openssl rand -base64 48`).
2. Deploy the new `JWT_SECRET`.
3. In-flight access tokens (15-minute lifetime) expire naturally. Active users transparently exchange valid refresh tokens stored in PostgreSQL for new access tokens signed with the new secret.

---

## 4. Key Storage & Hygiene Guidelines

1. **Production Key Generation:** Production keys must be generated using cryptographically secure pseudorandom number generators (CSPRNG):
   ```bash
   # AES-256 Encryption Key
   openssl rand -hex 32

   # JWT Signing Key
   openssl rand -base64 48

   # HMAC Secret
   openssl rand -hex 24
   ```
2. **Secret Store Integration:** In staging and production environments, keys must be provisioned via an external secret management service (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) and injected into the container environment at runtime.
3. **Audit Verification:** Automated tests in `src/test/security/cryptographic-separation.test.ts` verify that key separation is mathematically and programmatically enforced.
