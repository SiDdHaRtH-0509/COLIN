/**
 * COLIN AWS S3 & S3-Compatible Cloud Storage Provider Adapter
 * Phase 4A.2.5.1: Cloud Image Storage Infrastructure
 * 
 * Supports AWS S3, Cloudflare R2, and local MinIO with pre-signed URLs,
 * server-side encryption, and private-by-default bucket policies.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import {
  StorageProvider,
  UploadFileInput,
  UploadResult,
  StorageMetadata,
  SignedUploadResult,
  DeliveryOptions,
  StorageValidationError,
  StorageProviderError,
} from '../storage.types';
import { getCircuitBreaker } from '../../reliability/circuitBreaker';
import { withTimeout } from '../../reliability/timeout';
import { IntegrationCircuitOpenError } from '../../reliability/errors';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
  forcePathStyle?: boolean;
}

export class S3StorageProvider implements StorageProvider {
  private client: S3Client | null = null;
  private readonly config: S3StorageConfig;

  constructor(config: S3StorageConfig) {
    this.config = config;
    this.initClient();
  }

  private initClient(): void {
    const { region, endpoint, accessKeyId, secretAccessKey, forcePathStyle } = this.config;

    // In production, credentials must be provided
    if (accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: region || 'us-east-1',
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: forcePathStyle ?? Boolean(endpoint),
      });
    }
  }

  private getClientOrThrow(): S3Client {
    if (!this.client) {
      throw new StorageProviderError(
        'S3 Client is not initialized. Ensure S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are configured.'
      );
    }
    return this.client;
  }

  /**
   * Uploads file to S3 bucket with private ACL.
   */
  async upload(file: UploadFileInput): Promise<UploadResult> {
    const client = this.getClientOrThrow();

    if (!file.buffer || file.buffer.length === 0) {
      throw new StorageValidationError('File buffer is empty.');
    }

    let extension = 'webp';
    if (file.mimeType.includes('jpeg') || file.mimeType.includes('jpg')) extension = 'jpg';
    else if (file.mimeType.includes('png')) extension = 'png';

    const subDirPrefix = file.subDir ? `${file.subDir.replace(/[^a-zA-Z0-9_\-/]/g, '')}/` : '';
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `${subDirPrefix}prop_img_${uniqueId}.${extension}`;

    const breaker = getCircuitBreaker('s3-storage', { failureThreshold: 3, openDurationMs: 15000 });

    try {
      return await breaker.execute(async () => {
        const command = new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimeType,
          // Enforce AES256 server-side encryption at rest
          ServerSideEncryption: 'AES256',
        });

        await withTimeout(
          () => client.send(command),
          10000,
          { provider: 's3-storage', operationName: 'upload' }
        );

        const publicUrl = this.formatPublicUrl(storageKey);

        return {
          storageKey,
          publicUrl,
          fileSizeBytes: file.buffer.length,
          mimeType: file.mimeType,
        };
      });
    } catch (err: unknown) {
      if (err instanceof IntegrationCircuitOpenError) {
        throw new StorageProviderError(`S3 Storage circuit breaker is OPEN. Fast-failing request.`, err);
      }
      throw new StorageProviderError(
        `Failed to upload object '${storageKey}' to S3 bucket '${this.config.bucket}'.`,
        err
      );
    }
  }

  /**
   * Deletes object from S3.
   */
  async delete(storageKey: string): Promise<void> {
    const client = this.getClientOrThrow();
    const sanitizedKey = this.sanitizeKey(storageKey);
    const breaker = getCircuitBreaker('s3-storage', { failureThreshold: 3, openDurationMs: 15000 });

    try {
      await breaker.execute(async () => {
        const command = new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: sanitizedKey,
        });

        await withTimeout(
          () => client.send(command),
          10000,
          { provider: 's3-storage', operationName: 'delete' }
        );
      });
    } catch (err: unknown) {
      if (err instanceof IntegrationCircuitOpenError) {
        throw new StorageProviderError(`S3 Storage circuit breaker is OPEN. Fast-failing delete.`, err);
      }
      throw new StorageProviderError(`Failed to delete object '${sanitizedKey}' from S3.`, err);
    }
  }

  /**
   * Checks whether object exists via HEAD request.
   */
  async exists(storageKey: string): Promise<boolean> {
    const client = this.getClientOrThrow();
    const sanitizedKey = this.sanitizeKey(storageKey);
    const breaker = getCircuitBreaker('s3-storage', { failureThreshold: 3, openDurationMs: 15000 });

    try {
      return await breaker.execute(async () => {
        const command = new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: sanitizedKey,
        });
        await withTimeout(
          () => client.send(command),
          10000,
          { provider: 's3-storage', operationName: 'exists' }
        );
        return true;
      });
    } catch (err: unknown) {
      // 404 / NotFound means it does not exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (err as any)?.$metadata?.httpStatusCode || (err as any)?.name;
      if (status === 404 || status === 'NotFound' || status === 'NoSuchKey') {
        return false;
      }
      if (err instanceof IntegrationCircuitOpenError) {
        throw new StorageProviderError(`S3 Storage circuit breaker is OPEN. Fast-failing exists check.`, err);
      }
      throw new StorageProviderError(`Failed to inspect object '${sanitizedKey}' on S3.`, err);
    }
  }

  /**
   * Retrieves S3 object metadata.
   */
  async getMetadata(storageKey: string): Promise<StorageMetadata | null> {
    const client = this.getClientOrThrow();
    const sanitizedKey = this.sanitizeKey(storageKey);
    const breaker = getCircuitBreaker('s3-storage', { failureThreshold: 3, openDurationMs: 15000 });

    try {
      return await breaker.execute(async () => {
        const command = new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: sanitizedKey,
        });
        const response = await withTimeout(
          () => client.send(command),
          10000,
          { provider: 's3-storage', operationName: 'getMetadata' }
        );

        return {
          storageKey: sanitizedKey,
          size: response.ContentLength || 0,
          mimeType: response.ContentType,
          lastModified: response.LastModified,
          eTag: response.ETag?.replace(/"/g, ''),
        };
      });
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (err as any)?.$metadata?.httpStatusCode || (err as any)?.name;
      if (status === 404 || status === 'NotFound' || status === 'NoSuchKey') {
        return null;
      }
      if (err instanceof IntegrationCircuitOpenError) {
        throw new StorageProviderError(`S3 Storage circuit breaker is OPEN. Fast-failing metadata query.`, err);
      }
      throw new StorageProviderError(`Failed to get metadata for object '${sanitizedKey}' on S3.`, err);
    }
  }

  /**
   * Returns a CDN delivery URL or pre-signed GET URL for private asset delivery.
   */
  async getDeliveryUrl(storageKey: string, options: DeliveryOptions = {}): Promise<string> {
    const sanitizedKey = this.sanitizeKey(storageKey);

    if (options.signed) {
      const client = this.getClientOrThrow();
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: sanitizedKey,
      });
      const expiresIn = options.expiresInSeconds || 3600;
      return getSignedUrl(client, command, { expiresIn });
    }

    return this.formatPublicUrl(sanitizedKey);
  }

  /**
   * Generates a pre-signed PUT URL for direct client-to-S3 uploads.
   */
  async createUploadUrl(
    filename: string,
    contentType: string,
    expiresInSeconds: number = 900
  ): Promise<SignedUploadResult> {
    const client = this.getClientOrThrow();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `uploads/temp_${uniqueId}_${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: storageKey,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    const publicUrl = this.formatPublicUrl(storageKey);

    return {
      uploadUrl,
      storageKey,
      publicUrl,
      expiresInSeconds,
    };
  }

  private formatPublicUrl(storageKey: string): string {
    if (this.config.publicBaseUrl) {
      const baseUrl = this.config.publicBaseUrl.replace(/\/+$/, '');
      return `${baseUrl}/${storageKey}`;
    }
    const region = this.config.region || 'us-east-1';
    return `https://${this.config.bucket}.s3.${region}.amazonaws.com/${storageKey}`;
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9._\-/]/g, '');
  }
}
