/**
/**
 * COLIN Storage Abstraction & Provider Types
 * Phase 4A.2.5.1: Cloud Image Storage Infrastructure
 */

export interface UploadFileInput {
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
  size?: number;
  subDir?: string;
}

export interface UploadResult {
  storageKey: string;
  publicUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface StorageMetadata {
  storageKey: string;
  size: number;
  mimeType?: string;
  lastModified?: Date;
  eTag?: string;
}

export interface SignedUploadResult {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
  expiresInSeconds: number;
}

export interface DeliveryOptions {
  signed?: boolean;
  expiresInSeconds?: number;
  download?: boolean;
}

export interface StorageProvider {
  /**
   * Uploads a file buffer to storage.
   */
  upload(file: UploadFileInput): Promise<UploadResult>;

  /**
   * Deletes an object by storage key.
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Checks whether an object exists in storage.
   */
  exists(storageKey: string): Promise<boolean>;

  /**
   * Retrieves object metadata.
   */
  getMetadata(storageKey: string): Promise<StorageMetadata | null>;

  /**
   * Returns delivery URL for an object (public CDN or signed URL).
   */
  getDeliveryUrl(storageKey: string, options?: DeliveryOptions): Promise<string>;

  /**
   * Generates a pre-signed upload URL for direct client uploads.
   */
  createUploadUrl(
    filename: string,
    contentType: string,
    expiresInSeconds?: number
  ): Promise<SignedUploadResult>;
}

export class StorageValidationError extends Error {
  public readonly statusCode = 400;
  public readonly code = 'INVALID_IMAGE_FILE';

  constructor(message: string) {
    super(message);
    this.name = 'StorageValidationError';
  }
}

export class StorageProviderError extends Error {
  public readonly statusCode = 500;
  public readonly code = 'STORAGE_PROVIDER_ERROR';

  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'StorageProviderError';
  }
}
