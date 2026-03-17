-- Migration: Add Full-Text Search (FTS) GIN indexes
-- Run this on existing databases to enable fast search queries
-- These indexes replace slow ILIKE scans with fast GIN lookups
--
-- Apply with: psql -d safedify -f 001_add_fts_indexes.sql

-- Drop existing indexes if they exist (idempotent)
DROP INDEX IF EXISTS idx_incidents_fts;
DROP INDEX IF EXISTS idx_observations_fts;
DROP INDEX IF EXISTS idx_actions_fts;
DROP INDEX IF EXISTS idx_permits_fts;
DROP INDEX IF EXISTS idx_documents_fts;

-- Create GIN indexes for Full-Text Search
-- Using 'english' configuration for stemming (e.g., "running" matches "run")

CREATE INDEX idx_incidents_fts 
    ON incidents USING GIN (to_tsvector('english', COALESCE(description, '')));

CREATE INDEX idx_observations_fts 
    ON observations USING GIN (to_tsvector('english', COALESCE(description, '')));

CREATE INDEX idx_actions_fts 
    ON actions USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

CREATE INDEX idx_permits_fts 
    ON permits USING GIN (to_tsvector('english', COALESCE(description, '')));

CREATE INDEX idx_documents_fts 
    ON documents USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')));

-- Analyze tables to update statistics for query planner
ANALYZE incidents;
ANALYZE observations;
ANALYZE actions;
ANALYZE permits;
ANALYZE documents;

-- Verify indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE '%_fts';
