/**
 * COLIN Student Domain Service
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { StudentRepository, UpdateStudentProfileData, UpdateStudentPreferencesData } from '../database/repositories/StudentRepository';
import { RecordNotFoundError } from '../database/errors';

export class StudentService {
  private studentRepo: StudentRepository;

  constructor() {
    this.studentRepo = new StudentRepository();
  }

  /**
   * Retrieves own student profile.
   */
  async getProfile(userId: string) {
    const profile = await this.studentRepo.findProfileByUserId(userId);
    if (!profile) {
      throw new RecordNotFoundError('Student profile not found.');
    }

    return {
      userId: profile.userId,
      email: profile.user.email,
      phone: profile.user.phone,
      firstName: profile.user.profile?.firstName || '',
      lastName: profile.user.profile?.lastName || '',
      avatarUrl: profile.user.profile?.avatarUrl || null,
      collegeName: profile.collegeName,
      course: profile.course,
      batchYear: profile.batchYear,
      studentIdCardUrl: profile.studentIdCardUrl,
      verificationStatus: profile.verificationStatus,
      verifiedAt: profile.verifiedAt,
      preferences: profile.preferences
        ? {
            preferredLocation: profile.preferences.preferredLocation,
            maxBudget: profile.preferences.maxBudget ? Number(profile.preferences.maxBudget) : null,
            preferredRoomType: profile.preferences.preferredRoomType,
            foodPreference: profile.preferences.foodPreference,
            lifestyleHabits: profile.preferences.lifestyleHabits,
          }
        : null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Updates student personal and academic information, and preferences if provided.
   */
  async updateProfile(
    userId: string,
    data: UpdateStudentProfileData & { preferences?: UpdateStudentPreferencesData }
  ) {
    // 1. Update personal & academic profile
    await this.studentRepo.updateProfile(userId, {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      collegeName: data.collegeName,
      course: data.course,
      batchYear: data.batchYear,
      studentIdCardUrl: data.studentIdCardUrl,
    });

    // 2. Update preferences if present
    if (data.preferences) {
      await this.studentRepo.updatePreferences(userId, data.preferences);
    }

    return this.getProfile(userId);
  }

  /**
   * Retrieves profile completion metrics.
   */
  async getCompletionStatus(userId: string) {
    return this.studentRepo.calculateCompletionStatus(userId);
  }
}

export const studentService = new StudentService();
