/**
 * Agent Tools — callable functions the AI agent can invoke
 * Each tool has: name, description, parameters schema, and execute function
 */
import db from '../db.js';
import { v4 as uuid } from 'uuid';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => any;
}

// ---------- TOOL IMPLEMENTATIONS ----------

const queryIncidents: ToolDefinition = {
  name: 'query_incidents',
  description: 'Query the incidents database. Can filter by type, category (OSHA classification), severity, status, date range, or location. Categories: Near Miss, First Aid Case, Medical Treatment Case, Restricted Work Case, Lost Time Injury, Fatality.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Filter by incident type (e.g. LTI, Near Miss, Fire, Vehicle Incident, Environmental)' },
      category: { type: 'string', description: 'Filter by OSHA category (Near Miss, First Aid Case, Medical Treatment Case, Restricted Work Case, Lost Time Injury, Fatality)' },
      severity: { type: 'string', description: 'Filter by severity (e.g. Low, Medium, High, Critical)' },
      status: { type: 'string', description: 'Filter by status (e.g. Open, Investigating, Closed)' },
      location: { type: 'string', description: 'Filter by location (partial match)' },
      limit: { type: 'number', description: 'Max results to return (default 20)' },
    }
  },
  execute: (params) => {
    let query = 'SELECT * FROM incidents WHERE 1=1';
    const binds: any[] = [];

    if (params.type) { query += ' AND type = ?'; binds.push(params.type); }
    if (params.category) { query += ' AND category = ?'; binds.push(params.category); }
    if (params.severity) { query += ' AND severity = ?'; binds.push(params.severity); }
    if (params.status) { query += ' AND status = ?'; binds.push(params.status); }
    if (params.location) { query += ' AND location LIKE ?'; binds.push(`%${params.location}%`); }

    query += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(params.limit || 20);

    return db.prepare(query).all(...binds);
  }
};

const getIncidentStats: ToolDefinition = {
  name: 'get_incident_stats',
  description: 'Get aggregate incident statistics: counts by type, category (OSHA), severity, status, monthly trends, days lost, and overall totals. Category hierarchy: Near Miss → First Aid Case → Medical Treatment Case → Restricted Work Case → Lost Time Injury → Fatality.',
  parameters: { type: 'object', properties: {} },
  execute: () => {
    const total = (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as any).c;
    const byType = db.prepare('SELECT type, COUNT(*) as count FROM incidents GROUP BY type').all();
    const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM incidents GROUP BY category').all();
    const bySeverity = db.prepare('SELECT severity, COUNT(*) as count FROM incidents GROUP BY severity').all();
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM incidents GROUP BY status').all();
    const monthly = db.prepare(
      "SELECT strftime('%Y-%m', date) as month, COUNT(*) as count FROM incidents GROUP BY month ORDER BY month DESC LIMIT 12"
    ).all();
    const manHours = (db.prepare('SELECT COALESCE(SUM(man_hours),0) as total FROM stats_logs').get() as any).total;
    const totalDaysLost = (db.prepare('SELECT COALESCE(SUM(days_lost),0) as total FROM incidents').get() as any).total;

    return { total, byType, byCategory, bySeverity, byStatus, monthly, totalManHours: manHours, totalDaysLost };
  }
};

const queryObservations: ToolDefinition = {
  name: 'query_observations',
  description: 'Query safety observations. Can filter by type (Unsafe Act, Unsafe Condition, Near Miss, Good Practice), category, or status.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Observation type filter' },
      category: { type: 'string', description: 'Category filter (e.g. PPE, Housekeeping)' },
      status: { type: 'string', description: 'Status filter (Open, In Progress, Closed)' },
      limit: { type: 'number', description: 'Max results (default 20)' }
    }
  },
  execute: (params) => {
    let query = 'SELECT * FROM observations WHERE 1=1';
    const binds: any[] = [];
    if (params.type) { query += ' AND type = ?'; binds.push(params.type); }
    if (params.category) { query += ' AND category = ?'; binds.push(params.category); }
    if (params.status) { query += ' AND status = ?'; binds.push(params.status); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(params.limit || 20);
    return db.prepare(query).all(...binds);
  }
};

const queryActions: ToolDefinition = {
  name: 'query_actions',
  description: 'Query corrective/preventive/improvement actions. Can filter by status, priority, assignee, action_type (Corrective/Preventive/Improvement), indicator (Leading/Lagging), category.',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter by status: Open, In Progress, Overdue, Done, Verified' },
      priority: { type: 'string', description: 'Filter by priority: Low, Medium, High, Critical' },
      assignee: { type: 'string', description: 'Filter by person assigned (partial match)' },
      action_type: { type: 'string', description: 'Filter by type: Corrective, Preventive, Improvement' },
      indicator: { type: 'string', description: 'Filter by indicator: Leading (proactive) or Lagging (reactive)' },
      category: { type: 'string', description: 'Filter by category (e.g. Training & Competency, Incident Corrective, PPE & Equipment)' },
      limit: { type: 'number' }
    }
  },
  execute: (params) => {
    let query = 'SELECT * FROM actions WHERE 1=1';
    const binds: any[] = [];
    if (params.status) { query += ' AND status = ?'; binds.push(params.status); }
    if (params.priority) { query += ' AND priority = ?'; binds.push(params.priority); }
    if (params.assignee) { query += ' AND assignee LIKE ?'; binds.push(`%${params.assignee}%`); }
    if (params.action_type) { query += ' AND action_type = ?'; binds.push(params.action_type); }
    if (params.indicator) { query += ' AND indicator = ?'; binds.push(params.indicator); }
    if (params.category) { query += ' AND category = ?'; binds.push(params.category); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(params.limit || 20);
    return db.prepare(query).all(...binds);
  }
};

const queryPermits: ToolDefinition = {
  name: 'query_permits',
  description: 'Query work permits. Filter by type, status, or location.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string' },
      status: { type: 'string' },
      location: { type: 'string' },
      limit: { type: 'number' }
    }
  },
  execute: (params) => {
    let query = 'SELECT * FROM permits WHERE 1=1';
    const binds: any[] = [];
    if (params.type) { query += ' AND type = ?'; binds.push(params.type); }
    if (params.status) { query += ' AND status = ?'; binds.push(params.status); }
    if (params.location) { query += ' AND location LIKE ?'; binds.push(`%${params.location}%`); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(params.limit || 20);
    return db.prepare(query).all(...binds);
  }
};

const queryWorkers: ToolDefinition = {
  name: 'query_workers',
  description: 'Query worker profiles. Filter by role, department, or name.',
  parameters: {
    type: 'object',
    properties: {
      role: { type: 'string' },
      department: { type: 'string' },
      name: { type: 'string' },
      limit: { type: 'number' }
    }
  },
  execute: (params) => {
    let query = 'SELECT * FROM workers WHERE 1=1';
    const binds: any[] = [];
    if (params.role) { query += ' AND role = ?'; binds.push(params.role); }
    if (params.department) { query += ' AND department = ?'; binds.push(params.department); }
    if (params.name) { query += ' AND name LIKE ?'; binds.push(`%${params.name}%`); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(params.limit || 50);
    return db.prepare(query).all(...binds);
  }
};

const createIncident: ToolDefinition = {
  name: 'create_incident',
  description: 'Create a new incident record in the database. Use when the user reports a new safety incident.',
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'Incident description (required)' },
      type: { type: 'string', description: 'Incident type: Near Miss, First Aid, Medical Treatment, Restricted Work Case, Lost Time Injury, Fatality, Environmental, Property Damage, Fire, Security, Vehicle Incident' },
      category: { type: 'string', description: 'OSHA category: Near Miss, First Aid Case, Medical Treatment Case, Restricted Work Case, Lost Time Injury, Fatality' },
      severity: { type: 'string', description: 'Severity: Low, Medium, High, Critical' },
      location: { type: 'string', description: 'Where it happened' },
      days_lost: { type: 'number', description: 'Days lost due to injury (for LTI)' },
      body_part: { type: 'string', description: 'Affected body part' },
      mechanism: { type: 'string', description: 'How injury occurred (e.g. Struck by, Fall from height, Caught between)' },
      immediate_action: { type: 'string', description: 'Immediate action taken' },
    },
    required: ['description', 'type', 'severity']
  },
  execute: (params) => {
    const id = uuid();
    db.prepare(
      `INSERT INTO incidents (id, description, location, date, type, category, severity, status, days_lost, body_part, mechanism, immediate_action) 
       VALUES (?, ?, ?, datetime('now'), ?, ?, ?, 'Open', ?, ?, ?, ?)`
    ).run(id, params.description, params.location || 'Not specified', params.type, params.category || 'Near Miss', params.severity, params.days_lost || 0, params.body_part, params.mechanism, params.immediate_action);
    return { success: true, id, message: `Incident created with ID ${id}` };
  }
};

const createAction: ToolDefinition = {
  name: 'create_action',
  description: 'Create a new action item. Can be Corrective (fix after incident), Preventive (prevent recurrence), or Improvement (enhance processes). Categorize as Leading (proactive: Training, Inspection, Risk Assessment, Safety Campaign, Procedure Update, PPE, Emergency Preparedness, Behavioral Safety) or Lagging (reactive: Incident Corrective, Incident Preventive, Regulatory Compliance, Investigation Finding, Audit Non-Conformance).',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Action title (required)' },
      description: { type: 'string', description: 'Detailed description of the action' },
      assignee: { type: 'string', description: 'Person responsible' },
      due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
      priority: { type: 'string', description: 'Priority: Low, Medium, High, Critical' },
      action_type: { type: 'string', description: 'Type: Corrective, Preventive, or Improvement' },
      category: { type: 'string', description: 'Category (see description for options)' },
      indicator: { type: 'string', description: 'Leading (proactive) or Lagging (reactive)' },
      related_incident_id: { type: 'string', description: 'Related incident ID if applicable' },
    },
    required: ['title']
  },
  execute: (params) => {
    const id = uuid();
    db.prepare(
      'INSERT INTO actions (id, title, description, assignee, due_date, priority, status, action_type, category, indicator, related_incident_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).run(id, params.title, params.description, params.assignee, params.due_date, params.priority || 'Medium', 'Open', params.action_type || 'Corrective', params.category || 'Other', params.indicator || 'Lagging', params.related_incident_id);
    return { success: true, id, message: `Action "${params.title}" created as ${params.indicator || 'Lagging'} / ${params.action_type || 'Corrective'}` };
  }
};

const calculateSafetyMetrics: ToolDefinition = {
  name: 'calculate_safety_metrics',
  description: 'Calculate HSE KPIs including TRIR, LTIFR, severity rate, leading/lagging indicator performance, action closure rates by type, and incident category breakdown (OSHA pyramid).',
  parameters: { type: 'object', properties: {} },
  execute: () => {
    const totalIncidents = (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as any).c;
    const ltiCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Lost Time Injury'").get() as any).c;
    const rwcCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Restricted Work Case'").get() as any).c;
    const mtcCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Medical Treatment Case'").get() as any).c;
    const facCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'First Aid Case'").get() as any).c;
    const nearMisses = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Near Miss'").get() as any).c;
    const fatalities = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Fatality'").get() as any).c;
    const totalDaysLost = (db.prepare('SELECT COALESCE(SUM(days_lost),0) as t FROM incidents').get() as any).t;
    const manHours = (db.prepare('SELECT COALESCE(SUM(man_hours),0) as t FROM stats_logs').get() as any).t;
    const openActions = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE status NOT IN ('Done','Verified')").get() as any).c;
    const totalInspections = (db.prepare('SELECT COUNT(*) as c FROM inspections WHERE completed = 1').get() as any).c;

    const recordable = mtcCount + rwcCount + ltiCount + fatalities;
    const trir = manHours > 0 ? (recordable / manHours) * 200000 : 0;
    const ltifr = manHours > 0 ? (ltiCount / manHours) * 1000000 : 0;
    const severityRate = manHours > 0 ? (totalDaysLost / manHours) * 200000 : 0;
    const nearMissRate = manHours > 0 ? (nearMisses / manHours) * 200000 : 0;

    // Leading / Lagging action breakdown
    const leadingTotal = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Leading'").get() as any).c;
    const leadingClosed = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Leading' AND status IN ('Done','Verified')").get() as any).c;
    const laggingTotal = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Lagging'").get() as any).c;
    const laggingClosed = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Lagging' AND status IN ('Done','Verified')").get() as any).c;
    const byActionCategory = db.prepare('SELECT category, indicator, action_type, COUNT(*) as count FROM actions GROUP BY category, indicator, action_type').all();

    return {
      totalIncidents,
      incidentPyramid: { fatalities, ltiCount, rwcCount, mtcCount, facCount, nearMisses },
      totalDaysLost,
      totalManHours: manHours,
      recordableIncidents: recordable,
      trir: Math.round(trir * 100) / 100,
      ltifr: Math.round(ltifr * 100) / 100,
      severityRate: Math.round(severityRate * 100) / 100,
      nearMissReportingRate: Math.round(nearMissRate * 100) / 100,
      openActions,
      completedInspections: totalInspections,
      leading: { total: leadingTotal, closed: leadingClosed, closureRate: leadingTotal > 0 ? Math.round((leadingClosed/leadingTotal)*100) : 0 },
      lagging: { total: laggingTotal, closed: laggingClosed, closureRate: laggingTotal > 0 ? Math.round((laggingClosed/laggingTotal)*100) : 0 },
      actionsByCategory: byActionCategory,
      safetyScore: totalIncidents === 0 ? 100 : Math.max(0, 100 - (fatalities * 50) - (ltiCount * 20) - (rwcCount * 10) - (mtcCount * 5) - (nearMisses * 1))
    };
  }
};

const runCustomQuery: ToolDefinition = {
  name: 'run_custom_query',
  description: 'Run a read-only SQL query on the HSE database for complex analysis. Tables: incidents, actions, observations, inspections, permits, workers, contractors, assets, documents, stats_logs, emergency_contacts, emergency_drills. ONLY SELECT queries allowed.',
  parameters: {
    type: 'object',
    properties: {
      sql: { type: 'string', description: 'SQL SELECT query to execute' }
    },
    required: ['sql']
  },
  execute: (params) => {
    const sql = params.sql.trim();
    // Safety: only allow SELECT
    if (!sql.toUpperCase().startsWith('SELECT')) {
      return { error: 'Only SELECT queries are allowed for safety.' };
    }
    // Block dangerous keywords
    const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'ATTACH', 'DETACH'];
    for (const kw of forbidden) {
      if (sql.toUpperCase().includes(kw)) {
        return { error: `Query contains forbidden keyword: ${kw}` };
      }
    }
    try {
      const results = db.prepare(sql).all();
      return { rowCount: results.length, data: results.slice(0, 100) };
    } catch (err: any) {
      return { error: err.message };
    }
  }
};

const getOverduActions: ToolDefinition = {
  name: 'get_overdue_actions',
  description: 'Get all overdue corrective actions (due date has passed and status is not Done).',
  parameters: { type: 'object', properties: {} },
  execute: () => {
    return db.prepare(
      "SELECT * FROM actions WHERE status != 'Done' AND due_date < date('now') ORDER BY due_date ASC"
    ).all();
  }
};

const getExpiringPermits: ToolDefinition = {
  name: 'get_expiring_permits',
  description: 'Get permits that are expiring within the next 7 days or have already expired.',
  parameters: { type: 'object', properties: {} },
  execute: () => {
    return db.prepare(
      "SELECT * FROM permits WHERE status = 'Approved' AND valid_until < date('now', '+7 days') ORDER BY valid_until ASC"
    ).all();
  }
};

// ---------- EXPORT ALL TOOLS ----------

export const allTools: ToolDefinition[] = [
  queryIncidents,
  getIncidentStats,
  queryObservations,
  queryActions,
  queryPermits,
  queryWorkers,
  createIncident,
  createAction,
  calculateSafetyMetrics,
  runCustomQuery,
  getOverduActions,
  getExpiringPermits,
];

export const toolMap = new Map(allTools.map(t => [t.name, t]));

/**
 * Format tools for the Gemini function calling API
 */
export const getToolDeclarations = () => {
  return allTools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
};
