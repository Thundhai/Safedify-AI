-- PostgreSQL schema for Safedify-AI
-- Review and adjust as needed before applying

-- ============ MULTI-TENANCY: Organizations ============

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'Pro',
    owner_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Worker',
    tier TEXT NOT NULL DEFAULT 'Free',
    avatar TEXT,
    org_id UUID REFERENCES organizations(id),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token TEXT,
    email_verification_expires TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_failed_login TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    must_change_password BOOLEAN DEFAULT FALSE,
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT FALSE,
    totp_backup_codes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Back-reference: organizations.owner_id → users.id
DO $$ BEGIN
  ALTER TABLE organizations ADD CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_id) REFERENCES users(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);

-- Security indexes for auth lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS org_invites (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Worker',
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted BOOLEAN DEFAULT FALSE,
    invited_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON org_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON org_invites(org_id);

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    description TEXT NOT NULL,
    location TEXT,
    date TIMESTAMP NOT NULL,
    date_reported TIMESTAMP,
    department TEXT,
    shift TEXT,
    type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Near Miss',
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    reported_by UUID REFERENCES users(id),
    image TEXT,
    images TEXT[],
    root_cause TEXT,
    corrective_actions TEXT,
    days_lost INTEGER DEFAULT 0,
    body_part TEXT,
    mechanism TEXT,
    immediate_action TEXT,
    weather_conditions TEXT,
    task_being_performed TEXT,
    injured_persons TEXT,
    witnesses TEXT,
    ppe_worn TEXT,
    ppe_adequate BOOLEAN,
    environmental_impact TEXT,
    immediate_actions_taken TEXT,
    area_secured BOOLEAN DEFAULT FALSE,
    emergency_services_notified BOOLEAN DEFAULT FALSE,
    regulatory_notification BOOLEAN DEFAULT FALSE,
    incident_number TEXT,
    ai_recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Audit logs table for tracking actions and changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    user_email TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    template_name TEXT NOT NULL,
    title TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    location TEXT,
    inspector UUID REFERENCES users(id),
    items TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    title TEXT NOT NULL,
    description TEXT,
    assignee UUID,
    due_date TIMESTAMP,
    completed_date TIMESTAMP,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Open',
    action_type TEXT NOT NULL DEFAULT 'Corrective',
    category TEXT NOT NULL DEFAULT 'Other',
    indicator TEXT NOT NULL DEFAULT 'Lagging',
    related_incident_id UUID REFERENCES incidents(id),
    verified_by UUID,
    effectiveness TEXT DEFAULT 'Not Assessed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    type TEXT NOT NULL,
    category TEXT,
    description TEXT NOT NULL,
    location TEXT,
    date TIMESTAMP NOT NULL,
    observer UUID,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'Open',
    immediate_action TEXT,
    images TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permits (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    type TEXT NOT NULL,
    location TEXT,
    description TEXT NOT NULL,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    requestor UUID,
    approver UUID,
    status TEXT NOT NULL DEFAULT 'Draft',
    controls TEXT,
    approver_comments TEXT,
    ai_audit_issues TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    role TEXT,
    department TEXT,
    company_id TEXT,
    joined_date TIMESTAMP,
    email TEXT,
    phone TEXT,
    points INTEGER DEFAULT 0,
    level TEXT DEFAULT 'Novice',
    badges TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Pending',
    documents TEXT DEFAULT '[]',
    compliance_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    category TEXT,
    model_number TEXT,
    serial_number TEXT,
    location TEXT,
    status TEXT DEFAULT 'Active',
    last_inspection_date TIMESTAMP,
    next_inspection_date TIMESTAMP,
    image TEXT,
    documents TEXT DEFAULT '[]',
    maintenance_history TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    title TEXT NOT NULL,
    category TEXT,
    content TEXT,
    status TEXT DEFAULT 'Draft',
    version INTEGER DEFAULT 1,
    uploaded_by UUID,
    approved_by UUID,
    approval_date TIMESTAMP,
    ai_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stats_logs (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    date TIMESTAMP NOT NULL,
    period TEXT NOT NULL DEFAULT 'Daily',
    man_hours REAL DEFAULT 0,
    active_workers INTEGER DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT NOT NULL,
    type TEXT,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_drills (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    type TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    location TEXT NOT NULL,
    participants_count INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    outcome TEXT,
    notes TEXT,
    attendance_list TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    messages TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    title TEXT NOT NULL,
    task_description TEXT,
    type TEXT NOT NULL DEFAULT 'JHA',
    date TIMESTAMP NOT NULL,
    author TEXT,
    hazards TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'Draft',
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspection_templates (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    items TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    title TEXT NOT NULL,
    description TEXT,
    required_for_roles TEXT DEFAULT '[]',
    validity_months INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_records (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    worker_id UUID REFERENCES workers(id),
    module_id UUID,
    module_title TEXT,
    completion_date TIMESTAMP,
    expiry_date TIMESTAMP,
    certificate_url TEXT,
    status TEXT DEFAULT 'Valid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ppe_inventory (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    category TEXT,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_threshold INTEGER DEFAULT 5,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ppe_issuance (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    worker_id UUID REFERENCES workers(id),
    worker_name TEXT,
    ppe_item_id UUID REFERENCES ppe_inventory(id),
    ppe_item_name TEXT,
    issue_date TIMESTAMP,
    expiry_date TIMESTAMP,
    signature_url TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    permissions TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safety_zones (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Safe',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radius REAL DEFAULT 100,
    required_ppe TEXT DEFAULT '[]',
    required_training TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    email_incidents BOOLEAN DEFAULT TRUE,
    email_permits BOOLEAN DEFAULT TRUE,
    email_actions BOOLEAN DEFAULT TRUE,
    email_training BOOLEAN DEFAULT TRUE,
    email_observations BOOLEAN DEFAULT FALSE,
    email_digest BOOLEAN DEFAULT TRUE,
    in_app_all BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS environmental_readings (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    reading_type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'Site Zone A',
    zone TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    recorded_by UUID REFERENCES users(id),
    notes TEXT,
    latitude REAL,
    longitude REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_locations (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS blocked_ips (
    ip_address TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP DEFAULT NOW(),
    blocked_until TIMESTAMP,
    blocked_by TEXT,
    auto_blocked BOOLEAN DEFAULT TRUE
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(date);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_due_date ON actions(due_date);
CREATE INDEX IF NOT EXISTS idx_actions_assignee ON actions(assignee);
CREATE INDEX IF NOT EXISTS idx_actions_indicator ON actions(indicator);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_observations_date ON observations(date);
CREATE INDEX IF NOT EXISTS idx_permits_status ON permits(status);
CREATE INDEX IF NOT EXISTS idx_permits_valid_until ON permits(valid_until);
CREATE INDEX IF NOT EXISTS idx_workers_department ON workers(department);
CREATE INDEX IF NOT EXISTS idx_training_records_worker ON training_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_training_records_status ON training_records(status);
CREATE INDEX IF NOT EXISTS idx_ppe_issuance_worker ON ppe_issuance(worker_id);
CREATE INDEX IF NOT EXISTS idx_ppe_issuance_status ON ppe_issuance(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_env_readings_type ON environmental_readings(reading_type);
CREATE INDEX IF NOT EXISTS idx_env_readings_date ON environmental_readings(created_at);

-- Full-Text Search (FTS) GIN indexes for fast search queries
-- These indexes significantly improve search performance over ILIKE
CREATE INDEX IF NOT EXISTS idx_incidents_fts ON incidents USING GIN (to_tsvector('english', COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_observations_fts ON observations USING GIN (to_tsvector('english', COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_actions_fts ON actions USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_permits_fts ON permits USING GIN (to_tsvector('english', COALESCE(description, '')));

-- Multi-tenancy org_id indexes
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
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')));

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_users_email_verification ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);
