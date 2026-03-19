/**
 * Full-Text Search — PostgreSQL FTS across incidents, observations, actions, permits, documents
 * 
 * Uses PostgreSQL's built-in full-text search with:
 * - to_tsvector() for document indexing
 * - plainto_tsquery() for query parsing
 * - ts_rank() for relevance scoring
 * - ts_headline() for snippet generation with highlights
 * 
 * GET /api/search?q=keyword&type=incidents,observations&limit=50
 * 
 * SECURITY: Query parameters validated and sanitized to prevent injection attacks.
 */
import { Router, Response } from 'express';
import pool from '../postgres';
import { AuthRequest, authenticate } from '../auth.js';
import { validateQuery, sanitizeString } from '../middleware/inputValidation.js';

const router = Router();
router.use(authenticate);

// Helper: check if user has privileged role (Admin/Manager see all data)
function isPrivilegedRole(role?: string): boolean {
  return role === 'Admin' || role === 'Manager';
}

// ---------- Query Parameter Validation ----------
const searchQuerySchema = {
  q: { type: 'string' as const, required: true, minLength: 2, maxLength: 500, sanitize: true },
  type: { type: 'string' as const, maxLength: 200 },
  limit: { type: 'number' as const, min: 1, max: 100, default: 30 },
};

// ---------- PostgreSQL Full-Text Search Configuration ----------
const FTS_CONFIG = 'english'; // PostgreSQL text search configuration

/**
 * Convert user query to PostgreSQL tsquery format
 * Handles partial matches and multiple words
 */
function toTsQuery(query: string): string {
  // Split into words, filter empty, add :* for prefix matching
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '';
  // Use & (AND) between words, :* for prefix matching
  return words.map(w => w.replace(/[^a-zA-Z0-9]/g, '') + ':*').join(' & ');
}

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

router.get('/', validateQuery(searchQuerySchema), async (req: AuthRequest, res: Response) => {
  // Use validated and sanitized query parameters
  const validated = (req as any).validatedQuery || {};
  const q = sanitizeString(validated.q || (req.query.q as string) || '', { stripHtml: true, maxLength: 500 }).trim();
  
  if (!q || q.length < 2) {
    res.status(400).json({ error: 'Search query must be at least 2 characters' });
    return;
  }

  const limit = Math.min(100, Math.max(1, validated.limit || parseInt(req.query.limit as string) || 30));
  const typeParam = sanitizeString(validated.type || (req.query.type as string) || '', { stripHtml: true, maxLength: 200 });
  const types = typeParam.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  
  // Validate type values
  const allowedTypes = ['incident', 'incidents', 'observation', 'observations', 'action', 'actions', 'permit', 'permits', 'document', 'documents'];
  const validTypes = types.filter(t => allowedTypes.includes(t));
  
  const results: SearchResult[] = [];

  // Convert query to tsquery format (already sanitized - only alphanumeric allowed)
  const tsQuery = toTsQuery(q);
  if (!tsQuery) {
    res.json({ query: q, total: 0, results: [] });
    return;
  }

  try {
    // Incidents - search description (scoped by reported_by for non-privileged users)
    if (validTypes.length === 0 || validTypes.includes('incident') || validTypes.includes('incidents')) {
      const privileged = isPrivilegedRole(req.user?.role);
      const ownerFilter = privileged ? '' : ' AND reported_by = $4';
      const incParams = privileged ? [FTS_CONFIG, tsQuery, limit] : [FTS_CONFIG, tsQuery, limit, req.user?.id];
      const incRows = (await pool.query(
        `SELECT id, description, date, status,
                ts_rank(to_tsvector($1, COALESCE(description, '')), to_tsquery($1, $2)) as rank,
                ts_headline($1, COALESCE(description, ''), to_tsquery($1, $2), 
                  'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as snippet
         FROM incidents 
         WHERE to_tsvector($1, COALESCE(description, '')) @@ to_tsquery($1, $2)${ownerFilter}
         ORDER BY rank DESC
         LIMIT $3`,
        incParams
      )).rows;
      for (const row of incRows) {
        results.push({
          id: row.id,
          type: 'incident',
          title: (row.description || '').slice(0, 200),
          snippet: row.snippet || (row.description || '').slice(0, 150),
          date: row.date,
          status: row.status,
          rank: parseFloat(row.rank) || 0,
        });
      }
    }

    // Observations - search description (scoped by created_by for non-privileged users)
    if (types.length === 0 || types.includes('observation') || types.includes('observations')) {
      const privileged = isPrivilegedRole(req.user?.role);
      const ownerFilter = privileged ? '' : ' AND created_by = $4';
      const obsParams = privileged ? [FTS_CONFIG, tsQuery, limit] : [FTS_CONFIG, tsQuery, limit, req.user?.id];
      const obsRows = (await pool.query(
        `SELECT id, description, date,
                ts_rank(to_tsvector($1, COALESCE(description, '')), to_tsquery($1, $2)) as rank,
                ts_headline($1, COALESCE(description, ''), to_tsquery($1, $2),
                  'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as snippet
         FROM observations 
         WHERE to_tsvector($1, COALESCE(description, '')) @@ to_tsquery($1, $2)${ownerFilter}
         ORDER BY rank DESC
         LIMIT $3`,
        obsParams
      )).rows;
      for (const row of obsRows) {
        results.push({
          id: row.id,
          type: 'observation',
          title: (row.description || '').slice(0, 200),
          snippet: row.snippet || (row.description || '').slice(0, 150),
          date: row.date,
          rank: parseFloat(row.rank) || 0,
        });
      }
    }

    // Actions - search title and description (scoped by created_by/assignee for non-privileged users)
    if (types.length === 0 || types.includes('action') || types.includes('actions')) {
      const privileged = isPrivilegedRole(req.user?.role);
      const ownerFilter = privileged ? '' : ' AND (created_by = $4 OR assignee = $4)';
      const actParams = privileged ? [FTS_CONFIG, tsQuery, limit] : [FTS_CONFIG, tsQuery, limit, req.user?.id];
      const actRows = (await pool.query(
        `SELECT id, title, description, created_at as date, status,
                ts_rank(to_tsvector($1, COALESCE(title, '') || ' ' || COALESCE(description, '')), to_tsquery($1, $2)) as rank,
                ts_headline($1, COALESCE(title, '') || ' ' || COALESCE(description, ''), to_tsquery($1, $2),
                  'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as snippet
         FROM actions 
         WHERE to_tsvector($1, COALESCE(title, '') || ' ' || COALESCE(description, '')) @@ to_tsquery($1, $2)${ownerFilter}
         ORDER BY rank DESC
         LIMIT $3`,
        actParams
      )).rows;
      for (const row of actRows) {
        results.push({
          id: row.id,
          type: 'action',
          title: (row.title || '').slice(0, 200),
          snippet: row.snippet || (row.title || '').slice(0, 150),
          date: row.date,
          status: row.status,
          rank: parseFloat(row.rank) || 0,
        });
      }
    }

    // Permits - search description (scoped by created_by for non-privileged users)
    if (types.length === 0 || types.includes('permit') || types.includes('permits')) {
      const privileged = isPrivilegedRole(req.user?.role);
      const ownerFilter = privileged ? '' : ' AND created_by = $4';
      const perParams = privileged ? [FTS_CONFIG, tsQuery, limit] : [FTS_CONFIG, tsQuery, limit, req.user?.id];
      const perRows = (await pool.query(
        `SELECT id, description, created_at as date, status,
                ts_rank(to_tsvector($1, COALESCE(description, '')), to_tsquery($1, $2)) as rank,
                ts_headline($1, COALESCE(description, ''), to_tsquery($1, $2),
                  'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as snippet
         FROM permits 
         WHERE to_tsvector($1, COALESCE(description, '')) @@ to_tsquery($1, $2)${ownerFilter}
         ORDER BY rank DESC
         LIMIT $3`,
        perParams
      )).rows;
      for (const row of perRows) {
        results.push({
          id: row.id,
          type: 'permit',
          title: (row.description || '').slice(0, 200),
          snippet: row.snippet || (row.description || '').slice(0, 150),
          date: row.date,
          status: row.status,
          rank: parseFloat(row.rank) || 0,
        });
      }
    }

    // Documents - search title and content
    if (types.length === 0 || types.includes('document') || types.includes('documents')) {
      const docRows = (await pool.query(
        `SELECT id, title, content, created_at as date,
                ts_rank(to_tsvector($1, COALESCE(title, '') || ' ' || COALESCE(content, '')), to_tsquery($1, $2)) as rank,
                ts_headline($1, COALESCE(title, '') || ' ' || COALESCE(content, ''), to_tsquery($1, $2),
                  'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as snippet
         FROM documents 
         WHERE to_tsvector($1, COALESCE(title, '') || ' ' || COALESCE(content, '')) @@ to_tsquery($1, $2)
         ORDER BY rank DESC
         LIMIT $3`,
        [FTS_CONFIG, tsQuery, limit]
      )).rows;
      for (const row of docRows) {
        results.push({
          id: row.id,
          type: 'document',
          title: (row.title || '').slice(0, 200),
          snippet: row.snippet || (row.title || '').slice(0, 150),
          date: row.date,
          rank: parseFloat(row.rank) || 0,
        });
      }
    }

    // Sort all results by rank descending
    results.sort((a, b) => b.rank - a.rank);

    res.json({
      query: q,
      total: results.length,
      results: results.slice(0, limit),
    });
  } catch (err: any) {
    console.error('[Search] FTS error:', err.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

export default router;
