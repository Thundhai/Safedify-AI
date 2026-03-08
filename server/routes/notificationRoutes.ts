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
import db from '../db.js';
import { AuthRequest, authenticate } from '../auth.js';

const router = Router();
router.use(authenticate);

// ---------- List notifications for current user ----------
router.get('/', (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const rows = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(req.user!.id, limit, offset);
  res.json(rows);
});

// ---------- Unread count ----------
router.get('/unread', (req: AuthRequest, res: Response) => {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(req.user!.id) as any;
  res.json({ count: row?.count || 0 });
});

// ---------- Mark one as read ----------
router.put('/:id/read', (req: AuthRequest, res: Response) => {
  db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).run(req.params.id as string, req.user!.id);
  res.json({ message: 'Marked as read' });
});

// ---------- Mark all as read ----------
router.put('/read-all', (req: AuthRequest, res: Response) => {
  db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
  ).run(req.user!.id);
  res.json({ message: 'All marked as read' });
});

// ---------- Delete one ----------
router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?'
  ).run(req.params.id as string, req.user!.id);
  res.json({ message: 'Deleted' });
});

// ============ NOTIFICATION PREFERENCES ============

// ---------- Get preferences ----------
router.get('/preferences', (req: AuthRequest, res: Response) => {
  const prefs = db.prepare(
    'SELECT * FROM notification_preferences WHERE user_id = ?'
  ).get(req.user!.id) as any;
  
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
  
  // Convert SQLite integers to booleans
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
router.put('/preferences', (req: AuthRequest, res: Response) => {
  const {
    email_incidents = true,
    email_permits = true,
    email_actions = true,
    email_training = true,
    email_observations = false,
    email_digest = true,
    in_app_all = true,
  } = req.body;
  
  // Upsert preferences
  db.prepare(`
    INSERT INTO notification_preferences (user_id, email_incidents, email_permits, email_actions, email_training, email_observations, email_digest, in_app_all, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      email_incidents = excluded.email_incidents,
      email_permits = excluded.email_permits,
      email_actions = excluded.email_actions,
      email_training = excluded.email_training,
      email_observations = excluded.email_observations,
      email_digest = excluded.email_digest,
      in_app_all = excluded.in_app_all,
      updated_at = excluded.updated_at
  `).run(
    req.user!.id,
    email_incidents ? 1 : 0,
    email_permits ? 1 : 0,
    email_actions ? 1 : 0,
    email_training ? 1 : 0,
    email_observations ? 1 : 0,
    email_digest ? 1 : 0,
    in_app_all ? 1 : 0
  );
  
  res.json({ message: 'Preferences updated' });
});

export default router;
