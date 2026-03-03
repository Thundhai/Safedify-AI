/**
 * Upload Routes — File-based image/document storage
 * 
 * POST   /api/uploads        — Upload one or more files (multipart/form-data)
 * GET    /api/uploads/:id     — Serve a stored file by ID
 * DELETE /api/uploads/:id     — Delete a stored file
 * 
 * Files are stored in DATA_DIR/uploads/ with UUID filenames.
 * Returns URLs like /api/uploads/<uuid>.<ext> that can be stored in DB columns.
 */
import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../auth.js';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';

const router = Router();

const DATA_DIR = process.env.DATA_DIR || path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure uploads dir exists
try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
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
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Handle base64 upload (from existing frontend code)
    if (req.body?.data && typeof req.body.data === 'string') {
      const match = req.body.data.match(/^data:([\w/+-]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Invalid base64 data URI' });
        return;
      }
      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > MAX_FILE_SIZE) {
        res.status(413).json({ error: 'File too large (max 10MB)' });
        return;
      }
      if (!ALLOWED_TYPES.has(mimeType)) {
        res.status(400).json({ error: `File type ${mimeType} not allowed` });
        return;
      }

      const ext = EXT_MAP[mimeType] || '.bin';
      const fileId = uuid();
      const filename = `${fileId}${ext}`;
      writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

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
 * Serve a stored file
 */
router.get('/:filename', (req: AuthRequest, res: Response) => {
  // Sanitize filename to prevent path traversal
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
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
 */
router.delete('/:filename', authenticate, (req: AuthRequest, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  try {
    unlinkSync(filePath);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
