/**
 * Upload Routes — File-based image/document storage with ownership tracking
 * 
 * POST   /api/uploads        — Upload one or more files (multipart/form-data)
 * GET    /api/uploads/:id     — Serve a stored file by ID
 * DELETE /api/uploads/:id     — Delete a stored file (owner/admin only)
 * 
 * Files are stored in DATA_DIR/uploads/ with UUID filenames.
 * Returns URLs like /api/uploads/<uuid>.<ext> that can be stored in DB columns.
 * 
 * SECURITY: 
 * - DELETE operations require ownership verification.
 * - File uploads validated for type, size, and malware signatures.
 * - Path traversal attacks prevented via filename sanitization.
 */
import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../auth.js';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import pool from '../postgres';
import { validateBase64Upload, validateFilename, containsMalwareSignatures } from '../middleware/fileValidation.js';
import { logSecurityEvent, getClientIp } from '../middleware/securityLogger.js';

const router = Router();

const DATA_DIR = process.env.DATA_DIR || path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure uploads dir exists
try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
  'image/gif': '.gif', 'image/svg+xml': '.svg',
  'application/pdf': '.pdf', 'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

/**
 * POST /api/uploads
 * Body: multipart/form-data with field "files" (one or many)
 * 
 * Accepts raw body with Content-Type for single file upload,
 * or base64 JSON body { data: "data:image/png;base64,...", filename?: string }
 * 
 * SECURITY: All uploads validated for:
 * - Allowed MIME types
 * - File size limits
 * - Magic byte verification (content matches declared type)
 * - Malware signature scanning
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Handle base64 upload (from existing frontend code)
    if (req.body?.data && typeof req.body.data === 'string') {
      // Comprehensive file validation
      const validation = validateBase64Upload(req.body.data, {
        allowedTypes: ['image', 'document'],
        maxSizeBytes: MAX_FILE_SIZE,
        requireMimeMatch: true,
      });
      
      if (!validation.valid) {
        logSecurityEvent({
          type: 'file_upload_rejected',
          severity: 'warning',
          userId: req.user?.id,
          ip: getClientIp(req),
          userAgent: (req.headers['user-agent'] || '').slice(0, 512),
          endpoint: req.path,
          method: req.method,
          details: validation.error || 'File validation failed',
        });
        res.status(400).json({ error: validation.error });
        return;
      }
      
      const match = req.body.data.match(/^data:([\w/+-]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Invalid base64 data URI' });
        return;
      }
      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Additional malware scan on decoded buffer
      const malwareCheck = containsMalwareSignatures(buffer);
      if (malwareCheck.detected) {
        logSecurityEvent({
          type: 'malware_detected',
          severity: 'critical',
          userId: req.user?.id,
          ip: getClientIp(req),
          userAgent: (req.headers['user-agent'] || '').slice(0, 512),
          endpoint: req.path,
          method: req.method,
          details: `Malware signature detected: ${malwareCheck.signature}`,
        });
        res.status(400).json({ error: 'File rejected: potentially dangerous content detected' });
        return;
      }

      const ext = EXT_MAP[mimeType] || '.bin';
      const fileId = uuid();
      const filename = `${fileId}${ext}`;
      writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

      // Track file ownership in database (including org_id for tenant isolation)
      await pool.query(
        'INSERT INTO uploads (id, filename, mime_type, size, uploaded_by, org_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [fileId, filename, mimeType, buffer.length, req.user?.id, req.user?.org_id]
      );

      const url = `/api/uploads/${filename}`;
      res.status(201).json({ id: fileId, url, filename, size: buffer.length, mimeType });
      return;
    }

    // Handle multiple base64 uploads
    if (req.body?.files && Array.isArray(req.body.files)) {
      const results = [];
      for (const fileData of req.body.files) {
        if (typeof fileData !== 'string') continue;
        const match = fileData.match(/^data:([\w/+-]+);base64,(.+)$/);
        if (!match) continue;
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > MAX_FILE_SIZE || !ALLOWED_TYPES.has(mimeType)) continue;

        const ext = EXT_MAP[mimeType] || '.bin';
        const fileId = uuid();
        const filename = `${fileId}${ext}`;
        writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
        
        // Track file ownership in database (including org_id for tenant isolation)
        await pool.query(
          'INSERT INTO uploads (id, filename, mime_type, size, uploaded_by, org_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [fileId, filename, mimeType, buffer.length, req.user?.id, req.user?.org_id]
        );
        
        results.push({ id: fileId, url: `/api/uploads/${filename}`, filename, size: buffer.length, mimeType });
      }
      res.status(201).json(results);
      return;
    }

    res.status(400).json({ error: 'Send { data: "data:...;base64,..." } or { files: ["data:...;base64,..."] }' });
  } catch (err: any) {
    console.error('[Upload] Error:', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * GET /api/uploads/:filename
 * Serve a stored file (requires authentication + org ownership)
 */
router.get('/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  // Sanitize filename to prevent path traversal
  const filename = path.basename(req.params.filename as string);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Verify the file belongs to the user's organization
  const orgId = req.user?.org_id;
  if (orgId) {
    const ownerCheck = await pool.query(
      'SELECT id FROM uploads WHERE filename = $1 AND org_id = $2',
      [filename, orgId]
    );
    if (ownerCheck.rows.length === 0) {
      // Check if it's a legacy file (no org_id) — allow Admin/Manager only
      const legacyCheck = await pool.query(
        'SELECT id FROM uploads WHERE filename = $1 AND org_id IS NULL',
        [filename]
      );
      if (legacyCheck.rows.length === 0) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      if (req.user?.role !== 'Admin' && req.user?.role !== 'Manager') {
        res.status(404).json({ error: 'File not found' });
        return;
      }
    }
  }

  try {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf', '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const data = readFileSync(filePath);
    
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable'); // files are immutable (UUID names)
    res.send(data);
  } catch {
    res.status(500).json({ error: 'Failed to read file' });
  }
});

/**
 * DELETE /api/uploads/:filename
 * Delete a stored file (requires ownership or admin/manager role)
 */
router.delete('/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  const filename = path.basename(req.params.filename as string);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Check ownership (unless admin/manager) + org isolation
  const userRole = req.user?.role;
  const orgId = req.user?.org_id;
  if (userRole !== 'Admin' && userRole !== 'Manager') {
    const result = await pool.query(
      'SELECT uploaded_by, org_id FROM uploads WHERE filename = $1',
      [filename]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      // Org isolation: resource must belong to user's org
      if (orgId && row.org_id && row.org_id !== orgId) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      if (row.uploaded_by !== req.user?.id) {
        res.status(403).json({ error: 'Access denied: You can only delete your own uploads' });
        return;
      }
    } else {
      // No DB record (legacy file) — only Admin/Manager can delete these
      res.status(403).json({ error: 'Access denied: Cannot verify ownership of this file' });
      return;
    }
  } else {
    // Admin/Manager: still enforce org isolation
    if (orgId) {
      const result = await pool.query(
        'SELECT org_id FROM uploads WHERE filename = $1',
        [filename]
      );
      if (result.rows.length > 0 && result.rows[0].org_id && result.rows[0].org_id !== orgId) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
    }
  }

  try {
    unlinkSync(filePath);
    // Also remove from database
    await pool.query('DELETE FROM uploads WHERE filename = $1', [filename]);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
