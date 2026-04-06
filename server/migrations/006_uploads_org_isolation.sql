-- ============================================================
-- Migration 006: Add org_id to uploads table for tenant isolation
-- ============================================================
-- IDOR FIX: Previously, any authenticated user could access any
-- uploaded file regardless of organization. This migration adds
-- org_id to enforce multi-tenant isolation on file access.
-- ============================================================

-- Add org_id column to uploads table
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill org_id from the uploading user's org
UPDATE uploads
SET org_id = u.org_id
FROM users u
WHERE uploads.uploaded_by = u.id
  AND uploads.org_id IS NULL;

-- Index for org-scoped file lookups
CREATE INDEX IF NOT EXISTS idx_uploads_org_id ON uploads(org_id);

-- Composite index for org + filename lookups (used in GET and DELETE)
CREATE INDEX IF NOT EXISTS idx_uploads_org_filename ON uploads(org_id, filename);
