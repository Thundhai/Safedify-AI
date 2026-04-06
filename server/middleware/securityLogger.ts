/**
 * Security Logging & Monitoring Middleware
 * 
 * Provides comprehensive security event logging:
 * - Authentication attempts (success/failure)
 * - API errors with context
 * - Rate limit violations
 * - Suspicious traffic pattern detection
 * 
 * All events are logged to the security_logs table and console.
 */
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth.js';
import pool from '../postgres';
import { v4 as uuid } from 'uuid';

// ============================================================
// Security Event Types
// ============================================================

export type SecurityEventType =
  | 'auth_success'
  | 'auth_failure'
  | 'auth_lockout'
  | 'auth_2fa_success'
  | 'auth_2fa_failure'
  | 'rate_limit_hit'
  | 'api_error'
  | 'suspicious_activity'
  | 'unauthorized_access'
  | 'invalid_token'
  | 'password_reset_request'
  | 'password_changed'
  | 'account_created'
  | 'privilege_escalation_attempt'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'path_traversal_attempt'
  | 'command_injection_attempt'
  | 'validation_failed'
  | 'injection_attempt'
  | 'file_upload_rejected'
  | 'malware_detected';

export type SeverityLevel = 'info' | 'warning' | 'critical';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SeverityLevel;
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  details?: string;
  metadata?: Record<string, any>;
}

// ============================================================
// IP & Request Analysis
// ============================================================

// In-memory tracking for rate anomaly detection (per IP)
const ipRequestCounts = new Map<string, { count: number; firstSeen: number; endpoints: Set<string> }>();
const IP_WINDOW_MS = 60 * 1000; // 1 minute window
const ANOMALY_THRESHOLDS = {
  requestsPerMinute: 60,      // More than 60 requests/min from single IP is suspicious
  uniqueEndpoints: 20,        // Hitting 20+ different endpoints rapidly is suspicious
  failedAuthPerMinute: 5,     // 5+ failed auths from same IP is suspicious
};

// Track failed auth attempts per IP
const failedAuthByIp = new Map<string, { count: number; firstAttempt: number }>();

// Max unique IPs to track before evicting stale entries
const MAX_TRACKED_IPS = 10000;

/**
 * Evict stale entries from tracking maps to prevent memory leaks
 */
function evictStaleEntries() {
  const now = Date.now();
  for (const [ip, record] of ipRequestCounts) {
    if (now - record.firstSeen > IP_WINDOW_MS * 2) {
      ipRequestCounts.delete(ip);
    }
  }
  for (const [ip, record] of failedAuthByIp) {
    if (now - record.firstAttempt > IP_WINDOW_MS * 2) {
      failedAuthByIp.delete(ip);
    }
  }
}

// Run eviction every 5 minutes
const evictionInterval = setInterval(evictStaleEntries, 5 * 60 * 1000);
// Allow process to exit despite the interval
if (evictionInterval.unref) evictionInterval.unref();

/**
 * Extract client IP from request, handling proxies
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Check if an IP shows suspicious patterns
 */
export function analyzeIpBehavior(ip: string, endpoint: string): { suspicious: boolean; reason?: string } {
  const now = Date.now();
  let record = ipRequestCounts.get(ip);
  
  if (!record || (now - record.firstSeen) > IP_WINDOW_MS) {
    // Evict stale entries if map is too large
    if (ipRequestCounts.size >= MAX_TRACKED_IPS) {
      evictStaleEntries();
    }
    // Reset or create new record
    record = { count: 1, firstSeen: now, endpoints: new Set([endpoint]) };
    ipRequestCounts.set(ip, record);
    return { suspicious: false };
  }
  
  record.count++;
  record.endpoints.add(endpoint);
  
  // Check thresholds
  if (record.count > ANOMALY_THRESHOLDS.requestsPerMinute) {
    return { suspicious: true, reason: `High request volume: ${record.count} requests in 1 minute` };
  }
  if (record.endpoints.size > ANOMALY_THRESHOLDS.uniqueEndpoints) {
    return { suspicious: true, reason: `Endpoint enumeration: ${record.endpoints.size} unique endpoints in 1 minute` };
  }
  
  return { suspicious: false };
}

/**
 * Track failed authentication attempts by IP
 */
export function trackFailedAuth(ip: string): { suspicious: boolean; attempts: number } {
  const now = Date.now();
  let record = failedAuthByIp.get(ip);
  
  if (!record || (now - record.firstAttempt) > IP_WINDOW_MS) {
    record = { count: 1, firstAttempt: now };
    failedAuthByIp.set(ip, record);
    return { suspicious: false, attempts: 1 };
  }
  
  record.count++;
  
  if (record.count >= ANOMALY_THRESHOLDS.failedAuthPerMinute) {
    return { suspicious: true, attempts: record.count };
  }
  
  return { suspicious: false, attempts: record.count };
}

// ============================================================
// Security Event Logging
// ============================================================

/**
 * Log a security event to the database and console
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Console logging with color coding
  const colors = {
    info: '\x1b[36m',     // Cyan
    warning: '\x1b[33m',  // Yellow
    critical: '\x1b[31m', // Red
    reset: '\x1b[0m',
  };
  const color = colors[event.severity];
  
  console.log(
    `${color}[SECURITY:${event.severity.toUpperCase()}]${colors.reset} ` +
    `${event.type} | ${event.method} ${event.endpoint} | IP: ${event.ip} | ` +
    `${event.userId ? `User: ${event.userId}` : event.email ? `Email: ${event.email}` : 'Anonymous'} | ` +
    `${event.details || ''}`
  );
  
  // Database logging
  try {
    await pool.query(
      `INSERT INTO security_logs 
       (id, event_type, severity, user_id, email, ip_address, user_agent, endpoint, method, status_code, details, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        uuid(),
        event.type,
        event.severity,
        event.userId || null,
        event.email || null,
        event.ip,
        event.userAgent.slice(0, 512),
        event.endpoint,
        event.method,
        event.statusCode || null,
        event.details || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        timestamp,
      ]
    );
  } catch (err: any) {
    // Don't fail the request if logging fails, but log to console
    console.error('[Security] Failed to log event to database:', err.message);
  }
}

// ============================================================
// Middleware: Security Request Monitor
// ============================================================

/**
 * Monitor all requests for suspicious patterns.
 * Should be mounted early in the middleware chain.
 */
export function securityMonitor() {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const endpoint = req.path;
    const method = req.method;
    const userAgent = (req.headers['user-agent'] || '').slice(0, 512);
    
    // Analyze IP behavior
    const behavior = analyzeIpBehavior(ip, endpoint);
    if (behavior.suspicious) {
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'warning',
        ip,
        userAgent,
        endpoint,
        method,
        details: behavior.reason,
      });
    }
    
    // Detect potential attack patterns in request
    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});
    const combined = body + query + req.path;
    
    // SQL injection patterns
    const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b.*=|'.*--|;.*DROP|1\s*=\s*1)/i;
    if (sqlPatterns.test(combined)) {
      logSecurityEvent({
        type: 'sql_injection_attempt',
        severity: 'critical',
        ip,
        userAgent,
        endpoint,
        method,
        details: 'Potential SQL injection pattern detected',
        metadata: { pattern: combined.slice(0, 200) },
      });
    }
    
    // XSS patterns
    const xssPatterns = /<script\b|javascript:|on\w+\s*=/i;
    if (xssPatterns.test(combined)) {
      logSecurityEvent({
        type: 'xss_attempt',
        severity: 'critical',
        ip,
        userAgent,
        endpoint,
        method,
        details: 'Potential XSS pattern detected',
      });
    }
    
    // Path traversal
    const traversalPatterns = /\.\.[\/\\]|%2e%2e|%252e/i;
    if (traversalPatterns.test(req.url)) {
      logSecurityEvent({
        type: 'path_traversal_attempt',
        severity: 'critical',
        ip,
        userAgent,
        endpoint,
        method,
        details: 'Path traversal pattern detected',
      });
    }
    
    next();
  };
}

// ============================================================
// Middleware: API Error Logger
// ============================================================

/**
 * Global error handler that logs API errors with security context.
 * Should be mounted as the last middleware (error handler).
 */
export function securityErrorHandler() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const userAgent = (req.headers['user-agent'] || '').slice(0, 512);
    const authReq = req as AuthRequest;
    
    const severity: SeverityLevel = 
      err.status >= 500 ? 'critical' :
      err.status === 401 || err.status === 403 ? 'warning' :
      'info';
    
    logSecurityEvent({
      type: 'api_error',
      severity,
      userId: authReq.user?.id,
      email: authReq.user?.email,
      ip,
      userAgent,
      endpoint: req.path,
      method: req.method,
      statusCode: err.status || 500,
      details: err.message,
      metadata: {
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      },
    });
    
    // Pass to default error handler
    next(err);
  };
}

// ============================================================
// Middleware: Rate Limit Logger
// ============================================================

/**
 * Custom handler for rate-limit-exceeded events.
 * Use as the 'handler' option in express-rate-limit.
 */
export function rateLimitLogger(req: Request, res: Response, _next: NextFunction, options: any) {
  const ip = getClientIp(req);
  const userAgent = (req.headers['user-agent'] || '').slice(0, 512);
  
  logSecurityEvent({
    type: 'rate_limit_hit',
    severity: 'warning',
    ip,
    userAgent,
    endpoint: req.path,
    method: req.method,
    statusCode: 429,
    details: `Rate limit exceeded: ${options.windowMs / 1000}s window, ${options.max} max requests`,
  });
  
  res.status(429).json({ error: 'Too many requests, please try again later.' });
}

// ============================================================
// Auth Event Helpers (for use in authRoutes)
// ============================================================

export function logAuthSuccess(req: AuthRequest, userId: string, email: string): void {
  const ip = getClientIp(req);
  const userAgent = (req.headers['user-agent'] || '').slice(0, 512);
  
  logSecurityEvent({
    type: 'auth_success',
    severity: 'info',
    userId,
    email,
    ip,
    userAgent,
    endpoint: req.path,
    method: req.method,
    details: 'Successful authentication',
  });
}

export function logAuthFailure(req: AuthRequest, email: string, reason: string): void {
  const ip = getClientIp(req);
  const userAgent = (req.headers['user-agent'] || '').slice(0, 512);
  
  // Track failed auths by IP
  const { suspicious, attempts } = trackFailedAuth(ip);
  
  logSecurityEvent({
    type: 'auth_failure',
    severity: suspicious ? 'critical' : 'warning',
    email,
    ip,
    userAgent,
    endpoint: req.path,
    method: req.method,
    details: reason,
    metadata: { failedAttemptsFromIp: attempts },
  });
  
  if (suspicious) {
    logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'critical',
      ip,
      userAgent,
      endpoint: req.path,
      method: req.method,
      details: `Brute force attack suspected: ${attempts} failed auth attempts from this IP in 1 minute`,
    });
  }
}

export function logUnauthorizedAccess(req: AuthRequest, reason: string): void {
  const ip = getClientIp(req);
  const userAgent = (req.headers['user-agent'] || '').slice(0, 512);
  
  logSecurityEvent({
    type: 'unauthorized_access',
    severity: 'warning',
    userId: req.user?.id,
    email: req.user?.email,
    ip,
    userAgent,
    endpoint: req.path,
    method: req.method,
    details: reason,
  });
}

// ============================================================
// Middleware: API Response Logger (captures 4xx/5xx responses)
// ============================================================

// Track error responses per IP for anomaly detection
const ipErrorCounts = new Map<string, { total: number; errors: number; firstSeen: number }>();

/**
 * Intercept all API responses to log 4xx/5xx status codes.
 * This catches errors from explicit res.status().json() calls
 * that never reach the securityErrorHandler.
 * Mount early in the middleware chain.
 */
export function apiResponseLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      const statusCode = res.statusCode;

      // Track all responses for error-ratio anomaly detection
      const now = Date.now();
      let errorRecord = ipErrorCounts.get(ip);
      if (!errorRecord || (now - errorRecord.firstSeen) > IP_WINDOW_MS) {
        errorRecord = { total: 0, errors: 0, firstSeen: now };
        ipErrorCounts.set(ip, errorRecord);
      }
      errorRecord.total++;

      if (statusCode >= 400) {
        errorRecord.errors++;
        const authReq = req as AuthRequest;
        const userAgent = (req.headers['user-agent'] || '').slice(0, 512);

        const severity: SeverityLevel =
          statusCode >= 500 ? 'critical' :
          statusCode === 401 || statusCode === 403 ? 'warning' :
          'info';

        logSecurityEvent({
          type: 'api_error',
          severity,
          userId: authReq.user?.id,
          email: authReq.user?.email,
          ip,
          userAgent,
          endpoint: req.path,
          method: req.method,
          statusCode,
          details: typeof body?.error === 'string' ? body.error.slice(0, 500) : `HTTP ${statusCode} response`,
        });

        // Detect high error ratio from single IP (> 80% errors with at least 10 requests)
        if (errorRecord.total >= 10 && (errorRecord.errors / errorRecord.total) > 0.8) {
          logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'warning',
            ip,
            userAgent,
            endpoint: req.path,
            method: req.method,
            details: `High error ratio: ${errorRecord.errors}/${errorRecord.total} requests returned errors (${Math.round(errorRecord.errors / errorRecord.total * 100)}%)`,
            metadata: { errorRatio: errorRecord.errors / errorRecord.total, totalRequests: errorRecord.total },
          });
        }
      }

      return originalJson(body);
    };

    next();
  };
}

// ============================================================
// Unusual Traffic Pattern Detection
// ============================================================

// Track per-IP access to sensitive endpoints (rapid hits)
const sensitiveEndpointHits = new Map<string, { endpoint: string; count: number; firstHit: number }[]>();

const SENSITIVE_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/login/2fa',
  '/api/admin',
  '/api/export',
  '/api/audit-logs',
];

const TRAFFIC_THRESHOLDS = {
  sensitiveEndpointPerMinute: 15,  // >15 hits on a single sensitive endpoint per minute
};

/**
 * Detect unusual traffic patterns:
 * - Rapid hits on sensitive endpoints (potential brute-force or enumeration)
 * Mount after securityMonitor in the middleware chain.
 */
export function trafficAnomalyDetector() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const endpoint = req.path;
    const userAgent = (req.headers['user-agent'] || '').slice(0, 512);
    const authReq = req as AuthRequest;
    const now = Date.now();

    // --- Sensitive endpoint velocity tracking ---
    const isSensitive = SENSITIVE_ENDPOINTS.some(e => endpoint.startsWith(e));
    if (isSensitive) {
      let ipHits = sensitiveEndpointHits.get(ip);
      if (!ipHits) {
        ipHits = [];
        sensitiveEndpointHits.set(ip, ipHits);
      }

      // Find or create tracking entry for this endpoint
      let entry = ipHits.find(h => h.endpoint === endpoint);
      if (!entry || (now - entry.firstHit) > IP_WINDOW_MS) {
        // Reset or create
        if (entry) {
          entry.count = 1;
          entry.firstHit = now;
        } else {
          entry = { endpoint, count: 1, firstHit: now };
          ipHits.push(entry);
        }
      } else {
        entry.count++;
      }

      if (entry.count > TRAFFIC_THRESHOLDS.sensitiveEndpointPerMinute) {
        logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'critical',
          userId: authReq.user?.id,
          ip,
          userAgent,
          endpoint,
          method: req.method,
          details: `Rapid sensitive endpoint access: ${entry.count} hits to ${endpoint} in 1 minute`,
          metadata: { hitsPerMinute: entry.count, endpoint },
        });
      }
    }

    next();
  };
}

// ============================================================
// Cleanup: Periodically clean old IP tracking data
// ============================================================

setInterval(() => {
  const now = Date.now();
  
  for (const [ip, record] of ipRequestCounts.entries()) {
    if (now - record.firstSeen > IP_WINDOW_MS * 2) {
      ipRequestCounts.delete(ip);
    }
  }
  
  for (const [ip, record] of failedAuthByIp.entries()) {
    if (now - record.firstAttempt > IP_WINDOW_MS * 2) {
      failedAuthByIp.delete(ip);
    }
  }

  for (const [ip, record] of ipErrorCounts.entries()) {
    if (now - record.firstSeen > IP_WINDOW_MS * 2) {
      ipErrorCounts.delete(ip);
    }
  }

  for (const [ip, hits] of sensitiveEndpointHits.entries()) {
    const active = hits.filter(h => now - h.firstHit <= IP_WINDOW_MS * 2);
    if (active.length === 0) {
      sensitiveEndpointHits.delete(ip);
    } else {
      sensitiveEndpointHits.set(ip, active);
    }
  }
}, IP_WINDOW_MS);
