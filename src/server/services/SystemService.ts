/**
 * COLIN System Diagnostics & Documentation Service
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 */

export interface SystemInfo {
  platform: string;
  service: string;
  version: string;
  environment: string;
  nodeVersion: string;
  uptimeSeconds: number;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
}

export class SystemService {
  private readonly startTime = Date.now();

  getSystemInfo(): SystemInfo {
    const memory = process.memoryUsage();
    return {
      platform: 'COLIN — Campus Living Verified',
      service: 'colin-central-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      memoryUsageMb: {
        rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      },
    };
  }

  getOpenApiDocument(): Record<string, unknown> {
    return {
      openapi: '3.1.0',
      info: {
        title: 'COLIN Central Marketplace API',
        version: '1.0.0',
        description: 'Core backend API architecture for verified student living accommodation, bookings, and governance.',
        contact: {
          name: 'COLIN Engineering Architecture Team',
          email: 'engineering@colin.in',
        },
      },
      servers: [
        {
          url: '/api/v1',
          description: 'Current API version (v1)',
        },
      ],
      tags: [
        { name: 'Health & Observability', description: 'Liveness, readiness, and database probe endpoints' },
        { name: 'System', description: 'System metadata, versioning, and diagnostics' },
      ],
      paths: {
        '/health/live': {
          get: {
            tags: ['Health & Observability'],
            summary: 'Liveness Probe',
            description: 'Returns HTTP 200 when the backend process and event loop are responsive.',
            responses: {
              '200': {
                description: 'Service is alive',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Service is alive and responding.' },
                        data: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', example: 'UP' },
                            uptimeSeconds: { type: 'number', example: 120 },
                            timestamp: { type: 'string', format: 'date-time' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/health/ready': {
          get: {
            tags: ['Health & Observability'],
            summary: 'Readiness Probe',
            description: 'Verifies database connectivity across dual runtime roles (colin_app_runtime and colin_admin_runtime).',
            responses: {
              '200': {
                description: 'Database is healthy and service is ready to accept traffic',
              },
              '503': {
                description: 'Database is degraded or unreachable',
              },
            },
          },
        },
        '/system/info': {
          get: {
            tags: ['System'],
            summary: 'System Metadata',
            description: 'Returns version, platform info, and runtime performance indicators.',
            responses: {
              '200': { description: 'System information retrieved successfully' },
            },
          },
        },
        '/system/validate-test': {
          post: {
            tags: ['System'],
            summary: 'Validation Architecture Demo',
            description: 'Demonstration endpoint proving Zod schema validation on request body and query parameters.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['title', 'category'],
                    properties: {
                      title: { type: 'string', minLength: 3, maxLength: 50 },
                      category: { type: 'string', enum: ['PG', 'HOSTEL', 'COLIVING'] },
                      slots: { type: 'integer', minimum: 1, maximum: 100 },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: 'Payload validated successfully' },
              '400': { description: 'Validation error with details' },
            },
          },
        },
        '/system/admin-test': {
          get: {
            tags: ['System'],
            summary: 'Admin Authorization Guard Demo',
            description: 'Demonstration endpoint proving strict role-based access control (Admin only).',
            security: [{ BearerAuth: [] }],
            responses: {
              '200': { description: 'Admin access authorized' },
              '401': { description: 'Authentication required' },
              '403': { description: 'Forbidden: administrative privileges required' },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    };
  }

  processEchoTest(input: { title: string; category: string; slots?: number }): {
    echoed: typeof input;
    processedAt: string;
    valid: boolean;
  } {
    return {
      echoed: input,
      processedAt: new Date().toISOString(),
      valid: true,
    };
  }
}

export const systemService = new SystemService();
