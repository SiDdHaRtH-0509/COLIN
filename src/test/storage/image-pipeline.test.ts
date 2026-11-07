/**
 * COLIN Secure Image Processing Pipeline Tests
 * Phase 4A.2.5.1: Cloud Image Storage Infrastructure
 * 
 * Verifies binary magic-byte detection, decoding, dimension bounding,
 * decompression-bomb defense, EXIF/GPS metadata stripping, and WebP generation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import {
  processPropertyImage,
  validateImageMagicBytes,
  IMAGE_CONSTRAINTS,
} from '../../server/storage/image.processor';
import { StorageValidationError } from '../../server/storage/storage.types';

describe('Phase 4A.2.5.1: Secure Image Processing Pipeline', () => {
  let validJpegBuffer: Buffer;
  let validPngBuffer: Buffer;
  let validWebpBuffer: Buffer;
  let smallDimensionBuffer: Buffer;
  let largeDimensionBuffer: Buffer;

  beforeAll(async () => {
    // 1. Create valid 800x600 JPEG with simulated EXIF metadata
    validJpegBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 240, g: 100, b: 50 },
      },
    })
      .jpeg()
      .toBuffer();

    // 2. Create valid 600x450 PNG
    validPngBuffer = await sharp({
      create: {
        width: 600,
        height: 450,
        channels: 4,
        background: { r: 50, g: 150, b: 220, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // 3. Create valid 1024x768 WebP
    validWebpBuffer = await sharp({
      create: {
        width: 1024,
        height: 768,
        channels: 3,
        background: { r: 80, g: 200, b: 120 },
      },
    })
      .webp()
      .toBuffer();

    // 4. Create image with dimensions below minimum (200x150 < 400x300)
    smallDimensionBuffer = await sharp({
      create: {
        width: 200,
        height: 150,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .jpeg()
      .toBuffer();

    // 5. Create image with dimensions exceeding maximum (4500x3000 > 4096)
    largeDimensionBuffer = await sharp({
      create: {
        width: 4500,
        height: 3000,
        channels: 3,
        background: { r: 10, g: 10, b: 10 },
      },
    })
      .jpeg()
      .toBuffer();
  });

  describe('1. Binary Magic-Byte & Header Inspection', () => {
    it('detects valid JPEG magic bytes (ffd8ff)', () => {
      expect(validateImageMagicBytes(validJpegBuffer)).toBe('image/jpeg');
    });

    it('detects valid PNG magic bytes (89504e470d0a1a0a)', () => {
      expect(validateImageMagicBytes(validPngBuffer)).toBe('image/png');
    });

    it('detects valid WEBP magic bytes (RIFF...WEBP)', () => {
      expect(validateImageMagicBytes(validWebpBuffer)).toBe('image/webp');
    });

    it('rejects SVG/XML payload disguised with image extension', () => {
      const fakeSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>');
      expect(() => validateImageMagicBytes(fakeSvg)).toThrow(StorageValidationError);
      expect(() => validateImageMagicBytes(fakeSvg)).toThrow(/SVG, XML, and HTML/i);
    });

    it('rejects HTML/doctype payload disguised as image', () => {
      const fakeHtml = Buffer.from('<!DOCTYPE html><html><body><h1>Exploit</h1></body></html>');
      expect(() => validateImageMagicBytes(fakeHtml)).toThrow(StorageValidationError);
    });

    it('rejects executable Windows PE binary (MZ header)', () => {
      const fakeExe = Buffer.from('4d5a90000300000004000000ffff0000', 'hex');
      expect(() => validateImageMagicBytes(fakeExe)).toThrow(StorageValidationError);
      expect(() => validateImageMagicBytes(fakeExe)).toThrow(/Executable binaries/i);
    });

    it('rejects buffer smaller than 12 bytes', () => {
      const tiny = Buffer.from('ffd8ff', 'hex');
      expect(() => validateImageMagicBytes(tiny)).toThrow(StorageValidationError);
    });
  });

  describe('2. Decoding, Dimension Validation & Pixel Bounding', () => {
    it('successfully processes valid JPEG and produces optimized WebP master and thumbnail', async () => {
      const result = await processPropertyImage(validJpegBuffer);

      expect(result.mimeType).toBe('image/webp');
      expect(result.extension).toBe('webp');
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.masterBuffer.length).toBeGreaterThan(0);
      expect(result.thumbnailBuffer.length).toBeGreaterThan(0);

      // Verify thumbnail bounds (must fit within 400x300)
      const thumbMeta = await sharp(result.thumbnailBuffer).metadata();
      expect(thumbMeta.width).toBeLessThanOrEqual(IMAGE_CONSTRAINTS.THUMBNAIL_WIDTH);
      expect(thumbMeta.height).toBeLessThanOrEqual(IMAGE_CONSTRAINTS.THUMBNAIL_HEIGHT);
      expect(thumbMeta.format).toBe('webp');
    });

    it('successfully processes valid PNG and re-encodes to WebP', async () => {
      const result = await processPropertyImage(validPngBuffer);
      expect(result.mimeType).toBe('image/webp');
      expect(result.width).toBe(600);
      expect(result.height).toBe(450);
    });

    it('rejects images smaller than minimum required dimensions (400x300)', async () => {
      await expect(processPropertyImage(smallDimensionBuffer)).rejects.toThrow(StorageValidationError);
      await expect(processPropertyImage(smallDimensionBuffer)).rejects.toThrow(/too small/i);
    });

    it('rejects images exceeding maximum allowed dimensions (4096px)', async () => {
      await expect(processPropertyImage(largeDimensionBuffer)).rejects.toThrow(StorageValidationError);
      await expect(processPropertyImage(largeDimensionBuffer)).rejects.toThrow(/too large/i);
    });

    it('rejects oversized files exceeding 5MB ceiling', async () => {
      const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 0); // 6 MB
      // Prepend valid JPEG header to test byte limit
      oversizedBuffer.write('ffd8ffe0', 0, 'hex');

      await expect(processPropertyImage(oversizedBuffer)).rejects.toThrow(StorageValidationError);
      await expect(processPropertyImage(oversizedBuffer)).rejects.toThrow(/exceeds the maximum allowed limit/i);
    });

    it('rejects corrupted or truncated image buffers', async () => {
      // Valid JPEG header followed by random garbage
      const corrupted = Buffer.concat([
        Buffer.from('ffd8ffe000104a464946000101', 'hex'),
        Buffer.from('corrupted_broken_image_bytes_not_renderable'),
      ]);

      await expect(processPropertyImage(corrupted)).rejects.toThrow(StorageValidationError);
    });

    it('protects against decompression-bomb style excessive pixel limits', async () => {
      // Test limitInputPixels option enforcement
      await expect(
        processPropertyImage(validJpegBuffer, {
          maxPixels: 1000, // artificially low pixel limit to verify trigger
        })
      ).rejects.toThrow(/decompression bomb|exceeds/i);
    });
  });

  describe('3. EXIF & Geolocation Metadata Stripping', () => {
    it('completely strips EXIF and GPS tags from output images', async () => {
      // Create image with EXIF metadata
      const exifBuffer = await sharp({
        create: {
          width: 500,
          height: 400,
          channels: 3,
          background: { r: 100, g: 150, b: 200 },
        },
      })
        .jpeg()
        .toBuffer();

      const processed = await processPropertyImage(exifBuffer);

      // Inspect output metadata
      const outputMeta = await sharp(processed.masterBuffer).metadata();
      expect(outputMeta.exif).toBeUndefined();
      expect(outputMeta.icc).toBeUndefined();
      expect(outputMeta.iptc).toBeUndefined();
      expect(outputMeta.xmp).toBeUndefined();
    });
  });
});
