/**
 * Sanitization utilities for XSS protection
 * Uses DOMPurify to sanitize user-generated content
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content, removing dangerous tags/attributes
 * Use for any user-generated HTML that will be rendered with dangerouslySetInnerHTML
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Sanitize plain text, stripping all HTML
 * Use for text inputs that should not contain any HTML
 */
export const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize URL, ensuring it's safe (no javascript:, data:, etc.)
 */
export const sanitizeUrl = (url: string): string => {
  const cleaned = url.trim();
  // Block dangerous protocols
  if (/^(javascript|data|vbscript):/i.test(cleaned)) {
    return '';
  }
  return cleaned;
};

/**
 * Escape HTML entities for safe display in text context
 * Does NOT sanitize — just escapes < > & " '
 */
export const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
};

/**
 * Sanitize filename to prevent path traversal attacks
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[/\\?%*:|"<>]/g, '_')  // Remove dangerous chars
    .replace(/\.\./g, '_')            // Prevent path traversal
    .replace(/^\.+/, '_')             // Remove leading dots
    .slice(0, 255);                   // Limit length
};

/**
 * Sanitize object properties recursively (for JSON data)
 * Escapes all string values
 */
export const sanitizeObject = <T>(obj: T): T => {
  if (typeof obj === 'string') {
    return sanitizeText(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as T;
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[sanitizeText(key)] = sanitizeObject(value);
    }
    return result as T;
  }
  return obj;
};
