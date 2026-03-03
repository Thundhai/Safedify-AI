/**
 * Full-Text Search — SQLite FTS5 across incidents, observations, actions, permits, documents
 * 
 * GET /api/search?q=keyword&type=incidents,observations&limit=50
 */
import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, authenticate } from '../auth.js';

const router = Router();
router.use(authenticate);

// ---------- FTS5 Virtual Tables ----------
try {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_incidents USING fts5(
      id UNINDEXED, description, location, type, category, severity, status,
      content='incidents', content_rowid='rowid'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_observations USING fts5(
      id UNINDEXED, description, location, type, category,
      content='observations', content_rowid='rowid'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_actions USING fts5(
      id UNINDEXED, title, description, assignee, category,
      content='actions', content_rowid='rowid'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_permits USING fts5(
      id UNINDEXED, type, location, description, status,
      content='permits', content_rowid='rowid'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_documents USING fts5(
      id UNINDEXED, title, category, content, ai_summary,
      content='documents', content_rowid='rowid'
    );
  `);
} catch {
  // Tables may already exist
}

// ---------- Rebuild FTS indexes ----------
const rebuildFTS = () => {
  try {
    const tables = ['fts_incidents', 'fts_observations', 'fts_actions', 'fts_permits', 'fts_documents'];
    for (const t of tables) {
      try { db.exec(`INSERT INTO ${t}(${t}) VALUES('rebuild')`); } catch {}
    }
  } catch {}
};

// Build FTS on startup (populate from content tables)
rebuildFTS();

// Rebuild periodically (every 5 minutes) to pick up new data
setInterval(rebuildFTS, 5 * 60 * 1000);

// ---------- Search route ----------

interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  date?: string;
  status?: string;
  rank: number;
}

router.get('/', (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) {
    res.status(400).json({ error: 'Search query must be at least 2 characters' });
    return;
  }

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
  const types = (req.query.type as string || '').split(',').map(t => t.trim()).filter(Boolean);

  // Escape special FTS5 characters
  const safeQ = q.replace(/['"*(){}[\]\\^~!@#$%&|<>?;:]/g, ' ').trim();
  if (!safeQ) {
    res.json({ results: [], total: 0 });
    return;
  }

  // Add prefix matching for better UX
  const ftsQuery = safeQ.split(/\s+/).map(w => `"${w}"*`).join(' ');
  const results: SearchResult[] = [];

  const searchConfigs = [
    {
      type: 'incident',
      table: 'fts_incidents',
      source: 'incidents',
      titleCol: 'description',
      snippetCols: 'description',
      dateCol: 'date',
      statusCol: 'status',
    },
    {
      type: 'observation',
      table: 'fts_observations',
      source: 'observations',
      titleCol: 'description',
      snippetCols: 'description',
      dateCol: 'date',
      statusCol: null,
    },
    {
      type: 'action',
      table: 'fts_actions',
      source: 'actions',
      titleCol: 'title',
      snippetCols: 'title, description',
      dateCol: 'created_at',
      statusCol: 'status',
    },
    {
      type: 'permit',
      table: 'fts_permits',
      source: 'permits',
      titleCol: 'description',
      snippetCols: 'description',
      dateCol: 'created_at',
      statusCol: 'status',
    },
    {
      type: 'document',
      table: 'fts_documents',
      source: 'documents',
      titleCol: 'title',
      snippetCols: 'title, content',
      dateCol: 'created_at',
      statusCol: 'status',
    },
  ];

  for (const cfg of searchConfigs) {
    if (types.length > 0 && !types.includes(cfg.type) && !types.includes(cfg.type + 's')) continue;

    try {
      const rows = db.prepare(
        `SELECT s.id, s.${cfg.titleCol} as title, rank
         FROM ${cfg.source} s
         JOIN ${cfg.table} f ON s.rowid = f.rowid
         WHERE ${cfg.table} MATCH ?
         ORDER BY rank
         LIMIT ?`
      ).all(ftsQuery, limit) as any[];

      for (const row of rows) {
        results.push({
          id: row.id,
          type: cfg.type,
          title: (row.title || '').slice(0, 200),
          snippet: (row.title || '').slice(0, 150),
          rank: row.rank,
        });
      }
    } catch {
      // FTS query syntax error — skip this table
    }
  }

  // Sort by rank (lower = more relevant in FTS5)
  results.sort((a, b) => a.rank - b.rank);

  res.json({
    query: q,
    total: results.length,
    results: results.slice(0, limit),
  });
});

// POST /api/search/rebuild — admin-only FTS rebuild
router.post('/rebuild', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  rebuildFTS();
  res.json({ message: 'FTS indexes rebuilt' });
});

export default router;
