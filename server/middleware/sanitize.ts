/**
 * Input sanitization middleware for Express
 * Strips or escapes dangerous content from request bodies
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Strip HTML tags from a string
 */
const stripTags = (str: string): string => {
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Escape HTML entities
 */
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Recursively sanitize object properties
 */
const sanitizeValue = (val: unknown, options: SanitizeOptions): unknown => {
  if (typeof val === 'string') {
    let cleaned = val.trim();
    if (options.stripTags) {
      cleaned = stripTags(cleaned);
    }
    if (options.escapeHtml) {
      cleaned = escapeHtml(cleaned);
    }
    // Limit string length
    if (options.maxLength && cleaned.length > options.maxLength) {
      cleaned = cleaned.slice(0, options.maxLength);
    }
    return cleaned;
  }
  if (Array.isArray(val)) {
    return val.map(v => sanitizeValue(v, options));
  }
  if (val && typeof val === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      // Sanitize keys too (prevent prototype pollution)
      const cleanKey = k.replace(/[^\w.-]/g, '_');
      if (cleanKey === '__proto__' || cleanKey === 'constructor' || cleanKey === 'prototype') {
        continue; // Skip dangerous keys
      }
      result[cleanKey] = sanitizeValue(v, options);
    }
    return result;
  }
  return val;
};

interface SanitizeOptions {
  stripTags?: boolean;
  escapeHtml?: boolean;
  maxLength?: number;
}

/**
 * Express middleware that sanitizes req.body
 * Call AFTER body-parser middleware
 */
export const sanitizeBody = (options: SanitizeOptions = { stripTags: true, maxLength: 10000 }) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body, options);
    }
    next();
  };
};

/**
 * Validate that required fields exist and are non-empty strings
 */
export const validateRequired = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter(f => {
      const val = req.body[f];
      return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
    });
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    next();
  };
};

export default sanitizeBody;
