/**
 * Secure File Upload Validation
 * 
 * Validates file uploads to prevent:
 * - Malicious file types (executables, scripts)
 * - File type spoofing (MIME type mismatch)
 * - Oversized files
 * - Path traversal in filenames
 * - Embedded malware signatures
 * 
 * Usage:
 *   import { validateFileUpload, ALLOWED_FILE_TYPES } from './middleware/fileValidation.js';
 */

import { logSecurityEvent, getClientIp } from './securityLogger.js';
import { Request, Response, NextFunction } from 'express';

// ============================================================
// Allowed File Types Configuration
// ============================================================

export interface AllowedFileType {
  mimeTypes: string[];
  extensions: string[];
  maxSizeBytes: number;
  magicBytes?: number[][];  // File signature / magic number
}

export const ALLOWED_FILE_TYPES: Record<string, AllowedFileType> = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    magicBytes: [
      [0xFF, 0xD8, 0xFF],                // JPEG
      [0x89, 0x50, 0x4E, 0x47],           // PNG
      [0x52, 0x49, 0x46, 0x46],           // WebP (RIFF)
      [0x47, 0x49, 0x46, 0x38],           // GIF
    ],
  },
  document: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
    maxSizeBytes: 25 * 1024 * 1024, // 25 MB
    magicBytes: [
      [0x25, 0x50, 0x44, 0x46],           // PDF
      [0xD0, 0xCF, 0x11, 0xE0],           // DOC/XLS (OLE)
      [0x50, 0x4B, 0x03, 0x04],           // DOCX/XLSX (ZIP-based)
    ],
  },
};

// Dangerous file types that should NEVER be allowed
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.dll', '.com', '.bat', '.cmd', '.ps1', '.vbs', '.js', '.jse',
  '.wsf', '.wsh', '.msc', '.msi', '.msp', '.scr', '.pif', '.application',
  '.gadget', '.hta', '.cpl', '.msc', '.jar', '.sh', '.bash', '.run',
  '.app', '.deb', '.rpm', '.dmg', '.pkg', '.bin', '.command',
  '.php', '.php3', '.php4', '.php5', '.phtml', '.asp', '.aspx', '.jsp',
  '.cgi', '.pl', '.py', '.rb', '.pyc', '.pyo',
]);

// Dangerous MIME types
const DANGEROUS_MIME_TYPES = new Set([
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-shellscript',
  'application/x-php',
  'application/x-httpd-php',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
]);

// ============================================================
// Magic Byte Detection
// ============================================================

/**
 * Check if buffer starts with any of the expected magic bytes
 */
function matchesMagicBytes(buffer: Buffer, expected: number[][]): boolean {
  if (!expected || expected.length === 0) return true;
  
  for (const magic of expected) {
    if (buffer.length >= magic.length) {
      let matches = true;
      for (let i = 0; i < magic.length; i++) {
        if (buffer[i] !== magic[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
  }
  return false;
}

/**
 * Detect actual file type from magic bytes
 */
export function detectFileType(buffer: Buffer): { type: string; mimeType: string } | null {
  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { type: 'image', mimeType: 'image/jpeg' };
  }
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { type: 'image', mimeType: 'image/png' };
  }
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return { type: 'image', mimeType: 'image/gif' };
  }
  // WebP (RIFF....WEBP)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return { type: 'image', mimeType: 'image/webp' };
  }
  // PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { type: 'document', mimeType: 'application/pdf' };
  }
  // ZIP-based (DOCX, XLSX, etc.)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { type: 'document', mimeType: 'application/zip' };
  }
  // OLE compound (DOC, XLS)
  if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
    return { type: 'document', mimeType: 'application/msword' };
  }
  
  return null;
}

// ============================================================
// Malware Signature Detection
// ============================================================

/**
 * Check for known malware signatures/patterns in file content
 */
export function containsMalwareSignatures(buffer: Buffer): { detected: boolean; signature?: string } {
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 100000));
  
  // PHP code injection
  if (/<\?php/i.test(content) || /<\?=/i.test(content)) {
    return { detected: true, signature: 'PHP code' };
  }
  
  // JavaScript in images (polyglot attacks)
  if (/(function\s*\(|<script|javascript:|eval\s*\()/i.test(content)) {
    return { detected: true, signature: 'JavaScript code' };
  }
  
  // Shell commands
  if (/^#!/.test(content) || /\b(bash|sh|exec|system|passthru|shell_exec)\s*\(/i.test(content)) {
    return { detected: true, signature: 'Shell script' };
  }
  
  // Windows PE executable
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return { detected: true, signature: 'Windows executable' };
  }
  
  // ELF executable (Linux)
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return { detected: true, signature: 'Linux executable' };
  }
  
  // SVG with script (XSS vector)
  if (/<svg[\s\S]*?<script/i.test(content)) {
    return { detected: true, signature: 'SVG with script' };
  }
  
  return { detected: false };
}

// ============================================================
// File Upload Validation
// ============================================================

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  detectedType?: string;
  detectedMimeType?: string;
}

/**
 * Validate a base64-encoded file upload
 */
export function validateBase64Upload(dataUri: string, options: {
  allowedTypes?: ('image' | 'document')[];
  maxSizeBytes?: number;
  requireMimeMatch?: boolean;
} = {}): FileValidationResult {
  const allowedTypes = options.allowedTypes || ['image', 'document'];
  const requireMimeMatch = options.requireMimeMatch !== false;
  
  // Parse data URI
  const match = dataUri.match(/^data:([\w/+-]+);base64,(.+)$/);
  if (!match) {
    return { valid: false, error: 'Invalid data URI format' };
  }
  
  const [, declaredMimeType, base64Data] = match;
  
  // Decode base64
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    return { valid: false, error: 'Invalid base64 encoding' };
  }
  
  // Check declared MIME type against dangerous types
  if (DANGEROUS_MIME_TYPES.has(declaredMimeType)) {
    return { valid: false, error: `File type '${declaredMimeType}' is not allowed` };
  }
  
  // Size check
  const maxSize = options.maxSizeBytes || 10 * 1024 * 1024;
  if (buffer.length > maxSize) {
    return { valid: false, error: `File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)` };
  }
  
  // Detect actual file type from magic bytes
  const detectedType = detectFileType(buffer);
  
  // Verify MIME type matches declared
  if (requireMimeMatch && detectedType) {
    // For zip-based formats, allow mismatch since DOCX/XLSX are detected as ZIP
    if (detectedType.mimeType !== declaredMimeType && 
        !(detectedType.mimeType === 'application/zip' && declaredMimeType.includes('officedocument'))) {
      return { 
        valid: false, 
        error: `File type mismatch: declared ${declaredMimeType}, detected ${detectedType.mimeType}` 
      };
    }
  }
  
  // Check against allowed categories
  let isAllowed = false;
  for (const category of allowedTypes) {
    const config = ALLOWED_FILE_TYPES[category];
    if (config.mimeTypes.includes(declaredMimeType)) {
      isAllowed = true;
      break;
    }
  }
  
  if (!isAllowed) {
    return { valid: false, error: `File type '${declaredMimeType}' is not in allowed types` };
  }
  
  // Check for malware signatures
  const malwareCheck = containsMalwareSignatures(buffer);
  if (malwareCheck.detected) {
    return { valid: false, error: `Potentially dangerous content detected: ${malwareCheck.signature}` };
  }
  
  return {
    valid: true,
    detectedType: detectedType?.type,
    detectedMimeType: detectedType?.mimeType || declaredMimeType,
  };
}

/**
 * Validate and sanitize a filename
 */
export function validateFilename(filename: string): FileValidationResult {
  if (typeof filename !== 'string' || filename.length === 0) {
    return { valid: false, error: 'Filename is required' };
  }
  
  // Check extension
  const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension '${ext}' is not allowed` };
  }
  
  // Sanitize filename
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Only safe characters
    .replace(/\.{2,}/g, '.')           // No multiple dots
    .replace(/^[.-]/, '_')             // Don't start with dot/dash
    .slice(0, 255);                    // Max length
  
  // Check for path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, error: 'Invalid filename' };
  }
  
  return { valid: true, sanitizedFilename: sanitized };
}

// ============================================================
// Express Middleware
// ============================================================

/**
 * Middleware to validate file uploads in request body
 */
export function validateFileUpload(options: {
  field?: string;            // Body field containing file data (default: 'data')
  multipleField?: string;    // Body field containing array of files (default: 'files')
  allowedTypes?: ('image' | 'document')[];
  maxSizeBytes?: number;
  maxFiles?: number;
} = {}) {
  const field = options.field || 'data';
  const multipleField = options.multipleField || 'files';
  const maxFiles = options.maxFiles || 10;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    
    // Single file upload
    if (body?.[field] && typeof body[field] === 'string') {
      const result = validateBase64Upload(body[field], {
        allowedTypes: options.allowedTypes,
        maxSizeBytes: options.maxSizeBytes,
      });
      
      if (!result.valid) {
        logSecurityEvent({
          type: 'file_upload_rejected',
          severity: 'warning',
          ip: getClientIp(req),
          userAgent: (req.headers['user-agent'] || '').slice(0, 512),
          endpoint: req.path,
          method: req.method,
          details: result.error || 'Invalid file upload',
        });
        
        res.status(400).json({ error: result.error });
        return;
      }
    }
    
    // Multiple file upload
    if (body?.[multipleField] && Array.isArray(body[multipleField])) {
      if (body[multipleField].length > maxFiles) {
        res.status(400).json({ error: `Too many files (max ${maxFiles})` });
        return;
      }
      
      for (let i = 0; i < body[multipleField].length; i++) {
        const fileData = body[multipleField][i];
        if (typeof fileData !== 'string') continue;
        
        const result = validateBase64Upload(fileData, {
          allowedTypes: options.allowedTypes,
          maxSizeBytes: options.maxSizeBytes,
        });
        
        if (!result.valid) {
          logSecurityEvent({
            type: 'file_upload_rejected',
            severity: 'warning',
            ip: getClientIp(req),
            userAgent: (req.headers['user-agent'] || '').slice(0, 512),
            endpoint: req.path,
            method: req.method,
            details: `File ${i + 1}: ${result.error}`,
          });
          
          res.status(400).json({ error: `File ${i + 1}: ${result.error}` });
          return;
        }
      }
    }
    
    next();
  };
}
