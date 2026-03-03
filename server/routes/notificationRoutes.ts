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

export default router;
