/**
 * COLIN — Owner Profile Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

import { generateUserFixtureSql } from './user.fixture';

export interface CreateOwnerOptions {
  userId?: string;
  businessName?: string;
  panNumber?: string;
}

export function generateOwnerFixtureSql(options: CreateOwnerOptions = {}) {
  const user = generateUserFixtureSql({
    id: options.userId,
    primaryRole: 'OWNER',
    firstName: 'Property',
    lastName: 'Owner',
  });

  const businessName = options.businessName || 'Colin Prime Stays Pvt Ltd';
  const panNumber = options.panNumber || 'ABCDE1234F';

  const ownerSql = `
    ${user.userSql}
    ${user.profileSql}
    INSERT INTO owner_profiles (user_id, business_name, pan_number, verification_status, business_structure, tier, created_at, updated_at)
    VALUES ('${user.id}', '${businessName}', '${panNumber}', 'VERIFIED', 'PRIVATE_LIMITED', 'VERIFIED_PARTNER', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  `;

  const cleanupSql = `
    DELETE FROM owner_profiles WHERE user_id = '${user.id}';
    ${user.cleanupSql}
  `;

  return { ownerId: user.id, ownerSql, cleanupSql };
}
