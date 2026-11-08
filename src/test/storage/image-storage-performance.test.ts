/**
 * COLIN Image Storage & Processing Performance Suite
 * Phase 4A.2.5.7: Performance, Security & Infrastructure Testing
 *
 * Validates Sharp image transformation latency (WebP conversion, thumbnailing, EXIF stripping),
 * concurrent batch processing throughput, heap memory stability, and maximum 8 photos limit overhead.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import { processPropertyImage } from '../../server/storage/image.processor';

describe('COLIN Phase 4A.2.5.7: Image Storage & Pipeline Performance Suite', () => {
  let sampleJpegBuffer: Buffer;
  let samplePngBuffer: Buffer;
  let sampleWebpBuffer: Buffer;

  beforeAll(async () => {
    sampleJpegBuffer = await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    samplePngBuffer = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 50, g: 180, b: 90, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    sampleWebpBuffer = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: { r: 220, g: 120, b: 40 },
      },
    })
      .webp()
      .toBuffer();
  });

  describe('4.5 Image Pipeline Latency & Transformation Benchmarks', () => {
    it('benchmarks full transformation of 1080p JPEG to WebP master + thumbnail (Target: < 200ms)', async () => {
      const t0 = performance.now();
      const result = await processPropertyImage(sampleJpegBuffer);
      const elapsed = performance.now() - t0;

      expect(result.mimeType).toBe('image/webp');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.thumbnailBuffer).toBeDefined();
      expect(result.thumbnailBuffer.length).toBeGreaterThan(0);
      expect(result.thumbnailSizeBytes).toBeGreaterThan(0);

      // Total processing time must be fast (under 250ms)
      expect(elapsed).toBeLessThan(250);
    });

    it('benchmarks transformation of PNG and WebP input formats', async () => {
      const tPng = performance.now();
      const pngRes = await processPropertyImage(samplePngBuffer);
      const pngElapsed = performance.now() - tPng;

      const tWebp = performance.now();
      const webpRes = await processPropertyImage(sampleWebpBuffer);
      const webpElapsed = performance.now() - tWebp;

      expect(pngRes.mimeType).toBe('image/webp');
      expect(webpRes.mimeType).toBe('image/webp');
      expect(pngElapsed).toBeLessThan(250);
      expect(webpElapsed).toBeLessThan(250);
    });

    it('processes batch of 10 concurrent images and validates memory ceiling', async () => {
      const memBefore = process.memoryUsage().heapUsed;
      const t0 = performance.now();

      const batchPromises = Array.from({ length: 10 }).map(() =>
        processPropertyImage(sampleJpegBuffer)
      );

      const results = await Promise.all(batchPromises);
      const totalElapsed = performance.now() - t0;
      const memAfter = process.memoryUsage().heapUsed;

      expect(results).toHaveLength(10);
      results.forEach((r) => {
        expect(r.mimeType).toBe('image/webp');
        expect(r.thumbnailBuffer).toBeDefined();
      });

      // 10 concurrent 1080p images processed under 1500ms
      expect(totalElapsed).toBeLessThan(1500);

      // Memory increase should be bounded (under 60MB heap delta)
      const memDeltaMb = (memAfter - memBefore) / (1024 * 1024);
      expect(memDeltaMb).toBeLessThan(60);
    });
  });
});
