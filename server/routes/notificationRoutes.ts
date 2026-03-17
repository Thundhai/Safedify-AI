/**
 * Notification Routes — CRUD for in-app notifications
 * 
 * GET    /api/notifications           — list current user's notifications
 * GET    /api/notifications/unread     — count of unread
 * PUT    /api/notifications/:id/read   — mark one as read
 * PUT    /api/notifications/read-all   — mark all as read
 * DELETE /api/notifications/:id        — delete one
 */
import { Router, Response } from 'express';
import pool from '../postgres';
import { AuthRequest, authenticate } from '../auth.js';
import { validateParams, validateQuery, ValidationSchema } from '../middleware/inputValidation.js';

const router = Router();
router.use(authenticate);

// Validation schemas
const paginationQuerySchema: ValidationSchema = {
  limit: { type: 'number', required: false, min: 1, max: 200 },
  offset: { type: 'number', required: false, min: 0, max: 100000 },
};

const uuidParamSchema: ValidationSchema = {
  id: { type: 'uuid', required: true },
};

// ---------- List notifications for current user ----------
router.get('/', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [req.user!.id, limit, offset]
  );
  res.json(result.rows);
});

// ---------- Unread count ----------
router.get('/unread', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0',
    [req.user!.id]
  );
  const row = result.rows[0];
  res.json({ count: row?.count || 0 });
});

// ---------- Mark one as read ----------
router.put('/:id/read', validateParams(uuidParamSchema), async (req: AuthRequest, res: Response) => {
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2',
    [req.params.id as string, req.user!.id]
  );
  res.json({ message: 'Marked as read' });
});

// ---------- Mark all as read ----------
router.put('/read-all', async (req: AuthRequest, res: Response) => {
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = $1 AND is_read = 0',
    [req.user!.id]
  );
  res.json({ message: 'All marked as read' });
});

// ---------- Delete one ----------
router.delete('/:id', validateParams(uuidParamSchema), async (req: AuthRequest, res: Response) => {
  await pool.query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
    [req.params.id as string, req.user!.id]
  );
  res.json({ message: 'Deleted' });
});

// ============ NOTIFICATION PREFERENCES ============

// ---------- Get preferences ----------
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM notification_preferences WHERE user_id = $1',
    [req.user!.id]
  );
  const prefs = result.rows[0];
  // Return defaults if no preferences set
  if (!prefs) {
    return res.json({
      user_id: req.user!.id,
      email_incidents: true,
      email_permits: true,
      email_actions: true,
      email_training: true,
      email_observations: false,
      email_digest: true,
      in_app_all: true,
    });
  }
  // Convert DB integers/booleans
  res.json({
    user_id: prefs.user_id,
    email_incidents: !!prefs.email_incidents,
    email_permits: !!prefs.email_permits,
    email_actions: !!prefs.email_actions,
    email_training: !!prefs.email_training,
    email_observations: !!prefs.email_observations,
    email_digest: !!prefs.email_digest,
    in_app_all: !!prefs.in_app_all,
  });
});

// ---------- Update preferences ----------
router.put('/preferences', async (req: AuthRequest, res: Response) => {
  const {
    email_incidents = true,
    email_permits = true,
    email_actions = true,
    email_training = true,
    email_observations = false,
    email_digest = true,
    in_app_all = true,
  } = req.body;
  // Upsert preferences (PostgreSQL ON CONFLICT)
  await pool.query(`
    INSERT INTO notification_preferences (user_id, email_incidents, email_permits, email_actions, email_training, email_observations, email_digest, in_app_all, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT(user_id) DO UPDATE SET
      email_incidents = EXCLUDED.email_incidents,
      email_permits = EXCLUDED.email_permits,
      email_actions = EXCLUDED.email_actions,
      email_training = EXCLUDED.email_training,
      email_observations = EXCLUDED.email_observations,
      email_digest = EXCLUDED.email_digest,
      in_app_all = EXCLUDED.in_app_all,
      updated_at = EXCLUDED.updated_at
  `, [
    req.user!.id,
    email_incidents ? 1 : 0,
    email_permits ? 1 : 0,
    email_actions ? 1 : 0,
    email_training ? 1 : 0,
    email_observations ? 1 : 0,
    email_digest ? 1 : 0,
    in_app_all ? 1 : 0
  ]);
  res.json({ message: 'Preferences updated' });
});

export default router;
