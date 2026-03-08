import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// On Vercel serverless, only /tmp is writable
const isVercel = !!process.env.VERCEL;
const DATA_DIR = process.env.DATA_DIR || (isVercel ? '/tmp' : __dirname);

// Ensure data directory exists
try { mkdirSync(DATA_DIR, { recursive: true }); } catch {}

const DB_PATH = path.join(DATA_DIR, 'safedify.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ---------- SCHEMA ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Worker',
    tier TEXT NOT NULL DEFAULT 'Free',
    avatar TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    location TEXT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Near Miss',
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    reported_by TEXT,
    image TEXT,
    root_cause TEXT,
    corrective_actions TEXT,
    days_lost INTEGER DEFAULT 0,
    body_part TEXT,
    mechanism TEXT,
    immediate_action TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (reported_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT,
    inspector TEXT,
    items TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    signature TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (inspector) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assignee TEXT,
    due_date TEXT,
    completed_date TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Open',
    action_type TEXT NOT NULL DEFAULT 'Corrective',
    category TEXT NOT NULL DEFAULT 'Other',
    indicator TEXT NOT NULL DEFAULT 'Lagging',
    related_incident_id TEXT,
    verified_by TEXT,
    effectiveness TEXT DEFAULT 'Not Assessed',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (related_incident_id) REFERENCES incidents(id)
  );

  CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT,
    description TEXT NOT NULL,
    location TEXT,
    date TEXT NOT NULL,
    observer TEXT,
    is_anonymous INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Open',
    immediate_action TEXT,
    images TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS permits (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    location TEXT,
    description TEXT NOT NULL,
    valid_from TEXT,
    valid_until TEXT,
    requestor TEXT,
    approver TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    controls TEXT,
    approver_comments TEXT,
    ai_audit_issues TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    department TEXT,
    company_id TEXT,
    joined_date TEXT,
    email TEXT,
    phone TEXT,
    points INTEGER DEFAULT 0,
    level TEXT DEFAULT 'Novice',
    badges TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Pending',
    documents TEXT DEFAULT '[]',
    compliance_score INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    model_number TEXT,
    serial_number TEXT,
    location TEXT,
    status TEXT DEFAULT 'Active',
    last_inspection_date TEXT,
    next_inspection_date TEXT,
    image TEXT,
    documents TEXT DEFAULT '[]',
    maintenance_history TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    content TEXT,
    status TEXT DEFAULT 'Draft',
    version INTEGER DEFAULT 1,
    uploaded_by TEXT,
    approved_by TEXT,
    approval_date TEXT,
    ai_summary TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stats_logs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    period TEXT NOT NULL DEFAULT 'Daily',
    man_hours REAL DEFAULT 0,
    active_workers INTEGER DEFAULT 0,
    remarks TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS emergency_contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT NOT NULL,
    type TEXT,
    location TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS emergency_drills (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    participants_count INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    outcome TEXT,
    notes TEXT,
    attendance_list TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agent_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    messages TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS risk_assessments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    task_description TEXT,
    type TEXT NOT NULL DEFAULT 'JHA',
    date TEXT NOT NULL,
    author TEXT,
    hazards TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inspection_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    items TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS training_modules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    required_for_roles TEXT DEFAULT '[]',
    validity_months INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS training_records (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL,
    module_id TEXT,
    module_title TEXT,
    completion_date TEXT,
    expiry_date TEXT,
    certificate_url TEXT,
    status TEXT DEFAULT 'Valid',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (worker_id) REFERENCES workers(id)
  );

  CREATE TABLE IF NOT EXISTS ppe_inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_threshold INTEGER DEFAULT 5,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ppe_issuance (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL,
    worker_name TEXT,
    ppe_item_id TEXT NOT NULL,
    ppe_item_name TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    signature_url TEXT,
    status TEXT DEFAULT 'Active',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (worker_id) REFERENCES workers(id),
    FOREIGN KEY (ppe_item_id) REFERENCES ppe_inventory(id)
  );

  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system INTEGER DEFAULT 0,
    permissions TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS safety_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Safe',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radius REAL DEFAULT 100,
    required_ppe TEXT DEFAULT '[]',
    required_training TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    is_read INTEGER DEFAULT 0,
    email_sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id TEXT PRIMARY KEY,
    email_incidents INTEGER DEFAULT 1,
    email_permits INTEGER DEFAULT 1,
    email_actions INTEGER DEFAULT 1,
    email_training INTEGER DEFAULT 1,
    email_observations INTEGER DEFAULT 0,
    email_digest INTEGER DEFAULT 1,
    in_app_all INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS environmental_readings (
    id TEXT PRIMARY KEY,
    reading_type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'Site Zone A',
    zone TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    recorded_by TEXT,
    notes TEXT,
    latitude REAL,
    longitude REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS site_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ---------- INDEXES for query performance ----------
const createIndex = (sql: string) => { try { db.exec(sql); } catch {} };
createIndex('CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)');
createIndex('CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity)');
createIndex('CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(date)');
createIndex('CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON incidents(reported_by)');
createIndex('CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category)');
createIndex('CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status)');
createIndex('CREATE INDEX IF NOT EXISTS idx_actions_due_date ON actions(due_date)');
createIndex('CREATE INDEX IF NOT EXISTS idx_actions_assignee ON actions(assignee)');
createIndex('CREATE INDEX IF NOT EXISTS idx_actions_indicator ON actions(indicator)');
createIndex('CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type)');
createIndex('CREATE INDEX IF NOT EXISTS idx_observations_date ON observations(date)');
createIndex('CREATE INDEX IF NOT EXISTS idx_permits_status ON permits(status)');
createIndex('CREATE INDEX IF NOT EXISTS idx_permits_valid_until ON permits(valid_until)');
createIndex('CREATE INDEX IF NOT EXISTS idx_workers_department ON workers(department)');
createIndex('CREATE INDEX IF NOT EXISTS idx_training_records_worker ON training_records(worker_id)');
createIndex('CREATE INDEX IF NOT EXISTS idx_training_records_status ON training_records(status)');
createIndex('CREATE INDEX IF NOT EXISTS idx_ppe_issuance_worker ON ppe_issuance(worker_id)');
createIndex('CREATE INDEX IF NOT EXISTS idx_ppe_issuance_status ON ppe_issuance(status)');
createIndex('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
createIndex('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)');
createIndex('CREATE INDEX IF NOT EXISTS idx_env_readings_type ON environmental_readings(reading_type)');
createIndex('CREATE INDEX IF NOT EXISTS idx_env_readings_date ON environmental_readings(created_at)');

// ---------- MIGRATIONS (add new columns to existing tables) ----------
const migrate = (table: string, column: string, colDef: string) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${colDef}`);
  } catch {
    // Column already exists — ignore
  }
};

// Incident migrations
migrate('incidents', 'category', "TEXT NOT NULL DEFAULT 'Near Miss'");
migrate('incidents', 'days_lost', 'INTEGER DEFAULT 0');
migrate('incidents', 'body_part', 'TEXT');
migrate('incidents', 'mechanism', 'TEXT');
migrate('incidents', 'immediate_action', 'TEXT');
migrate('incidents', 'date_reported', 'TEXT');
migrate('incidents', 'department', 'TEXT');
migrate('incidents', 'shift', 'TEXT');
migrate('incidents', 'weather_conditions', 'TEXT');
migrate('incidents', 'task_being_performed', 'TEXT');
migrate('incidents', 'injured_persons', 'TEXT');      // JSON array
migrate('incidents', 'witnesses', 'TEXT');              // JSON array
migrate('incidents', 'ppe_worn', 'TEXT');               // JSON array
migrate('incidents', 'ppe_adequate', 'INTEGER');        // 0/1/null
migrate('incidents', 'environmental_impact', 'TEXT');
migrate('incidents', 'immediate_actions_taken', 'TEXT');
migrate('incidents', 'area_secured', 'INTEGER DEFAULT 0');
migrate('incidents', 'emergency_services_notified', 'INTEGER DEFAULT 0');
migrate('incidents', 'regulatory_notification', 'INTEGER DEFAULT 0');
migrate('incidents', 'images', 'TEXT');                 // JSON array of base64 images

// Action migrations
migrate('actions', 'description', 'TEXT');
migrate('actions', 'completed_date', 'TEXT');
migrate('actions', 'action_type', "TEXT NOT NULL DEFAULT 'Corrective'");
migrate('actions', 'category', "TEXT NOT NULL DEFAULT 'Other'");
migrate('actions', 'indicator', "TEXT NOT NULL DEFAULT 'Lagging'");
migrate('actions', 'verified_by', 'TEXT');
migrate('actions', 'effectiveness', "TEXT DEFAULT 'Not Assessed'");

// ---------- SEED DEFAULT DATA ----------

const seedDefaults = () => {
  // Seed default roles
  const existingRoles = (db.prepare('SELECT COUNT(*) as c FROM roles').get() as any).c;
  if (existingRoles === 0) {
    const insertRole = db.prepare('INSERT OR IGNORE INTO roles (id, name, description, is_system, permissions) VALUES (?,?,?,?,?)');
    const roles = [
      { id: 'role-admin', name: 'Admin', desc: 'Full system access and configuration.', perms: ['manage_roles','manage_users','view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','approve_permit','manage_documents','ai_features'] },
      { id: 'role-manager', name: 'HSE Manager', desc: 'HSE Dept Lead. Approvals and Analytics.', perms: ['manage_users','view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','approve_permit','manage_documents','ai_features'] },
      { id: 'role-coordinator', name: 'HSE Coordinator', desc: 'Coordinates safety activities and data.', perms: ['view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','approve_permit','manage_documents','ai_features'] },
      { id: 'role-advisor', name: 'HSE Advisor', desc: 'Subject matter expert for risk and compliance.', perms: ['view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','ai_features'] },
      { id: 'role-officer', name: 'HSE Officer', desc: 'Field safety officer executing inspections.', perms: ['create_incident','manage_incidents','perform_inspection','create_permit','manage_documents','ai_features'] },
      { id: 'role-supervisor', name: 'HSE Supervisor', desc: 'Site supervisor responsible for team safety.', perms: ['create_incident','perform_inspection','create_permit','ai_features'] },
      { id: 'role-technician', name: 'HSE Technician', desc: 'HSE Technician for equipment and monitoring.', perms: ['create_incident','perform_inspection','ai_features'] },
      { id: 'role-worker', name: 'Worker', desc: 'General staff reporting observations.', perms: ['create_incident'] },
      { id: 'role-executive', name: 'Executive Management', desc: 'Senior leadership read-only access.', perms: ['view_analytics'] },
    ];
    for (const r of roles) {
      insertRole.run(r.id, r.name, r.desc, 1, JSON.stringify(r.perms));
    }
    console.log('[DB] Seeded default roles');
  }

  // Seed default inspection templates
  const existingTemplates = (db.prepare('SELECT COUNT(*) as c FROM inspection_templates').get() as any).c;
  if (existingTemplates === 0) {
    const insertTmpl = db.prepare('INSERT OR IGNORE INTO inspection_templates (id, name, category, description, items) VALUES (?,?,?,?,?)');
    const templates = [
      { id: 'tmpl-1', name: 'General Construction Site', cat: 'Construction', desc: 'Daily safety checks for construction zones.', items: ['Are all workers wearing required PPE?','Is perimeter fencing intact?','Are walkways clear?','Is scaffolding properly tagged?','Are electrical cables protected?','Is fire fighting equipment accessible?','Are hazardous materials stored correctly?','Is PPE signage visible?','Are excavations barricaded?','Is welfare facility accessible?'] },
      { id: 'tmpl-2', name: 'Heavy Vehicle Inspection', cat: 'Logistics', desc: 'Pre-use check for trucks and cranes.', items: ['Are tires in good condition?','Do all lights and indicators work?','Are mirrors clean?','Are brakes functioning?','Is reverse alarm audible?','Are hydraulic hoses leak-free?','Is fire extinguisher present?','Is operator cabin clean?','Are seatbelts functioning?','Is load capacity chart available?'] },
      { id: 'tmpl-3', name: 'Office Safety Audit', cat: 'Facilities', desc: 'Monthly office environment check.', items: ['Are emergency exits clear?','Are extension cords safe?','Is lighting adequate?','Are fire extinguishers inspected?','Is first aid kit stocked?','Are walkways free of hazards?','Are filing cabinets closed?','Are sockets not overloaded?','Is kitchen area clean?','Are screens positioned correctly?'] },
      { id: 'tmpl-4', name: 'Hot Work Permit Audit', cat: 'Permits', desc: 'Compliance check for active hot work.', items: ['Is Hot Work Permit valid?','Is fire watch present?','Are combustibles removed?','Is fire equipment on hand?','Is welding equipment in good condition?','Is ventilation adequate?','Are screens used for arc flash?','Is PPE appropriate?','Is gas detector active?','Do workers know emergency procedure?'] },
    ];
    for (const t of templates) {
      insertTmpl.run(t.id, t.name, t.cat, t.desc, JSON.stringify(t.items));
    }
    console.log('[DB] Seeded default inspection templates');
  }
};

seedDefaults();

// ---------- Periodic cleanup ----------
// Clean up expired password reset tokens on startup and every hour
const cleanupExpiredTokens = () => {
  try {
    const result = db.prepare("DELETE FROM password_reset_tokens WHERE expires_at < datetime('now') OR used = 1").run();
    if (result.changes > 0) {
      console.log(`[DB] Cleaned up ${result.changes} expired/used password reset tokens`);
    }
  } catch (err: any) {
    console.error('[DB] Token cleanup error:', err.message);
  }
};
cleanupExpiredTokens();
setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // every hour

export default db;
export { DB_PATH };
