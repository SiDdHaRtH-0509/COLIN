# COLIN — Phase 4A.2.5.1.0 Cloud Image Storage Implementation Plan & Architecture Blueprint

**Phase:** Phase 4A.2.5.1.0 — Initial Storage Implementation Audit & Architecture Blueprint  
**Parent Phase:** Phase 4A.2.5.1 — Cloud Image Storage Infrastructure  
**Project:** COLIN — Campus Living Verified  
**Runtime:** Node.js 20+ / Express 5.3.0 / TypeScript Strict  
**Target Database:** PostgreSQL 18.4 (Port 5433)  
**ORM:** Prisma 5.22.0  
**Feature Branch:** `phase-4a-2-5-external-infrastructure`  
**Base Commit:** `b8e5458`  
**Status:** COMPLETED — IMPLEMENTATION PLAN APPROVED  

---

## 1. Executive Summary

This document establishes the detailed engineering plan for replacing COLIN's development-mode in-memory storage adapter with a production-grade, provider-independent cloud image storage infrastructure. The new architecture enforces server-controlled image decoding, dimension bounding, EXIF/GPS metadata stripping, decompression-bomb defense, S3-compatible cloud object persistence, signed upload/delivery capabilities, and atomic PostgreSQL metadata tracking, all while preserving the 8-photo limit, parent-row lock concurrency, and existing API contracts.

---

## 2. Existing Storage Architecture & API Baseline

### 2.1 Current Storage Service (`src/server/storage/storage.service.ts`)
- Interface `StorageProvider`: Provides `upload(file: UploadFileInput)`, `delete(storageKey: string)`, and `getUrl(storageKey: string)`.
- Implementation `LocalStorageProvider`: Stores files in an in-memory `Map<string, { buffer: Buffer, mimeType: string }>`.
- Validation: `validateImageMagicBytes` inspects leading file headers (JPEG `0xFFD8FF`, PNG `0x89504E47`, WEBP `RIFF...WEBP`, GIF `0x47494638`).
- Limits: 5MB maximum file size limit.

### 2.2 Database Relational Model (`PropertyPhoto` in `prisma/schema.prisma`)
```prisma
model PropertyPhoto {
  id                 String                     @id @default(uuid()) @db.Uuid
  propertyId         String                     @map("property_id") @db.Uuid
  photoStorageUrl    String                     @map("photo_storage_url") @db.VarChar(512)
  thumbnailUrl       String?                    @map("thumbnail_url") @db.VarChar(512)
  caption            String?                    @db.VarChar(150)
  displayOrder       Int                        @default(0) @map("display_order")
  isCover            Boolean                    @default(false) @map("is_cover")
  fileSizeBytes      Int?                       @map("file_size_bytes")
  mimeType           String?                    @map("mime_type") @db.VarChar(30)
  createdAt          DateTime                   @default(now()) @map("created_at") @db.Timestamptz(6)

  property           Property                   @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@index([propertyId])
  @@map("property_photos")
}
```

### 2.3 PostgreSQL Engine-Level Constraints (`COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql`)
1. **8-Photo Limit & Concurrency:** PostgreSQL trigger function `enforce_max_property_photos()` executes `PERFORM id FROM properties WHERE id = NEW.property_id FOR UPDATE;` before counting photos, guaranteeing that concurrent uploads are serialized and cannot breach 8 photos.
2. **Cover Photo Exclusivity:** Partial unique index `uq_property_cover_photo ON property_photos (property_id) WHERE is_cover = TRUE;`.
3. **Display Order Uniqueness:** Unique index `uq_property_photo_display_order ON property_photos (property_id, display_order);`.

---

## 3. Cloud Storage Provider Evaluation & Recommendation

We evaluated three potential cloud storage architectures for COLIN:

| Evaluation Criterion | Option A: AWS S3 / S3-Compatible | Option B: Google Cloud Storage | Option C: Cloudinary |
|:---|:---|:---|:---|
| **Object Durability** | 99.999999999% (11 9s) | 99.999999999% (11 9s) | Delegated to underlying cloud |
| **Private Bucket & IAM** | Standard IAM roles, Bucket Policies | Google Service Accounts | Restricted API keys |
| **Signed URLs** | Pre-signed PUT/GET via AWS SDK v3 | Signed URLs via V4 signing | Signed upload presets |
| **Cost & Egress Flexibility** | Standard S3 or Cloudflare R2 (0 egress) | Standard GCP egress rates | Tiered transformation limits |
| **Vendor Independence** | **High** (Compatible with R2, MinIO, S3) | Moderate (GCP proprietary SDK) | Low (Proprietary transforms/URLs)|
| **Operational Complexity**| Low/Standard (`@aws-sdk/client-s3`) | Moderate (Service Account JSON) | Low setup, complex billing |

### Architectural Decision:
**Option A: AWS S3 / S3-Compatible Cloud Storage Provider** is selected.
- Implementing an S3-compatible adapter allows seamless switching between AWS S3, Cloudflare R2 (for zero egress fees), or MinIO (for local containerized testing) without application code changes.
- Server-side image processing (`sharp`) provides complete autonomy over image compression, metadata sanitization, and WebP variant generation without relying on proprietary third-party CDNs.

---

## 4. Target Architecture & Required Modifications

```
                                  HTTP Request (Owner)
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │   Owner Property Photo API Controller  │
                       │   POST /properties/:id/photos/upload   │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │        Authentication & Ownership      │
                       │     (Verify owner matches property)    │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │       Image Processing Pipeline        │
                       │  - Magic byte validation               │
                       │  - sharp: decode & parse dimensions    │
                       │  - Dimension check (400x300 to 4096x4096)
                       │  - Decompression bomb protection (<16MP)
                       │  - Strip EXIF & Geolocation data       │
                       │  - Re-encode to clean WebP & Thumbnail │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │        Storage Provider Abstraction    │
                       │  ┌─────────────────┬─────────────────┐ │
                       │  │ S3CloudAdapter  │ LocalDiskAdapter│ │
                       │  └─────────────────┴─────────────────┘ │
                       └───────────────────┬────────────────────┘
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     ▼                                           ▼
       ┌───────────────────────────┐               ┌───────────────────────────┐
       │   Private Object Storage  │               │   PostgreSQL Database     │
       │   - Original WebP Asset   │               │   - PropertyPhoto Record  │
       │   - Thumbnail WebP Asset  │               │   - Concurrency Lock      │
       └───────────────────────────┘               └───────────────────────────┘
```

---

## 5. Implementation Roadmap & Sub-Phases

### 5.1 Sub-Phase 4A.2.5.1.1: Storage Provider Abstraction & Adapters
- Define enhanced `StorageProvider` interface:
  - `upload(file: ProcessedFileInput): Promise<UploadResult>`
  - `delete(storageKey: string): Promise<void>`
  - `exists(storageKey: string): Promise<boolean>`
  - `getMetadata(storageKey: string): Promise<StorageMetadata | null>`
  - `getDeliveryUrl(storageKey: string, options?: DeliveryOptions): string`
  - `createUploadUrl(filename: string, contentType: string, expiresInSeconds?: number): Promise<SignedUploadResult>`
- Implement `S3StorageProvider` using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- Enhance `LocalStorageProvider` with durable local filesystem caching and memory persistence for seamless testing.

### 5.2 Sub-Phase 4A.2.5.1.2: Secure Image Processing Pipeline
- Install and configure `sharp` image processing library.
- Create `src/server/storage/image.processor.ts`:
  - Enforce minimum dimensions: `400 x 300` pixels.
  - Enforce maximum dimensions: `4096 x 4096` pixels.
  - Enforce maximum decoded pixel count: `16,000,000` pixels (16 MP).
  - Strip all EXIF, GPS, camera metadata (`.rotate().withMetadata(false)`).
  - Re-encode master image to optimized WebP (`quality: 85`).
  - Generate standard thumbnail (`400 x 300`, WebP).
  - Reject SVG, HTML, executables, scripts, and malformed images.

### 5.3 Sub-Phase 4A.2.5.1.3: Upload Architecture & Controller Integration
- Extend `owner.property.controller.ts` and `owner.property.routes.ts`:
  - Support multipart binary uploads via a secure stream parser or raw buffer upload.
  - Maintain 100% backward compatibility with existing JSON metadata endpoint (`POST /properties/:id/photos`).
  - Support new direct upload endpoint (`POST /properties/:id/photos/upload`).

### 5.4 Sub-Phase 4A.2.5.1.4: Database Metadata & Orphan Cleanup
- If storage upload succeeds but DB transaction fails, execute compensating deletion to avoid orphaned cloud objects.
- When photos are deleted, delete both main image and thumbnail from object storage.

### 5.5 Sub-Phase 4A.2.5.1.5: Environment Configuration & Secrets
- Update `src/server/config/serverConfig.ts` with typed storage configuration:
  - `STORAGE_PROVIDER`: `'local'` | `'s3'`
  - `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
  - `STORAGE_PUBLIC_BASE_URL`
- Update `.env.example` with documented non-secret placeholders.

### 5.6 Sub-Phase 4A.2.5.1.6: Comprehensive Testing Suite
- Authored test suites:
  - `src/test/storage/storage-provider.test.ts` (Local & S3 mock adapter tests)
  - `src/test/storage/image-pipeline.test.ts` (Magic bytes, EXIF stripping, dimension bounds, decompression bombs, SVG/HTML rejections)
  - `src/test/storage/photo-lifecycle.integration.test.ts` (Live PG upload, cover exclusivity, 8-photo limit, atomic deletion)
- Verify zero regressions across all 427 existing platform tests.

---

## 6. Execution Authorization

Plan is fully documented. Proceeding to **Phase 4A.2.5.1.1** implementation.
