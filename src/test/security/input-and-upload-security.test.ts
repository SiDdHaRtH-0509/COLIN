/**
 * COLIN Input Validation, File Upload Security & Defense-in-Depth Suite
 * Phase 4A.2.5.7: Performance, Security & Infrastructure Testing
 *
 * Validates protection against SQL Injection, Cross-Site Scripting (XSS),
 * Malformed JSON, Oversized Payloads, Invalid UUIDs, MIME-Type Spoofing,
 * Decompression Bombs, EXIF Metadata Leaks, CSRF, CORS, and Secret Leaks.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { Express } from 'express';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { processPropertyImage, validateImageMagicBytes } from '../../server/storage/image.processor';
import { StorageValidationError } from '../../server/storage/storage.types';

describe('COLIN Phase 4A.2.5.7: Input Validation, File Upload & API Security', () => {
  let app: Express;

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();
  });

  afterAll(async () => {
    await shutdownDatabaseConnections();
  });

  // ===========================================================================
  // 5.3 INPUT VALIDATION & INJECTION DEFENSES
  // ===========================================================================
  describe('5.3 Input Validation & Injection Defenses', () => {
    it('safely handles SQL injection payloads in search queries via Prisma parameterization', async () => {
      const sqlPayloads = [
        `' OR '1'='1`,
        `'; DROP TABLE properties; --`,
        `' UNION SELECT null, null, null, null --`,
        `admin'--`,
        `1 OR 1=1`,
      ];

      for (const payload of sqlPayloads) {
        const res = await request(app)
          .get(`/api/v1/properties?query=${encodeURIComponent(payload)}`)
          .set('Accept', 'application/json');

        // Must succeed with safe empty/filtered list or reject safely, NEVER crash with 500 SQL error
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        }
      }
    });

    it('neutralizes Cross-Site Scripting (XSS) payloads in query inputs', async () => {
      const xssPayload = `<script>alert('XSS-COLIN')</script>`;
      const res = await request(app)
        .get(`/api/v1/properties?query=${encodeURIComponent(xssPayload)}`)
        .set('Accept', 'application/json');

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        const textResponse = JSON.stringify(res.body);
        // Payload must not be executed or returned unescaped in script tag
        expect(textResponse).not.toContain('<script>alert');
      }
    });

    it('rejects malformed unparseable JSON with HTTP 400 MALFORMED_JSON', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "broken@test.com", "password": unquoted_value}');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MALFORMED_JSON');
    });

    it('rejects invalid UUID route parameters with HTTP 400 or 422', async () => {
      const invalidUuids = ['not-a-uuid', '12345', 'undefined', 'null', 'uuid-with-spaces !'];

      for (const id of invalidUuids) {
        const res = await request(app).get(`/api/v1/properties/${id}`);
        // Must reject invalid UUID gracefully without unhandled 500 database exceptions
        expect([400, 404, 422]).toContain(res.status);
        expect(res.body.success).toBe(false);
      }
    });

    it('rejects invalid geographic coordinates outside valid lat/lng ranges', async () => {
      const invalidCoords = [
        { lat: 95.0, lng: 77.0 },  // Latitude > 90
        { lat: -95.0, lng: 77.0 }, // Latitude < -90
        { lat: 28.0, lng: 195.0 }, // Longitude > 180
        { lat: 28.0, lng: -195.0 },// Longitude < -180
      ];

      for (const coords of invalidCoords) {
        const res = await request(app)
          .post('/api/v1/location/reverse-geocode')
          .send({ latitude: coords.lat, longitude: coords.lng });
        expect([400, 422]).toContain(res.status);
      }
    });

    it('rejects negative pagination parameters (limit < 0, offset < 0)', async () => {
      const res = await request(app).get('/api/v1/properties?limit=-5&offset=-10');
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // ===========================================================================
  // 5.4 FILE UPLOAD SECURITY & MALICIOUS ASSET DEFENSES
  // ===========================================================================
  describe('5.4 File Upload Security & Magic-Byte Validation', () => {
    it('detects and rejects MIME-type spoofing (executable disguised as image)', async () => {
      // Windows executable PE header (MZ) disguised as image/jpeg
      const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');

      expect(() => validateImageMagicBytes(fakeExeBuffer)).toThrow(StorageValidationError);
      expect(() => validateImageMagicBytes(fakeExeBuffer)).toThrow(/Unsupported or forged image format/i);
    });

    it('rejects HTML or SVG script content disguised as JPEG/PNG', async () => {
      const fakeSvgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

      expect(() => validateImageMagicBytes(fakeSvgBuffer)).toThrow(StorageValidationError);
    });

    it('rejects decompression bomb / excessive pixel dimensions (> 6000px)', async () => {
      // Create small buffer with headers claiming 7000x7000 dimensions
      const bombBuffer = await sharp({
        create: {
          width: 6500,
          height: 6500,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .jpeg({ quality: 10 })
        .toBuffer();

      await expect(processPropertyImage(bombBuffer)).rejects.toThrow(
        /Image exceeds maximum allowed decoded pixel count|potential decompression bomb/i
      );
    });

    it('guarantees EXIF metadata and GPS coordinates are stripped in output WebP', async () => {
      // Create image with EXIF metadata
      const exifBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 120, g: 120, b: 120 },
        },
      })
        .withMetadata({
          exif: {
            IFD0: {
              Make: 'SensitiveCameraMake',
              Model: 'SecretCameraModel',
            },
          },
        })
        .jpeg()
        .toBuffer();

      const processed = await processPropertyImage(exifBuffer);
      const inspectMeta = await sharp(processed.masterBuffer).metadata();

      // Output WebP must strip camera make/model and GPS metadata
      expect(inspectMeta.exif).toBeUndefined();
      expect(processed.mimeType).toBe('image/webp');
    });
  });

  // ===========================================================================
  // 5.5 SECRETS, CORS & CSRF DEFENSES
  // ===========================================================================
  describe('5.5 CORS, CSRF & Security Headers', () => {
    it('blocks unauthorized origins under strict CORS policy with HTTP 403', async () => {
      const res = await request(app)
        .get('/api/v1/system/info')
        .set('Origin', 'http://attacker-phishing.com');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CORS_FORBIDDEN');
    });

    it('enforces CSRF protection on cookie-authenticated state mutations', async () => {
      // Simulating cookie-authenticated request without CSRF header
      const res = await request(app)
        .patch('/api/v1/students/me')
        .set('Cookie', ['accessToken=some_simulated_cookie_token'])
        .send({ collegeName: 'Unauthorized Update' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('exempts explicit Authorization: Bearer requests from CSRF header requirement', async () => {
      const res = await request(app)
        .get('/api/v1/system/info')
        .set('Authorization', 'Bearer some-test-token');

      // Not blocked by CSRF middleware
      expect(res.status).toBe(200);
    });

    it('enforces mandatory HTTP security headers (nosniff, DENY, strict-origin)', async () => {
      const res = await request(app).get('/health/live');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });
});
