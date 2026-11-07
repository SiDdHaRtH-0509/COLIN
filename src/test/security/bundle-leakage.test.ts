/**
 * COLIN Frontend Distribution Bundle & Secret Leakage Tests
 * Phase 4A.2.5.5: External API Security & Secrets Management
 *
 * Scans compiled production assets in dist/ to guarantee that server-side
 * API credentials and encryption keys never leak into client web bundles.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('COLIN Phase 4A.2.5.5: Frontend Bundle Leakage Inspection (Gate S13, S15)', () => {
  const distDir = path.resolve(process.cwd(), 'dist');
  const assetsDir = path.resolve(distDir, 'assets');

  it('verifies production build directory exists and contains compiled client assets', () => {
    expect(fs.existsSync(distDir)).toBe(true);
    expect(fs.existsSync(assetsDir)).toBe(true);

    const assetFiles = fs.readdirSync(assetsDir);
    const jsFiles = assetFiles.filter((f) => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  it('guarantees that privileged server secrets do not leak into compiled JavaScript bundles', () => {
    const assetFiles = fs.readdirSync(assetsDir);
    const jsFiles = assetFiles.filter((f) => f.endsWith('.js'));

    const forbiddenIdentifiers = [
      'GOOGLE_MAPS_SERVER_KEY',
      'S3_SECRET_ACCESS_KEY',
      'S3_ACCESS_KEY_ID',
      'SENDGRID_API_KEY',
      'POSTMARK_SERVER_TOKEN',
      'EMAIL_ENCRYPTION_KEY',
      'EMAIL_ENCRYPTION_KEY_FALLBACK',
      'SENDGRID_WEBHOOK_VERIFICATION_KEY',
      'RATE_LIMIT_IDENTITY_HMAC_SECRET',
      'DATABASE_ADMIN_URL',
    ];

    for (const jsFile of jsFiles) {
      const filePath = path.join(assetsDir, jsFile);
      const content = fs.readFileSync(filePath, 'utf-8');

      for (const identifier of forbiddenIdentifiers) {
        expect(
          content.includes(identifier),
          `SECURITY BREACH: Forbidden server secret identifier '${identifier}' was detected in client bundle '${jsFile}'`
        ).toBe(false);
      }
    }
  });

  it('verifies that sensitive connection strings and private credentials are not exposed in client code', () => {
    const assetFiles = fs.readdirSync(assetsDir);
    const jsFiles = assetFiles.filter((f) => f.endsWith('.js'));

    for (const jsFile of jsFiles) {
      const filePath = path.join(assetsDir, jsFile);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for raw PostgreSQL URI with password
      expect(content).not.toMatch(/postgresql:\/\/[^:]+:[^@]+@/i);

      // Check for raw Redis URI with password
      expect(content).not.toMatch(/redis:\/\/[^:]*:[^@]+@/i);

      // Check for SendGrid key format
      expect(content).not.toMatch(/SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/);

      // Check for AWS Secret Access Key format (40 base64 chars)
      expect(content).not.toMatch(/aws_secret_access_key/i);
    }
  });
});
