import pg from 'pg';

const { Client } = pg;
const devDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:colin_dev_secret_2026!@localhost:5434/colin?schema=public';
const testDbUrl = 'postgresql://postgres:colin_dev_secret_2026!@localhost:5434/colin_test?schema=public';

async function seedAdmin(url, dbName) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`
      INSERT INTO admin_roles (id, code, name, description, is_system_role, created_at)
      VALUES 
        (gen_random_uuid(), 'SUPER_ADMIN', 'Super Administrator', 'Full platform operational and security authority', true, NOW()),
        (gen_random_uuid(), 'OPERATIONS_ADMIN', 'Operations Administrator', 'Visit coordination and operations', true, NOW()),
        (gen_random_uuid(), 'VERIFICATION_MANAGER', 'Verification Manager', 'Property inspection and certification', true, NOW()),
        (gen_random_uuid(), 'FINANCE_ADMIN', 'Finance Administrator', 'Financial reports, payments and refunds', true, NOW()),
        (gen_random_uuid(), 'STUDENT_SUPPORT', 'Student Support Specialist', 'Student tickets and inquiries', true, NOW()),
        (gen_random_uuid(), 'OWNER_SUPPORT', 'Owner Support Specialist', 'Host onboarding and property assistance', true, NOW()),
        (gen_random_uuid(), 'MARKETING_ADMIN', 'Marketing Administrator', 'Campaigns and promotions', true, NOW())
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO admin_accounts (
        id, username, email, full_name, password_hash, status, is_mfa_enforced, failed_login_attempts, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        'superadmin',
        'admin@colin.in',
        'COLIN Master Admin',
        '$2b$10$J9jJaHDOc14w7yzL62/Mi.cv7RoNj10e0S8qwpUjv5RdgJ9nfz.86',
        'ACTIVE',
        false,
        0,
        NOW(),
        NOW()
      ) ON CONFLICT (id) DO NOTHING;

      INSERT INTO admin_user_roles (admin_id, role_id, assigned_at)
      SELECT '00000000-0000-0000-0000-000000000001', id, NOW()
      FROM admin_roles WHERE code = 'SUPER_ADMIN'
      ON CONFLICT DO NOTHING;

      GRANT SELECT, INSERT, UPDATE, DELETE ON 
        email_verification_tokens, email_outbox, email_suppressions 
      TO colin_app_runtime;

      GRANT SELECT, INSERT, UPDATE ON 
        email_verification_tokens, email_outbox, email_suppressions 
      TO colin_admin_runtime;
    `);
    console.log(`[SETUP-DB] Seeded super admin account and roles in ${dbName}`);
  } finally {
    await client.end();
  }
}

async function main() {
  const client = new Client({ connectionString: devDbUrl });
  await client.connect();
  try {
    await client.query(`
      ALTER ROLE colin_admin_runtime WITH PASSWORD 'colin_dev_secret_2026!';
      ALTER ROLE colin_app_runtime WITH PASSWORD 'colin_dev_secret_2026!';
      ALTER ROLE colin_migrator WITH PASSWORD 'colin_dev_secret_2026!';
      GRANT CONNECT ON DATABASE colin TO colin_admin_runtime, colin_app_runtime, colin_migrator;
      GRANT CONNECT ON DATABASE colin_test TO colin_admin_runtime, colin_app_runtime, colin_migrator;
    `);
    console.log('[SETUP-DB] Passwords and connect privileges configured on database roles successfully!');
  } finally {
    await client.end();
  }

  await seedAdmin(devDbUrl, 'colin');
  await seedAdmin(testDbUrl, 'colin_test');
}

main().catch((err) => {
  console.error('[SETUP-DB FATAL]', err);
  process.exit(1);
});
