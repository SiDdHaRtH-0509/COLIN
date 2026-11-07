/**
 * COLIN Student Repository
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Data access layer for student profiles, academic information, and accommodation preferences.
 */

import { StudentProfile, StudentPreference, Prisma, RoomType } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { getAppPrismaClient } from '../prisma';

export interface UpdateStudentProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  collegeName?: string;
  course?: string;
  batchYear?: number;
  studentIdCardUrl?: string;
}

export interface UpdateStudentPreferencesData {
  preferredLocation?: string;
  maxBudget?: number | Prisma.Decimal;
  preferredRoomType?: RoomType;
  foodPreference?: string;
  lifestyleHabits?: Record<string, unknown>;
}

export interface StudentProfileWithRelations extends StudentProfile {
  user: {
    id: string;
    email: string;
    phone: string | null;
    profile: {
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
  preferences: StudentPreference | null;
}

export interface ProfileCompletionStatus {
  isComplete: boolean;
  completionPercentage: number;
  completedFields: string[];
  missingFields: string[];
}

export class StudentRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Retrieves student profile by user ID with linked UserProfile and StudentPreference.
   */
  async findProfileByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<StudentProfileWithRelations | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.studentProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          preferences: true,
        },
      });
    });
  }

  /**
   * Updates student personal and academic profile in a transaction.
   */
  async updateProfile(
    userId: string,
    data: UpdateStudentProfileData,
    tx?: Prisma.TransactionClient
  ): Promise<StudentProfileWithRelations> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        // 1. Update personal name/avatar if provided
        if (data.firstName !== undefined || data.lastName !== undefined) {
          await prismaTx.userProfile.upsert({
            where: { userId },
            create: {
              userId,
              firstName: data.firstName || 'Student',
              lastName: data.lastName || '',
            },
            update: {
              ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
              ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
            },
          });
        }

        // 2. Update phone on base User table if provided
        if (data.phone !== undefined) {
          await prismaTx.user.update({
            where: { id: userId },
            data: { phone: data.phone },
          });
        }

        // 3. Update StudentProfile academic fields
        const studentUpdate: Prisma.StudentProfileUpdateInput = {};
        if (data.collegeName !== undefined) studentUpdate.collegeName = data.collegeName;
        if (data.course !== undefined) studentUpdate.course = data.course;
        if (data.batchYear !== undefined) studentUpdate.batchYear = data.batchYear;
        if (data.studentIdCardUrl !== undefined) studentUpdate.studentIdCardUrl = data.studentIdCardUrl;

        await prismaTx.studentProfile.update({
          where: { userId },
          data: studentUpdate,
        });

        // 4. Return updated profile
        return prismaTx.studentProfile.findUniqueOrThrow({
          where: { userId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            preferences: true,
          },
        });
      };

      if (tx) {
        return executeInTx(tx);
      }
      const client = getAppPrismaClient();
      return client.$transaction(executeInTx);
    });
  }

  /**
   * Updates or creates student accommodation preferences.
   */
  async updatePreferences(
    userId: string,
    preferences: UpdateStudentPreferencesData,
    tx?: Prisma.TransactionClient
  ): Promise<StudentPreference> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const budgetDecimal = preferences.maxBudget !== undefined
        ? new Prisma.Decimal(preferences.maxBudget.toString())
        : undefined;

      return client.studentPreference.upsert({
        where: { studentId: userId },
        create: {
          studentId: userId,
          preferredLocation: preferences.preferredLocation || null,
          maxBudget: budgetDecimal || null,
          preferredRoomType: preferences.preferredRoomType || null,
          foodPreference: preferences.foodPreference || null,
          lifestyleHabits: preferences.lifestyleHabits ? (preferences.lifestyleHabits as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
        update: {
          ...(preferences.preferredLocation !== undefined ? { preferredLocation: preferences.preferredLocation } : {}),
          ...(budgetDecimal !== undefined ? { maxBudget: budgetDecimal } : {}),
          ...(preferences.preferredRoomType !== undefined ? { preferredRoomType: preferences.preferredRoomType } : {}),
          ...(preferences.foodPreference !== undefined ? { foodPreference: preferences.foodPreference } : {}),
          ...(preferences.lifestyleHabits !== undefined
            ? { lifestyleHabits: preferences.lifestyleHabits as Prisma.InputJsonValue }
            : {}),
        },
      });
    });
  }

  /**
   * Calculates profile completion status.
   */
  async calculateCompletionStatus(userId: string, tx?: Prisma.TransactionClient): Promise<ProfileCompletionStatus> {
    const profile = await this.findProfileByUserId(userId, tx);
    if (!profile) {
      return {
        isComplete: false,
        completionPercentage: 0,
        completedFields: [],
        missingFields: ['profile'],
      };
    }

    const fieldChecks: Record<string, boolean> = {
      firstName: Boolean(profile.user.profile?.firstName && profile.user.profile.firstName !== 'Student'),
      lastName: Boolean(profile.user.profile?.lastName),
      phone: Boolean(profile.user.phone),
      collegeName: Boolean(profile.collegeName && profile.collegeName !== 'Not Specified'),
      course: Boolean(profile.course),
      batchYear: Boolean(profile.batchYear),
      preferredLocation: Boolean(profile.preferences?.preferredLocation),
      maxBudget: Boolean(profile.preferences?.maxBudget),
      preferredRoomType: Boolean(profile.preferences?.preferredRoomType),
    };

    const completedFields = Object.keys(fieldChecks).filter((k) => fieldChecks[k]);
    const missingFields = Object.keys(fieldChecks).filter((k) => !fieldChecks[k]);
    const totalFields = Object.keys(fieldChecks).length;
    const completionPercentage = Math.round((completedFields.length / totalFields) * 100);

    return {
      isComplete: missingFields.length === 0,
      completionPercentage,
      completedFields,
      missingFields,
    };
  }
}
