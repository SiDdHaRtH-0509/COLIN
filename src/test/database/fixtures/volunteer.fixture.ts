/**
 * COLIN — Volunteer Profile Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

import { generateUserFixtureSql } from './user.fixture';

export interface CreateVolunteerOptions {
  userId?: string;
  campusName?: string;
}

export function generateVolunteerFixtureSql(options: CreateVolunteerOptions = {}) {
  const user = generateUserFixtureSql({
    id: options.userId,
    primaryRole: 'VOLUNTEER',
    firstName: 'Campus',
    lastName: 'Volunteer',
  });

  const campusName = options.campusName || 'North Campus University';

  const volunteerSql = `
    ${user.userSql}
    ${user.profileSql}
    INSERT INTO volunteer_profiles (user_id, campus_name, status, created_at, updated_at)
    VALUES ('${user.id}', '${campusName}', 'ACTIVE', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  `;

  const cleanupSql = `
    DELETE FROM volunteer_profiles WHERE user_id = '${user.id}';
    ${user.cleanupSql}
  `;

  return { volunteerId: user.id, volunteerSql, cleanupSql };
}
