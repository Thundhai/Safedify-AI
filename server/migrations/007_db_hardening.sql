-- Migration 007: Database Access Hardening
-- Restricts default PUBLIC schema permissions and grants only needed privileges
-- to the application user. This follows the CIS PostgreSQL Benchmark (Section 4.2).
--
-- IMPORTANT: Run as a superuser/database owner, NOT as the application user.
-- After running, the application user (safedify_user) will only have:
--   - SELECT, INSERT, UPDATE, DELETE on all tables in public schema
--   - USAGE, SELECT on all sequences
--   - EXECUTE on all functions
--   - No CREATE TABLE, DROP TABLE, ALTER TABLE, etc.

-- 1. Revoke default PUBLIC access to schema
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- 2. Grant minimum required privileges to the application user
-- Replace 'safedify_user' with your actual application database user if different
DO $$
DECLARE
  app_user TEXT := current_setting('app.db_user', true);
BEGIN
  -- Fall back to 'safedify_user' if not set
  IF app_user IS NULL OR app_user = '' THEN
    app_user := 'safedify_user';
  END IF;

  -- Schema usage (required to see tables)
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', app_user);

  -- DML only: SELECT, INSERT, UPDATE, DELETE (no DDL like CREATE/DROP/ALTER)  
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', app_user);

  -- Sequences (needed for serial/identity columns)
  EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', app_user);

  -- Functions (needed for uuid_generate_v4, etc.)
  EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO %I', app_user);

  -- Ensure future tables/sequences also get the same grants
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', app_user);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', app_user);

  RAISE NOTICE 'Granted minimum privileges to user: %', app_user;
END $$;

-- 3. Add index on security_logs for efficient querying of recent events
-- (Supports the new traffic anomaly detection and error ratio tracking)
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_created 
  ON security_logs (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_type_severity 
  ON security_logs (event_type, severity, created_at DESC);

-- 4. PostgreSQL server-level recommendations (must be set in postgresql.conf, not SQL)
-- These are documented here for the ops team:
--
-- # Enable connection logging
-- log_connections = on
-- log_disconnections = on
--
-- # Log all DDL statements  
-- log_statement = 'ddl'
--
-- # Log slow queries (> 1 second)
-- log_min_duration_statement = 1000
--
-- # Restrict listening to private interfaces only
-- listen_addresses = 'localhost'  -- or specific private IPs
--
-- # In pg_hba.conf, restrict connections:
-- # TYPE  DATABASE  USER           ADDRESS        METHOD
-- # local all       all                           scram-sha-256
-- # host  safedify  safedify_user  10.0.0.0/8     scram-sha-256
-- # host  safedify  safedify_user  172.16.0.0/12  scram-sha-256
-- # host  safedify  safedify_user  192.168.0.0/16 scram-sha-256
-- # hostssl safedify safedify_user 0.0.0.0/0      scram-sha-256  -- for cloud managed DB only
