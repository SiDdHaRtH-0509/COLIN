/**
 * COLIN Storage Abstraction & Image Validation Module
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Provides provider-independent storage architecture, cryptographic magic-byte
 * file inspection, size enforcement, and path traversal protection.
 */

import crypto from 'crypto';

export interface UploadFileInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  size: number;
}

export interface UploadResult {
  storageKey: string;
  publicUrl: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface StorageProvider {
  upload(file: UploadFileInput): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
  getUrl(storageKey: string): string;
}

export class StorageValidationError extends Error {
  public readonly statusCode = 400;
  public readonly code = 'INVALID_IMAGE_FILE';

  constructor(message: string) {
    super(message);
    this.name = 'StorageValidationError';
  }
}

/**
 * Validates actual binary signatures (magic bytes) to verify file integrity.
 * Prevents executable disguise attacks (e.g. .exe or .sh renamed to .png).
 */
export function validateImageMagicBytes(buffer: Buffer, _claimedMimeType?: string): string {
  if (!buffer || buffer.length < 12) {
    throw new StorageValidationError('File buffer is empty or too small to be a valid image.');
  }

  const hexHeader = buffer.subarray(0, 12).toString('hex').toLowerCase();

  // JPEG: starts with ffd8ff
  if (hexHeader.startsWith('ffd8ff')) {
    return 'image/jpeg';
  }

  // PNG: starts with 89504e470d0a1a0a
  if (hexHeader.startsWith('89504e470d0a1a0a')) {
    return 'image/png';
  }

  // WEBP: starts with 52494646 (RIFF) and has 57454250 (WEBP) at bytes 8-11
  if (hexHeader.startsWith('52494646') && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }

  // GIF: starts with 47494638 (GIF8)
  if (hexHeader.startsWith('47494638')) {
    return 'image/gif';
  }

  throw new StorageValidationError(
    `Unsupported or forged image format. Expected JPEG, PNG, or WEBP; received header ${hexHeader.substring(0, 8)}.`
  );
}

/**
 * Controlled Local / Memory Storage Adapter for Development & Testing.
 * Uses opaque storage keys and isolates client responses from raw filesystem paths.
 */
export class LocalStorageProvider implements StorageProvider {
  private inMemoryStore = new Map<string, { buffer: Buffer; mimeType: string }>();
  private readonly maxSizeBytes: number;
  private readonly baseUrl: string;

  constructor(options: { maxSizeBytes?: number; baseUrl?: string } = {}) {
    this.maxSizeBytes = options.maxSizeBytes || 5 * 1024 * 1024; // 5 MB limit
    this.baseUrl = options.baseUrl || '/api/v1/storage/images';
  }

  /**
   * Validates and persists an uploaded image file into the storage provider.
   */
  async upload(file: UploadFileInput): Promise<UploadResult> {
    // 1. File size check
    if (file.size > this.maxSizeBytes || file.buffer.length > this.maxSizeBytes) {
      throw new StorageValidationError(
        `File size (${Math.round(file.size / 1024)} KB) exceeds the maximum allowed limit of ${Math.round(this.maxSizeBytes / 1024)} KB.`
      );
    }

    // 2. Binary magic byte inspection
    const verifiedMimeType = validateImageMagicBytes(file.buffer, file.mimeType);

    // 3. Extension resolution
    let extension = 'jpg';
    if (verifiedMimeType === 'image/png') extension = 'png';
    else if (verifiedMimeType === 'image/webp') extension = 'webp';
    else if (verifiedMimeType === 'image/gif') extension = 'gif';

    // 4. Generate opaque cryptographically random storage key
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `prop_img_${uniqueId}.${extension}`;

    // 5. Store in local repository
    this.inMemoryStore.set(storageKey, {
      buffer: file.buffer,
      mimeType: verifiedMimeType,
    });

    const publicUrl = this.getUrl(storageKey);

    return {
      storageKey,
      publicUrl,
      fileSizeBytes: file.buffer.length,
      mimeType: verifiedMimeType,
    };
  }

  /**
   * Deletes an image from storage.
   */
  async delete(storageKey: string): Promise<void> {
    // Sanitize key to prevent path traversal attempts
    const sanitizedKey = storageKey.replace(/[^a-zA-Z0-9._-]/g, '');
    this.inMemoryStore.delete(sanitizedKey);
  }

  /**
   * Returns the public delivery URL for a storage key.
   */
  getUrl(storageKey: string): string {
    const sanitizedKey = storageKey.replace(/[^a-zA-Z0-9._-]/g, '');
    return `${this.baseUrl}/${sanitizedKey}`;
  }

  /**
   * Retrieves image buffer for download or serving.
   */
  getBuffer(storageKey: string): { buffer: Buffer; mimeType: string } | null {
    const sanitizedKey = storageKey.replace(/[^a-zA-Z0-9._-]/g, '');
    return this.inMemoryStore.get(sanitizedKey) || null;
  }
}

// Global default storage provider instance
export const storageProvider: StorageProvider = new LocalStorageProvider();
