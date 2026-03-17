/**
 * Audit Logging — records all significant user actions for HSE compliance.
 * 
 * Captures: user, action, entity, timestamp, IP, details.
 * 
 * GET  /api/audit-logs          — list logs (Admin only)
 * GET  /api/audit-logs/export   — CSV export (Admin only)
 */
import { Router, Response, NextFunction } from 'express';
import pool from '../postgres';
import { AuthRequest, authenticate, requireRole } from '../auth.js';
import { v4 as uuid } from 'uuid';

// Schema creation removed; handled by postgres-schema.sql

// ---------- Logger function ----------

export type AuditAction =
  | 'login' | 'login_failed' | 'login_2fa_required' | 'register' | 'logout'
  | 'password_reset_request' | 'password_reset'
  | 'create' | 'update' | 'delete'
  | 'export' | 'upload'
  | 'role_change' | 'permission_change'
  | '2fa_enabled' | '2fa_disabled' | '2fa_failed'
  | 'profile_update' | 'password_change'
  | 'account_locked' | 'login_blocked_locked'
  | 'email_verified' | 'verification_resent';

export interface AuditEntry {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: string;
}

export const logAudit = async (
  req: AuthRequest,
  entry: AuditEntry
) => {
  try {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const ua = (req.headers['user-agent'] || '').slice(0, 256);
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_email, user_role, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
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
      ]
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
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: any[] = [];

  if (req.query.action) { where.push('action = $' + (params.length + 1)); params.push(req.query.action); }
  if (req.query.entity_type) { where.push('entity_type = $' + (params.length + 1)); params.push(req.query.entity_type); }
  if (req.query.user_id) { where.push('user_id = $' + (params.length + 1)); params.push(req.query.user_id); }
  if (req.query.from) { where.push('created_at >= $' + (params.length + 1)); params.push(req.query.from); }
  if (req.query.to) { where.push('created_at <= $' + (params.length + 1)); params.push(req.query.to); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalResult = await pool.query(`SELECT COUNT(*) as c FROM audit_logs ${whereClause}`, params);
  const total = totalResult.rows[0]?.c || 0;
  const rowsResult = await pool.query(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const rows = rowsResult.rows;

  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Per-Page', String(limit));
  res.set('X-Total-Pages', String(Math.ceil(total / limit)));
  res.json(rows);
});

// GET /api/audit-logs/export — CSV download
router.get('/export', async (req: AuthRequest, res: Response) => {
  const where: string[] = [];
  const params: any[] = [];

  if (req.query.from) { where.push('created_at >= $' + (params.length + 1)); params.push(req.query.from); }
  if (req.query.to) { where.push('created_at <= $' + (params.length + 1)); params.push(req.query.to); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rowsResult = await pool.query(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT 10000`,
    params
  );
  const rows = rowsResult.rows;

  const csvHeader = 'Timestamp,User,Email,Role,Action,Entity Type,Entity ID,IP Address,Details\n';
  const csvRows = rows.map((r: any) => {
    const escape = (v: any) => `"${String(v || '').replace(/"/g, '""')}"`;
    return [r.created_at, r.user_id, r.user_email, r.user_role, r.action, r.entity_type, r.entity_id, r.ip_address, r.details]
      .map(escape).join(',');
  }).join('\n');

  await logAudit(req, { action: 'export', entityType: 'audit_logs', details: `Exported ${rows.length} records` });

  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csvHeader + csvRows);
});

export default router;
