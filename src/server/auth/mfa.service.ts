/**
 * COLIN RFC 6238 Time-Based One-Time Password (TOTP) & MFA Service
 * Phase 6D: Multi-Factor Authentication for Administrators
 * 
 * Implements standard RFC 6238 / RFC 4226 TOTP computation using Node.js built-in crypto.
 * Zero external dependencies. Employs constant-time verification to prevent timing attacks.
 */

import crypto from 'node:crypto';

// Base32 alphabet according to RFC 4648
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export class MfaService {
  /**
   * Generates a cryptographically strong 160-bit (20-byte) Base32 encoded secret.
   */
  public static generateTotpSecret(byteLength = 20): string {
    const buffer = crypto.randomBytes(byteLength);
    return this.base32Encode(buffer);
  }

  /**
   * Generates a standard OTPAuth URL for QR code generation in authenticator apps.
   * e.g., Google Authenticator, Microsoft Authenticator, 1Password.
   */
  public static generateOtpAuthUrl(email: string, secret: string, issuer = 'COLIN'): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Computes the 6-digit TOTP code for a given secret at a specific counter/time.
   */
  public static generateTotp(secret: string, timeStep = 30, offsetSteps = 0): string {
    const key = this.base32Decode(secret);
    const epochSeconds = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epochSeconds / timeStep) + offsetSteps;

    // Convert counter to 8-byte big-endian buffer
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();

    // Dynamic truncation (RFC 4226 Section 5.4)
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Verifies a candidate 6-digit TOTP code against a secret.
   * Allows a clock skew tolerance of ±1 step (30 seconds before or after).
   */
  public static verifyTotp(candidateCode: string, secret: string, window = 1): boolean {
    if (!candidateCode || candidateCode.length !== 6 || !/^\d{6}$/.test(candidateCode)) {
      return false;
    }

    const cleanSecret = secret.toUpperCase().replace(/[\s-]/g, '');

    // Check current time step and adjacent windows for clock skew tolerance
    for (let offset = -window; offset <= window; offset++) {
      const expected = this.generateTotp(cleanSecret, 30, offset);
      if (crypto.timingSafeEqual(Buffer.from(candidateCode), Buffer.from(expected))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generates 10 single-use emergency backup recovery codes.
   * Format: 8 alphanumeric uppercase characters grouped into 4-4 (e.g. A3F8-9K2L).
   */
  public static generateRecoveryCodes(count = 10): { rawCodes: string[]; hashedCodes: string[] } {
    const rawCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const rawHex = crypto.randomBytes(4).toString('hex').toUpperCase();
      const formatted = `${rawHex.substring(0, 4)}-${rawHex.substring(4, 8)}`;
      rawCodes.push(formatted);
      hashedCodes.push(this.hashRecoveryCode(formatted));
    }

    return { rawCodes, hashedCodes };
  }

  /**
   * Computes a deterministic SHA-256 hash of a recovery code for database storage.
   */
  public static hashRecoveryCode(code: string): string {
    const normalized = code.toUpperCase().replace(/[\s-]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Encodes a Buffer to Base32 string (RFC 4648).
   */
  private static base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Decodes a Base32 string to Buffer (RFC 4648).
   */
  private static base32Decode(input: string): Buffer {
    const clean = input.toUpperCase().replace(/[\s=-]/g, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < clean.length; i++) {
      const val = BASE32_ALPHABET.indexOf(clean[i]);
      if (val === -1) {
        continue;
      }

      value = (value << 5) | val;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }
}
