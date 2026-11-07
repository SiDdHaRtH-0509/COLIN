/**
 * COLIN Storage Provider Unit & Contract Tests
 * Phase 4A.2.5.1: Cloud Image Storage Infrastructure
 * 
 * Verifies LocalStorageProvider and S3StorageProvider contracts,
 * delivery URL generation, pre-signed upload creation, and error handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProvider } from '../../server/storage/providers/LocalStorageProvider';
import { S3StorageProvider } from '../../server/storage/providers/S3StorageProvider';
import { StorageValidationError, StorageProviderError } from '../../server/storage/storage.types';

describe('Phase 4A.2.5.1: Storage Provider Contract Suite', () => {
  describe('1. LocalStorageProvider Implementation', () => {
    let provider: LocalStorageProvider;
    const sampleBuffer = Buffer.from('ffd8ffe000104a464946000101fakejpeg', 'utf-8');

    beforeEach(() => {
      provider = new LocalStorageProvider({
        baseUrl: '/api/v1/storage/images',
        maxSizeBytes: 2 * 1024 * 1024,
      });
    });

    it('successfully uploads and returns opaque storage key and public URL', async () => {
      const result = await provider.upload({
        buffer: sampleBuffer,
        mimeType: 'image/jpeg',
        subDir: 'properties/prop-101',
      });

      expect(result.storageKey).toMatch(/^properties\/prop-101\/prop_img_[a-f0-9]+\.jpg$/);
      expect(result.publicUrl).toBe(`/api/v1/storage/images/${result.storageKey}`);
      expect(result.fileSizeBytes).toBe(sampleBuffer.length);
      expect(result.mimeType).toBe('image/jpeg');

      // Verify existence
      const exists = await provider.exists(result.storageKey);
      expect(exists).toBe(true);
    });

    it('correctly retrieves object metadata and eTag', async () => {
      const result = await provider.upload({
        buffer: sampleBuffer,
        mimeType: 'image/webp',
      });

      const meta = await provider.getMetadata(result.storageKey);
      expect(meta).not.toBeNull();
      expect(meta?.size).toBe(sampleBuffer.length);
      expect(meta?.mimeType).toBe('image/webp');
      expect(meta?.eTag).toBeDefined();
    });

    it('returns null metadata for non-existent storage keys', async () => {
      const meta = await provider.getMetadata('non_existent_key.webp');
      expect(meta).toBeNull();
    });

    it('deletes uploaded object idempotently', async () => {
      const result = await provider.upload({
        buffer: sampleBuffer,
        mimeType: 'image/png',
      });

      expect(await provider.exists(result.storageKey)).toBe(true);

      await provider.delete(result.storageKey);
      expect(await provider.exists(result.storageKey)).toBe(false);

      // Deleting again should not throw
      await expect(provider.delete(result.storageKey)).resolves.not.toThrow();
    });

    it('generates simulated signed delivery URL with expiration', async () => {
      const result = await provider.upload({
        buffer: sampleBuffer,
        mimeType: 'image/jpeg',
      });

      const signedUrl = await provider.getDeliveryUrl(result.storageKey, {
        signed: true,
        expiresInSeconds: 1800,
      });

      expect(signedUrl).toContain('signature=');
      expect(signedUrl).toContain('expires=');
      expect(signedUrl).toContain(result.storageKey);
    });

    it('creates pre-signed upload URL structure for direct uploads', async () => {
      const uploadAuth = await provider.createUploadUrl('balcony.webp', 'image/webp', 900);

      expect(uploadAuth.uploadUrl).toContain('/signed-upload/');
      expect(uploadAuth.storageKey).toContain('balcony.webp');
      expect(uploadAuth.expiresInSeconds).toBe(900);
    });

    it('sanitizes storage keys and prevents path traversal', async () => {
      const maliciousKey = '../../../../etc/passwd';
      await provider.delete(maliciousKey);
      expect(await provider.exists(maliciousKey)).toBe(false);
    });

    it('rejects uploads exceeding maximum configured byte size', async () => {
      const bigBuffer = Buffer.alloc(3 * 1024 * 1024); // 3 MB > 2 MB max
      await expect(
        provider.upload({
          buffer: bigBuffer,
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow(StorageValidationError);
    });
  });

  describe('2. S3StorageProvider Configuration & Error Handling', () => {
    it('throws sanitized StorageProviderError when initialized without credentials', async () => {
      const s3Provider = new S3StorageProvider({
        bucket: 'colin-test-bucket',
        region: 'ap-south-1',
        // credentials intentionally omitted
      });

      const sampleBuffer = Buffer.from('sample_bytes');
      await expect(
        s3Provider.upload({
          buffer: sampleBuffer,
          mimeType: 'image/webp',
        })
      ).rejects.toThrow(StorageProviderError);

      await expect(
        s3Provider.upload({
          buffer: sampleBuffer,
          mimeType: 'image/webp',
        })
      ).rejects.toThrow(/S3 Client is not initialized/i);
    });

    it('formats public CDN delivery URLs when publicBaseUrl is configured', async () => {
      const s3Provider = new S3StorageProvider({
        bucket: 'colin-test-bucket',
        region: 'ap-south-1',
        publicBaseUrl: 'https://cdn.colin.in/properties',
      });

      const url = await s3Provider.getDeliveryUrl('properties/prop-1/cover.webp');
      expect(url).toBe('https://cdn.colin.in/properties/properties/prop-1/cover.webp');
    });

    it('formats standard AWS S3 URLs when publicBaseUrl is not specified', async () => {
      const s3Provider = new S3StorageProvider({
        bucket: 'colin-test-bucket',
        region: 'ap-south-1',
      });

      const url = await s3Provider.getDeliveryUrl('properties/prop-1/cover.webp');
      expect(url).toBe('https://colin-test-bucket.s3.ap-south-1.amazonaws.com/properties/prop-1/cover.webp');
    });
  });
});
