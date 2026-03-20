import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

export default async function globalSetup() {
  const psqlEnv = {
    ...process.env,
    PGPASSWORD: 'safedify_pass',
  };
  const psql = 'psql -h localhost -U safedify_user -d safedify';

  // Drop tables owned by safedify_user + truncate postgres-owned tables
  try {
    execSync(
      `${psql} -c "DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public') LOOP IF r.tableowner = current_user THEN EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE'; ELSE EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE'; END IF; END LOOP; END $$;"`,
      { stdio: 'inherit', env: psqlEnv }
    );
  } catch (err) {
    console.error('Warning: table cleanup had errors (continuing):', (err as any).message);
  }

  // Apply the full schema (uses IF NOT EXISTS for safety)
  try {
    execSync(`${psql} -f server/postgres-schema.sql`, {
      stdio: 'inherit',
      env: psqlEnv,
    });
  } catch (err) {
    console.error('Failed to initialize PostgreSQL schema:', err);
    process.exit(1);
  }

  // Patch postgres-owned tables that may be missing columns
  try {
    execSync(
      `${psql} -c "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS org_id UUID;"`,
      { stdio: 'inherit', env: psqlEnv }
    );
  } catch {
    // audit_logs.org_id is non-critical — writes already catch errors
  }

  // Seed demo users directly (server seed runs before globalSetup, so we must seed here)
  try {
    const hash = bcrypt.hashSync('admin123', 12);
    const adminId = randomUUID();
    const workerId = randomUUID();
    const supervisorId = randomUUID();
    const orgId = randomUUID();

    const seedSql = `
      INSERT INTO users (id, name, email, password_hash, role, tier, avatar, org_id, email_verified, must_change_password, password_changed_at)
      VALUES
        ('${adminId}', 'John Doe', 'admin@safedify.com', '${hash}', 'Admin', 'Enterprise', 'JD', NULL, TRUE, FALSE, NOW()),
        ('${workerId}', 'Robert Fox', 'worker@safedify.com', '${hash}', 'Worker', 'Pro', 'RF', NULL, TRUE, FALSE, NOW()),
        ('${supervisorId}', 'Sarah Connor', 'supervisor@safedify.com', '${hash}', 'HSE Supervisor', 'Pro', 'SC', NULL, TRUE, FALSE, NOW())
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO organizations (id, name, slug, plan, owner_id)
      VALUES ('${orgId}', 'Demo Organization', 'demo', 'Enterprise', '${adminId}')
      ON CONFLICT (slug) DO NOTHING;

      UPDATE users SET org_id = (SELECT id FROM organizations WHERE slug = 'demo')
      WHERE email IN ('admin@safedify.com', 'worker@safedify.com', 'supervisor@safedify.com') AND org_id IS NULL;
    `;

    execSync(`${psql} -c "${seedSql.replace(/\n/g, ' ')}"`, {
      stdio: 'inherit',
      env: psqlEnv,
    });
    console.log('[GlobalSetup] Seeded demo users + org');
  } catch (err) {
    console.error('[GlobalSetup] Failed to seed demo users:', (err as any).message);
  }
}
