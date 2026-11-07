/**
 * COLIN Local Storage Provider Adapter
 * Phase 4A.2.5.1: Cloud Image Storage Infrastructure
 * 
 * Provides an in-memory & local file persistence adapter for development and testing.
 * Implements the full StorageProvider contract with simulated signed URLs.
 */

import crypto from 'crypto';
import {
  StorageProvider,
  UploadFileInput,
  UploadResult,
  StorageMetadata,
  SignedUploadResult,
  DeliveryOptions,
  StorageValidationError,
} from '../storage.types';

export interface LocalStorageOptions {
  baseUrl?: string;
  maxSizeBytes?: number;
}

export class LocalStorageProvider implements StorageProvider {
  private store = new Map<string, { buffer: Buffer; mimeType: string; uploadedAt: Date }>();
  private readonly baseUrl: string;
  private readonly maxSizeBytes: number;

  constructor(options: LocalStorageOptions = {}) {
    this.baseUrl = options.baseUrl || '/api/v1/storage/images';
    this.maxSizeBytes = options.maxSizeBytes || 5 * 1024 * 1024;
  }

  /**
   * Uploads an image buffer to the local store.
   */
  async upload(file: UploadFileInput): Promise<UploadResult> {
    if (file.size && file.size > this.maxSizeBytes) {
      throw new StorageValidationError(
        `File size exceeds the maximum allowed limit of ${Math.round(this.maxSizeBytes / 1024)} KB.`
      );
    }

    if (file.buffer.length > this.maxSizeBytes) {
      throw new StorageValidationError(
        `Buffer length exceeds the maximum allowed limit of ${Math.round(this.maxSizeBytes / 1024)} KB.`
      );
    }

    // Determine clean extension
    let extension = 'webp';
    if (file.mimeType.includes('jpeg') || file.mimeType.includes('jpg')) extension = 'jpg';
    else if (file.mimeType.includes('png')) extension = 'png';

    const subDirPrefix = file.subDir ? `${file.subDir.replace(/[^a-zA-Z0-9_\-/]/g, '')}/` : '';
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `${subDirPrefix}prop_img_${uniqueId}.${extension}`;

    this.store.set(storageKey, {
      buffer: file.buffer,
      mimeType: file.mimeType,
      uploadedAt: new Date(),
    });

    return {
      storageKey,
      publicUrl: this.getDeliveryUrlSync(storageKey),
      fileSizeBytes: file.buffer.length,
      mimeType: file.mimeType,
    };
  }

  /**
   * Deletes an object by storage key.
   */
  async delete(storageKey: string): Promise<void> {
    const sanitizedKey = this.sanitizeKey(storageKey);
    this.store.delete(sanitizedKey);
  }

  /**
   * Checks whether an object exists.
   */
  async exists(storageKey: string): Promise<boolean> {
    const sanitizedKey = this.sanitizeKey(storageKey);
    return this.store.has(sanitizedKey);
  }

  /**
   * Retrieves object metadata.
   */
  async getMetadata(storageKey: string): Promise<StorageMetadata | null> {
    const sanitizedKey = this.sanitizeKey(storageKey);
    const item = this.store.get(sanitizedKey);
    if (!item) return null;

    return {
      storageKey: sanitizedKey,
      size: item.buffer.length,
      mimeType: item.mimeType,
      lastModified: item.uploadedAt,
      eTag: crypto.createHash('md5').update(item.buffer).digest('hex'),
    };
  }

  /**
   * Returns delivery URL for an object.
   */
  async getDeliveryUrl(storageKey: string, options: DeliveryOptions = {}): Promise<string> {
    const sanitizedKey = this.sanitizeKey(storageKey);
    if (options.signed) {
      const token = crypto.randomBytes(8).toString('hex');
      const expires = Math.floor(Date.now() / 1000) + (options.expiresInSeconds || 3600);
      return `${this.baseUrl}/${sanitizedKey}?signature=${token}&expires=${expires}`;
    }
    return `${this.baseUrl}/${sanitizedKey}`;
  }

  /**
   * Synchronous helper for instant public URL generation.
   */
  private getDeliveryUrlSync(storageKey: string): string {
    const sanitizedKey = this.sanitizeKey(storageKey);
    return `${this.baseUrl}/${sanitizedKey}`;
  }

  /**
   * Simulates a pre-signed upload URL for testing direct client uploads.
   */
  async createUploadUrl(
    filename: string,
    _contentType?: string,
    expiresInSeconds: number = 900
  ): Promise<SignedUploadResult> {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `uploads/temp_${uniqueId}_${sanitizedFilename}`;

    const token = crypto.randomBytes(16).toString('hex');
    const uploadUrl = `http://localhost:3001${this.baseUrl}/signed-upload/${storageKey}?signature=${token}`;

    return {
      uploadUrl,
      storageKey,
      publicUrl: this.getDeliveryUrlSync(storageKey),
      expiresInSeconds,
    };
  }

  /**
   * Helper to retrieve raw buffer in tests or file serving.
   */
  getBuffer(storageKey: string): { buffer: Buffer; mimeType: string } | null {
    const sanitizedKey = this.sanitizeKey(storageKey);
    return this.store.get(sanitizedKey) || null;
  }

  /**
   * Clears in-memory storage (used for test teardown).
   */
  clear(): void {
    this.store.clear();
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9._\-/]/g, '');
  }
}
