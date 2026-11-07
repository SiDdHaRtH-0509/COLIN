# COLIN — Phase 4A.2.4 Property Photo & Storage Management Report

**Phase:** Phase 4A.2.4 — Core Marketplace Domain & Business API Implementation  
**Project:** COLIN — Campus Living Verified  
**Runtime:** Node.js 20+ / TypeScript Strict  
**Database:** PostgreSQL 18.4  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

COLIN enforces strict asset management rules for property photography to maintain high marketplace curation standards, prevent malicious file uploads, avoid storage bloat, and guarantee visual consistency. This report details the photo management architecture, storage abstractions, binary validation, and database constraints.

---

## 2. Core Image Invariants & Rules

1. **Strict Maximum 8 Photos Rule:**
   - Enforced at the application DTO / service layer (`ValidationConstraintError` if `photoCount >= 8`).
   - Enforced at the database engine level via PostgreSQL trigger `trg_enforce_property_photo_limit` on `property_photos`.
   - Attempting to insert a 9th photo raises an immediate error.

2. **Cover Photo Uniqueness:**
   - Only one photo per property may have `is_cover: true`.
   - Adding a new photo with `is_cover: true` or updating a photo to cover automatically unsets `is_cover` on all other photos of that property.
   - Guarded by PostgreSQL partial unique index:
     ```sql
     CREATE UNIQUE INDEX uq_property_cover_photo 
     ON property_photos (property_id) 
     WHERE is_cover = TRUE;
     ```

3. **Collision-Resistant Display Order:**
   - Unique index `uq_property_photo_display_order` on `(property_id, display_order)` prevents duplicate orders.
   - When reordering photos, `PropertyRepository.reorderPhotos()` shifts all existing photos to negative temporary offsets in an atomic transaction before assigning the final display order, avoiding intermediate unique constraint violations.

---

## 3. Storage Abstraction & Binary Magic Byte Inspection

### 3.1 Storage Abstraction
File storage is completely abstracted behind `StorageProvider` (`src/server/storage/storage.service.ts`), decoupling the application from local filesystem vs cloud object storage (e.g., S3/GCS):
- `saveFile(fileBuffer, originalFilename, mimeType, subDir)`
- `deleteFile(storageUrl)`

### 3.2 Magic Byte Inspection
Content-Type headers sent by clients are inherently untrusted. The storage service inspects the leading bytes of every upload buffer:
- **JPEG:** Leading 3 bytes `0xFF, 0xD8, 0xFF`
- **PNG:** Leading 8 bytes `0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A`
- **WEBP:** Leading 4 bytes `0x52, 0x49, 0x46, 0x46` (RIFF) followed by bytes 8-12 `0x57, 0x45, 0x42, 0x50` (WEBP)
- Any non-matching file (including `.exe`, `.sh`, `.php`, or `.svg` script vectors disguised as `.jpg`) is immediately rejected with HTTP 400.

### 3.3 Size & Traversal Defenses
- Files are limited to 5MB (`5 * 1024 * 1024` bytes).
- Filenames are sanitized, stripped of `../`, `..\\`, and mapped to `UUID + ext` to prevent directory traversal attacks.

---

## 4. API Endpoints Specification

Mounted under `/api/v1/owner/properties/:propertyId/photos`:
- `GET /api/v1/owner/properties/:propertyId/photos`: Lists all photos ordered by `displayOrder`.
- `POST /api/v1/owner/properties/:propertyId/photos`: Adds a photo (or binary upload).
- `PUT /api/v1/owner/properties/:propertyId/photos/reorder`: Atomically reorders photos.
- `DELETE /api/v1/owner/properties/:propertyId/photos/:photoId`: Deletes a photo and its physical storage asset.

---

## 5. Verification Verdict

- 8-photo limit verified at DB level (Postgres error `P0001` in `backend-orm-integration.test.ts`) and API level (`marketplace-business.integration.test.ts`).
- Magic byte detection verified for JPEG, PNG, WEBP in `marketplace-unit.test.ts`.
- Non-owner photo modification attempts rejected in `marketplace-adversarial.test.ts`.

**Verdict: FULL PASS**
