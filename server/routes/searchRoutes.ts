/**
 * Full-Text Search — SQLite FTS5 across incidents, observations, actions, permits, documents
 * 
 * GET /api/search?q=keyword&type=incidents,observations&limit=50
 */
import { Router, Response } from 'express';
import pool from '../postgres';
import { AuthRequest, authenticate } from '../auth.js';

const router = Router();
router.use(authenticate);

// ---------- FTS5 Virtual Tables ----------
// PostgreSQL does not support FTS5 virtual tables like SQLite. We'll use ILIKE for basic search.

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

router.get('/', async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) {
    res.status(400).json({ error: 'Search query must be at least 2 characters' });
    return;
  }

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
  const types = (req.query.type as string || '').split(',').map(t => t.trim()).filter(Boolean);
  const results: SearchResult[] = [];

  // Helper for ILIKE search
  const searchLike = `%${q.replace(/%/g, '')}%`;

  // Incidents
  if (types.length === 0 || types.includes('incident') || types.includes('incidents')) {
    const incRows = (await pool.query(
      `SELECT id, description as title, date, status FROM incidents WHERE description ILIKE $1 LIMIT $2`,
      [searchLike, limit]
    )).rows;
    for (const row of incRows) {
      results.push({
        id: row.id,
        type: 'incident',
        title: (row.title || '').slice(0, 200),
        snippet: (row.title || '').slice(0, 150),
        date: row.date,
        status: row.status,
        rank: 0,
      });
    }
  }
  // Observations
  if (types.length === 0 || types.includes('observation') || types.includes('observations')) {
    const obsRows = (await pool.query(
      `SELECT id, description as title, date FROM observations WHERE description ILIKE $1 LIMIT $2`,
      [searchLike, limit]
    )).rows;
    for (const row of obsRows) {
      results.push({
        id: row.id,
        type: 'observation',
        title: (row.title || '').slice(0, 200),
        snippet: (row.title || '').slice(0, 150),
        date: row.date,
        rank: 0,
      });
    }
  }
  // Actions
  if (types.length === 0 || types.includes('action') || types.includes('actions')) {
    const actRows = (await pool.query(
      `SELECT id, title, created_at as date, status FROM actions WHERE title ILIKE $1 OR description ILIKE $1 LIMIT $2`,
      [searchLike, limit]
    )).rows;
    for (const row of actRows) {
      results.push({
        id: row.id,
        type: 'action',
        title: (row.title || '').slice(0, 200),
        snippet: (row.title || '').slice(0, 150),
        date: row.date,
        status: row.status,
        rank: 0,
      });
    }
  }
  // Permits
  if (types.length === 0 || types.includes('permit') || types.includes('permits')) {
    const perRows = (await pool.query(
      `SELECT id, description as title, created_at as date, status FROM permits WHERE description ILIKE $1 LIMIT $2`,
      [searchLike, limit]
    )).rows;
    for (const row of perRows) {
      results.push({
        id: row.id,
        type: 'permit',
        title: (row.title || '').slice(0, 200),
        snippet: (row.title || '').slice(0, 150),
        date: row.date,
        status: row.status,
        rank: 0,
      });
    }
  }
  // Documents
  if (types.length === 0 || types.includes('document') || types.includes('documents')) {
    const docRows = (await pool.query(
      `SELECT id, title, created_at as date FROM documents WHERE title ILIKE $1 OR content ILIKE $1 LIMIT $2`,
      [searchLike, limit]
    )).rows;
    for (const row of docRows) {
      results.push({
        id: row.id,
        type: 'document',
        title: (row.title || '').slice(0, 200),
        snippet: (row.title || '').slice(0, 150),
        date: row.date,
        rank: 0,
      });
    }
  }

  res.json({
    query: q,
    total: results.length,
    results: results.slice(0, limit),
  });
});

// POST /api/search/rebuild — admin-only FTS rebuild
// FTS rebuild endpoint is not needed for PostgreSQL version

export default router;
