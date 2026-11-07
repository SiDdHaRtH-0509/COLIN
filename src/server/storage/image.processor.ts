/**
 * COLIN Secure Image Processing Pipeline
 * Phase 4A.2.5.1: Cloud Image Storage Infrastructure
 * 
 * Enforces server-controlled image decoding, dimension bounding,
 * decompression-bomb defense, EXIF/GPS metadata stripping, and WebP re-encoding.
 */

import sharp, { Sharp, Metadata } from 'sharp';
import { StorageValidationError } from './storage.types';

export interface ProcessedImageResult {
  masterBuffer: Buffer;
  thumbnailBuffer: Buffer;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  thumbnailSizeBytes: number;
}

export interface ImageProcessingOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxPixels?: number;
  maxFileSizeBytes?: number;
  outputFormat?: 'webp' | 'jpeg';
  quality?: number;
}

export const IMAGE_CONSTRAINTS = {
  MIN_WIDTH: 400,
  MIN_HEIGHT: 300,
  MAX_WIDTH: 4096,
  MAX_HEIGHT: 4096,
  MAX_DECODED_PIXELS: 16_000_000, // 16 Megapixels
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  THUMBNAIL_WIDTH: 400,
  THUMBNAIL_HEIGHT: 300,
} as const;

/**
 * Validates actual binary signatures (magic bytes) to verify file integrity.
 * Strictly permits only JPEG, PNG, and WEBP. Rejects SVG, HTML, executables, scripts, and GIF.
 */
export function validateImageMagicBytes(buffer: Buffer, _claimedMimeType?: string): string {
  if (!buffer || buffer.length < 12) {
    throw new StorageValidationError('File buffer is empty or too small to be a valid image.');
  }

  const hexHeader = buffer.subarray(0, 12).toString('hex').toLowerCase();

  // Reject SVG/XML scripts disguised as images
  const asciiHeader = buffer.subarray(0, 128).toString('ascii').toLowerCase();
  if (
    asciiHeader.includes('<svg') ||
    asciiHeader.includes('<?xml') ||
    asciiHeader.includes('<html') ||
    asciiHeader.includes('<!doctype') ||
    asciiHeader.includes('<script')
  ) {
    throw new StorageValidationError('SVG, XML, and HTML script payloads are strictly rejected for property photos.');
  }

  // Reject common executable signatures (MZ for Windows PE/EXE, ELF for Linux, Mach-O for Mac)
  if (hexHeader.startsWith('4d5a') || hexHeader.startsWith('7f454c46') || hexHeader.startsWith('cffaedfe')) {
    throw new StorageValidationError('Unsupported or forged image format. Executable binaries are strictly prohibited.');
  }

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

  throw new StorageValidationError(
    `Unsupported or forged image format. Expected JPEG, PNG, or WEBP; received header ${hexHeader.substring(0, 8)}.`
  );
}

/**
 * Comprehensive image processing pipeline.
 * Decodes buffer, enforces dimension bounds, rejects decompression bombs,
 * strips EXIF/GPS metadata, and produces optimized master and thumbnail buffers.
 */
export async function processPropertyImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImageResult> {
  const maxFileSizeBytes = options.maxFileSizeBytes || IMAGE_CONSTRAINTS.MAX_FILE_SIZE_BYTES;
  const minWidth = options.minWidth || IMAGE_CONSTRAINTS.MIN_WIDTH;
  const minHeight = options.minHeight || IMAGE_CONSTRAINTS.MIN_HEIGHT;
  const maxWidth = options.maxWidth || IMAGE_CONSTRAINTS.MAX_WIDTH;
  const maxHeight = options.maxHeight || IMAGE_CONSTRAINTS.MAX_HEIGHT;
  const maxPixels = options.maxPixels || IMAGE_CONSTRAINTS.MAX_DECODED_PIXELS;

  // 1. File size check
  if (inputBuffer.length > maxFileSizeBytes) {
    throw new StorageValidationError(
      `File size (${Math.round(inputBuffer.length / 1024)} KB) exceeds the maximum allowed limit of ${Math.round(
        maxFileSizeBytes / 1024
      )} KB.`
    );
  }

  // 2. Binary magic byte inspection
  validateImageMagicBytes(inputBuffer);

  // 3. Sharp decoding with decompression bomb protection (limitInputPixels)
  let image: Sharp;
  let metadata: Metadata;
  try {
    image = sharp(inputBuffer, {
      failOn: 'error',
      limitInputPixels: maxPixels,
    });
    metadata = await image.metadata();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes('Input image exceeds pixel limit') || errorMsg.includes('limitInputPixels')) {
      throw new StorageValidationError('Image exceeds maximum allowed decoded pixel count (potential decompression bomb).');
    }
    throw new StorageValidationError(`Malformed or unreadable image file: ${errorMsg}`);
  }

  const { width, height, format } = metadata;
  if (!width || !height) {
    throw new StorageValidationError('Unable to determine image dimensions.');
  }

  // 4. Allowed raster formats check
  if (!format || !['jpeg', 'png', 'webp'].includes(format.toLowerCase())) {
    throw new StorageValidationError(`Image format '${format}' is not permitted for property photos. Allowed: JPEG, PNG, WEBP.`);
  }

  // 5. Dimension bounds check
  if (width < minWidth || height < minHeight) {
    throw new StorageValidationError(
      `Image dimensions (${width}x${height}) are too small. Minimum required dimensions are ${minWidth}x${minHeight} pixels.`
    );
  }

  if (width > maxWidth || height > maxHeight) {
    throw new StorageValidationError(
      `Image dimensions (${width}x${height}) are too large. Maximum allowed dimensions are ${maxWidth}x${maxHeight} pixels.`
    );
  }

  if (width * height > maxPixels) {
    throw new StorageValidationError(
      `Total pixel count (${width * height} pixels) exceeds the maximum limit of ${maxPixels} pixels.`
    );
  }

  // 6. EXIF Stripping & Master Re-encoding
  // .rotate() auto-rotates based on EXIF Orientation tag before metadata is stripped
  // Sharp by default strips all EXIF, GPS, camera, and device metadata on re-encoding
  const masterSharp = sharp(inputBuffer, { limitInputPixels: maxPixels }).rotate();

  const masterBuffer = await masterSharp
    .webp({ quality: options.quality || 85, effort: 4 })
    .toBuffer();

  const finalMetadata = await sharp(masterBuffer).metadata();

  // 7. Thumbnail Generation (400x300, aspect-ratio preserved via fit: inside)
  const thumbnailBuffer = await sharp(inputBuffer, { limitInputPixels: maxPixels })
    .rotate()
    .resize(IMAGE_CONSTRAINTS.THUMBNAIL_WIDTH, IMAGE_CONSTRAINTS.THUMBNAIL_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  return {
    masterBuffer,
    thumbnailBuffer,
    mimeType: 'image/webp',
    extension: 'webp',
    width: finalMetadata.width || width,
    height: finalMetadata.height || height,
    fileSizeBytes: masterBuffer.length,
    thumbnailSizeBytes: thumbnailBuffer.length,
  };
}
