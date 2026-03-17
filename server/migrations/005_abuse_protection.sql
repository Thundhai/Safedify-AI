-- Abuse Protection Tables
-- Migration: 005_abuse_protection.sql
-- 
-- Creates tables for IP blocking and abuse tracking

-- ============================================================
-- Blocked IPs Table
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_ips (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,  -- IPv6 max length
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,  -- NULL = permanent
  blocked_by VARCHAR(255),    -- NULL = auto-blocked
  auto_blocked BOOLEAN DEFAULT true,
  CONSTRAINT valid_ip CHECK (ip_address ~ '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$' OR ip_address ~ '^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$')
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until) WHERE blocked_until IS NOT NULL;

-- ============================================================
-- Registration Attempts Table (persistent tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS registration_attempts (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  email VARCHAR(255),
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT false,
  user_agent TEXT,
  fingerprint VARCHAR(64)  -- Browser fingerprint if available
);

CREATE INDEX IF NOT EXISTS idx_registration_attempts_ip ON registration_attempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_email ON registration_attempts(email, attempted_at) WHERE email IS NOT NULL;

-- ============================================================
-- Login Attempts Table (persistent tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  email VARCHAR(255),
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT false,
  failure_reason VARCHAR(100),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at) WHERE email IS NOT NULL;

-- ============================================================
-- Suspicious Activity Log
-- ============================================================
CREATE TABLE IF NOT EXISTS suspicious_activity (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  activity_type VARCHAR(50) NOT NULL,  -- bot_detected, scraping, bruteforce, etc.
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  details JSONB,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_ip ON suspicious_activity(ip_address, detected_at);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_type ON suspicious_activity(activity_type, detected_at);
CREATE INDEX IF NOT EXISTS idx_suspicious_unresolved ON suspicious_activity(resolved, detected_at) WHERE NOT resolved;

-- ============================================================
-- API Usage Stats (for rate limit tuning)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_usage_hourly (
  id SERIAL PRIMARY KEY,
  hour TIMESTAMPTZ NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_count INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_response_ms REAL,
  error_count INTEGER DEFAULT 0,
  UNIQUE(hour, endpoint, method)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_hour ON api_usage_hourly(hour);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_hourly(endpoint);

-- ============================================================
-- Cleanup function for expired blocks
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_blocks() RETURNS void AS $$
BEGIN
  DELETE FROM blocked_ips WHERE blocked_until IS NOT NULL AND blocked_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE blocked_ips IS 'IP addresses blocked due to abuse';
COMMENT ON TABLE registration_attempts IS 'Track registration attempts for rate limiting';
COMMENT ON TABLE login_attempts IS 'Track login attempts for security monitoring';
COMMENT ON TABLE suspicious_activity IS 'Log of detected suspicious activity';
COMMENT ON TABLE api_usage_hourly IS 'Hourly API usage statistics for monitoring';
