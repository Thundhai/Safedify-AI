-- PostgreSQL schema for Safedify-AI
-- Review and adjust as needed before applying

CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Worker',
    tier TEXT NOT NULL DEFAULT 'Free',
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incidents (
    id UUID PRIMARY KEY,
    description TEXT NOT NULL,
    location TEXT,
    date TIMESTAMP NOT NULL,
    date_reported TIMESTAMP,
    department TEXT,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Audit logs table for tracking actions and changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
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

CREATE TABLE inspections (
    id UUID PRIMARY KEY,
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

CREATE TABLE actions (
    id UUID PRIMARY KEY,
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

CREATE TABLE observations (
    id UUID PRIMARY KEY,
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

CREATE TABLE permits (
    id UUID PRIMARY KEY,
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

CREATE TABLE workers (
    id UUID PRIMARY KEY,
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

CREATE TABLE contractors (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Pending',
    documents TEXT DEFAULT '[]',
    compliance_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assets (
    id UUID PRIMARY KEY,
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

CREATE TABLE documents (
    id UUID PRIMARY KEY,
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

CREATE TABLE stats_logs (
    id UUID PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    period TEXT NOT NULL DEFAULT 'Daily',
    man_hours REAL DEFAULT 0,
    active_workers INTEGER DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT NOT NULL,
    type TEXT,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emergency_drills (
    id UUID PRIMARY KEY,
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

CREATE TABLE agent_conversations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    messages TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    task_description TEXT,
    type TEXT NOT NULL DEFAULT 'JHA',
    date TIMESTAMP NOT NULL,
    author UUID,
    hazards TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inspection_templates (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    items TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE training_modules (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    required_for_roles TEXT DEFAULT '[]',
    validity_months INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE training_records (
    id UUID PRIMARY KEY,
    worker_id UUID REFERENCES workers(id),
    module_id UUID,
    module_title TEXT,
    completion_date TIMESTAMP,
    expiry_date TIMESTAMP,
    certificate_url TEXT,
    status TEXT DEFAULT 'Valid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ppe_inventory (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_threshold INTEGER DEFAULT 5,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ppe_issuance (
    id UUID PRIMARY KEY,
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

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    permissions TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE safety_zones (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Safe',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radius REAL DEFAULT 100,
    required_ppe TEXT DEFAULT '[]',
    required_training TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
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

CREATE TABLE notification_preferences (
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

CREATE TABLE environmental_readings (
    id UUID PRIMARY KEY,
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

CREATE TABLE site_locations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_date ON incidents(date);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_due_date ON actions(due_date);
CREATE INDEX idx_actions_assignee ON actions(assignee);
CREATE INDEX idx_actions_indicator ON actions(indicator);
CREATE INDEX idx_observations_type ON observations(type);
CREATE INDEX idx_observations_date ON observations(date);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_valid_until ON permits(valid_until);
CREATE INDEX idx_workers_department ON workers(department);
CREATE INDEX idx_training_records_worker ON training_records(worker_id);
CREATE INDEX idx_training_records_status ON training_records(status);
CREATE INDEX idx_ppe_issuance_worker ON ppe_issuance(worker_id);
CREATE INDEX idx_ppe_issuance_status ON ppe_issuance(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_env_readings_type ON environmental_readings(reading_type);
CREATE INDEX idx_env_readings_date ON environmental_readings(created_at);
