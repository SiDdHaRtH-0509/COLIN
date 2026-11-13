import pg from 'pg';

const { Client } = pg;
const devDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:colin_dev_secret_2026!@localhost:5434/colin?schema=public';
const testDbUrl = 'postgresql://postgres:colin_dev_secret_2026!@localhost:5434/colin_test?schema=public';

async function seedAdmin(url, dbName) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`
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
    `);
    console.log(`[SETUP-DB] Seeded super admin account in ${dbName}`);
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
