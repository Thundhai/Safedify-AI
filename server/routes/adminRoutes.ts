import { Router, Response } from 'express';
import { authenticate, requireRole, type AuthRequest } from '../auth.js';
import pool from '../postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
router.use(authenticate);
router.use(requireRole('Admin'));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

// GET /api/admin/backups — List available backups
router.get('/backups', (_req: AuthRequest, res: Response) => {
  if (!fs.existsSync(BACKUPS_DIR)) {
    res.json([]);
    return;
  }
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('safedify-backup-'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, f));
      return { filename: f, size: stat.size, created: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.created.localeCompare(a.created));
  res.json(files);
});

// POST /api/admin/backup — Create a manual backup marker
router.post('/backup', (_req: AuthRequest, res: Response) => {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `safedify-backup-${timestamp}.json`;
  const filepath = path.join(BACKUPS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify({ created: new Date().toISOString(), type: 'manual' }));
  res.json({ filename, message: 'Backup created' });
});

// GET /api/admin/errors — Last 100 api_error events from security_logs (Admin only)
router.get('/errors', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, event_type, severity, user_id, email, ip_address, endpoint, method,
              status_code, details, metadata, created_at
       FROM security_logs
       WHERE event_type = 'api_error'
       ORDER BY created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
