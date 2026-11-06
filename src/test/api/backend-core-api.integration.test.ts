import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { Express } from 'express';

/**
 * =============================================================================
 * COLIN — BACKEND CORE SERVICE & API ARCHITECTURE INTEGRATION TEST SUITE
 * =============================================================================
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Tests the centralized Express application, versioned routing (/api/v1),
 * controller architecture, Zod request validation, authentication/authorization
 * middleware boundaries, CORS & security headers, centralized error handling,
 * and live PostgreSQL 18.4 health probes.
 * 
 * Zero mock frameworks. Direct in-memory HTTP execution via Supertest.
 * =============================================================================
 */

describe('COLIN Phase 4A.2.2.3: Backend Core Service & API Architecture', () => {
  let app: Express;

  beforeAll(async () => {
    // 1. Initialize and verify PostgreSQL 18.4 connectivity across dual runtime roles
    const conn = await initializeDatabaseConnections();
    expect(conn.appRuntimeConnected).toBe(true);
    expect(conn.adminRuntimeConnected).toBe(true);

    // 2. Instantiate decoupled Express application
    app = createApp();
  });

  afterAll(async () => {
    await shutdownDatabaseConnections();
  });

  // ===========================================================================
  // 1. APPLICATION BOOTSTRAP & SEPARATION OF CONCERNS
  // ===========================================================================
  describe('1. Application Bootstrap & HTTP Pipeline', () => {
    it('creates an Express application instance decoupled from network listener', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
      expect(typeof app.use).toBe('function');
    });

    it('attaches and returns X-Request-Id header on all responses', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id'].length).toBeGreaterThan(10);
    });

    it('preserves client-provided X-Request-Id correlation ID', async () => {
      const customReqId = 'colin-trace-uuid-99998888';
      const res = await request(app)
        .get('/health/live')
        .set('X-Request-Id', customReqId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customReqId);
      expect(res.body.meta.requestId).toBe(customReqId);
    });
  });

  // ===========================================================================
  // 2. SECURITY HEADERS & CORS POLICIES
  // ===========================================================================
  describe('2. Security Headers & CORS Enforcement', () => {
    it('enforces mandatory production security headers on all responses', async () => {
      const res = await request(app).get('/health/live');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('0');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['cache-control']).toContain('no-store');
    });

    it('allows CORS requests from configured origin with credentials support', async () => {
      const res = await request(app)
        .get('/api/v1/system/info')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('rejects CORS requests from unauthorized external origins with HTTP 403', async () => {
      const res = await request(app)
        .get('/api/v1/system/info')
        .set('Origin', 'http://malicious-phishing-site.com');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CORS_FORBIDDEN');
    });
  });

  // ===========================================================================
  // 3. API ROUTING, VERSIONING & 404 NOT FOUND HANDLING
  // ===========================================================================
  describe('3. API Routing Architecture & Versioning (/api/v1)', () => {
    it('serves root container orchestration aliases (/health/live and /health/ready)', async () => {
      const liveRes = await request(app).get('/health/live');
      expect(liveRes.status).toBe(200);
      expect(liveRes.body.data.status).toBe('UP');

      const readyRes = await request(app).get('/health/ready');
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.data.status).toBe('READY');
    });

    it('serves versioned endpoints under /api/v1 namespace', async () => {
      const res = await request(app).get('/api/v1/system/info');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.platform).toContain('COLIN');
      expect(res.body.data.service).toBe('colin-central-backend');
    });

    it('returns standardized JSON error for undefined route (404 Not Found)', async () => {
      const res = await request(app).get('/api/v1/nonexistent-route-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
      expect(res.body.error.message).toContain('nonexistent-route-endpoint');
      expect(res.body.meta.requestId).toBeDefined();
      expect(res.body.meta.timestamp).toBeDefined();
    });

    it('returns standardized JSON error when HTTP method is not supported (404)', async () => {
      const res = await request(app).post('/api/v1/health/live');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  // ===========================================================================
  // 4. CENTRALIZED REQUEST VALIDATION (ZOD)
  // ===========================================================================
  describe('4. Centralized Request Validation Architecture', () => {
    it('accepts and processes valid request body payload', async () => {
      const validPayload = {
        title: 'Silicon Hub Student PG',
        category: 'PG',
        slots: 10,
      };

      const res = await request(app)
        .post('/api/v1/system/validate-test')
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.echoed.title).toBe(validPayload.title);
      expect(res.body.data.echoed.category).toBe('PG');
      expect(res.body.data.valid).toBe(true);
    });

    it('rejects request body missing mandatory fields with HTTP 400 VALIDATION_ERROR', async () => {
      const invalidPayload = {
        slots: 5,
        // missing title and category
      };

      const res = await request(app)
        .post('/api/v1/system/validate-test')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.some((d: any) => d.field === 'title')).toBe(true);
      expect(res.body.error.details.some((d: any) => d.field === 'category')).toBe(true);
    });

    it('rejects request body with invalid enum value with HTTP 400', async () => {
      const badEnumPayload = {
        title: 'Luxury Villa Accommodation',
        category: 'RESORT', // Invalid enum (must be PG, HOSTEL, or COLIVING)
      };

      const res = await request(app)
        .post('/api/v1/system/validate-test')
        .send(badEnumPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.field === 'category')).toBe(true);
    });

    it('rejects request body with out-of-range numerical fields with HTTP 400', async () => {
      const badNumberPayload = {
        title: 'Central PG Living',
        category: 'HOSTEL',
        slots: 500, // Maximum allowed is 100
      };

      const res = await request(app)
        .post('/api/v1/system/validate-test')
        .send(badNumberPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.field === 'slots')).toBe(true);
    });

    it('rejects malformed unparseable JSON with HTTP 400 MALFORMED_JSON', async () => {
      const res = await request(app)
        .post('/api/v1/system/validate-test')
        .set('Content-Type', 'application/json')
        .send('{"title": "Unclosed string');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MALFORMED_JSON');
    });

    it('rejects invalid query parameters with HTTP 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/system/info?format=unsupported-format');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.field === 'format')).toBe(true);
    });

    it('rejects oversized JSON request payloads with HTTP 413 or 400', async () => {
      // 1.5MB string exceeding 1MB limit
      const oversizedPayload = {
        title: 'Valid Title',
        category: 'PG',
        largeBlob: 'a'.repeat(1.5 * 1024 * 1024),
      };

      const res = await request(app)
        .post('/api/v1/system/validate-test')
        .send(oversizedPayload);

      expect([400, 413]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // ===========================================================================
  // 5. AUTHENTICATION & AUTHORIZATION INTEGRATION BOUNDARIES
  // ===========================================================================
  describe('5. Authentication & Authorization Middleware Interfaces', () => {
    it('rejects unauthenticated request to protected administrative route with HTTP 401', async () => {
      const res = await request(app).get('/api/v1/system/admin-test');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      expect(res.body.meta.requestId).toBeDefined();
    });

    it('rejects authenticated non-admin role (STUDENT) from accessing admin route with HTTP 403', async () => {
      const res = await request(app)
        .get('/api/v1/system/admin-test')
        .set('Authorization', 'Bearer test-token-student01-STUDENT');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Administrative privileges required');
    });

    it('authorizes authenticated ADMIN user to access protected administrative route', async () => {
      const res = await request(app)
        .get('/api/v1/system/admin-test')
        .set('Authorization', 'Bearer test-token-admin01-ADMIN-SUPER_ADMIN');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessGranted).toBe(true);
      expect(res.body.data.context.userId).toBe('admin01');
      expect(res.body.data.context.role).toBe('ADMIN');
      expect(res.body.data.context.adminRole).toBe('SUPER_ADMIN');
    });
  });

  // ===========================================================================
  // 6. HEALTH & OBSERVABILITY PROBES (LIVE POSTGRESQL 18.4)
  // ===========================================================================
  describe('6. Health & Observability Probes (Live Engine)', () => {
    it('GET /api/v1/health/live returns process responsiveness metrics', async () => {
      const res = await request(app).get('/api/v1/health/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
      expect(res.body.meta.requestId).toBeDefined();
    });

    it('GET /api/v1/health/ready performs real PostgreSQL ping on dual roles and reports HEALTHY', async () => {
      const res = await request(app).get('/api/v1/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('READY');
      expect(res.body.data.isReady).toBe(true);

      const db = res.body.data.database;
      expect(db.status).toBe('HEALTHY');
      expect(db.isAlive).toBe(true);
      expect(db.roles.appRuntime.status).toBe('CONNECTED');
      expect(db.roles.adminRuntime.status).toBe('CONNECTED');
      expect(db.roles.appRuntime.role).toBe('colin_app_runtime');
      expect(db.roles.adminRuntime.role).toBe('colin_admin_runtime');

      // Verify zero plaintext credentials in response
      const stringified = JSON.stringify(res.body);
      expect(stringified).not.toContain('postgres:');
      expect(stringified).not.toContain('password');
    });
  });

  // ===========================================================================
  // 7. OPENAPI 3.1 SPECIFICATION ENDPOINT
  // ===========================================================================
  describe('7. OpenAPI Documentation Specification', () => {
    it('serves OpenAPI 3.1 document under /api/v1/system/openapi.json', async () => {
      const res = await request(app).get('/api/v1/system/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.openapi).toBe('3.1.0');
      expect(res.body.data.info.title).toContain('COLIN');
      expect(res.body.data.paths['/health/live']).toBeDefined();
      expect(res.body.data.paths['/health/ready']).toBeDefined();
      expect(res.body.data.paths['/system/info']).toBeDefined();
      expect(res.body.data.paths['/system/validate-test']).toBeDefined();
    });

    it('supports ?format=json to serve raw OpenAPI spec directly', async () => {
      const res = await request(app).get('/api/v1/system/openapi.json?format=json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.1.0');
      expect(res.body.info).toBeDefined();
    });
  });

  // ===========================================================================
  // 8. STANDARDIZED API ERROR RESPONSE CONTRACT
  // ===========================================================================
  describe('8. API Response Contract Consistency', () => {
    it('guarantees identical schema structure across all success responses', async () => {
      const res = await request(app).get('/api/v1/system/info');
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('requestId');
      expect(res.body.meta).toHaveProperty('timestamp');
    });

    it('guarantees identical schema structure across all error responses', async () => {
      const res = await request(app).get('/api/v1/route-that-does-not-exist');
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('requestId');
      expect(res.body.meta).toHaveProperty('timestamp');
      expect(res.body).not.toHaveProperty('stack');
    });
  });

  // ===========================================================================
  // 9. CENTRALIZED ERROR PIPELINE & DOMAIN ERROR MAPPING
  // ===========================================================================
  describe('9. Domain Error Mapping through Centralized Pipeline', () => {
    it('maps UniqueConstraintViolationError to HTTP 409 Conflict', async () => {
      const res = await request(app).get('/api/v1/system/error-test/unique');
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
      expect(res.body.error.message).toContain('Duplicate email detected');
      expect(res.body.error.details).toEqual({ field: 'email' });
    });

    it('maps RecordNotFoundError to HTTP 404 Not Found', async () => {
      const res = await request(app).get('/api/v1/system/error-test/notfound');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RECORD_NOT_FOUND');
    });

    it('maps ForeignKeyViolationError to HTTP 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/system/error-test/foreignkey');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FOREIGN_KEY_VIOLATION');
    });

    it('maps DatabaseUnavailableError to HTTP 503 Service Unavailable', async () => {
      const res = await request(app).get('/api/v1/system/error-test/unavailable');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('maps ValidationConstraintError to HTTP 422 Unprocessable Entity', async () => {
      const res = await request(app).get('/api/v1/system/error-test/validation');
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_CONSTRAINT_VIOLATION');
    });

    it('maps unhandled generic Error to HTTP 500 without leaking internal stack traces', async () => {
      const res = await request(app).get('/api/v1/system/error-test/generic');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(res.body).not.toHaveProperty('stack');
      expect(JSON.stringify(res.body)).not.toContain('at ');
    });
  });

  // ===========================================================================
  // 10. SERVER LIFECYCLE & CONFIGURATION
  // ===========================================================================
  describe('10. Server Lifecycle & Configuration', () => {
    it('reads validated server configuration parameters', async () => {
      const { getServerConfig } = await import('../../server/config/serverConfig');
      const config = getServerConfig();

      expect(config.port).toBeGreaterThan(0);
      expect(config.apiPrefix).toBe('/api/v1');
      expect(Array.isArray(config.corsAllowedOrigins)).toBe(true);
      expect(config.corsAllowedOrigins.length).toBeGreaterThan(0);
      expect(config.bodySizeLimit).toBeDefined();
    });

    it('exposes setupGracefulShutdown without throwing errors', async () => {
      const { setupGracefulShutdown } = await import('../../server/server');
      const http = await import('node:http');

      const dummyServer = http.createServer();
      expect(() => setupGracefulShutdown(dummyServer)).not.toThrow();
    });
  });
});
