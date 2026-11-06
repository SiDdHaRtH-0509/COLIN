import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getAppPrismaClient,
  getAdminPrismaClient,
  getPrismaClientInfo,
  redactDatabaseUrl,
  initializeDatabaseConnections,
  shutdownDatabaseConnections,
  checkDatabaseHealth,
  executeTransaction,
  translateDatabaseError,
  UniqueConstraintViolationError,
  ForeignKeyViolationError,
  RecordNotFoundError,
  TransactionConflictError,
  DatabaseUnavailableError,
  DatabaseAuthorizationError,
  ValidationConstraintError,
  UserRepository,
  PropertyRepository,
  BedReservationRepository,
  LedgerRepository,
  AdminAuditRepository,
} from '../../server/database';
import {
  UserRoleType,
  PropertyType,
  PropertyGenderPolicy,
  PropertyVerificationStatus,
  JournalTransactionType,
  LedgerEntryType,
  AuditActionCategory,
  AuditSeverity,
  Prisma,
} from '@prisma/client';

/**
 * =============================================================================
 * COLIN — BACKEND DATABASE CONNECTIVITY & ORM INTEGRATION TEST SUITE
 * =============================================================================
 * Phase 4A.2.2.2 Backend Database Connectivity & ORM Integration
 *
 * Verifies live PostgreSQL 18.4 ORM integration, singleton lifecycle management,
 * least-privilege role separation (colin_app_runtime vs colin_admin_runtime),
 * centralized transaction rollbacks, domain error translation, and foundational
 * repository persistence operations.
 *
 * Zero mock objects. Zero placeholder assertions.
 * =============================================================================
 */

// Load .env if DATABASE_URL is not already exported in process.env
let resolvedDatabaseUrl = typeof process !== 'undefined' ? process.env?.DATABASE_URL : undefined;
if (!resolvedDatabaseUrl && typeof process !== 'undefined') {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const envPath = path.resolve(process.cwd ? process.cwd() : '.', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
      if (match) {
        resolvedDatabaseUrl = match[1];
        process.env.DATABASE_URL = resolvedDatabaseUrl;
      }
    }
  } catch {}
}

const isDatabaseConfigured = Boolean(resolvedDatabaseUrl && resolvedDatabaseUrl.trim() !== '');

describe.skipIf(!isDatabaseConfigured)('COLIN Phase 4A.2.2.2: Backend ORM & Database Integration', () => {
  const userRepo = new UserRepository();
  const propertyRepo = new PropertyRepository();
  const bedReservationRepo = new BedReservationRepository();
  const ledgerRepo = new LedgerRepository();
  const auditRepo = new AdminAuditRepository();

  beforeAll(async () => {
    // Verify connectivity on both roles before suite execution
    const conn = await initializeDatabaseConnections();
    expect(conn.appRuntimeConnected).toBe(true);
    expect(conn.adminRuntimeConnected).toBe(true);
  });

  afterAll(async () => {
    await shutdownDatabaseConnections();
  });

  // ===========================================================================
  // 1. DATABASE INFRASTRUCTURE & CONNECTION LIFECYCLE
  // ===========================================================================
  describe('1. Database Infrastructure & Connection Lifecycle', () => {
    it('enforces singleton instance identity across repeated calls for app runtime', () => {
      const client1 = getAppPrismaClient();
      const client2 = getAppPrismaClient();
      expect(client1).toBe(client2);
    });

    it('enforces singleton instance identity across repeated calls for admin runtime', () => {
      const client1 = getAdminPrismaClient();
      const client2 = getAdminPrismaClient();
      expect(client1).toBe(client2);
    });

    it('isolates app runtime client from admin runtime client into distinct instances', () => {
      const appClient = getAppPrismaClient();
      const adminClient = getAdminPrismaClient();
      expect(appClient).not.toBe(adminClient);
    });

    it('returns HEALTHY status and latency metrics from checkDatabaseHealth()', async () => {
      const health = await checkDatabaseHealth();
      expect(health.status).toBe('HEALTHY');
      expect(health.isAlive).toBe(true);
      expect(health.isReady).toBe(true);
      expect(health.roles.appRuntime.status).toBe('CONNECTED');
      expect(health.roles.adminRuntime.status).toBe('CONNECTED');
      expect(health.roles.appRuntime.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.roles.adminRuntime.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.metrics.configuredPoolMax).toBeGreaterThan(0);
    });

    it('redacts sensitive credentials from health check and diagnostic info', () => {
      const info = getPrismaClientInfo();
      expect(info.appRole).toBe('colin_app_runtime');
      expect(info.adminRole).toBe('colin_admin_runtime');
      expect(info.appEndpoint).toContain('<REDACTED>');
      expect(info.adminEndpoint).toContain('<REDACTED>');
      expect(info.appEndpoint).not.toContain('password');
      expect(info.adminEndpoint).not.toContain('password');
    });

    it('successfully connects and computes round-trip latency via initializeDatabaseConnections()', async () => {
      const conn = await initializeDatabaseConnections();
      expect(conn.appRuntimeConnected).toBe(true);
      expect(conn.adminRuntimeConnected).toBe(true);
      expect(conn.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // 2. SECURE CONFIGURATION & ERROR TRANSLATION
  // ===========================================================================
  describe('2. Secure Configuration & Error Translation', () => {
    it('safely redacts passwords and secrets in redactDatabaseUrl()', () => {
      const rawUrl = 'postgresql://admin_user:super_secret_p%40ss@db.colin.internal:5432/colin_prod?sslmode=require';
      const redacted = redactDatabaseUrl(rawUrl);
      expect(redacted).not.toContain('super_secret_p');
      expect(redacted).toContain('<REDACTED>');
      expect(redacted).toContain('admin_user:<REDACTED>@db.colin.internal:5432/colin_prod?sslmode=require');
    });

    it('maps Prisma P2002 to UniqueConstraintViolationError (HTTP 409)', () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
        message: 'Unique constraint failed on the fields: (`email`)',
      };
      const translated = translateDatabaseError(prismaError);
      expect(translated).toBeInstanceOf(UniqueConstraintViolationError);
      expect(translated.statusCode).toBe(409);
      expect(translated.code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
      expect(translated.message).toContain('email');
    });

    it('maps Prisma P2003 to ForeignKeyViolationError (HTTP 400)', () => {
      const prismaError = {
        code: 'P2003',
        meta: { field_name: 'owner_id' },
        message: 'Foreign key constraint failed on the field: `owner_id`',
      };
      const translated = translateDatabaseError(prismaError);
      expect(translated).toBeInstanceOf(ForeignKeyViolationError);
      expect(translated.statusCode).toBe(400);
      expect(translated.code).toBe('FOREIGN_KEY_VIOLATION');
    });

    it('maps Prisma P2025 to RecordNotFoundError (HTTP 404)', () => {
      const prismaError = {
        code: 'P2025',
        message: 'An operation failed because it depends on one or more records that were required but not found.',
      };
      const translated = translateDatabaseError(prismaError);
      expect(translated).toBeInstanceOf(RecordNotFoundError);
      expect(translated.statusCode).toBe(404);
      expect(translated.code).toBe('RECORD_NOT_FOUND');
    });

    it('maps Prisma P2024 to DatabaseUnavailableError (HTTP 503)', () => {
      const prismaError = {
        code: 'P2024',
        message: 'Timed out fetching a new connection from the connection pool.',
      };
      const translated = translateDatabaseError(prismaError);
      expect(translated).toBeInstanceOf(DatabaseUnavailableError);
      expect(translated.statusCode).toBe(503);
      expect(translated.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('maps Prisma P2028 to TransactionConflictError (HTTP 409)', () => {
      const prismaError = {
        code: 'P2028',
        message: 'Transaction already closed: could not perform query.',
      };
      const translated = translateDatabaseError(prismaError);
      expect(translated).toBeInstanceOf(TransactionConflictError);
      expect(translated.statusCode).toBe(409);
      expect(translated.code).toBe('TRANSACTION_CONFLICT');
    });

    it('maps PostgreSQL PL/pgSQL constraint violation to ValidationConstraintError (HTTP 422)', () => {
      const pgError = new Error('ERROR: COLIN Constraint Violation: Property already has the maximum allowed 8 photos');
      const translated = translateDatabaseError(pgError);
      expect(translated).toBeInstanceOf(ValidationConstraintError);
      expect(translated.statusCode).toBe(422);
      expect(translated.code).toBe('VALIDATION_CONSTRAINT_VIOLATION');
      expect(translated.message).toContain('Property already has the maximum allowed 8 photos');
    });

    it('maps PostgreSQL permission denied (42501) to DatabaseAuthorizationError (HTTP 403)', () => {
      const pgError = new Error('ERROR: permission denied for table admin_audit_logs');
      const translated = translateDatabaseError(pgError);
      expect(translated).toBeInstanceOf(DatabaseAuthorizationError);
      expect(translated.statusCode).toBe(403);
      expect(translated.code).toBe('DATABASE_AUTHORIZATION_DENIED');
    });
  });

  // ===========================================================================
  // 3. USER REPOSITORY (LIVE DATABASE)
  // ===========================================================================
  describe('3. UserRepository (Live PostgreSQL Engine)', () => {
    const testEmail = `student.test.${Date.now()}@colin.in`;
    let createdUserId: string;

    it('creates a new student user and linked user_profile in a single operation', async () => {
      const user = await userRepo.createUser({
        email: testEmail,
        passwordHash: '$2b$12$e80MvQ0J4gK8W2jCgqN6z.3q3a1U9v6Zg8bW5mF9yJ7hR3kT4l1rS',
        firstName: 'Aarav',
        lastName: 'Sharma',
        primaryRole: UserRoleType.STUDENT,
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.primaryRole).toBe(UserRoleType.STUDENT);
      createdUserId = user.id;
    });

    it('retrieves user by id with profile joined', async () => {
      const found = await userRepo.findById(createdUserId);
      expect(found).not.toBeNull();
      expect(found?.email).toBe(testEmail);
      expect((found as any)?.profile?.firstName).toBe('Aarav');
      expect((found as any)?.profile?.lastName).toBe('Sharma');
    });

    it('retrieves user by email address', async () => {
      const found = await userRepo.findByEmail(testEmail);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(createdUserId);
    });

    it('updates last login timestamp on user entity', async () => {
      const updated = await userRepo.updateLastLogin(createdUserId);
      expect(updated.lastLoginAt).not.toBeNull();
      expect(new Date(updated.lastLoginAt!).getTime()).toBeGreaterThan(0);
    });

    it('rejects duplicate user creation with identical email via UniqueConstraintViolationError', async () => {
      await expect(
        userRepo.createUser({
          email: testEmail,
          passwordHash: 'hash-dup',
          firstName: 'Duplicate',
          lastName: 'User',
        })
      ).rejects.toThrow(UniqueConstraintViolationError);
    });
  });

  // ===========================================================================
  // 4. PROPERTY REPOSITORY (LIVE DATABASE & 8-PHOTO LIMIT TRIGGER)
  // ===========================================================================
  describe('4. PropertyRepository (Live PostgreSQL Engine)', () => {
    const verifiedOwnerId = '00000000-0000-0000-0000-000000000002';
    const slug = `stay-test-${Date.now()}`;
    let createdPropId: string;

    it('creates an accommodation property attached to verified owner', async () => {
      const prop = await propertyRepo.createProperty({
        ownerId: verifiedOwnerId,
        name: 'Silicon Heights Residency',
        slug,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '42 Tech Park Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560100',
        description: 'Modern student coliving space near campuses.',
      });

      expect(prop).toBeDefined();
      expect(prop.id).toBeDefined();
      expect(prop.slug).toBe(slug);
      expect(prop.city).toBe('Bengaluru');
      createdPropId = prop.id;
    });

    it('retrieves property by id and by slug', async () => {
      const byId = await propertyRepo.findById(createdPropId);
      expect(byId).not.toBeNull();
      expect(byId?.id).toBe(createdPropId);

      const bySlug = await propertyRepo.findBySlug(slug);
      expect(bySlug).not.toBeNull();
      expect(bySlug?.id).toBe(createdPropId);
    });

    it('allows inserting up to 8 photos for a property', async () => {
      for (let i = 1; i <= 8; i++) {
        const photo = await propertyRepo.addPhoto(createdPropId, {
          photoStorageUrl: `https://storage.colin.in/photos/${createdPropId}/photo-${i}.jpg`,
          displayOrder: i,
          isCover: i === 1,
          caption: `View ${i}`,
        });
        expect(photo.id).toBeDefined();
        expect(photo.displayOrder).toBe(i);
      }

      const count = await propertyRepo.getPhotoCount(createdPropId);
      expect(count).toBe(8);
    });

    it('rejects 9th photo insertion via PostgreSQL trigger trg_enforce_property_photo_limit', async () => {
      await expect(
        propertyRepo.addPhoto(createdPropId, {
          photoStorageUrl: `https://storage.colin.in/photos/${createdPropId}/photo-9.jpg`,
          displayOrder: 9,
          caption: 'Exceeding limit',
        })
      ).rejects.toThrow(ValidationConstraintError);

      const count = await propertyRepo.getPhotoCount(createdPropId);
      expect(count).toBe(8);
    });

    it('queries verified listings with filter criteria', async () => {
      const results = await propertyRepo.findVerifiedListings({
        city: 'Bengaluru',
        status: PropertyVerificationStatus.DRAFT, // Created test property is draft
        limit: 5,
      });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((p) => p.id === createdPropId)).toBe(true);
    });
  });

  // ===========================================================================
  // 5. BED RESERVATION REPOSITORY (LIVE DATABASE & EXCLUSION CONSTRAINT)
  // ===========================================================================
  describe('5. BedReservationRepository (Live PostgreSQL Engine)', () => {
    const studentId = '00000000-0000-0000-0000-000000000001';
    const bedId = '00000000-0000-0000-0000-000000000005';
    let holdId: string;

    // Clean up any stale reservations on this test bed before starting
    beforeAll(async () => {
      const appClient = getAppPrismaClient();
      await appClient.bedReservation.deleteMany({
        where: { bedId },
      });
    });

    it('creates a temporary hold on an available bed', async () => {
      const hold = await bedReservationRepo.createHold({
        bedId,
        studentId,
        holdDurationHours: 1,
      });

      expect(hold).toBeDefined();
      expect(hold.id).toBeDefined();
      expect(hold.bedId).toBe(bedId);
      expect(hold.status).toBe('TEMPORARY_HOLD');
      expect(hold.holdExpiresAt).not.toBeNull();
      holdId = hold.id;
    });

    it('finds active reservation for the held bed', async () => {
      const active = await bedReservationRepo.findActiveByBedId(bedId);
      expect(active).not.toBeNull();
      expect(active?.id).toBe(holdId);
      expect(active?.status).toBe('TEMPORARY_HOLD');
    });

    it('rejects concurrent active hold on the same bed via partial unique index uq_active_bed_reservation', async () => {
      await expect(
        bedReservationRepo.createHold({
          bedId,
          studentId: '00000000-0000-0000-0000-000000000009',
          holdDurationHours: 1,
        })
      ).rejects.toThrow(UniqueConstraintViolationError);
    });

    it('confirms the reservation successfully', async () => {
      const confirmed = await bedReservationRepo.confirmReservation(holdId);
      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.confirmedAt).not.toBeNull();
      expect(confirmed.holdExpiresAt).toBeNull();
    });

    it('executes expire_stale_bed_reservations() stored procedure without error', async () => {
      const expiredCount = await bedReservationRepo.expireStaleReservations();
      expect(typeof expiredCount).toBe('number');
      expect(expiredCount).toBeGreaterThanOrEqual(0);
    });

    afterAll(async () => {
      const appClient = getAppPrismaClient();
      await appClient.bedReservation.deleteMany({
        where: { bedId },
      });
    });
  });

  // ===========================================================================
  // 6. LEDGER REPOSITORY (LIVE DATABASE & DOUBLE-ENTRY IMMUTABILITY)
  // ===========================================================================
  describe('6. LedgerRepository (Live PostgreSQL Engine)', () => {
    const clearingAccountId = '00000000-0000-0000-0000-000000000006';
    const revenueAccountId = '00000000-0000-0000-0000-000000000007';
    const txNum = `TX-ORM-${Date.now()}`;
    const idempKey = `idemp-orm-${Date.now()}`;
    let postedTxId: string;

    it('creates a draft balanced double-entry transaction', async () => {
      const tx = await ledgerRepo.createDraftTransaction({
        transactionNumber: txNum,
        transactionType: JournalTransactionType.VISIT_FEE_COLLECTION,
        description: 'Student Platform Visit Fee Booking',
        idempotencyKey: idempKey,
        entries: [
          {
            accountId: clearingAccountId,
            entryType: LedgerEntryType.DEBIT,
            amount: 500.0,
          },
          {
            accountId: revenueAccountId,
            entryType: LedgerEntryType.CREDIT,
            amount: 500.0,
          },
        ],
      });

      expect(tx).toBeDefined();
      expect(tx.id).toBeDefined();
      expect(tx.status).toBe('DRAFT');
      expect(tx.entries).toHaveLength(2);
      postedTxId = tx.id;
    });

    it('retrieves transaction by id with entries included', async () => {
      const found = await ledgerRepo.findById(postedTxId);
      expect(found).not.toBeNull();
      expect(found?.transactionNumber).toBe(txNum);
      expect(found?.entries).toHaveLength(2);
    });

    it('posts the balanced transaction successfully via postTransaction()', async () => {
      const posted = await ledgerRepo.postTransaction(postedTxId);
      expect(posted.status).toBe('POSTED');
      expect(posted.postedAt).not.toBeNull();
    });

    it('rejects posting an unbalanced transaction via PostgreSQL balance trigger', async () => {
      const badTxNum = `TX-BAD-${Date.now()}`;
      const badIdemp = `idemp-bad-${Date.now()}`;

      const unbalTx = await ledgerRepo.createDraftTransaction({
        transactionNumber: badTxNum,
        transactionType: JournalTransactionType.VISIT_FEE_COLLECTION,
        description: 'Unbalanced Transaction Test',
        idempotencyKey: badIdemp,
        entries: [
          {
            accountId: clearingAccountId,
            entryType: LedgerEntryType.DEBIT,
            amount: 500.0,
          },
          {
            accountId: revenueAccountId,
            entryType: LedgerEntryType.CREDIT,
            amount: 450.0, // Difference of 50
          },
        ],
      });

      await expect(ledgerRepo.postTransaction(unbalTx.id)).rejects.toThrow(ValidationConstraintError);
    });

    it('reverses a posted transaction via PostgreSQL procedure reverse_ledger_transaction()', async () => {
      const revTxNum = `REV-${Date.now()}`;
      const reversalId = await ledgerRepo.reverseTransaction(postedTxId, 'Student visit canceled', revTxNum);
      expect(reversalId).toBeDefined();

      const origTx = await ledgerRepo.findById(postedTxId);
      expect(origTx?.status).toBe('REVERSED');

      const revTx = await ledgerRepo.findById(reversalId);
      expect(revTx?.status).toBe('POSTED');
      expect(revTx?.reversesTransactionId).toBe(postedTxId);
      expect(revTx?.entries).toHaveLength(2);
    });

    it('computes ledger account balance dynamically via getAccountBalance()', async () => {
      const balance = await ledgerRepo.getAccountBalance(clearingAccountId);
      expect(balance).toBeDefined();
      expect(balance instanceof Prisma.Decimal).toBe(true);
    });
  });

  // ===========================================================================
  // 7. ADMIN AUDIT REPOSITORY (LIVE DATABASE & colin_admin_runtime)
  // ===========================================================================
  describe('7. AdminAuditRepository (colin_admin_runtime & Immutability)', () => {
    const adminId = '00000000-0000-0000-0000-000000000003';
    let auditLogId: string;

    beforeAll(async () => {
      const adminClient = getAdminPrismaClient();
      await adminClient.adminAccount.upsert({
        where: { id: adminId },
        update: {},
        create: {
          id: adminId,
          username: 'audit_test_admin',
          email: 'audit.admin@colin.in',
          fullName: 'Audit Admin Officer',
          passwordHash: '$2b$12$e80MvQ0J4gK8W2jCgqN6z.3q3a1U9v6Zg8bW5mF9yJ7hR3kT4l1rS',
        },
      });
    });

    it('logs an administrative audit action using colin_admin_runtime', async () => {
      const log = await auditRepo.logAction({
        adminId,
        actionCategory: AuditActionCategory.PROPERTY_VERIFICATION,
        action: 'PROPERTY_AUDIT_APPROVED',
        targetEntity: 'Property',
        targetEntityId: '00000000-0000-0000-0000-000000000080',
        ipAddress: '192.168.1.100',
        userAgent: 'COLIN-AdminClient/1.0',
        severity: AuditSeverity.MEDIUM,
        detailsJson: { reason: 'On-site verification passed with distinction' },
      });

      expect(log).toBeDefined();
      expect(log.id).toBeDefined();
      expect(log.actionCategory).toBe(AuditActionCategory.PROPERTY_VERIFICATION);
      expect(log.recordedAt).toBeDefined();
      auditLogId = log.id;
    });

    it('queries recent audit logs with category filtering', async () => {
      const logs = await auditRepo.findRecentLogs({
        category: AuditActionCategory.PROPERTY_VERIFICATION,
        limit: 10,
      });

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.id === auditLogId)).toBe(true);
    });

    it('strictly prohibits UPDATE or DELETE on admin_audit_logs via immutability trigger', async () => {
      const adminClient = getAdminPrismaClient();

      // Attempting to update recorded audit log must fail
      await expect(
        adminClient.adminAuditLog.update({
          where: { id: auditLogId },
          data: { action: 'MUTATED_ACTION' },
        })
      ).rejects.toThrow();

      // Attempting to delete recorded audit log must fail
      await expect(
        adminClient.adminAuditLog.delete({
          where: { id: auditLogId },
        })
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // 8. TRANSACTION INTEGRITY & ATOMIC ROLLBACK
  // ===========================================================================
  describe('8. Transaction Integrity & Atomic Rollback (executeTransaction)', () => {
    it('commits all multi-repository operations atomically upon success', async () => {
      const txEmail = `tx.success.${Date.now()}@colin.in`;
      const txSlug = `tx-slug-success-${Date.now()}`;

      const result = await executeTransaction(async (tx) => {
        const u = await userRepo.createUser(
          {
            email: txEmail,
            passwordHash: 'hash-tx',
            firstName: 'Karan',
            lastName: 'Malhotra',
            primaryRole: UserRoleType.STUDENT,
          },
          tx
        );

        const p = await propertyRepo.createProperty(
          {
            ownerId: '00000000-0000-0000-0000-000000000002',
            name: 'Karan Residency',
            slug: txSlug,
            propertyType: PropertyType.HOSTEL,
            genderPolicy: PropertyGenderPolicy.BOYS_ONLY,
            addressLine1: '12 College Rd',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560001',
          },
          tx
        );

        return { userId: u.id, propId: p.id };
      });

      expect(result.userId).toBeDefined();
      expect(result.propId).toBeDefined();

      // Verify both records persisted in the database
      const foundUser = await userRepo.findById(result.userId);
      const foundProp = await propertyRepo.findById(result.propId);
      expect(foundUser).not.toBeNull();
      expect(foundProp).not.toBeNull();
    });

    it('rolls back all operations atomically when an error occurs inside transaction', async () => {
      const rollbackEmail = `tx.rollback.${Date.now()}@colin.in`;
      let createdUserIdInsideTx: string | undefined;

      await expect(
        executeTransaction(async (tx) => {
          const u = await userRepo.createUser(
            {
              email: rollbackEmail,
              passwordHash: 'hash-rb',
              firstName: 'Rollback',
              lastName: 'Tester',
            },
            tx
          );
          createdUserIdInsideTx = u.id;

          // Intentionally throw an error mid-transaction
          throw new Error('Simulated business validation failure mid-transaction');
        })
      ).rejects.toThrow();

      // Verify created user was rolled back and does not exist in PostgreSQL
      expect(createdUserIdInsideTx).toBeDefined();
      const checkUser = await userRepo.findById(createdUserIdInsideTx!);
      expect(checkUser).toBeNull();
    });
  });

  // ===========================================================================
  // 9. RUNTIME ROLE SEPARATION & LEAST-PRIVILEGE ENFORCEMENT
  // ===========================================================================
  describe('9. Least-Privilege Role Separation (colin_app_runtime vs colin_admin_runtime)', () => {
    it('prohibits colin_app_runtime from querying admin_audit_logs table (permission denied)', async () => {
      const appClient = getAppPrismaClient();

      await expect(
        appClient.adminAuditLog.findMany({
          take: 5,
        })
      ).rejects.toThrow();
    });

    it('prohibits colin_app_runtime from writing to admin_audit_logs table', async () => {
      const appClient = getAppPrismaClient();

      await expect(
        appClient.adminAuditLog.create({
          data: {
            actionCategory: AuditActionCategory.AUTH_LOGIN,
            action: 'ILLEGAL_APP_WRITE',
            targetEntity: 'System',
            ipAddress: '127.0.0.1',
          },
        })
      ).rejects.toThrow();
    });

    it('authorizes colin_admin_runtime to query and write to admin_audit_logs table', async () => {
      const adminClient = getAdminPrismaClient();

      const created = await adminClient.adminAuditLog.create({
        data: {
          actionCategory: AuditActionCategory.AUTH_LOGIN,
          action: 'AUTHORIZED_ADMIN_WRITE',
          targetEntity: 'System',
          ipAddress: '127.0.0.1',
        },
      });

      expect(created.id).toBeDefined();

      const queried = await adminClient.adminAuditLog.findMany({
        where: { id: created.id },
      });
      expect(queried).toHaveLength(1);
    });
  });
});
