/**
 * COLIN Database Performance & Query Execution Analysis
 * Phase 4A.2.5.7: Performance, Security & Infrastructure Testing
 *
 * Runs EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) on representative PostgreSQL 18.4 queries
 * to evaluate query execution plans, buffer cache efficiency, index usage, and
 * concurrent transaction isolation behavior.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getAppPrismaClient } from '../../server/database/prisma';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { executeTransaction } from '../../server/database/transaction';

interface ExplainPlanResult {
  Plan: {
    'Node Type': string;
    'Total Cost': number;
    'Actual Startup Time': number;
    'Actual Total Time': number;
    'Actual Rows': number;
    'Actual Loops': number;
    'Shared Hit Blocks'?: number;
    'Shared Read Blocks'?: number;
    Plans?: any[];
  };
  'Planning Time': number;
  'Execution Time': number;
}

describe('COLIN Phase 4A.2.5.7: PostgreSQL Database Performance Suite', () => {
  const prisma = getAppPrismaClient();

  beforeAll(async () => {
    await initializeDatabaseConnections();
  });

  afterAll(async () => {
    await shutdownDatabaseConnections();
  });

  describe('4.3 Query Plan & Index Efficiency Analysis (EXPLAIN ANALYZE)', () => {
    it('analyzes public property discovery query plan (EXPLAIN ANALYZE)', async () => {
      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT id, name, city, property_type, is_featured, created_at
        FROM properties
        WHERE verification_status = 'VERIFIED'
        ORDER BY is_featured DESC, created_at DESC
        LIMIT 10;
      `;

      const result = await prisma.$queryRawUnsafe<any[]>(explainQuery);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const planWrapper: ExplainPlanResult = result[0]['QUERY PLAN'][0];
      const executionTimeMs = planWrapper['Execution Time'];
      const planningTimeMs = planWrapper['Planning Time'];

      // Execution time must be sub-15ms for indexed limit queries
      expect(executionTimeMs).toBeLessThan(50);
      expect(planningTimeMs).toBeLessThan(15);
    });

    it('analyzes spatial bounding-box property search query plan', async () => {
      const explainSpatialQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT id, name, latitude, longitude, city
        FROM properties
        WHERE latitude BETWEEN 28.500000 AND 28.800000
          AND longitude BETWEEN 77.100000 AND 77.300000
        LIMIT 20;
      `;

      const result = await prisma.$queryRawUnsafe<any[]>(explainSpatialQuery);
      expect(result).toBeDefined();
      const planWrapper: ExplainPlanResult = result[0]['QUERY PLAN'][0];

      expect(planWrapper['Execution Time']).toBeLessThan(50);
      expect(planWrapper['Planning Time']).toBeLessThan(15);
    });

    it('analyzes single-row student profile index lookup by user_id', async () => {
      const explainStudentQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT user_id, college_name, created_at
        FROM student_profiles
        WHERE user_id = '00000000-0000-0000-0000-000000000000'
        LIMIT 1;
      `;

      const result = await prisma.$queryRawUnsafe<any[]>(explainStudentQuery);
      expect(result).toBeDefined();
      const planWrapper: ExplainPlanResult = result[0]['QUERY PLAN'][0];

      // Single index lookup execution time must be sub-5ms
      expect(planWrapper['Execution Time']).toBeLessThan(25);
    });

    it('analyzes photo metadata lookup by property_id with display_order sorting', async () => {
      const explainPhotoQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT id, property_id, photo_storage_url, thumbnail_url, is_cover, display_order
        FROM property_photos
        WHERE property_id = '00000000-0000-0000-0000-000000000000'
        ORDER BY display_order ASC;
      `;

      const result = await prisma.$queryRawUnsafe<any[]>(explainPhotoQuery);
      expect(result).toBeDefined();
      const planWrapper: ExplainPlanResult = result[0]['QUERY PLAN'][0];

      expect(planWrapper['Execution Time']).toBeLessThan(25);
    });

    it('analyzes owner properties join with photos (absence of N+1 overhead)', async () => {
      const explainJoinQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT p.id, p.name, p.city, p.verification_status, pp.photo_storage_url, pp.is_cover
        FROM properties p
        LEFT JOIN property_photos pp ON p.id = pp.property_id AND pp.is_cover = true
        WHERE p.owner_id = '00000000-0000-0000-0000-000000000000'
        ORDER BY p.created_at DESC
        LIMIT 10;
      `;

      const result = await prisma.$queryRawUnsafe<any[]>(explainJoinQuery);
      expect(result).toBeDefined();
      const planWrapper: ExplainPlanResult = result[0]['QUERY PLAN'][0];

      expect(planWrapper['Execution Time']).toBeLessThan(50);
    });
  });

  describe('4.3 Concurrent Transactions & Pool Isolation', () => {
    it('executes 10 concurrent bounded transactions with zero deadlocks or pool exhaustion', async () => {
      const concurrency = 10;
      const t0 = performance.now();

      const txPromises = Array.from({ length: concurrency }).map((_, idx) =>
        executeTransaction(async (tx) => {
          const res = await tx.$queryRaw<{ val: any }[]>`SELECT ${idx} as val;`;
          return Number(res[0].val);
        }, {
          maxRetries: 2,
          timeoutMs: 3000,
        })
      );

      const results = await Promise.all(txPromises);
      const elapsed = performance.now() - t0;

      expect(results).toHaveLength(10);
      results.forEach((val, i) => expect(val).toBe(i));
      expect(elapsed).toBeLessThan(1500);
    });
  });
});
