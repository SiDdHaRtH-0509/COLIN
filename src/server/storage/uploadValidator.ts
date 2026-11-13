/**
 * COLIN File Upload Security & Magic-Byte Inspection Service
 * Phase 6F: API Security Hardening & Safe Asset Ingestion
 * 
 * Inspects incoming binary streams for true magic-byte headers, eliminates path traversal,
 * rejects executable payloads, and enforces deterministic UUID filename mapping.
 */

import path from 'node:path';
import crypto from 'node:crypto';

export interface FileValidationResult {
  isValid: boolean;
  mimeType: string;
  sanitizedFilename: string;
  errorMessage?: string;
}

// Magic Byte Signatures for authorized image & document formats
const MAGIC_NUMBERS = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47],
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46], // 'RIFF' ... 'WEBP'
  PDF: [0x25, 0x50, 0x44, 0x46], // '%PDF'
};

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.bin', '.js', '.mjs',
  '.ts', '.html', '.htm', '.php', '.phtml', '.py', '.pl', '.jsp',
  '.vbs', '.jar', '.dll', '.so', '.dylib', '.com', '.scr', '.ps1',
]);

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['application/pdf', '.pdf'],
]);

export class UploadValidator {
  /**
   * Validates binary buffer contents using magic bytes and validates extension.
   */
  public static validateBuffer(
    buffer: Buffer,
    originalFilename: string,
    maxSizeBytes = 5 * 1024 * 1024 // 5MB
  ): FileValidationResult {
    // 1. Size Verification
    if (!buffer || buffer.length === 0) {
      return { isValid: false, mimeType: '', sanitizedFilename: '', errorMessage: 'Uploaded file is empty.' };
    }

    if (buffer.length > maxSizeBytes) {
      return {
        isValid: false,
        mimeType: '',
        sanitizedFilename: '',
        errorMessage: `Uploaded file exceeds maximum limit of ${maxSizeBytes / 1024 / 1024}MB.`,
      };
    }

    // 2. Path Traversal & Filename Sanitization
    const baseName = path.basename(originalFilename).trim();
    const ext = path.extname(baseName).toLowerCase();

    if (BLOCKED_EXTENSIONS.has(ext)) {
      return {
        isValid: false,
        mimeType: '',
        sanitizedFilename: '',
        errorMessage: `Executable or script extension '${ext}' is strictly prohibited.`,
      };
    }

    // 3. Inspect Binary Magic Bytes
    const detectedMime = this.detectMagicBytes(buffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
      return {
        isValid: false,
        mimeType: '',
        sanitizedFilename: '',
        errorMessage: 'Invalid file format. Only authentic JPEG, PNG, WebP, and PDF files are allowed.',
      };
    }

    // 4. Generate Safe UUID-based filename to prevent overwriting or directory traversal
    const safeExtension = ALLOWED_MIME_TYPES.get(detectedMime) || ext;
    const safeFilename = `${crypto.randomUUID()}${safeExtension}`;

    return {
      isValid: true,
      mimeType: detectedMime,
      sanitizedFilename: safeFilename,
    };
  }

  /**
   * Detects true MIME type from initial buffer header bytes.
   */
  private static detectMagicBytes(buffer: Buffer): string | null {
    if (buffer.length < 4) return null;

    // Check JPEG (FF D8 FF)
    if (
      buffer[0] === MAGIC_NUMBERS.JPEG[0] &&
      buffer[1] === MAGIC_NUMBERS.JPEG[1] &&
      buffer[2] === MAGIC_NUMBERS.JPEG[2]
    ) {
      return 'image/jpeg';
    }

    // Check PNG (89 50 4E 47)
    if (
      buffer[0] === MAGIC_NUMBERS.PNG[0] &&
      buffer[1] === MAGIC_NUMBERS.PNG[1] &&
      buffer[2] === MAGIC_NUMBERS.PNG[2] &&
      buffer[3] === MAGIC_NUMBERS.PNG[3]
    ) {
      return 'image/png';
    }

    // Check PDF (%PDF -> 25 50 44 46)
    if (
      buffer[0] === MAGIC_NUMBERS.PDF[0] &&
      buffer[1] === MAGIC_NUMBERS.PDF[1] &&
      buffer[2] === MAGIC_NUMBERS.PDF[2] &&
      buffer[3] === MAGIC_NUMBERS.PDF[3]
    ) {
      return 'application/pdf';
    }

    // Check WebP (RIFF .... WEBP)
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50  // WEBP
    ) {
      return 'image/webp';
    }

    return null;
  }
}
