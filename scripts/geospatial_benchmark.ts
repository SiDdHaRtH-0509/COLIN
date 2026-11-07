/**
 * COLIN PostgreSQL Geospatial Performance Benchmark
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure (Remediation C)
 * 
 * Benchmarks bounding-box prefilter + spherical Haversine queries across
 * 1,000, 10,000, and 50,000 properties with EXPLAIN (ANALYZE, BUFFERS).
 */

import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/colin_test?schema=public',
});

interface CityCluster {
  city: string;
  state: string;
  latRange: [number, number];
  lngRange: [number, number];
}

const INDIAN_HUBS: CityCluster[] = [
  { city: 'Delhi', state: 'Delhi', latRange: [28.45, 28.75], lngRange: [77.05, 77.35] },
  { city: 'Bengaluru', state: 'Karnataka', latRange: [12.85, 13.05], lngRange: [77.50, 77.70] },
  { city: 'Mumbai', state: 'Maharashtra', latRange: [19.00, 19.25], lngRange: [72.80, 73.05] },
  { city: 'Pune', state: 'Maharashtra', latRange: [18.45, 18.65], lngRange: [73.75, 73.95] },
  { city: 'Hyderabad', state: 'Telangana', latRange: [17.35, 17.55], lngRange: [78.30, 78.55] },
  { city: 'Kota', state: 'Rajasthan', latRange: [25.10, 25.25], lngRange: [75.80, 75.95] },
];

export interface BenchmarkMetrics {
  scale: number;
  searchRadiusKm: number;
  centerCoords: { latitude: number; longitude: number };
  planningTimeMs: number;
  executionTimeMs: number;
  totalTimeMs: number;
  rowsScanned: number;
  rowsReturned: number;
  indexUsed: string | null;
  scanType: string;
  sharedHitBlocks: number;
  sharedReadBlocks: number;
  planJson: any;
}

export async function runGeospatialBenchmark(): Promise<BenchmarkMetrics[]> {
  const client = await pool.connect();
  const results: BenchmarkMetrics[] = [];

  try {
    console.log('[Benchmark] Connecting to PostgreSQL 18.4 on port 5433...');

    // 1. Create a dedicated test owner if not present
    const ownerCheck = await client.query(`SELECT user_id FROM owner_profiles LIMIT 1;`);
    let ownerId: string;

    if (ownerCheck.rows.length === 0) {
      const userRes = await client.query(`
        INSERT INTO users (id, email, password_hash, primary_role, status)
        VALUES (gen_random_uuid(), 'benchmark.owner@colin.in', 'hash', 'OWNER', 'ACTIVE')
        RETURNING id;
      `);
      ownerId = userRes.rows[0].id;
      await client.query(`
        INSERT INTO owner_profiles (user_id, business_name, owner_tier, verification_status)
        VALUES ($1, 'Benchmark Living Corp', 'STANDARD', 'VERIFIED');
      `, [ownerId]);
    } else {
      ownerId = ownerCheck.rows[0].user_id;
    }

    // 2. Clear existing benchmark properties
    await client.query(`DELETE FROM properties WHERE name LIKE 'SYNTH_GEO_%';`);

    const targetScales = [1000, 10000, 50000];
    let currentCount = 0;

    for (const targetScale of targetScales) {
      const needed = targetScale - currentCount;
      console.log(`[Benchmark] Inserting ${needed} synthetic properties for target scale ${targetScale}...`);

      const batchSize = 1000;
      let inserted = 0;

      while (inserted < needed) {
        const thisBatch = Math.min(batchSize, needed - inserted);
        const values: any[] = [];
        const paramHolders: string[] = [];

        for (let i = 0; i < thisBatch; i++) {
          const idx = currentCount + inserted + i + 1;
          const hub = INDIAN_HUBS[idx % INDIAN_HUBS.length];
          const lat = hub.latRange[0] + Math.random() * (hub.latRange[1] - hub.latRange[0]);
          const lng = hub.lngRange[0] + Math.random() * (hub.lngRange[1] - hub.lngRange[0]);
          const slug = `synth-geo-${targetScale}-${idx}-${crypto.randomBytes(3).toString('hex')}`;

          const offset = i * 11;
          paramHolders.push(`(
            $${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4},
            $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8},
            $${offset + 9}, $${offset + 10}, $${offset + 11}
          )`);

          values.push(
            ownerId,
            `SYNTH_GEO_${targetScale}_${idx}`,
            slug,
            'PG',
            'COED',
            `${idx} University Road`,
            hub.city,
            hub.state,
            '110001',
            lat.toFixed(7),
            lng.toFixed(7)
          );
        }

        const insertQuery = `
          INSERT INTO properties (
            id, owner_id, name, slug, property_type, gender_policy,
            address_line1, city, state, pincode, latitude, longitude,
            verification_status, total_rooms, total_beds, available_beds,
            updated_at
          )
          SELECT
            gen_random_uuid(), v.owner_id::uuid, v.name, v.slug, v.property_type::"PropertyType", v.gender_policy::"PropertyGenderPolicy",
            v.address_line1, v.city, v.state, v.pincode, v.latitude::numeric, v.longitude::numeric,
            'VERIFIED'::"PropertyVerificationStatus", 10, 20, 10,
            NOW()
          FROM (VALUES ${paramHolders.join(',\n')}) AS v(
            owner_id, name, slug, property_type, gender_policy,
            address_line1, city, state, pincode, latitude, longitude
          );
        `;

        await client.query(insertQuery, values);
        inserted += thisBatch;
      }

      currentCount = targetScale;

      // Vacuum / Analyze to update planner statistics
      console.log(`[Benchmark] Running ANALYZE on properties table (${targetScale} rows)...`);
      await client.query(`ANALYZE properties;`);

      // 3. Execute EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      // Benchmark query: Search properties within 5 km of Delhi North Campus (28.6942, 77.2085)
      const centerLat = 28.6942;
      const centerLng = 77.2085;
      const radiusKm = 5;

      const latDelta = radiusKm / 111.32;
      const lngDelta = radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));

      const minLat = centerLat - latDelta;
      const maxLat = centerLat + latDelta;
      const minLng = centerLng - lngDelta;
      const maxLng = centerLng + lngDelta;

      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT 
          id, name, latitude, longitude,
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($1)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(latitude))
              ))
            )
          ) AS distance_km
        FROM properties
        WHERE verification_status = 'VERIFIED'
          AND latitude BETWEEN $3 AND $4
          AND longitude BETWEEN $5 AND $6
          AND (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($1)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(latitude))
              ))
            )
          ) <= $7
        ORDER BY distance_km ASC
        LIMIT 12;
      `;

      const explainRes = await client.query(explainQuery, [
        centerLat, centerLng, minLat, maxLat, minLng, maxLng, radiusKm
      ]);

      const planWrapper = explainRes.rows[0]['QUERY PLAN'][0];
      const plan = planWrapper.Plan;

      const planningTime = planWrapper['Planning Time'];
      const executionTime = planWrapper['Execution Time'];

      // Recursively inspect plan tree for index usage
      let indexUsed: string | null = null;
      let scanType = plan['Node Type'];

      function inspectNode(node: any) {
        if (node['Index Name']) {
          indexUsed = node['Index Name'];
          scanType = node['Node Type'];
        }
        if (node.Plans) {
          for (const sub of node.Plans) inspectNode(sub);
        }
      }
      inspectNode(plan);

      const metrics: BenchmarkMetrics = {
        scale: targetScale,
        searchRadiusKm: radiusKm,
        centerCoords: { latitude: centerLat, longitude: centerLng },
        planningTimeMs: Number(planningTime.toFixed(3)),
        executionTimeMs: Number(executionTime.toFixed(3)),
        totalTimeMs: Number((planningTime + executionTime).toFixed(3)),
        rowsScanned: plan['Actual Rows'] || 0,
        rowsReturned: Math.min(12, plan['Actual Rows'] || 0),
        indexUsed,
        scanType,
        sharedHitBlocks: plan['Shared Hit Blocks'] || 0,
        sharedReadBlocks: plan['Shared Read Blocks'] || 0,
        planJson: planWrapper,
      };

      console.log(`[Benchmark] Scale ${targetScale}: Execution Time = ${metrics.executionTimeMs} ms, Index = ${metrics.indexUsed || 'Seq Scan'}`);
      results.push(metrics);
    }

    // 4. Cleanup synthetic properties
    console.log('[Benchmark] Cleaning up synthetic test data...');
    await client.query(`DELETE FROM properties WHERE name LIKE 'SYNTH_GEO_%';`);
    await client.query(`ANALYZE properties;`);

    console.log('[Benchmark] Benchmark completed successfully.');
    return results;
  } finally {
    client.release();
  }
}

// If invoked directly via CLI
if (process.argv[1]?.endsWith('geospatial_benchmark.ts')) {
  runGeospatialBenchmark()
    .then((res) => {
      console.log('\n--- FINAL BENCHMARK RESULTS ---');
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Benchmark Error]', err);
      process.exit(1);
    });
}
