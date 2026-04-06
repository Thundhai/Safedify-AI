/**
 * Agent Tools — callable functions the AI agent can invoke
 * Each tool has: name, description, parameters schema, and execute function
 * 
 * SECURITY: All tools receive org_id context and scope queries to the user's organization.
 * This prevents cross-tenant data leakage through the AI agent.
 */
import pool from '../postgres';
import { v4 as uuid } from 'uuid';

export interface ToolContext {
  orgId?: string;
  userId?: string;
  userName?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any, ctx?: ToolContext) => any;
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
  execute: async (params, ctx?: ToolContext) => {
    // Tracing: log tool call
    console.log(`[AgentTool] query_incidents called with params:`, params);
    let query = 'SELECT * FROM incidents WHERE org_id = $1';
    const binds: any[] = [ctx?.orgId || null];
    let idx = 2;
    if (params.type) { query += ` AND type = $${idx}`; binds.push(params.type); idx++; }
    if (params.category) { query += ` AND category = $${idx}`; binds.push(params.category); idx++; }
    if (params.severity) { query += ` AND severity = $${idx}`; binds.push(params.severity); idx++; }
    if (params.status) { query += ` AND status = $${idx}`; binds.push(params.status); idx++; }
    if (params.location) { query += ` AND location LIKE $${idx}`; binds.push(`%${params.location}%`); idx++; }
    query += ` ORDER BY created_at DESC LIMIT $${idx}`;
    binds.push(params.limit || 20);
    const result = await pool.query(query, binds);
    // Tracing: log result count
    console.log(`[AgentTool] query_incidents result count:`, result.rows.length);
    return result.rows;
  }
};

const getIncidentStats: ToolDefinition = {
  name: 'get_incident_stats',
  description: 'Get aggregate incident statistics: counts by type, category (OSHA), severity, status, monthly trends, days lost, and overall totals. Category hierarchy: Near Miss → First Aid Case → Medical Treatment Case → Restricted Work Case → Lost Time Injury → Fatality.',
  parameters: { type: 'object', properties: {} },
  execute: async (_params, ctx?: ToolContext) => {
    const orgFilter = 'WHERE org_id = $1';
    const orgBind = [ctx?.orgId || null];
    const totalResult = await pool.query(`SELECT COUNT(*) as c FROM incidents ${orgFilter}`, orgBind);
    const total = totalResult.rows[0]?.c || 0;
    const byType = (await pool.query(`SELECT type, COUNT(*) as count FROM incidents ${orgFilter} GROUP BY type`, orgBind)).rows;
    const byCategory = (await pool.query(`SELECT category, COUNT(*) as count FROM incidents ${orgFilter} GROUP BY category`, orgBind)).rows;
    const bySeverity = (await pool.query(`SELECT severity, COUNT(*) as count FROM incidents ${orgFilter} GROUP BY severity`, orgBind)).rows;
    const byStatus = (await pool.query(`SELECT status, COUNT(*) as count FROM incidents ${orgFilter} GROUP BY status`, orgBind)).rows;
    const monthly = (await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM') as month, COUNT(*) as count FROM incidents ${orgFilter} GROUP BY month ORDER BY month DESC LIMIT 12`, orgBind)).rows;
    const manHoursResult = await pool.query(`SELECT COALESCE(SUM(man_hours),0) as total FROM stats_logs ${orgFilter}`, orgBind);
    const manHours = manHoursResult.rows[0]?.total || 0;
    const totalDaysLostResult = await pool.query(`SELECT COALESCE(SUM(days_lost),0) as total FROM incidents ${orgFilter}`, orgBind);
    const totalDaysLost = totalDaysLostResult.rows[0]?.total || 0;
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
  execute: async (params, ctx?: ToolContext) => {
    let query = 'SELECT * FROM observations WHERE org_id = $1';
    const binds: any[] = [ctx?.orgId || null];
    let idx = 2;
    if (params.type) { query += ` AND type = $${idx}`; binds.push(params.type); idx++; }
    if (params.category) { query += ` AND category = $${idx}`; binds.push(params.category); idx++; }
    if (params.status) { query += ` AND status = $${idx}`; binds.push(params.status); idx++; }
    query += ` ORDER BY created_at DESC LIMIT $${idx}`;
    binds.push(params.limit || 20);
    const result = await pool.query(query, binds);
    return result.rows;
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
  execute: async (params, ctx?: ToolContext) => {
    let query = 'SELECT * FROM actions WHERE org_id = $1';
    const binds: any[] = [ctx?.orgId || null];
    let idx = 2;
    if (params.status) { query += ` AND status = $${idx}`; binds.push(params.status); idx++; }
    if (params.priority) { query += ` AND priority = $${idx}`; binds.push(params.priority); idx++; }
    if (params.assignee) { query += ` AND assignee LIKE $${idx}`; binds.push(`%${params.assignee}%`); idx++; }
    if (params.action_type) { query += ` AND action_type = $${idx}`; binds.push(params.action_type); idx++; }
    if (params.indicator) { query += ` AND indicator = $${idx}`; binds.push(params.indicator); idx++; }
    if (params.category) { query += ` AND category = $${idx}`; binds.push(params.category); idx++; }
    query += ` ORDER BY created_at DESC LIMIT $${idx}`;
    binds.push(params.limit || 20);
    const result = await pool.query(query, binds);
    return result.rows;
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
  execute: async (params, ctx?: ToolContext) => {
    let query = 'SELECT * FROM permits WHERE org_id = $1';
    const binds: any[] = [ctx?.orgId || null];
    let idx = 2;
    if (params.type) { query += ` AND type = $${idx}`; binds.push(params.type); idx++; }
    if (params.status) { query += ` AND status = $${idx}`; binds.push(params.status); idx++; }
    if (params.location) { query += ` AND location LIKE $${idx}`; binds.push(`%${params.location}%`); idx++; }
    query += ` ORDER BY created_at DESC LIMIT $${idx}`;
    binds.push(params.limit || 20);
    const result = await pool.query(query, binds);
    return result.rows;
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
  execute: async (params, ctx?: ToolContext) => {
    let query = 'SELECT * FROM workers WHERE org_id = $1';
    const binds: any[] = [ctx?.orgId || null];
    let idx = 2;
    if (params.role) { query += ` AND role = $${idx}`; binds.push(params.role); idx++; }
    if (params.department) { query += ` AND department = $${idx}`; binds.push(params.department); idx++; }
    if (params.name) { query += ` AND name LIKE $${idx}`; binds.push(`%${params.name}%`); idx++; }
    query += ` ORDER BY created_at DESC LIMIT $${idx}`;
    binds.push(params.limit || 50);
    const result = await pool.query(query, binds);
    return result.rows;
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
  execute: async (params, ctx?: ToolContext) => {
    const id = uuid();
    await pool.query(
      `INSERT INTO incidents (id, description, location, date, type, category, severity, status, reported_by, days_lost, body_part, mechanism, immediate_action, org_id)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, 'Open', $7, $8, $9, $10, $11, $12)`,
      [id, params.description, params.location || 'Not specified', params.type, params.category || 'Near Miss', params.severity, params._userId || ctx?.userId || null, params.days_lost || 0, params.body_part, params.mechanism, params.immediate_action, ctx?.orgId || null]
    );
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
  execute: async (params, ctx?: ToolContext) => {
    const id = uuid();
    await pool.query(
      'INSERT INTO actions (id, title, description, assignee, due_date, priority, status, action_type, category, indicator, related_incident_id, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [id, params.title, params.description, params.assignee, params.due_date, params.priority || 'Medium', 'Open', params.action_type || 'Corrective', params.category || 'Other', params.indicator || 'Lagging', params.related_incident_id, ctx?.orgId || null]
    );
    return { success: true, id, message: `Action "${params.title}" created as ${params.indicator || 'Lagging'} / ${params.action_type || 'Corrective'}` };
  }
};

const calculateSafetyMetrics: ToolDefinition = {
  name: 'calculate_safety_metrics',
  description: 'Calculate HSE KPIs including TRIR, LTIFR, severity rate, leading/lagging indicator performance, action closure rates by type, and incident category breakdown (OSHA pyramid).',
  parameters: { type: 'object', properties: {} },
  execute: async (_params, ctx?: ToolContext) => {
    const orgFilter = 'WHERE org_id = $1';
    const orgBind = [ctx?.orgId || null];
    const totalIncidents = (await pool.query(`SELECT COUNT(*) as c FROM incidents ${orgFilter}`, orgBind)).rows[0]?.c || 0;
    const ltiCount = (await pool.query(`SELECT COUNT(*) as c FROM incidents ${orgFilter} AND category = 'Lost Time Injury'`, orgBind)).rows[0]?.c || 0;
    const rwcCount = (await pool.query(`SELECT COUNT(*) as c FROM incidents ${orgFilter} AND category = 'Restricted Work Case'`, orgBind)).rows[0]?.c || 0;
    const mtcCount = (await pool.query(`SELECT COUNT(*) as c FROM incidents ${orgFilter} AND category = 'Medical Treatment Case'`, orgBind)).rows[0]?.c || 0;
    const facCount = (await pool.query(`SELECT COUNT(*) as c FROM incidents ${orgFilter} AND category = 'First Aid Case'`, orgBind)).rows[0]?.c || 0;
    const nearMisses = (await pool.query(`SELECT COUNT(*) as c FROM incidents ${orgFilter} AND category = 'Near Miss'`, orgBind)).rows[0]?.c || 0;
    const fatalities = (await pool.query(`SELECT COUNT(*) as c FROM incidents ${orgFilter} AND category = 'Fatality'`, orgBind)).rows[0]?.c || 0;
    const totalDaysLost = (await pool.query(`SELECT COALESCE(SUM(days_lost),0) as t FROM incidents ${orgFilter}`, orgBind)).rows[0]?.t || 0;
    const manHours = (await pool.query(`SELECT COALESCE(SUM(man_hours),0) as t FROM stats_logs ${orgFilter}`, orgBind)).rows[0]?.t || 0;
    const openActions = (await pool.query(`SELECT COUNT(*) as c FROM actions ${orgFilter} AND status NOT IN ('Done','Verified')`, orgBind)).rows[0]?.c || 0;
    const totalInspections = (await pool.query(`SELECT COUNT(*) as c FROM inspections ${orgFilter} AND completed = 1`, orgBind)).rows[0]?.c || 0;

    const recordable = mtcCount + rwcCount + ltiCount + fatalities;
    const trir = manHours > 0 ? (recordable / manHours) * 200000 : 0;
    const ltifr = manHours > 0 ? (ltiCount / manHours) * 1000000 : 0;
    const severityRate = manHours > 0 ? (totalDaysLost / manHours) * 200000 : 0;
    const nearMissRate = manHours > 0 ? (nearMisses / manHours) * 200000 : 0;

    // Leading / Lagging action breakdown
    const leadingTotal = (await pool.query(`SELECT COUNT(*) as c FROM actions ${orgFilter} AND indicator = 'Leading'`, orgBind)).rows[0]?.c || 0;
    const leadingClosed = (await pool.query(`SELECT COUNT(*) as c FROM actions ${orgFilter} AND indicator = 'Leading' AND status IN ('Done','Verified')`, orgBind)).rows[0]?.c || 0;
    const laggingTotal = (await pool.query(`SELECT COUNT(*) as c FROM actions ${orgFilter} AND indicator = 'Lagging'`, orgBind)).rows[0]?.c || 0;
    const laggingClosed = (await pool.query(`SELECT COUNT(*) as c FROM actions ${orgFilter} AND indicator = 'Lagging' AND status IN ('Done','Verified')`, orgBind)).rows[0]?.c || 0;
    const byActionCategory = (await pool.query(`SELECT category, indicator, action_type, COUNT(*) as count FROM actions ${orgFilter} GROUP BY category, indicator, action_type`, orgBind)).rows;

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
  execute: async (params, ctx?: ToolContext) => {
    const sql = params.sql.trim();
    // Safety: only allow SELECT statements (must start with SELECT after stripping comments)
    const stripped = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim();
    if (!stripped.toUpperCase().startsWith('SELECT')) {
      return { error: 'Only SELECT queries are allowed for safety.' };
    }
    // Block dangerous keywords (case-insensitive, word-boundary matching to avoid false positives)
    const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'ATTACH', 'DETACH', 'PRAGMA', 'REPLACE', 'TRUNCATE', 'GRANT', 'REVOKE', 'COPY', 'EXECUTE', 'EXEC'];
    const upper = stripped.toUpperCase();
    for (const kw of forbidden) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(upper)) {
        return { error: `Query contains forbidden keyword: ${kw}` };
      }
    }
    // Block access to sensitive tables
    const sensitiveTablePatterns = ['users', 'password_reset_tokens', 'agent_conversations', 'email_verification_tokens', 'security_logs', 'blocked_ips', 'organizations', 'roles', 'pg_catalog', 'information_schema', 'pg_tables'];
    for (const table of sensitiveTablePatterns) {
      const regex = new RegExp(`\\b${table}\\b`, 'i');
      if (regex.test(stripped)) {
        return { error: `Access to table "${table}" is not allowed for security reasons.` };
      }
    }
    // Block semicolons to prevent statement chaining
    if (stripped.includes(';')) {
      return { error: 'Multiple statements are not allowed.' };
    }
    // Enforce org_id scoping: inject WHERE org_id = $1 if the query references org-scoped tables
    const orgScopedTables = ['incidents', 'actions', 'observations', 'inspections', 'permits', 'workers', 'contractors', 'assets', 'documents', 'stats_logs'];
    const referencedOrgTable = orgScopedTables.find(t => new RegExp(`\\b${t}\\b`, 'i').test(stripped));
    if (referencedOrgTable && !stripped.toLowerCase().includes('org_id')) {
      return { error: `Custom queries on "${referencedOrgTable}" must include an org_id filter. Your query was rejected for tenant safety. Use a specific tool instead.` };
    }
    try {
      // If the query mentions org_id, pass the user's org_id as $1
      const hasOrgParam = stripped.includes('$1');
      const result = hasOrgParam 
        ? await pool.query(sql, [ctx?.orgId || null])
        : await pool.query(sql);
      return { rowCount: result.rows.length, data: result.rows.slice(0, 100) };
    } catch (err: any) {
      return { error: 'Query execution failed. Please check your SQL syntax.' };
    }
  }
};

const getOverdueActions: ToolDefinition = {
  name: 'get_overdue_actions',
  description: 'Get all overdue corrective actions (due date has passed and status is not Done).',
  parameters: { type: 'object', properties: {} },
  execute: async (_params, ctx?: ToolContext) => {
    return (await pool.query(
      "SELECT * FROM actions WHERE org_id = $1 AND status != 'Done' AND due_date < NOW() ORDER BY due_date ASC",
      [ctx?.orgId || null]
    )).rows;
  }
};

const getExpiringPermits: ToolDefinition = {
  name: 'get_expiring_permits',
  description: 'Get permits that are expiring within the next 7 days or have already expired.',
  parameters: { type: 'object', properties: {} },
  execute: async (_params, ctx?: ToolContext) => {
    return (await pool.query(
      "SELECT * FROM permits WHERE org_id = $1 AND status = 'Active' AND valid_until < NOW() + INTERVAL '7 days' ORDER BY valid_until ASC",
      [ctx?.orgId || null]
    )).rows;
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
  getOverdueActions,
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
