-- Migration 003: IDOR Security Fixes
-- Adds created_by columns for ownership tracking and uploads table
-- Run: psql -U postgres -d safedify -f server/migrations/003_idor_security.sql

-- ============================================================
-- Add created_by columns for ownership verification
-- ============================================================

-- Actions: track who created the action (existing actions will have NULL)
ALTER TABLE actions ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Index for ownership queries
CREATE INDEX IF NOT EXISTS idx_actions_created_by ON actions(created_by);

-- Observations: track who created the observation
ALTER TABLE observations ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Index for ownership queries  
CREATE INDEX IF NOT EXISTS idx_observations_created_by ON observations(created_by);

-- Permits: track who created the permit
ALTER TABLE permits ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Index for ownership queries
CREATE INDEX IF NOT EXISTS idx_permits_created_by ON permits(created_by);

-- ============================================================
-- Create uploads table for file ownership tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for ownership lookups
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON uploads(uploaded_by);

-- Index for filename lookups (used in GET and DELETE)
CREATE INDEX IF NOT EXISTS idx_uploads_filename ON uploads(filename);

-- ============================================================
-- Backfill created_by for existing records where possible
-- ============================================================

-- For incidents: reported_by is already the user ID
-- No backfill needed since reported_by column already exists

-- For actions: try to map assignee name to user ID for existing records
-- This is best-effort; records without clear mapping will remain NULL
UPDATE actions a
SET created_by = u.id
FROM users u
WHERE a.created_by IS NULL
  AND a.assignee IS NOT NULL
  AND (u.name = a.assignee OR u.id = a.assignee);

-- For observations: try to map observer name to user ID
UPDATE observations o
SET created_by = u.id
FROM users u
WHERE o.created_by IS NULL
  AND o.observer IS NOT NULL
  AND (u.name = o.observer OR u.id = o.observer);

-- For permits: try to map requestor name to user ID
UPDATE permits p
SET created_by = u.id
FROM users u
WHERE p.created_by IS NULL
  AND p.requestor IS NOT NULL
  AND (u.name = p.requestor OR u.id = p.requestor);

-- ============================================================
-- Grant permissions (if using PostgreSQL roles)
-- ============================================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON uploads TO safedify_app;

-- ============================================================
-- Verification
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '=== Migration 003: IDOR Security Fixes ===';
    RAISE NOTICE 'Added columns: actions.created_by, observations.created_by, permits.created_by';
    RAISE NOTICE 'Created table: uploads (for file ownership tracking)';
    RAISE NOTICE 'Run this in your application to verify: SELECT COUNT(*) FROM uploads;';
END $$;
