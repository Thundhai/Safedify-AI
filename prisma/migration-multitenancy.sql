-- ============================================================
-- MULTI-TENANCY MIGRATION
-- Run this on existing Safedify databases to add organization support.
-- This creates a default org and assigns all existing data to it.
-- ============================================================

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'Pro',
    owner_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create org_invites table
CREATE TABLE IF NOT EXISTS org_invites (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Worker',
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted BOOLEAN DEFAULT FALSE,
    invited_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON org_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON org_invites(org_id);

-- 3. Create a default organization for existing data
INSERT INTO organizations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', 'Pro')
ON CONFLICT (id) DO NOTHING;

-- 4. Add org_id to users and all data tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE actions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE observations ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE permits ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE stats_logs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE emergency_drills ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE inspection_templates ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE ppe_inventory ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE ppe_issuance ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE safety_zones ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE environmental_readings ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- 5. Assign all existing data to the default organization
UPDATE users SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE incidents SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE actions SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE observations SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE inspections SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE permits SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE workers SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE contractors SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE assets SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE documents SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE stats_logs SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE emergency_contacts SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE emergency_drills SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE agent_conversations SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE risk_assessments SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE inspection_templates SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE training_modules SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE training_records SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE ppe_inventory SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE ppe_issuance SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE safety_zones SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE notifications SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE environmental_readings SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE site_locations SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE audit_logs SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

-- 6. Set owner of default org to first Admin user
UPDATE organizations 
SET owner_id = (SELECT id FROM users WHERE role = 'Admin' ORDER BY created_at ASC LIMIT 1) 
WHERE id = '00000000-0000-0000-0000-000000000001' AND owner_id IS NULL;

-- 7. Add the foreign key constraint for organizations.owner_id
ALTER TABLE organizations ADD CONSTRAINT IF NOT EXISTS fk_organizations_owner FOREIGN KEY (owner_id) REFERENCES users(id);

-- 8. Create indexes for org_id on all tables
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(org_id);
CREATE INDEX IF NOT EXISTS idx_actions_org ON actions(org_id);
CREATE INDEX IF NOT EXISTS idx_observations_org ON observations(org_id);
CREATE INDEX IF NOT EXISTS idx_inspections_org ON inspections(org_id);
CREATE INDEX IF NOT EXISTS idx_permits_org ON permits(org_id);
CREATE INDEX IF NOT EXISTS idx_workers_org ON workers(org_id);
CREATE INDEX IF NOT EXISTS idx_contractors_org ON contractors(org_id);
CREATE INDEX IF NOT EXISTS idx_assets_org ON assets(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_org ON risk_assessments(org_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_org ON emergency_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_emergency_drills_org ON emergency_drills(org_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_org ON training_modules(org_id);
CREATE INDEX IF NOT EXISTS idx_training_records_org ON training_records(org_id);
CREATE INDEX IF NOT EXISTS idx_ppe_inventory_org ON ppe_inventory(org_id);
CREATE INDEX IF NOT EXISTS idx_ppe_issuance_org ON ppe_issuance(org_id);
CREATE INDEX IF NOT EXISTS idx_safety_zones_org ON safety_zones(org_id);
CREATE INDEX IF NOT EXISTS idx_environmental_readings_org ON environmental_readings(org_id);
CREATE INDEX IF NOT EXISTS idx_site_locations_org ON site_locations(org_id);
CREATE INDEX IF NOT EXISTS idx_stats_logs_org ON stats_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_org ON agent_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_inspection_templates_org ON inspection_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id);
