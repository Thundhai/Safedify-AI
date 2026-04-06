import { Pool, PoolConfig } from 'pg';

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
    max: parseInt(process.env.PG_POOL_MAX || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    // SSL: required in production; default to verifying certs
    ssl: isProduction ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
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