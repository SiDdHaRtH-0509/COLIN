/**
 * COLIN Unified Storage Service & Provider Factory
 * Phase 4A.2.5.1: Cloud Image Storage Infrastructure
 * 
 * Exposes provider-independent storage interfaces, image processing pipeline,
 * and handles environment-driven adapter initialization.
 */

import { StorageProvider } from './storage.types';
import { LocalStorageProvider } from './providers/LocalStorageProvider';
import { S3StorageProvider } from './providers/S3StorageProvider';

// Re-export types
export * from './storage.types';
export * from './image.processor';
export * from './providers/LocalStorageProvider';
export * from './providers/S3StorageProvider';

/**
 * Storage Provider Factory.
 * Selects provider based on environment configuration.
 * Defaults to LocalStorageProvider for dev and test.
 */
export function createStorageProvider(): StorageProvider {
  const providerType = process.env.STORAGE_PROVIDER || 'local';

  if (providerType.toLowerCase() === 's3') {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION || 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'CRITICAL CONFIGURATION ERROR: S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY must be defined in production.'
        );
      }
      // In development or test, fall back gracefully with warning
      console.warn('⚠️ [Storage] S3 credentials missing. Falling back to LocalStorageProvider for development/test.');
      return new LocalStorageProvider();
    }

    return new S3StorageProvider({
      bucket,
      region,
      endpoint,
      accessKeyId,
      secretAccessKey,
      publicBaseUrl,
    });
  }

  return new LocalStorageProvider();
}

// Global active storage provider instance
export const storageProvider: StorageProvider = createStorageProvider();
