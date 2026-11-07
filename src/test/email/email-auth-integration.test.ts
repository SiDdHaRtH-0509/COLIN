/**
 * COLIN Transactional Email - Authentication Integration Test Suite
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Verifies Gate E15 (Verification email integration), Gate E16 (Password reset email),
 * Gate E17 (Password changed notification), and Gate E30 (Full authentication regression).
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../server/app';
import { getAppPrismaClient } from '../../server/database';
import { initializeDatabaseConnections } from '../../server/database/lifecycle';
import {
  EmailWorker,
  getSharedMockEmailProvider,
  EmailEventType,
  EmailOutboxStatus,
} from '../../server/email';

describe('COLIN Transactional Email - Authentication Integration Suite', () => {
  let app: Express;
  const prisma = getAppPrismaClient();
  const mockProvider = getSharedMockEmailProvider();

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();
  });

  beforeEach(async () => {
    mockProvider.clear();
  });

  // Gate E15: Verification email integration
  it('[Gate E15] enqueues verification email upon successful user registration and allows token verification', async () => {
    const timestamp = Date.now();
    const testEmail = `student_e15_${timestamp}@colin.test`;

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        firstName: 'Aarav',
        lastName: 'Sharma',
        role: 'STUDENT',
        collegeName: 'Delhi University',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    const userId = regRes.body.data.user.id;

    // Verify verification outbox record exists
    const outboxRecord = await prisma.emailOutbox.findFirst({
      where: {
        recipient: testEmail,
        eventType: EmailEventType.VERIFICATION_EMAIL,
      },
    });
    expect(outboxRecord).toBeDefined();
    expect(outboxRecord!.status).toBe(EmailOutboxStatus.PENDING);
    expect(outboxRecord!.templateAlias).toBe('verification');

    // Run email worker to process and deliver
    const worker = new EmailWorker({ provider: mockProvider });
    const runResult = await worker.runBatch(10);
    expect(runResult.succeeded).toBeGreaterThanOrEqual(1);

    // Verify sent message in mock provider
    const sent = mockProvider.findMessagesTo(testEmail);
    expect(sent.length).toBe(1);
    expect(sent[0].subject).toContain('Verify your email address');

    // Extract raw token from verification link in email body
    const match = sent[0].textBody.match(/token=([a-f0-9]+)/);
    expect(match).toBeDefined();
    const rawVerificationToken = match![1];

    // Verify email using token via /api/v1/auth/email/verify
    const verifyRes = await request(app)
      .post('/api/v1/auth/email/verify')
      .send({ token: rawVerificationToken });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    // Verify user in database is now email verified
    const verifiedUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(verifiedUser!.isEmailVerified).toBe(true);

    // Reusing the token must fail
    const reuseRes = await request(app)
      .post('/api/v1/auth/email/verify')
      .send({ token: rawVerificationToken });
    expect(reuseRes.status).toBe(401);
  });

  // Gate E16: Password reset email integration
  it('[Gate E16] enqueues password reset email upon forgot-password request and resets password', async () => {
    const timestamp = Date.now();
    const testEmail = `owner_e16_${timestamp}@colin.test`;

    // Register an owner
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'OriginalPassword123!',
        firstName: 'Pooja',
        role: 'OWNER',
        businessName: 'Patel Residencies',
      });
    expect(regRes.status).toBe(201);

    // Request password reset
    const forgotRes = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: testEmail });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    // Verify password reset outbox record
    const resetOutbox = await prisma.emailOutbox.findFirst({
      where: {
        recipient: testEmail,
        eventType: EmailEventType.PASSWORD_RESET,
      },
    });
    expect(resetOutbox).toBeDefined();
    expect(resetOutbox!.status).toBe(EmailOutboxStatus.PENDING);

    // Run worker to deliver email
    const worker = new EmailWorker({ provider: mockProvider });
    await worker.runBatch(10);

    const sent = mockProvider.findMessagesTo(testEmail);
    const resetMsg = sent.find((m) => m.subject.includes('Reset your password'));
    expect(resetMsg).toBeDefined();

    // Extract reset token from link
    const match = resetMsg!.textBody.match(/token=([a-f0-9]+)/);
    expect(match).toBeDefined();
    const rawResetToken = match![1];

    // Reset password with token
    const resetRes = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({
        token: rawResetToken,
        newPassword: 'BrandNewSecurePassword2026!',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Verify user can log in with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'BrandNewSecurePassword2026!',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.tokens.accessToken).toBeDefined();
  });

  // Gate E17: Password changed notification
  it('[Gate E17] enqueues security notification email whenever a password is changed or reset', async () => {
    const timestamp = Date.now();
    const testEmail = `pwchange_${timestamp}@colin.test`;

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'InitialPassword123!',
        firstName: 'Karan',
        role: 'STUDENT',
      });
    const token = regRes.body.data.tokens.accessToken;

    // Change password via authenticated endpoint
    const changeRes = await request(app)
      .post('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'InitialPassword123!',
        newPassword: 'UpdatedPassword999!',
      });
    expect(changeRes.status).toBe(200);

    // Verify password changed outbox record was enqueued
    const notificationOutbox = await prisma.emailOutbox.findFirst({
      where: {
        recipient: testEmail,
        eventType: EmailEventType.PASSWORD_CHANGED,
      },
    });
    expect(notificationOutbox).toBeDefined();
    expect(notificationOutbox!.templateAlias).toBe('password_changed');

    // Run worker to deliver notification
    const worker = new EmailWorker({ provider: mockProvider });
    await worker.runBatch(10);

    const sent = mockProvider.findMessagesTo(testEmail);
    const alertMsg = sent.find((m) => m.subject.includes('password was changed'));
    expect(alertMsg).toBeDefined();
    expect(alertMsg!.htmlBody).toContain('Password Changed Successfully');
  });

  // Gate E30: Full authentication regression
  it('[Gate E30] maintains complete backward compatibility across all existing authentication endpoints', async () => {
    const timestamp = Date.now();
    const email = `regress_${timestamp}@colin.test`;

    // 1. Register
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'SecureAuthPassword123!',
        firstName: 'Neha',
        lastName: 'Kapoor',
        role: 'STUDENT',
      });
    expect(regRes.status).toBe(201);
    const refreshToken = regRes.body.data.tokens.refreshToken;
    let accessToken = regRes.body.data.tokens.accessToken;

    // 2. Access protected endpoint (GET /me)
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(email);

    // 3. Refresh token
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.tokens.accessToken).toBeDefined();
    accessToken = refreshRes.body.data.tokens.accessToken;

    // 4. Logout
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);
  });
});
