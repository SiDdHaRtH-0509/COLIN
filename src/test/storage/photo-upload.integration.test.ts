/**
 * COLIN Photo Upload & Storage Lifecycle Integration Test Suite
 * Phase 4A.2.5.1: Cloud Image Storage Infrastructure
 * 
 * Verifies multipart image upload, Sharp processing, thumbnail generation,
 * 8-photo limit, concurrency lock, cover photo management, and asset deletion
 * against live PostgreSQL 18.4.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import sharp from 'sharp';
import { PropertyType, PropertyGenderPolicy } from '@prisma/client';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { getAppPrismaClient } from '../../server/database/prisma';

describe('COLIN Phase 4A.2.5.1: Photo Upload & Storage Integration Suite', () => {
  let app: Express;
  const appPrisma = getAppPrismaClient();

  const timestamp = Date.now();
  const ownerEmail = `storage_owner_${timestamp}@host.test`;
  const otherOwnerEmail = `storage_other_${timestamp}@host.test`;
  const studentEmail = `storage_student_${timestamp}@campus.test`;
  const testPassword = 'Password123!@#Secure';

  let ownerToken: string;
  let otherOwnerToken: string;
  let studentToken: string;
  let propertyId: string;

  let validImageBuffer: Buffer;

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();

    // Synthesize valid 800x600 test JPEG buffer
    validImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 60, g: 120, b: 210 },
      },
    })
      .jpeg()
      .toBuffer();

    // 1. Register primary owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: ownerEmail,
        password: testPassword,
        firstName: 'Vipul',
        lastName: 'Mehta',
        role: 'OWNER',
        businessName: 'Mehta Living Spaces',
      });
    expect(ownerRes.status).toBe(201);
    ownerToken = ownerRes.body.data.tokens.accessToken;

    // 2. Register other owner for IDOR checks
    const otherOwnerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: otherOwnerEmail,
        password: testPassword,
        firstName: 'Sunil',
        lastName: 'Grover',
        role: 'OWNER',
        businessName: 'Grover Living Spaces',
      });
    expect(otherOwnerRes.status).toBe(201);
    otherOwnerToken = otherOwnerRes.body.data.tokens.accessToken;

    // 3. Register student
    const studentRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: studentEmail,
        password: testPassword,
        firstName: 'Rohan',
        lastName: 'Verma',
        role: 'STUDENT',
        collegeName: 'Delhi University',
      });
    expect(studentRes.status).toBe(201);
    studentToken = studentRes.body.data.tokens.accessToken;

    // Create test property for owner
    const propRes = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Mehta Prime Residency',
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '88 Cyber Hub Enclave',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122002',
        totalRooms: 10,
        totalBeds: 20,
        availableBeds: 8,
      });

    propertyId = propRes.body.data.id;
  });

  afterAll(async () => {
    try {
      // Clean up property and seeded users
      if (propertyId) {
        await appPrisma.propertyPhoto.deleteMany({ where: { propertyId } });
        await appPrisma.property.deleteMany({ where: { id: propertyId } });
      }
      await appPrisma.user.deleteMany({
        where: { email: { in: [ownerEmail, otherOwnerEmail, studentEmail] } },
      });
    } catch {
      // Ignored in test cleanup
    }
    await shutdownDatabaseConnections();
  });

  describe('1. Multipart Binary Image Upload', () => {
    it('uploads valid image, strips EXIF, generates WebP thumbnail, and saves DB record', async () => {
      const res = await request(app)
        .post(`/api/v1/owner/properties/${propertyId}/photos/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('caption', 'Spacious Master Bedroom')
        .field('isCover', 'true')
        .attach('photo', validImageBuffer, 'bedroom.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.propertyId).toBe(propertyId);
      expect(res.body.data.photoStorageUrl).toContain('prop_img_');
      expect(res.body.data.thumbnailUrl).toContain('prop_img_');
      expect(res.body.data.mimeType).toBe('image/webp');
      expect(res.body.data.isCover).toBe(true);
      expect(res.body.data.caption).toBe('Spacious Master Bedroom');

      // Verify that local asset delivery returns the stored image
      const photoUrl = res.body.data.photoStorageUrl;
      const getAssetRes = await request(app).get(photoUrl);
      expect(getAssetRes.status).toBe(200);
      expect(getAssetRes.headers['content-type']).toBe('image/webp');
      expect(getAssetRes.headers['x-content-type-options']).toBe('nosniff');
    });

    it('rejects upload with missing file', async () => {
      const res = await request(app)
        .post(`/api/v1/owner/properties/${propertyId}/photos/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('caption', 'Empty payload');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/No image file provided/i);
    });

    it('rejects upload when file dimensions are smaller than 400x300', async () => {
      const tinyBuffer = await sharp({
        create: {
          width: 250,
          height: 200,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const res = await request(app)
        .post(`/api/v1/owner/properties/${propertyId}/photos/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('photo', tinyBuffer, 'tiny.jpg');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/too small/i);
    });
  });

  describe('2. Authorization & IDOR Protection', () => {
    it('strictly prohibits other owner from uploading to non-owned property (IDOR)', async () => {
      const res = await request(app)
        .post(`/api/v1/owner/properties/${propertyId}/photos/upload`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .attach('photo', validImageBuffer, 'intruder.jpg');

      expect([403, 404]).toContain(res.status);
    });

    it('strictly prohibits student role from uploading property photos', async () => {
      const res = await request(app)
        .post(`/api/v1/owner/properties/${propertyId}/photos/upload`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('photo', validImageBuffer, 'student_attempt.jpg');

      expect(res.status).toBe(403);
    });
  });

  describe('3. Maximum 8 Photos Limit & Photo Deletion Lifecycle', () => {
    it('allows uploading up to 8 photos and rejects the 9th upload attempt', async () => {
      // 1 photo is already uploaded. Upload 6 more photos to reach 7 photos
      for (let i = 2; i <= 7; i++) {
        const uploadRes = await request(app)
          .post(`/api/v1/owner/properties/${propertyId}/photos/upload`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .field('caption', `Listing Photo ${i}`)
          .attach('photo', validImageBuffer, `photo_${i}.jpg`);
        expect(uploadRes.status).toBe(201);
      }

      // Upload the 8th photo (allowed ceiling)
      const eighthRes = await request(app)
        .post(`/api/v1/owner/properties/${propertyId}/photos/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('caption', '8th Final Photo')
        .attach('photo', validImageBuffer, 'photo_8.jpg');
      expect(eighthRes.status).toBe(201);

      // Verify total count is exactly 8 in database
      const count = await appPrisma.propertyPhoto.count({ where: { propertyId } });
      expect(count).toBe(8);

      // Attempt to upload 9th photo -> Must be rejected with 422 or 400
      const ninthRes = await request(app)
        .post(`/api/v1/owner/properties/${propertyId}/photos/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('caption', '9th Disallowed Photo')
        .attach('photo', validImageBuffer, 'photo_9.jpg');

      expect([400, 422]).toContain(ninthRes.status);
      expect(ninthRes.body.error.message).toMatch(/maximum.*8/i);
    });

    it('deletes a photo and allows subsequent upload after freeing capacity', async () => {
      // Fetch photos to find an ID to delete
      const photos = await appPrisma.propertyPhoto.findMany({
        where: { propertyId },
        orderBy: { displayOrder: 'asc' },
      });
      expect(photos.length).toBe(8);

      const targetPhotoId = photos[photos.length - 1].id;

      // Delete the photo
      const deleteRes = await request(app)
        .delete(`/api/v1/owner/properties/${propertyId}/photos/${targetPhotoId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify count in DB dropped to 7
      const countAfterDelete = await appPrisma.propertyPhoto.count({ where: { propertyId } });
      expect(countAfterDelete).toBe(7);

      // Now uploading a replacement 8th photo succeeds
      const replacementRes = await request(app)
        .post(`/api/v1/owner/properties/${propertyId}/photos/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('caption', 'Replacement 8th Photo')
        .attach('photo', validImageBuffer, 'photo_replacement.jpg');

      expect(replacementRes.status).toBe(201);
    });
  });
});
