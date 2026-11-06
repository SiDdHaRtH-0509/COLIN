/**
 * COLIN User Repository
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Handles database operations for User accounts, profiles, and role lookups.
 */

import { User, Prisma, UserRoleType } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateUserData {
  email: string;
  phone?: string;
  passwordHash: string;
  primaryRole?: UserRoleType;
  firstName: string;
  lastName?: string;
}

export class UserRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Finds a user by ID with optional profile joins.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.user.findUnique({
        where: { id },
        include: {
          profile: true,
          studentProfile: true,
          ownerProfile: true,
        },
      });
    });
  }

  /**
   * Finds a user by email address.
   */
  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.user.findUnique({
        where: { email },
        include: {
          profile: true,
          studentProfile: true,
          ownerProfile: true,
        },
      });
    });
  }

  /**
   * Creates a new user with associated UserProfile in a single operation.
   */
  async createUser(data: CreateUserData, tx?: Prisma.TransactionClient): Promise<User> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          phone: data.phone,
          passwordHash: data.passwordHash,
          primaryRole: data.primaryRole || UserRoleType.STUDENT,
          profile: {
            create: {
              firstName: data.firstName,
              lastName: data.lastName || '',
            },
          },
        },
        include: {
          profile: true,
        },
      });
    });
  }

  /**
   * Updates last login timestamp for audit tracking.
   */
  async updateLastLogin(id: string, tx?: Prisma.TransactionClient): Promise<User> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    });
  }
}
