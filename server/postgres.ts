import { Pool, PoolConfig } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * PostgreSQL Connection Configuration
 * 
 * SECURITY NOTES:
 * - In production, always use SSL (ssl: { rejectUnauthorized: true })
 * - Use environment variables for all credentials
 * - Restrict database user permissions to minimum required
 * - Do NOT expose database port to public internet
 * - Use connection pooling to prevent connection exhaustion attacks
 */
const poolConfig: PoolConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'safedify_user',
  password: process.env.PG_PASSWORD || 'safedify_pass',
  database: process.env.PG_DATABASE || 'safedify',
  
  // Connection pool settings (prevent connection exhaustion)
  max: parseInt(process.env.PG_POOL_MAX || '20'),      // Max connections in pool
  idleTimeoutMillis: 30000,                            // Close idle connections after 30s
  connectionTimeoutMillis: 5000,                       // Fail fast on connection issues
  
  // SSL Configuration for production
  ...(isProduction && {
    ssl: {
      // Require valid SSL certificate in production
      // Set to false only if using self-signed certs (not recommended)
      rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false',
    },
  }),
  
  // For Vercel/Neon/Supabase: use connection string if provided
  ...(process.env.DATABASE_URL && {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  }),
};

const pool = new Pool(poolConfig);

// Log connection errors (but don't expose credentials)
pool.on('error', (err) => {
  console.error('[Database] Unexpected pool error:', err.message);
});

// Warn if using insecure defaults in production
if (isProduction) {
  if (!process.env.PG_PASSWORD && !process.env.DATABASE_URL) {
    console.warn('\x1b[33m[SECURITY] Using default database password in production!\x1b[0m');
  }
  if (!process.env.DATABASE_URL && !poolConfig.ssl) {
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