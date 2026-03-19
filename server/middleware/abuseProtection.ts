/**
 * Abuse Protection Middleware
 * 
 * Comprehensive protection against:
 * - Brute force attacks (login, registration)
 * - Bot/automated script detection
 * - Data scraping/enumeration
 * - API abuse
 * 
 * Features:
 * - Progressive rate limiting with exponential backoff
 * - Bot fingerprint detection
 * - Honeypot fields for form submissions
 * - Request timing analysis
 * - Device fingerprint tracking
 */
import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { AuthRequest } from '../auth.js';
import { logSecurityEvent, getClientIp } from './securityLogger.js';
import pool from '../postgres';

// ============================================================
// Configuration
// ============================================================

const ABUSE_CONFIG = {
  // Login protection
  login: {
    windowMs: 15 * 60 * 1000,     // 15 minutes
    maxAttempts: 5,               // Per IP
    blockDurationMs: 30 * 60 * 1000, // 30 min block after exceeded
  },
  // Registration protection
  registration: {
    windowMs: 60 * 60 * 1000,     // 1 hour
    maxAttempts: process.env.NODE_ENV === 'production' ? 3 : 20, // Relaxed in dev/test
  },
  // AI generation protection
  aiGeneration: {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 10,              // Per user
    maxRequestsAnon: 3,           // Per IP (unauthenticated)
  },
  // General API protection
  api: {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 60,              // Per IP
    scrapeThreshold: 300,         // Requests/min to flag as scraping (SPA makes many parallel calls)
  },
  // Bot detection thresholds
  bot: {
    minRequestInterval: 50,       // Requests faster than 50ms = bot
    maxRequestsPerSecond: 10,     // More than 10 req/sec = bot
    suspiciousUserAgents: [
      'curl', 'wget', 'httpie', 'python-requests', 'go-http-client',
      'java/', 'apache-httpclient', 'scrapy', 'crawler', 'spider',
      'bot', 'headless', 'phantom', 'selenium', 'puppeteer', 'playwright'
    ],
  },
};

// ============================================================
// In-Memory Tracking (for fast checks)
// ============================================================

interface RequestTracker {
  count: number;
  firstRequest: number;
  lastRequest: number;
  blocked: boolean;
  blockedUntil?: number;
  requestTimes: number[];  // Track timing for bot detection
}

const ipTrackers = new Map<string, RequestTracker>();
const loginAttempts = new Map<string, { count: number; firstAttempt: number; blocked: boolean; blockedUntil?: number }>();
const registrationAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, tracker] of ipTrackers.entries()) {
    if (now - tracker.lastRequest > 30 * 60 * 1000) {
      ipTrackers.delete(ip);
    }
  }
  for (const [ip, tracker] of loginAttempts.entries()) {
    if (now - tracker.firstAttempt > ABUSE_CONFIG.login.windowMs) {
      loginAttempts.delete(ip);
    }
  }
  for (const [ip, tracker] of registrationAttempts.entries()) {
    if (now - tracker.firstAttempt > ABUSE_CONFIG.registration.windowMs) {
      registrationAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ============================================================
// Bot Detection
// ============================================================

interface BotDetectionResult {
  isBot: boolean;
  confidence: number;
  reasons: string[];
}

/**
 * Analyze request for bot-like behavior
 */
export function detectBot(req: Request): BotDetectionResult {
  const reasons: string[] = [];
  let confidence = 0;
  const ip = getClientIp(req);
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  
  // 1. Check user agent
  if (!userAgent || userAgent.length < 10) {
    reasons.push('Missing or short user-agent');
    confidence += 30;
  }
  
  for (const botSignature of ABUSE_CONFIG.bot.suspiciousUserAgents) {
    if (userAgent.includes(botSignature)) {
      reasons.push(`Bot signature in user-agent: ${botSignature}`);
      confidence += 40;
      break;
    }
  }
  
  // 2. Check request timing
  const tracker = ipTrackers.get(ip);
  if (tracker && tracker.requestTimes.length >= 3) {
    const intervals = [];
    for (let i = 1; i < tracker.requestTimes.length; i++) {
      intervals.push(tracker.requestTimes[i] - tracker.requestTimes[i - 1]);
    }
    
    // Check for suspiciously fast requests
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgInterval < ABUSE_CONFIG.bot.minRequestInterval) {
      reasons.push(`Requests too fast: ${avgInterval.toFixed(0)}ms average`);
      confidence += 50;
    }
    
    // Check for machine-like regularity (very consistent timing)
    if (intervals.length >= 5) {
      const stdDev = Math.sqrt(intervals.reduce((sq, n) => sq + Math.pow(n - avgInterval, 2), 0) / intervals.length);
      if (stdDev < 10 && avgInterval < 500) {
        reasons.push('Machine-like request timing');
        confidence += 30;
      }
    }
  }
  
  // 3. Check for missing browser headers
  const browserHeaders = ['accept-language', 'accept-encoding', 'sec-fetch-mode'];
  const missingHeaders = browserHeaders.filter(h => !req.headers[h]);
  if (missingHeaders.length >= 2) {
    reasons.push(`Missing browser headers: ${missingHeaders.join(', ')}`);
    confidence += 20;
  }
  
  // 4. Check for headless browser signatures
  if (req.headers['sec-ch-ua']?.includes('"HeadlessChrome"')) {
    reasons.push('Headless browser detected');
    confidence += 60;
  }
  
  return {
    isBot: confidence >= 50,
    confidence: Math.min(100, confidence),
    reasons,
  };
}

// ============================================================
// Middleware: Track Request Timing
// ============================================================

/**
 * Track request timing for bot detection
 */
export function trackRequestTiming() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    
    let tracker = ipTrackers.get(ip);
    if (!tracker) {
      tracker = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
        requestTimes: [],
      };
      ipTrackers.set(ip, tracker);
    }
    
    tracker.count++;
    tracker.lastRequest = now;
    
    // Keep last 20 request times for analysis
    tracker.requestTimes.push(now);
    if (tracker.requestTimes.length > 20) {
      tracker.requestTimes.shift();
    }
    
    next();
  };
}

// ============================================================
// Middleware: Bot Protection
// ============================================================

/**
 * Block or challenge suspected bots
 */
export function botProtection(options: { blockBots?: boolean; logOnly?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const detection = detectBot(req);
    const ip = getClientIp(req);
    
    if (detection.isBot) {
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: detection.confidence >= 70 ? 'critical' : 'warning',
        ip,
        userAgent: (req.headers['user-agent'] || '').slice(0, 512),
        endpoint: req.path,
        method: req.method,
        details: `Bot detected (${detection.confidence}% confidence): ${detection.reasons.join('; ')}`,
      });
      
      if (options.blockBots && detection.confidence >= 70) {
        res.status(403).json({ 
          error: 'Access denied',
          code: 'BOT_DETECTED',
        });
        return;
      }
    }
    
    next();
  };
}

// ============================================================
// Middleware: Login Rate Limiter (Progressive)
// ============================================================

/**
 * Progressive rate limiter for login attempts
 * Implements exponential backoff after failed attempts
 */
export function loginRateLimiter() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    
    let tracker = loginAttempts.get(ip);
    
    // Check if blocked
    if (tracker?.blocked && tracker.blockedUntil && tracker.blockedUntil > now) {
      const remainingMs = tracker.blockedUntil - now;
      const remainingMin = Math.ceil(remainingMs / 60000);
      
      logSecurityEvent({
        type: 'rate_limit_hit',
        severity: 'warning',
        ip,
        userAgent: (req.headers['user-agent'] || '').slice(0, 512),
        endpoint: req.path,
        method: req.method,
        details: `Login blocked for ${remainingMin}min due to too many attempts`,
      });
      
      res.status(429).json({
        error: `Too many login attempts. Try again in ${remainingMin} minute(s).`,
        retryAfter: remainingMs,
        code: 'LOGIN_RATE_LIMITED',
      });
      return;
    }
    
    // Reset if window expired
    if (tracker && now - tracker.firstAttempt > ABUSE_CONFIG.login.windowMs) {
      tracker = { count: 0, firstAttempt: now, blocked: false };
      loginAttempts.set(ip, tracker);
    }
    
    // Initialize tracker
    if (!tracker) {
      tracker = { count: 0, firstAttempt: now, blocked: false };
      loginAttempts.set(ip, tracker);
    }
    
    tracker.count++;
    
    // Check if exceeded
    if (tracker.count > ABUSE_CONFIG.login.maxAttempts) {
      tracker.blocked = true;
      // Progressive backoff: double the block time for each additional attempt
      const multiplier = Math.min(4, Math.pow(2, tracker.count - ABUSE_CONFIG.login.maxAttempts - 1));
      tracker.blockedUntil = now + ABUSE_CONFIG.login.blockDurationMs * multiplier;
      
      logSecurityEvent({
        type: 'auth_lockout',
        severity: 'critical',
        ip,
        userAgent: (req.headers['user-agent'] || '').slice(0, 512),
        endpoint: req.path,
        method: req.method,
        details: `IP blocked after ${tracker.count} login attempts (${Math.ceil(ABUSE_CONFIG.login.blockDurationMs * multiplier / 60000)}min block)`,
      });
      
      res.status(429).json({
        error: 'Too many login attempts. Your IP has been temporarily blocked.',
        code: 'LOGIN_RATE_LIMITED',
      });
      return;
    }
    
    next();
  };
}

/**
 * Record successful login (reset counter)
 */
export function recordLoginSuccess(ip: string): void {
  loginAttempts.delete(ip);
}

// ============================================================
// Middleware: Registration Rate Limiter
// ============================================================

/**
 * Rate limiter for account registration
 */
export function registrationRateLimiter() {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    
    let tracker = registrationAttempts.get(ip);
    
    // Reset if window expired
    if (tracker && now - tracker.firstAttempt > ABUSE_CONFIG.registration.windowMs) {
      tracker = { count: 0, firstAttempt: now };
      registrationAttempts.set(ip, tracker);
    }
    
    // Initialize tracker
    if (!tracker) {
      tracker = { count: 0, firstAttempt: now };
      registrationAttempts.set(ip, tracker);
    }
    
    if (tracker.count >= ABUSE_CONFIG.registration.maxAttempts) {
      logSecurityEvent({
        type: 'rate_limit_hit',
        severity: 'warning',
        ip,
        userAgent: (req.headers['user-agent'] || '').slice(0, 512),
        endpoint: req.path,
        method: req.method,
        details: `Registration rate limit: ${tracker.count} attempts in ${Math.ceil((now - tracker.firstAttempt) / 60000)}min`,
      });
      
      res.status(429).json({
        error: 'Too many registration attempts. Please try again later.',
        code: 'REGISTRATION_RATE_LIMITED',
      });
      return;
    }
    
    tracker.count++;
    next();
  };
}

// ============================================================
// Middleware: AI Generation Rate Limiter
// ============================================================

/**
 * Strict rate limiter for AI generation endpoints
 * Uses both per-user and per-IP limits
 */
export function aiGenerationLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: ABUSE_CONFIG.aiGeneration.windowMs,
    max: (req: AuthRequest) => {
      // Authenticated users get more requests
      if (req.user) {
        // Premium tiers could get more
        if (req.user.tier === 'Premium' || req.user.tier === 'Enterprise') {
          return ABUSE_CONFIG.aiGeneration.maxRequests * 3;
        }
        return ABUSE_CONFIG.aiGeneration.maxRequests;
      }
      return ABUSE_CONFIG.aiGeneration.maxRequestsAnon;
    },
    keyGenerator: (req: AuthRequest) => {
      if (req.user?.id) return `user:${req.user.id}`;
      return `ip:${getClientIp(req)}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const authReq = req as AuthRequest;
      logSecurityEvent({
        type: 'rate_limit_hit',
        severity: 'warning',
        userId: authReq.user?.id,
        ip: getClientIp(req),
        userAgent: (req.headers['user-agent'] || '').slice(0, 512),
        endpoint: req.path,
        method: req.method,
        details: 'AI generation rate limit exceeded',
      });
      
      res.status(429).json({
        error: 'AI request limit exceeded. Please wait before generating more content.',
        code: 'AI_RATE_LIMITED',
        retryAfter: ABUSE_CONFIG.aiGeneration.windowMs,
      });
    },
  });
}

// ============================================================
// Middleware: Anti-Scraping Protection
// ============================================================

/**
 * Detect and prevent data scraping
 */
export function antiScrapingProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip scraping check for auth endpoints (they have dedicated rate limiters)
    if (req.path.startsWith('/api/auth')) {
      return next();
    }

    const ip = getClientIp(req);
    const tracker = ipTrackers.get(ip);
    
    if (!tracker) {
      return next();
    }
    
    // Calculate requests per minute
    const windowMs = Date.now() - tracker.firstRequest;
    const requestsPerMinute = (tracker.count / windowMs) * 60000;
    
    if (requestsPerMinute > ABUSE_CONFIG.api.scrapeThreshold) {
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'critical',
        ip,
        userAgent: (req.headers['user-agent'] || '').slice(0, 512),
        endpoint: req.path,
        method: req.method,
        details: `Potential scraping detected: ${requestsPerMinute.toFixed(0)} requests/min`,
      });
      
      res.status(429).json({
        error: 'Rate limit exceeded. Automated access is not permitted.',
        code: 'SCRAPING_DETECTED',
      });
      return;
    }
    
    next();
  };
}

// ============================================================
// Middleware: Honeypot Fields
// ============================================================

/**
 * Check for honeypot fields (should be empty)
 * Add hidden field like <input name="_hp_email" style="display:none">
 */
export function honeypotProtection(fieldNames: string[] = ['_hp_email', '_hp_name', '_hp_url', 'website', 'url']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body || {};
    
    for (const field of fieldNames) {
      if (body[field] && body[field].toString().trim() !== '') {
        logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'warning',
          ip: getClientIp(req),
          userAgent: (req.headers['user-agent'] || '').slice(0, 512),
          endpoint: req.path,
          method: req.method,
          details: `Honeypot field filled: ${field}`,
        });
        
        // Return 200 OK to not reveal detection
        res.status(200).json({ success: true });
        return;
      }
    }
    
    next();
  };
}

// ============================================================
// Middleware: Request Fingerprint Validation
// ============================================================

/**
 * Validate request has expected browser characteristics
 */
export function browserValidation() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for health checks and public endpoints
    if (req.path === '/api/health' || req.path.startsWith('/api/docs')) {
      return next();
    }
    
    const userAgent = req.headers['user-agent'];
    const acceptLanguage = req.headers['accept-language'];
    const acceptEncoding = req.headers['accept-encoding'];
    
    // API requests from frontend should have these headers
    // Direct API access (curl, etc.) might not
    const isSuspicious = !userAgent || 
      (req.method !== 'GET' && !acceptLanguage && !acceptEncoding);
    
    if (isSuspicious && process.env.NODE_ENV === 'production') {
      // Add header to track suspicious requests
      res.setHeader('X-Request-Quality', 'low');
    }
    
    next();
  };
}

// ============================================================
// Blocked IP Management
// ============================================================

/**
 * Check if IP is in the blocked list
 */
export async function isIpBlocked(ip: string): Promise<{ blocked: boolean; reason?: string; until?: Date }> {
  try {
    const { rows } = await pool.query(
      'SELECT reason, blocked_until FROM blocked_ips WHERE ip_address = $1 AND (blocked_until IS NULL OR blocked_until > NOW())',
      [ip]
    );
    if (rows[0]) {
      return { blocked: true, reason: rows[0].reason, until: rows[0].blocked_until };
    }
    return { blocked: false };
  } catch {
    return { blocked: false };
  }
}

/**
 * Block an IP address
 */
export async function blockIp(ip: string, reason: string, durationMs?: number, blockedBy?: string): Promise<void> {
  const blockedUntil = durationMs ? new Date(Date.now() + durationMs) : null;
  try {
    await pool.query(
      `INSERT INTO blocked_ips (ip_address, reason, blocked_until, blocked_by, auto_blocked)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ip_address) DO UPDATE SET reason = $2, blocked_until = $3, blocked_at = NOW()`,
      [ip, reason, blockedUntil, blockedBy, !blockedBy]
    );
  } catch (err: any) {
    console.error('[Abuse] Failed to block IP:', err.message);
  }
}

/**
 * Middleware to check blocked IPs
 */
export function blockedIpCheck() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const blockStatus = await isIpBlocked(ip);
    
    if (blockStatus.blocked) {
      res.status(403).json({
        error: 'Access denied',
        reason: blockStatus.reason,
        code: 'IP_BLOCKED',
      });
      return;
    }
    
    next();
  };
}

// ============================================================
// Export combined protection middleware
// ============================================================

/**
 * Apply full abuse protection stack
 */
export function fullAbuseProtection() {
  return [
    trackRequestTiming(),
    blockedIpCheck(),
    botProtection({ blockBots: process.env.NODE_ENV === 'production' }),
    antiScrapingProtection(),
    browserValidation(),
  ];
}
