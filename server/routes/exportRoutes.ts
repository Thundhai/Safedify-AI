/**
 * Export Routes — CSV and JSON export for HSE data
 * 
 * GET /api/export/:entity?format=csv|json&from=&to=
 */
import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, authenticate, requirePermission } from '../auth.js';
import { logAudit } from './auditRoutes.js';

const router = Router();
router.use(authenticate);
router.use(requirePermission('view_analytics'));

const EXPORTABLE: Record<string, { table: string; dateCol: string; columns: string[] }> = {
  incidents: {
    table: 'incidents',
    dateCol: 'date',
    columns: ['id', 'description', 'location', 'date', 'type', 'category', 'severity', 'status', 'reported_by', 'department', 'days_lost', 'body_part', 'mechanism', 'shift', 'created_at'],
  },
  observations: {
    table: 'observations',
    dateCol: 'date',
    columns: ['id', 'type', 'category', 'description', 'location', 'date', 'observer', 'status', 'immediate_action', 'created_at'],
  },
  actions: {
    table: 'actions',
    dateCol: 'created_at',
    columns: ['id', 'title', 'description', 'assignee', 'due_date', 'completed_date', 'priority', 'status', 'action_type', 'category', 'indicator', 'effectiveness', 'created_at'],
  },
  inspections: {
    table: 'inspections',
    dateCol: 'date',
    columns: ['id', 'template_name', 'title', 'date', 'location', 'score', 'completed', 'created_at'],
  },
  permits: {
    table: 'permits',
    dateCol: 'created_at',
    columns: ['id', 'type', 'location', 'description', 'valid_from', 'valid_until', 'requestor', 'approver', 'status', 'created_at'],
  },
  workers: {
    table: 'workers',
    dateCol: 'created_at',
    columns: ['id', 'name', 'role', 'department', 'company_id', 'joined_date', 'email', 'phone', 'points', 'level', 'created_at'],
  },
  contractors: {
    table: 'contractors',
    dateCol: 'created_at',
    columns: ['id', 'name', 'contact_person', 'email', 'phone', 'status', 'compliance_score', 'created_at'],
  },
  assets: {
    table: 'assets',
    dateCol: 'created_at',
    columns: ['id', 'name', 'category', 'model_number', 'serial_number', 'location', 'status', 'last_inspection_date', 'next_inspection_date', 'created_at'],
  },
  'risk-assessments': {
    table: 'risk_assessments',
    dateCol: 'date',
    columns: ['id', 'title', 'task_description', 'type', 'date', 'author', 'status', 'created_at'],
  },
  training: {
    table: 'training_records',
    dateCol: 'completion_date',
    columns: ['id', 'worker_id', 'module_title', 'completion_date', 'expiry_date', 'status', 'created_at'],
  },
};

router.get('/:entity', (req: AuthRequest, res: Response) => {
  const entity = req.params.entity;
  const config = EXPORTABLE[entity];
  if (!config) {
    res.status(400).json({ error: `Unknown entity: ${entity}. Available: ${Object.keys(EXPORTABLE).join(', ')}` });
    return;
  }

  const format = (req.query.format as string || 'csv').toLowerCase();
  const from = req.query.from as string;
  const to = req.query.to as string;

  const where: string[] = [];
  const params: any[] = [];
  if (from) { where.push(`${config.dateCol} >= ?`); params.push(from); }
  if (to) { where.push(`${config.dateCol} <= ?`); params.push(to); }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const selectCols = config.columns.join(', ');
  const rows = db.prepare(
    `SELECT ${selectCols} FROM ${config.table} ${whereClause} ORDER BY ${config.dateCol} DESC LIMIT 10000`
  ).all(...params) as any[];

  logAudit(req, { action: 'export', entityType: entity, details: `Exported ${rows.length} ${entity} as ${format}` });

  if (format === 'json') {
    res.set('Content-Disposition', `attachment; filename="${entity}-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(rows);
    return;
  }

  // CSV
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csvHeader = config.columns.join(',') + '\n';
  const csvRows = rows.map(r => config.columns.map(c => escape(r[c])).join(',')).join('\n');

  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', `attachment; filename="${entity}-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csvHeader + csvRows);
});

export default router;
