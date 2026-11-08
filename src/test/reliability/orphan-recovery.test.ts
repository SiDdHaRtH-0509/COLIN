/**
 * COLIN Storage Orphan Recovery & Reconciliation Tests
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling (Finding 3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  reconcileOrphanedPropertyPhotos,
  extractStorageKey,
} from '../../server/storage/orphanReconciliation';
import { StorageProvider } from '../../server/storage/storage.types';
import { PropertyRepository } from '../../server/database/repositories/PropertyRepository';

describe('COLIN Storage Orphan Recovery & Reconciliation (Finding 3 Audit Closure)', () => {
  let mockStorage: StorageProvider;
  let mockRepo: PropertyRepository;

  beforeEach(() => {
    mockStorage = {
      upload: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(true),
      getMetadata: vi.fn(),
    } as unknown as StorageProvider;

    mockRepo = {
      findPhotosByPropertyId: vi.fn(),
    } as unknown as PropertyRepository;
  });

  describe('extractStorageKey', () => {
    it('extracts relative key from absolute S3 URL', () => {
      const url = 'https://colin-bucket.s3.us-east-1.amazonaws.com/properties/prop-123/master/photo1.webp';
      expect(extractStorageKey(url)).toBe('properties/prop-123/master/photo1.webp');
    });

    it('returns raw key if already relative', () => {
      const key = 'properties/prop-123/master/photo1.webp';
      expect(extractStorageKey(key)).toBe('properties/prop-123/master/photo1.webp');
    });

    it('handles empty or whitespace strings', () => {
      expect(extractStorageKey('')).toBe('');
      expect(extractStorageKey('   ')).toBe('');
    });
  });

  describe('4-Step Upload Partial Failure Simulation & Reconciliation', () => {
    it('simulates 4-step sequence (upload ok, thumb ok, DB fail, compensating cleanup fail) and successfully reconciles orphaned objects', async () => {
      const propertyId = 'prop-uuid-4444';

      // 1 & 2: Master and thumbnail keys generated
      const masterKey = `properties/${propertyId}/master/prop_img_master_123.webp`;
      const thumbKey = `properties/${propertyId}/thumbnails/prop_img_thumb_123.webp`;

      // 3: DB persistence failed, so DB contains NO records for this upload
      // Existing DB state: property only has an earlier, valid photo
      const existingValidMaster = `properties/${propertyId}/master/valid_001.webp`;
      const existingValidThumb = `properties/${propertyId}/thumbnails/valid_001.webp`;

      (mockRepo.findPhotosByPropertyId as any).mockResolvedValue([
        {
          id: 'photo-db-1',
          propertyId,
          photoStorageUrl: `https://storage.colin.local/${existingValidMaster}`,
          thumbnailUrl: `https://storage.colin.local/${existingValidThumb}`,
          isCover: true,
          displayOrder: 0,
        },
      ]);

      // 4: Compensating cleanup had failed during the initial upload error
      // Now, run the reconciliation utility providing candidates that include both existing valid keys and orphaned keys
      const candidateKeys = [
        existingValidMaster,
        masterKey, // orphan
        thumbKey,  // orphan
      ];

      const result = await reconcileOrphanedPropertyPhotos(propertyId, candidateKeys, {
        propertyRepo: mockRepo,
        storageProvider: mockStorage,
      });

      // Assertions
      expect(result.propertyId).toBe(propertyId);
      expect(result.candidateKeysExamined).toBe(3);
      expect(result.registeredInDb).toBe(1);

      // Orphans found must be ONLY the two keys that were NOT in the DB
      expect(result.orphansFound).toEqual([masterKey, thumbKey]);

      // Both orphans deleted successfully
      expect(result.deletedSuccessfully).toEqual([masterKey, thumbKey]);
      expect(result.failedDeletions).toHaveLength(0);

      // Verify storage delete was called for orphans, but NEVER for the registered valid photo
      expect(mockStorage.delete).toHaveBeenCalledTimes(2);
      expect(mockStorage.delete).toHaveBeenCalledWith(masterKey);
      expect(mockStorage.delete).toHaveBeenCalledWith(thumbKey);
      expect(mockStorage.delete).not.toHaveBeenCalledWith(existingValidMaster);
    });

    it('reports failed deletions when cloud storage is unreachable with retry', async () => {
      const propertyId = 'prop-uuid-5555';
      const orphanKey = `properties/${propertyId}/master/orphan_failure.webp`;

      (mockRepo.findPhotosByPropertyId as any).mockResolvedValue([]);
      (mockStorage.delete as any).mockRejectedValue(new Error('S3 503 Service Unavailable'));

      const result = await reconcileOrphanedPropertyPhotos(propertyId, [orphanKey], {
        propertyRepo: mockRepo,
        storageProvider: mockStorage,
        maxRetryAttempts: 2,
      });

      expect(result.orphansFound).toEqual([orphanKey]);
      expect(result.deletedSuccessfully).toHaveLength(0);
      expect(result.failedDeletions).toHaveLength(1);
      expect(result.failedDeletions[0]).toEqual({
        key: orphanKey,
        error: 'S3 503 Service Unavailable',
      });
    });

    it('handles empty candidates or non-existent property safely', async () => {
      const result = await reconcileOrphanedPropertyPhotos('prop-none', [], {
        propertyRepo: mockRepo,
        storageProvider: mockStorage,
      });

      expect(result.candidateKeysExamined).toBe(0);
      expect(result.orphansFound).toHaveLength(0);
      expect(mockStorage.delete).not.toHaveBeenCalled();
    });
  });
});
