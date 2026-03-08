/**
 * Audit Logging — records all significant user actions for HSE compliance.
 * 
 * Captures: user, action, entity, timestamp, IP, details.
 * 
 * GET  /api/audit-logs          — list logs (Admin only)
 * GET  /api/audit-logs/export   — CSV export (Admin only)
 */
import { Router, Response, NextFunction } from 'express';
import db from '../db.js';
import { AuthRequest, authenticate, requireRole } from '../auth.js';
import { v4 as uuid } from 'uuid';

// ---------- Schema ----------
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type);
    CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
  `);
} catch {}

// ---------- Logger function ----------

export type AuditAction =
  | 'login' | 'login_failed' | 'login_2fa_required' | 'register' | 'logout'
  | 'password_reset_request' | 'password_reset'
  | 'create' | 'update' | 'delete'
  | 'export' | 'upload'
  | 'role_change' | 'permission_change'
  | '2fa_enabled' | '2fa_disabled' | '2fa_failed'
  | 'profile_update' | 'password_change';

export interface AuditEntry {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: string;
}

export const logAudit = (
  req: AuthRequest,
  entry: AuditEntry
) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    const ua = (req.headers['user-agent'] || '').slice(0, 256);
    db.prepare(
      `INSERT INTO audit_logs (id, user_id, user_email, user_role, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uuid(),
      req.user?.id || null,
      req.user?.email || (req.body?.email as string) || null,
      req.user?.role || null,
      entry.action,
      entry.entityType || null,
      entry.entityId || null,
      entry.details || null,
      ip,
      ua,
    );
  } catch (err: any) {
    console.error('[Audit] Write error:', err.message);
  }
};

// ---------- Auto-audit middleware (for data routes) ----------

/**
 * Attach to a router to automatically log POST/PUT/DELETE requests.
 * Must be placed AFTER authenticate middleware.
 */
export const auditMiddleware = (entityType: string) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    // We log after the route handler succeeds, using res.on('finish')
    const originalEnd = _res.end;
    const method = req.method.toUpperCase();

    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      _res.end = function (...args: any[]) {
        const statusCode = _res.statusCode;
        // Only log successful mutations
        if (statusCode >= 200 && statusCode < 300) {
          const actionMap: Record<string, AuditAction> = { POST: 'create', PUT: 'update', DELETE: 'delete' };
          logAudit(req, {
            action: actionMap[method] || 'update',
            entityType,
            entityId: req.params?.id || req.body?.id,
            details: method === 'DELETE' ? undefined : JSON.stringify(req.body || {}).slice(0, 500),
          });
        }
        return originalEnd.apply(_res, args as [any, BufferEncoding]);
      } as any;
    }

    next();
  };
};

// ---------- Routes ----------

const router = Router();
router.use(authenticate);
router.use(requireRole('Admin'));

// GET /api/audit-logs — paginated list
router.get('/', (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: any[] = [];

  if (req.query.action) { where.push('action = ?'); params.push(req.query.action); }
  if (req.query.entity_type) { where.push('entity_type = ?'); params.push(req.query.entity_type); }
  if (req.query.user_id) { where.push('user_id = ?'); params.push(req.query.user_id); }
  if (req.query.from) { where.push("created_at >= ?"); params.push(req.query.from); }
  if (req.query.to) { where.push("created_at <= ?"); params.push(req.query.to); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as c FROM audit_logs ${whereClause}`).get(...params) as any).c;
  const rows = db.prepare(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Per-Page', String(limit));
  res.set('X-Total-Pages', String(Math.ceil(total / limit)));
  res.json(rows);
});

// GET /api/audit-logs/export — CSV download
router.get('/export', (req: AuthRequest, res: Response) => {
  const where: string[] = [];
  const params: any[] = [];

  if (req.query.from) { where.push("created_at >= ?"); params.push(req.query.from); }
  if (req.query.to) { where.push("created_at <= ?"); params.push(req.query.to); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT 10000`
  ).all(...params) as any[];

  const csvHeader = 'Timestamp,User,Email,Role,Action,Entity Type,Entity ID,IP Address,Details\n';
  const csvRows = rows.map(r => {
    const escape = (v: any) => `"${String(v || '').replace(/"/g, '""')}"`;
    return [r.created_at, r.user_id, r.user_email, r.user_role, r.action, r.entity_type, r.entity_id, r.ip_address, r.details]
      .map(escape).join(',');
  }).join('\n');

  logAudit(req, { action: 'export', entityType: 'audit_logs', details: `Exported ${rows.length} records` });

  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csvHeader + csvRows);
});

export default router;
