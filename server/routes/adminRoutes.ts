/**
 * Automated SQLite Backup — scheduled backups to DATA_DIR/backups/
 * 
 * Runs on startup and then every BACKUP_INTERVAL_HOURS (default: 6).
 * Keeps BACKUP_RETENTION_COUNT (default: 10) most recent backups.
 * 
 * Admin API:
 *   POST /api/admin/backup          — trigger manual backup
 *   GET  /api/admin/backups         — list available backups
 *   GET  /api/admin/backups/:name   — download a backup
 */
import { Router, Response } from 'express';
import { copyFileSync, readdirSync, unlinkSync, mkdirSync, statSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { AuthRequest, authenticate, requireRole } from '../auth.js';
import { DB_PATH } from '../db.js';

const DATA_DIR = process.env.DATA_DIR || path.dirname(DB_PATH);
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const INTERVAL_HOURS = parseInt(process.env.BACKUP_INTERVAL_HOURS || '6');
const RETENTION = parseInt(process.env.BACKUP_RETENTION_COUNT || '10');

try { mkdirSync(BACKUP_DIR, { recursive: true }); } catch {}

// ---------- Backup Logic ----------

export const createBackup = (): string | null => {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `safedify-backup-${ts}.db`;
    const dest = path.join(BACKUP_DIR, filename);
    copyFileSync(DB_PATH, dest);
    console.log(`[Backup] Created: ${filename}`);
    pruneOld();
    return filename;
  } catch (err: any) {
    console.error('[Backup] Failed:', err.message);
    return null;
  }
};

const pruneOld = () => {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('safedify-backup-') && f.endsWith('.db'))
      .map(f => ({ name: f, time: statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    // Remove oldest beyond retention limit
    for (const file of files.slice(RETENTION)) {
      unlinkSync(path.join(BACKUP_DIR, file.name));
      console.log(`[Backup] Pruned old: ${file.name}`);
    }
  } catch {}
};

const listBackups = () => {
  try {
    return readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('safedify-backup-') && f.endsWith('.db'))
      .map(f => {
        const st = statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: st.size, created: st.mtime.toISOString() };
      })
      .sort((a, b) => b.created.localeCompare(a.created));
  } catch { return []; }
};

// ---------- Schedule ----------

// Initial backup on startup
setTimeout(() => createBackup(), 5000);

// Periodic backup
setInterval(() => createBackup(), INTERVAL_HOURS * 60 * 60 * 1000);

// ---------- Routes ----------

const router = Router();
router.use(authenticate);
router.use(requireRole('Admin'));

// POST /api/admin/backup — trigger manual backup
router.post('/backup', (_req: AuthRequest, res: Response) => {
  const filename = createBackup();
  if (filename) {
    res.json({ message: 'Backup created', filename });
  } else {
    res.status(500).json({ error: 'Backup failed' });
  }
});

// GET /api/admin/backups — list available backups
router.get('/backups', (_req: AuthRequest, res: Response) => {
  res.json(listBackups());
});

// GET /api/admin/backups/:name — download a backup file
router.get('/backups/:name', (req: AuthRequest, res: Response) => {
  const name = path.basename(req.params.name as string);
  if (!name.startsWith('safedify-backup-') || !name.endsWith('.db')) {
    res.status(400).json({ error: 'Invalid backup name' });
    return;
  }
  const filePath = path.join(BACKUP_DIR, name);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'Backup not found' });
    return;
  }
  const data = readFileSync(filePath);
  res.set('Content-Type', 'application/x-sqlite3');
  res.set('Content-Disposition', `attachment; filename="${name}"`);
  res.send(data);
});

export default router;
