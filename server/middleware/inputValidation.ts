/**
 * Comprehensive Input Validation Module
 * 
 * Provides strict validation and sanitization for all user inputs to prevent:
 * - SQL Injection
 * - Command Injection
 * - XSS (Script Injection)
 * - Path Traversal
 * - Unsafe File Uploads
 * - Type Coercion Attacks
 * 
 * Usage:
 *   import { validate, ValidationSchema, sanitize } from './middleware/inputValidation.js';
 *   router.post('/endpoint', validate(schema), handler);
 */

import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent, getClientIp } from './securityLogger.js';

// ============================================================
// Dangerous Pattern Detection
// ============================================================

/**
 * SQL Injection patterns to detect and block
 */
const SQL_INJECTION_PATTERNS = [
  // Classic SQL keywords in suspicious positions
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE)\b.*\b(FROM|INTO|TABLE|DATABASE|SCHEMA)\b)/i,
  // UNION SELECT attacks
  /\bUNION\s+(ALL\s+)?SELECT\b/i,
  // Comment-based bypass
  /(--|#|\/\*|\*\/)/,
  // Boolean-based blind injection
  /\b(OR|AND)\s+[\d\w]+\s*=\s*[\d\w]+/i,
  // Time-based blind injection
  /\b(SLEEP|WAITFOR|DELAY|BENCHMARK)\s*\(/i,
  // Stacked queries
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE)/i,
  // PostgreSQL specific
  /(\$\$|PG_SLEEP|PG_READ_FILE)/i,
  // Hex encoding bypass
  /0x[0-9a-fA-F]+/,
  // Char/concat obfuscation
  /\b(CHAR|CHR|CONCAT)\s*\(/i,
];

/**
 * Command injection patterns to detect and block
 */
const COMMAND_INJECTION_PATTERNS = [
  // Shell command separators
  /[;&|`$]/,
  // Command substitution
  /\$\(|\$\{|`/,
  // Common dangerous commands
  /\b(rm|mv|cp|cat|wget|curl|bash|sh|nc|netcat|python|perl|ruby|php|node)\b/i,
  // Path to shell
  /(\/bin\/|\/usr\/bin\/|\/etc\/)/,
  // Windows command injection
  /\b(cmd|powershell|wscript|cscript)\b/i,
  // Null byte injection
  /\x00/,
  // Environment variable access
  /\$[A-Z_]+/,
];

/**
 * XSS patterns to detect and block
 */
const XSS_PATTERNS = [
  // Script tags
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  // Event handlers
  /\bon\w+\s*=/gi,
  // JavaScript protocol
  /javascript\s*:/gi,
  // vbscript protocol
  /vbscript\s*:/gi,
  // Data URIs with script
  /data\s*:[^,]*;base64[^,]*,/gi,
  // Expression (IE)
  /expression\s*\(/gi,
  // SVG with script
  /<svg[\s\S]*?onload/gi,
  // iframe
  /<iframe/gi,
  // Object/embed
  /<(object|embed|applet)/gi,
  // Import/link injection
  /<link[\s\S]*?href/gi,
  // Form action hijacking
  /<form[\s\S]*?action/gi,
  // Meta refresh redirect
  /<meta[\s\S]*?http-equiv/gi,
];

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/, 
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.\.%2f/gi,
  /%252e%252e%252f/gi,
  /\.%2e\//gi,
  /%2e\.\//gi,
];

// ============================================================
// Detection Functions
// ============================================================

export interface DetectionResult {
  detected: boolean;
  type: 'sql_injection' | 'command_injection' | 'xss' | 'path_traversal';
  pattern?: string;
  value?: string;
}

/**
 * Check string for SQL injection attempts
 */
export function detectSqlInjection(value: string): DetectionResult {
  if (typeof value !== 'string') return { detected: false, type: 'sql_injection' };
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return { detected: true, type: 'sql_injection', pattern: pattern.source, value: value.slice(0, 100) };
    }
  }
  return { detected: false, type: 'sql_injection' };
}

/**
 * Check string for command injection attempts
 */
export function detectCommandInjection(value: string): DetectionResult {
  if (typeof value !== 'string') return { detected: false, type: 'command_injection' };
  
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return { detected: true, type: 'command_injection', pattern: pattern.source, value: value.slice(0, 100) };
    }
  }
  return { detected: false, type: 'command_injection' };
}

/**
 * Check string for XSS attempts
 */
export function detectXss(value: string): DetectionResult {
  if (typeof value !== 'string') return { detected: false, type: 'xss' };
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      return { detected: true, type: 'xss', pattern: pattern.source, value: value.slice(0, 100) };
    }
  }
  return { detected: false, type: 'xss' };
}

/**
 * Check string for path traversal attempts
 */
export function detectPathTraversal(value: string): DetectionResult {
  if (typeof value !== 'string') return { detected: false, type: 'path_traversal' };
  
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(value)) {
      return { detected: true, type: 'path_traversal', pattern: pattern.source, value: value.slice(0, 100) };
    }
  }
  return { detected: false, type: 'path_traversal' };
}

/**
 * Run all injection detection on a value
 */
export function detectAllInjections(value: string): DetectionResult | null {
  const checks = [
    detectSqlInjection(value),
    detectCommandInjection(value),
    detectXss(value),
    detectPathTraversal(value),
  ];
  
  for (const result of checks) {
    if (result.detected) return result;
  }
  return null;
}

// ============================================================
// Sanitization Functions
// ============================================================

/**
 * Remove/escape dangerous characters
 */
export function sanitizeString(value: string, options: {
  maxLength?: number;
  stripHtml?: boolean;
  escapeHtml?: boolean;
  allowedChars?: RegExp;
  trim?: boolean;
} = {}): string {
  if (typeof value !== 'string') return '';
  
  let result = value;
  
  // Trim whitespace
  if (options.trim !== false) {
    result = result.trim();
  }
  
  // Strip all HTML tags
  if (options.stripHtml) {
    result = result.replace(/<[^>]*>/g, '');
  }
  
  // Escape HTML entities
  if (options.escapeHtml) {
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // Filter to allowed characters only
  if (options.allowedChars) {
    result = result.split('').filter(c => options.allowedChars!.test(c)).join('');
  }
  
  // Truncate to max length
  if (options.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
  }
  
  // Remove null bytes
  result = result.replace(/\x00/g, '');
  
  return result;
}

/**
 * Sanitize for safe use in filenames
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return 'unnamed';
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Only allow safe chars
    .replace(/\.{2,}/g, '.')           // No multiple dots
    .replace(/^[.-]/, '_')             // Don't start with dot or dash
    .slice(0, 255);                    // Max filename length
}

/**
 * Sanitize for safe use in SQL identifiers (table/column names)
 * Only use when absolutely necessary - prefer parameterized queries
 */
export function sanitizeSqlIdentifier(identifier: string): string {
  if (typeof identifier !== 'string') return '';
  
  // Only allow alphanumeric and underscore
  return identifier.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 64);
}

/**
 * Sanitize UUID format
 */
export function sanitizeUuid(value: string): string | null {
  if (typeof value !== 'string') return null;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value.toLowerCase() : null;
}

// ============================================================
// Validation Schema Types
// ============================================================

type ValidatorFn = (value: any, fieldName: string) => { valid: boolean; error?: string; value?: any };

export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'uuid' | 'date' | 'url';
  required?: boolean;
  default?: any;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  trim?: boolean;                // If true, trim whitespace
  allowHtml?: boolean;           // If false (default), strip HTML
  allowInjection?: boolean;      // If false (default), check for injections
  sanitize?: boolean;            // If true, sanitize instead of reject
  arrayOf?: FieldSchema;         // For array type
  properties?: ValidationSchema; // For object type
  custom?: ValidatorFn;          // Custom validation function
}

export interface ValidationSchema {
  [field: string]: FieldSchema;
}

// ============================================================
// Built-in Validators
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;

function validateField(value: any, schema: FieldSchema, fieldName: string): { valid: boolean; error?: string; sanitized?: any } {
  // Handle undefined/null
  if (value === undefined || value === null || value === '') {
    if (schema.required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, sanitized: schema.default };
  }
  
  let sanitized = value;
  
  // Type validation
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, error: `${fieldName} must be a string` };
      }
      
      // Check for injection attacks (unless explicitly allowed)
      if (!schema.allowInjection) {
        const injection = detectAllInjections(value);
        if (injection) {
          if (schema.sanitize) {
            // Sanitize instead of reject
            sanitized = sanitizeString(value, { stripHtml: true, escapeHtml: true, maxLength: schema.maxLength });
          } else {
            return { valid: false, error: `${fieldName} contains potentially dangerous content (${injection.type})` };
          }
        }
      }
      
      // Strip HTML unless allowed
      if (!schema.allowHtml && typeof sanitized === 'string') {
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      }
      
      // String length validation
      if (schema.minLength && sanitized.length < schema.minLength) {
        return { valid: false, error: `${fieldName} must be at least ${schema.minLength} characters` };
      }
      if (schema.maxLength && sanitized.length > schema.maxLength) {
        if (schema.sanitize) {
          sanitized = sanitized.slice(0, schema.maxLength);
        } else {
          return { valid: false, error: `${fieldName} must be at most ${schema.maxLength} characters` };
        }
      }
      
      // Pattern validation
      if (schema.pattern && !schema.pattern.test(sanitized)) {
        return { valid: false, error: `${fieldName} format is invalid` };
      }
      break;
      
    case 'email':
      if (typeof value !== 'string' || !EMAIL_REGEX.test(value.trim())) {
        return { valid: false, error: `${fieldName} must be a valid email address` };
      }
      sanitized = value.trim().toLowerCase();
      if (schema.maxLength && sanitized.length > schema.maxLength) {
        return { valid: false, error: `${fieldName} is too long` };
      }
      break;
      
    case 'uuid':
      if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
        return { valid: false, error: `${fieldName} must be a valid UUID` };
      }
      sanitized = value.toLowerCase();
      break;
      
    case 'url':
      if (typeof value !== 'string' || !URL_REGEX.test(value)) {
        return { valid: false, error: `${fieldName} must be a valid URL` };
      }
      // Check for javascript: or data: protocols
      if (/^(javascript|data|vbscript):/i.test(value)) {
        return { valid: false, error: `${fieldName} contains an unsafe URL protocol` };
      }
      break;
      
    case 'date':
      if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) {
        // Try parsing as date
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) {
          return { valid: false, error: `${fieldName} must be a valid date` };
        }
        sanitized = parsed.toISOString();
      }
      break;
      
    case 'number':
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) {
        return { valid: false, error: `${fieldName} must be a number` };
      }
      if (schema.min !== undefined && num < schema.min) {
        return { valid: false, error: `${fieldName} must be at least ${schema.min}` };
      }
      if (schema.max !== undefined && num > schema.max) {
        return { valid: false, error: `${fieldName} must be at most ${schema.max}` };
      }
      sanitized = num;
      break;
      
    case 'boolean':
      if (typeof value === 'boolean') {
        sanitized = value;
      } else if (value === 'true' || value === '1') {
        sanitized = true;
      } else if (value === 'false' || value === '0') {
        sanitized = false;
      } else {
        return { valid: false, error: `${fieldName} must be a boolean` };
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        return { valid: false, error: `${fieldName} must be an array` };
      }
      if (schema.minLength && value.length < schema.minLength) {
        return { valid: false, error: `${fieldName} must have at least ${schema.minLength} items` };
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        return { valid: false, error: `${fieldName} must have at most ${schema.maxLength} items` };
      }
      if (schema.arrayOf) {
        const sanitizedArray = [];
        for (let i = 0; i < value.length; i++) {
          const result = validateField(value[i], schema.arrayOf, `${fieldName}[${i}]`);
          if (!result.valid) return result;
          sanitizedArray.push(result.sanitized);
        }
        sanitized = sanitizedArray;
      }
      break;
      
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { valid: false, error: `${fieldName} must be an object` };
      }
      if (schema.properties) {
        const result = validateObject(value, schema.properties);
        if (!result.valid) return result;
        sanitized = result.sanitized;
      }
      break;
  }
  
  // Enum validation
  if (schema.enum && !schema.enum.includes(sanitized)) {
    return { valid: false, error: `${fieldName} must be one of: ${schema.enum.join(', ')}` };
  }
  
  // Custom validation
  if (schema.custom) {
    const customResult = schema.custom(sanitized, fieldName);
    if (!customResult.valid) {
      return { valid: false, error: customResult.error };
    }
    if (customResult.value !== undefined) {
      sanitized = customResult.value;
    }
  }
  
  return { valid: true, sanitized };
}

function validateObject(data: any, schema: ValidationSchema): { valid: boolean; error?: string; sanitized?: any } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Request body must be an object' };
  }
  
  const sanitized: any = {};
  
  // Validate each field in schema
  for (const [field, fieldSchema] of Object.entries(schema)) {
    const result = validateField(data[field], fieldSchema, field);
    if (!result.valid) {
      return result;
    }
    if (result.sanitized !== undefined) {
      sanitized[field] = result.sanitized;
    }
  }
  
  // Copy non-schema fields (for flexibility) but sanitize them
  for (const [field, value] of Object.entries(data)) {
    if (!(field in schema)) {
      // Skip prototype pollution keys
      if (field === '__proto__' || field === 'constructor' || field === 'prototype') {
        continue;
      }
      // Basic sanitization for unexpected fields
      if (typeof value === 'string') {
        const injection = detectAllInjections(value);
        if (injection) {
          return { valid: false, error: `Field '${field}' contains potentially dangerous content` };
        }
        sanitized[field] = sanitizeString(value, { stripHtml: true, maxLength: 10000 });
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[field] = value;
      } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        // Deep sanitize arrays and objects
        sanitized[field] = JSON.parse(JSON.stringify(value, (_, v) => {
          if (typeof v === 'string') {
            const inj = detectAllInjections(v);
            if (inj) throw new Error(`Dangerous content in nested field`);
            return sanitizeString(v, { stripHtml: true, maxLength: 10000 });
          }
          return v;
        }));
      }
    }
  }
  
  return { valid: true, sanitized };
}

// ============================================================
// Express Middleware
// ============================================================

/**
 * Validation middleware factory
 * 
 * Usage:
 *   router.post('/endpoint', validate({
 *     email: { type: 'email', required: true },
 *     name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
 *     age: { type: 'number', min: 0, max: 150 },
 *   }), handler);
 */
export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validateObject(req.body, schema);
    
    if (!result.valid) {
      logSecurityEvent({
        type: 'validation_failed',
        severity: 'warning',
        ip: getClientIp(req),
        userAgent: (req.headers['user-agent'] || '').slice(0, 512),
        endpoint: req.path,
        method: req.method,
        details: result.error || 'Validation failed',
      });
      
      res.status(400).json({ error: result.error });
      return;
    }
    
    // Replace body with sanitized version
    req.body = result.sanitized;
    next();
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validateObject(req.query as any, schema);
    
    if (!result.valid) {
      logSecurityEvent({
        type: 'validation_failed',
        severity: 'warning',
        ip: getClientIp(req),
        userAgent: (req.headers['user-agent'] || '').slice(0, 512),
        endpoint: req.path,
        method: req.method,
        details: `Query validation: ${result.error}`,
      });
      
      res.status(400).json({ error: result.error });
      return;
    }
    
    // Replace query with sanitized version
    (req as any).validatedQuery = result.sanitized;
    next();
  };
}

/**
 * Validate URL parameters
 */
export function validateParams(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validateObject(req.params, schema);
    
    if (!result.valid) {
      res.status(400).json({ error: result.error });
      return;
    }
    
    // Store validated params
    (req as any).validatedParams = result.sanitized;
    next();
  };
}

/**
 * Generic injection detection middleware - scans all request data
 */
export function detectInjections(options: { logOnly?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const checkValue = (value: any, path: string): DetectionResult | null => {
      if (typeof value === 'string') {
        return detectAllInjections(value);
      }
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const result = checkValue(value[i], `${path}[${i}]`);
          if (result) return result;
        }
      } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          const result = checkValue(v, `${path}.${k}`);
          if (result) return result;
        }
      }
      return null;
    };
    
    // Check body
    const bodyResult = req.body ? checkValue(req.body, 'body') : null;
    // Check query
    const queryResult = req.query ? checkValue(req.query, 'query') : null;
    // Check params
    const paramsResult = req.params ? checkValue(req.params, 'params') : null;
    
    const detected = bodyResult || queryResult || paramsResult;
    
    if (detected) {
      logSecurityEvent({
        type: 'injection_attempt',
        severity: 'critical',
        ip: getClientIp(req),
        userAgent: (req.headers['user-agent'] || '').slice(0, 512),
        endpoint: req.path,
        method: req.method,
        details: `${detected.type} detected: ${detected.pattern}`,
      });
      
      if (!options.logOnly) {
        res.status(400).json({ 
          error: 'Invalid input detected',
          code: 'MALICIOUS_INPUT',
        });
        return;
      }
    }
    
    next();
  };
}

// ============================================================
// Common Validation Schemas
// ============================================================

export const commonSchemas = {
  id: { type: 'uuid' as const, required: true },
  
  email: { type: 'email' as const, required: true, maxLength: 255 },
  
  password: { 
    type: 'string' as const, 
    required: true, 
    minLength: 8, 
    maxLength: 128,
    allowInjection: true, // Passwords can contain special chars
  },
  
  name: { 
    type: 'string' as const, 
    required: true, 
    minLength: 2, 
    maxLength: 100,
    pattern: /^[a-zA-Z\s'-]+$/,
  },
  
  description: {
    type: 'string' as const,
    maxLength: 10000,
    sanitize: true,
  },
  
  pagination: {
    page: { type: 'number' as const, min: 1, max: 10000, default: 1 },
    limit: { type: 'number' as const, min: 1, max: 200, default: 50 },
  },
  
  searchQuery: {
    type: 'string' as const,
    required: true,
    minLength: 2,
    maxLength: 500,
    // Allow special search operators but sanitize
    sanitize: true,
  },
  
  date: { type: 'date' as const },
  
  status: {
    type: 'string' as const,
    enum: ['Open', 'In Progress', 'Closed', 'Draft', 'Pending', 'Approved', 'Rejected'],
  },
  
  severity: {
    type: 'string' as const,
    enum: ['Low', 'Medium', 'High', 'Critical'],
  },
  
  priority: {
    type: 'string' as const,
    enum: ['Low', 'Medium', 'High', 'Critical'],
  },
};
