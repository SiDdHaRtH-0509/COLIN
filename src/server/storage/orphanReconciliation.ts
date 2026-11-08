/**
 * COLIN Cloud Storage Orphan Recovery & Reconciliation
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling
 *
 * Implements targeted reconciliation for orphaned cloud storage objects when
 * the multi-step upload lifecycle suffers partial failures (e.g., S3 upload succeeds,
 * PostgreSQL metadata persistence fails, and compensating rollback fails).
 *
 * Designed as a safe, minimal operational utility without requiring new schema migrations
 * or external background queue dependencies.
 */

import { PropertyRepository } from '../database/repositories/PropertyRepository';
import { StorageProvider } from './storage.types';
import { storageProvider as defaultStorageProvider } from './storage.service';
import { withRetry } from '../reliability/retry';
import { ReliabilityLogger } from '../reliability/logger';

export interface OrphanReconciliationResult {
  propertyId: string;
  candidateKeysExamined: number;
  registeredInDb: number;
  orphansFound: string[];
  deletedSuccessfully: string[];
  failedDeletions: Array<{ key: string; error: string }>;
}

export interface ReconcileOptions {
  propertyRepo?: PropertyRepository;
  storageProvider?: StorageProvider;
  maxRetryAttempts?: number;
}

/**
 * Normalizes a storage key or public URL to extract the relative storage path/filename.
 */
export function extractStorageKey(urlOrKey: string): string {
  if (!urlOrKey) return '';
  const trimmed = urlOrKey.trim();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      return parsed.pathname.replace(/^\/+/, '');
    }
  } catch {
    // Fall back to string handling if URL parse fails
  }
  return trimmed.replace(/^\/+/, '');
}

/**
 * Reconciles candidate storage keys against registered PostgreSQL property photo records.
 * Candidate keys not referenced in the database are identified as orphans and deleted with retries.
 */
export async function reconcileOrphanedPropertyPhotos(
  propertyId: string,
  candidateKeys: string[],
  options: ReconcileOptions = {}
): Promise<OrphanReconciliationResult> {
  const repo = options.propertyRepo || new PropertyRepository();
  const storage = options.storageProvider || defaultStorageProvider;
  const maxAttempts = options.maxRetryAttempts ?? 3;

  if (!propertyId || !candidateKeys || candidateKeys.length === 0) {
    return {
      propertyId,
      candidateKeysExamined: candidateKeys ? candidateKeys.length : 0,
      registeredInDb: 0,
      orphansFound: [],
      deletedSuccessfully: [],
      failedDeletions: [],
    };
  }

  // 1. Fetch all registered photos for this property from the database
  const registeredPhotos = await repo.findPhotosByPropertyId(propertyId);
  const registeredKeySet = new Set<string>();

  for (const photo of registeredPhotos) {
    if (photo.photoStorageUrl) {
      registeredKeySet.add(extractStorageKey(photo.photoStorageUrl));
      registeredKeySet.add(photo.photoStorageUrl.trim());
    }
    if (photo.thumbnailUrl) {
      registeredKeySet.add(extractStorageKey(photo.thumbnailUrl));
      registeredKeySet.add(photo.thumbnailUrl.trim());
    }
  }

  // 2. Identify candidate keys that do not exist in the database
  const orphans: string[] = [];
  for (const candidate of candidateKeys) {
    const normalized = extractStorageKey(candidate);
    if (!registeredKeySet.has(candidate) && !registeredKeySet.has(normalized)) {
      orphans.push(candidate);
    }
  }

  const deletedSuccessfully: string[] = [];
  const failedDeletions: Array<{ key: string; error: string }> = [];

  // 3. Compensating deletion for orphaned assets with retry
  for (const orphanKey of orphans) {
    try {
      await withRetry(() => storage.delete(orphanKey), {
        maxAttempts,
        baseDelayMs: 100,
        jitter: true,
      });
      deletedSuccessfully.push(orphanKey);
    } catch (delErr: unknown) {
      const errMsg = delErr instanceof Error ? delErr.message : String(delErr);
      failedDeletions.push({ key: orphanKey, error: errMsg });
      ReliabilityLogger.error('Orphan reconciliation failed to delete storage asset', {
        provider: 's3-storage',
        operation: 'reconcileOrphanedPropertyPhotos',
        error: delErr,
        details: { propertyId, orphanKey, code: 'STORAGE_COMPENSATING_CLEANUP_FAILED' },
      });
    }
  }

  return {
    propertyId,
    candidateKeysExamined: candidateKeys.length,
    registeredInDb: registeredPhotos.length,
    orphansFound: orphans,
    deletedSuccessfully,
    failedDeletions,
  };
}
