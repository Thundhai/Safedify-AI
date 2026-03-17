-- Migration 004: Security Logging Tables
-- Creates security_logs table for comprehensive security event tracking
-- Run: psql -U postgres -d safedify -f server/migrations/004_security_logging.sql

-- ============================================================
-- Security Logs Table
-- ============================================================

CREATE TABLE IF NOT EXISTS security_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    user_id TEXT,
    email TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    details TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);

-- Index for finding suspicious IPs quickly
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_severity ON security_logs(ip_address, severity) 
  WHERE severity IN ('warning', 'critical');

-- ============================================================
-- Blocked IPs Table (for automatic IP blocking)
-- ============================================================

CREATE TABLE IF NOT EXISTS blocked_ips (
    ip_address TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP DEFAULT NOW(),
    blocked_until TIMESTAMP,
    blocked_by TEXT,
    auto_blocked BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);

-- ============================================================
-- Helper view: Recent critical events (last 24h)
-- ============================================================

CREATE OR REPLACE VIEW recent_critical_events AS
SELECT 
    event_type,
    ip_address,
    COUNT(*) as event_count,
    MAX(created_at) as last_seen,
    array_agg(DISTINCT endpoint ORDER BY endpoint) as endpoints
FROM security_logs
WHERE severity = 'critical' 
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, ip_address
ORDER BY event_count DESC;

-- ============================================================
-- Helper view: Suspicious IPs (many failures)
-- ============================================================

CREATE OR REPLACE VIEW suspicious_ips AS
SELECT 
    ip_address,
    COUNT(*) FILTER (WHERE event_type = 'auth_failure') as failed_auths,
    COUNT(*) FILTER (WHERE event_type = 'rate_limit_hit') as rate_limit_hits,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM security_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) FILTER (WHERE severity IN ('warning', 'critical')) > 5
ORDER BY critical_events DESC, failed_auths DESC;

-- ============================================================
-- Auto-cleanup: Remove logs older than 90 days
-- (Optional: run as scheduled job or manually)
-- ============================================================

-- You can set up a cron job or scheduled task to run:
-- DELETE FROM security_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- ============================================================
-- Verification
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '=== Migration 004: Security Logging ===';
    RAISE NOTICE 'Created table: security_logs';
    RAISE NOTICE 'Created table: blocked_ips';
    RAISE NOTICE 'Created view: recent_critical_events';
    RAISE NOTICE 'Created view: suspicious_ips';
    RAISE NOTICE '';
    RAISE NOTICE 'Query examples:';
    RAISE NOTICE '  SELECT * FROM recent_critical_events;';
    RAISE NOTICE '  SELECT * FROM suspicious_ips;';
END $$;
