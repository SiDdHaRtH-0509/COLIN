/**
 * COLIN — User & UserProfile Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

export interface CreateUserOptions {
  id?: string;
  email?: string;
  phone?: string;
  primaryRole?: 'STUDENT' | 'OWNER' | 'VOLUNTEER' | 'ADMIN';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  firstName?: string;
  lastName?: string;
}

export function generateUserFixtureSql(options: CreateUserOptions = {}) {
  const id = options.id || `00000000-0000-0000-0001-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const email = options.email || `test-${id.substring(24)}@colin.in`;
  const phone = options.phone || `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const primaryRole = options.primaryRole || 'STUDENT';
  const status = options.status || 'ACTIVE';
  const firstName = options.firstName || 'Test';
  const lastName = options.lastName || 'User';

  const userSql = `
    INSERT INTO users (id, email, phone, password_hash, primary_role, status, created_at, updated_at)
    VALUES ('${id}', '${email}', '${phone}', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash$dummyhash', '${primaryRole}', '${status}', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `;

  const profileSql = `
    INSERT INTO user_profiles (user_id, first_name, last_name, created_at, updated_at)
    VALUES ('${id}', '${firstName}', '${lastName}', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  `;

  const cleanupSql = `DELETE FROM users WHERE id = '${id}';`;

  return { id, email, phone, userSql, profileSql, cleanupSql };
}
