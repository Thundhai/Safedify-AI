import { Pool, PoolConfig } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Vercel-Supabase integration sets POSTGRES_URL; support both that and DATABASE_URL
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

// ============================================================
// Network restriction: Allowed database hosts
// ============================================================
// Only allow connections to known private/local network addresses.
// Public internet hostnames are permitted ONLY for managed cloud
// services (Supabase, Neon, RDS) which enforce their own firewalls.
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/, // IPv4 loopback
  /^::1$/,                  // IPv6 loopback
  /^10\.\d+\.\d+\.\d+$/,  // RFC 1918 Class A
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // RFC 1918 Class B
  /^192\.168\.\d+\.\d+$/,  // RFC 1918 Class C
  /^host\.docker\.internal$/i,
  /^db$/i,                   // Docker Compose service name
];

// Managed cloud DB hostnames are allowed (they restrict access via their own firewalls/VPCs)
const CLOUD_DB_PATTERNS = [
  /\.supabase\.co$/i,
  /\.supabase\.com$/i,
  /\.neon\.tech$/i,
  /\.rds\.amazonaws\.com$/i,
  /\.database\.azure\.com$/i,
  /\.cloudsql\.google\.com$/i,
  /\.railway\.app$/i,
  /\.render\.com$/i,
];

function isAllowedDbHost(host: string): boolean {
  if (!host) return false;
  // Explicitly allowed via env var (escape hatch for custom setups)
  const allowed = process.env.PG_ALLOWED_HOSTS?.split(',').map(h => h.trim());
  if (allowed?.includes(host)) return true;
  // Private/local addresses
  if (PRIVATE_HOST_PATTERNS.some(p => p.test(host))) return true;
  // Managed cloud providers
  if (CLOUD_DB_PATTERNS.some(p => p.test(host))) return true;
  return false;
}

function extractHostFromConnectionString(connStr: string): string | null {
  try {
    const url = new URL(connStr);
    return url.hostname;
  } catch {
    const match = connStr.match(/@([^:/]+)/);
    return match?.[1] || null;
  }
}

/**
 * PostgreSQL Connection Configuration
 * 
 * SECURITY NOTES:
 * - In production, always use SSL (ssl: { rejectUnauthorized: true })
 * - Use environment variables for all credentials
 * - Restrict database user permissions to minimum required
 * - Do NOT expose database port to public internet
 * - Use connection pooling to prevent connection exhaustion attacks
 * - Database host is validated against an allowlist of private/cloud addresses
 */

// Validate database host before creating pool
if (isProduction) {
  const dbHost = connectionString
    ? extractHostFromConnectionString(connectionString)
    : (process.env.PG_HOST || 'localhost');

  if (dbHost && !isAllowedDbHost(dbHost)) {
    console.error(`\n\x1b[31m[SECURITY] Database host "${dbHost}" is not in the allowed hosts list.\x1b[0m`);
    console.error('Only private network addresses and known cloud providers are allowed.');
    console.error('To allow a custom host, set PG_ALLOWED_HOSTS=your-db-host.example.com');
    console.error('This prevents accidental connections to public internet databases.\n');
    process.exit(1);
  }
}

const poolConfig: PoolConfig = connectionString
  ? {
    // When a connection string is provided (Vercel/Supabase/Neon), use it exclusively
    connectionString,
    // Serverless: keep pool small — each invocation needs 1-2 connections max.
    // Supabase's PgBouncer handles the real pooling server-side.
    max: parseInt(process.env.PG_POOL_MAX || (isProduction ? '3' : '20')),
    idleTimeoutMillis: isProduction ? 10000 : 30000, // Release idle connections faster in serverless
    connectionTimeoutMillis: 5000,
    // Prevent queries from hanging on stale/broken connections (e.g. PgBouncer recycled the server conn)
    query_timeout: 15000,
    // Allow the pool to exit cleanly in serverless environments
    allowExitOnIdle: isProduction,
    // SSL: required in production.
    // Managed DB poolers (Supabase, Neon) use self-signed certs, so default
    // rejectUnauthorized to false for connection-string setups (pooler URLs).
    // Override with PG_SSL_REJECT_UNAUTHORIZED=true for providers with valid certs.
    ssl: isProduction
      ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true' }
      : undefined,
  }
  : {
    // Individual connection parameters for local/custom setups
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || (isProduction ? undefined : 'safedify_user'),
    password: process.env.PG_PASSWORD || (isProduction ? undefined : 'safedify_pass'),
    database: process.env.PG_DATABASE || 'safedify',
    max: parseInt(process.env.PG_POOL_MAX || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...(isProduction && {
      ssl: {
        rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false',
      },
    }),
  };

const pool = new Pool(poolConfig);

// Log connection errors (but don't expose credentials)
pool.on('error', (err) => {
  console.error('[Database] Unexpected pool error:', err.message);
});

// ============================================================
// Production security checks
// ============================================================
if (isProduction) {
  if (!process.env.PG_PASSWORD && !connectionString) {
    console.error('\x1b[31m[FATAL] No database password set in production!\x1b[0m');
    console.error('Set PG_PASSWORD or provide a connection string via DATABASE_URL.\n');
    process.exit(1);
  }
  if (!connectionString && !poolConfig.ssl) {
    console.warn('\x1b[33m[SECURITY] Database connection is not using SSL!\x1b[0m');
  }
}

export default pool;

// ============================================================
// Database Initialization
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Apply postgres-schema.sql to the connected database.
 * All statements use CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS,
 * so this is safe to run on every startup — it is fully idempotent.
 * Ensures the DB has the required schema regardless of when it was created.
 */
export async function initializeDatabase(): Promise<void> {
  const schemaPath = path.join(__dirname, 'postgres-schema.sql');
  if (!existsSync(schemaPath)) {
    console.warn('[Database] postgres-schema.sql not found, skipping auto-init');
    return;
  }
  try {
    const schema = readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('[Database] Schema initialized / verified successfully');
  } catch (err: any) {
    // Log the error but do not crash — the DB may already be correctly configured
    // and this error may be a benign DDL warning from an existing schema.
    console.error('[Database] Schema initialization warning (non-fatal):', err.message);
  }

  // Ensure the uploads table exists (defined in migration 003, not in postgres-schema.sql).
  // The upload route uses org_id for tenant isolation — must be created before uploads work.
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON uploads(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_uploads_filename ON uploads(filename);
      CREATE INDEX IF NOT EXISTS idx_uploads_org_id ON uploads(org_id);
    `);
    // Add org_id if it was created by the old migration without it
    await pool.query(`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;`);
    console.log('[Database] Uploads table verified');
  } catch (err: any) {
    console.error('[Database] Uploads table warning (non-fatal):', err.message);
  }

  // Ensure columns added in migrations exist on tables created before those migrations.
  // ALTER TABLE ... ADD COLUMN IF NOT EXISTS is idempotent — safe to run every time.
  const columnPatches = `
    -- From 002_auth_security: email verification + account lockout + password policy
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
    -- From 006_incident_number: incident numbering + AI recommendations
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_number TEXT;
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ai_recommendations TEXT;
    -- From 008_risk_assessment_location: project/location/site field
    ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS location TEXT;
    -- Fix author column type: was incorrectly defined as UUID, must be TEXT (stores user name)
    ALTER TABLE risk_assessments ALTER COLUMN author TYPE TEXT USING COALESCE(author::TEXT, '');
  `;

  try {
    await pool.query(columnPatches);
    console.log('[Database] Column patches applied successfully');
  } catch (err: any) {
    console.error('[Database] Column patch warning (non-fatal):', err.message);
  }

  // Seed default roles if the roles table is empty.
  // requirePermission() reads from this table — without it every non-Admin gets 403.
  const defaultRoles = [
    { name: 'Admin',               desc: 'Full system access.',     perms: ['manage_roles','manage_users','view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','approve_permit','manage_documents','ai_features'] },
    { name: 'HSE Manager',         desc: 'HSE Dept Lead.',           perms: ['manage_users','view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','approve_permit','manage_documents','ai_features'] },
    { name: 'HSE Supervisor',      desc: 'HSE Supervisor.',          perms: ['view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','manage_documents','ai_features'] },
    { name: 'HSE Officer',         desc: 'HSE Officer.',             perms: ['view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','manage_documents','ai_features'] },
    { name: 'HSE Advisor',         desc: 'HSE Advisor.',             perms: ['view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','manage_documents','ai_features'] },
    { name: 'HSE Coordinator',     desc: 'HSE Coordinator.',         perms: ['view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','manage_documents'] },
    { name: 'HSE Technician',      desc: 'HSE Technician.',          perms: ['view_analytics','create_incident','perform_inspection','manage_documents'] },
    { name: 'Engineer',            desc: 'Site Engineer.',           perms: ['view_analytics','create_incident','perform_inspection','create_permit','manage_documents'] },
    { name: 'Site Supervisor',     desc: 'Site Supervisor.',         perms: ['view_analytics','create_incident','manage_incidents','perform_inspection','create_permit'] },
    { name: 'Construction Manager',desc: 'Construction Manager.',    perms: ['view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','approve_permit','manage_documents'] },
    { name: 'Operations Manager',  desc: 'Operations Manager.',      perms: ['view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','approve_permit','manage_documents','ai_features'] },
    { name: 'Worker',              desc: 'General staff.',           perms: ['create_incident'] },
  ];

  try {
    for (const r of defaultRoles) {
      await pool.query(
        `INSERT INTO roles (id, name, description, is_system, permissions)
         VALUES (gen_random_uuid(), $1, $2, TRUE, $3)
         ON CONFLICT (name) DO NOTHING`,
        [r.name, r.desc, JSON.stringify(r.perms)]
      );
    }
    console.log('[Database] Default roles seeded / verified');
  } catch (err: any) {
    console.error('[Database] Role seed warning (non-fatal):', err.message);
  }
}

/**
 * Database Security Best Practices:
 * 
 * 1. NETWORK ACCESS:
 *    - Database should ONLY be accessible from your application servers
 *    - Use VPC/private networking (AWS RDS, Supabase, Neon configure this automatically)
 *    - Never expose port 5432 to 0.0.0.0 or public internet
 * 
 * 2. USER PERMISSIONS:
 *    - Create a dedicated database user for the application
 *    - Grant only required permissions: SELECT, INSERT, UPDATE, DELETE on app tables
 *    - Never use superuser/postgres user in production
 *    
 *    Example:
 *    CREATE USER safedify_app WITH PASSWORD 'strong-random-password';
 *    GRANT CONNECT ON DATABASE safedify TO safedify_app;
 *    GRANT USAGE ON SCHEMA public TO safedify_app;
 *    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO safedify_app;
 * 
 * 3. SSL/TLS:
 *    - Always enable SSL in production
 *    - Use valid certificates (rejectUnauthorized: true)
 * 
 * 4. CREDENTIALS:
 *    - Never commit credentials to version control
 *    - Use environment variables or secrets management (Vercel, AWS Secrets Manager)
 */