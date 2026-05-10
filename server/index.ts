import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { sessionRateLimit } from './middleware/sessionRateLimit.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { securityMonitor, securityErrorHandler, rateLimitLogger, trafficAnomalyDetector } from './middleware/securityLogger.js';
import { detectInjections } from './middleware/inputValidation.js';
import { 
  trackRequestTiming, 
  blockedIpCheck, 
  botProtection, 
  antiScrapingProtection,
  registrationRateLimiter,
  aiGenerationLimiter,
  honeypotProtection
} from './middleware/abuseProtection.js';

// Database init (creates tables on import)
// Removed SQLite db.js import
import pool, { initializeDatabase } from './postgres.js';

// Auth
import { seedDefaultUsers, authenticate } from './auth.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import dataRoutes from './routes/dataRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import environmentalRoutes from './routes/environmentalRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import twoFactorRoutes from './routes/twoFactorRoutes.js';
import orgRoutes from './routes/orgRoutes.js';
import { readFileSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '4000');
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// ---------- Trust Proxy (for correct IP detection behind reverse proxy) ----------
if (isProduction) {
  app.set('trust proxy', 1);
}

// ---------- Security Headers ----------
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // React production builds don't need unsafe-eval
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind uses inline styles
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
  xDownloadOptions: true,
  xFrameOptions: { action: 'deny' },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
  xXssProtection: true,
}));

// ---------- HTTPS Enforcement (Production) ----------
if (isProduction) {
  app.use((req, res, next) => {
    // Redirect HTTP to HTTPS (trust proxy for x-forwarded-proto)
    if (req.headers['x-forwarded-proto'] === 'http') {
      res.redirect(301, `https://${req.headers.host}${req.url}`);
      return;
    }
    // Set additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    next();
  });
}

// ---------- Security Monitoring (detect suspicious patterns) ----------
app.use(securityMonitor());

// ---------- Unusual Traffic Pattern Detection (sensitive endpoint velocity) ----------
app.use(trafficAnomalyDetector());

// ---------- Abuse Protection (request tracking, IP blocking) ----------
// Note: botProtection({ blockBots: true }) removed — timing-based detection
// false-positives on all SPA users whose startup fires 10-15 parallel requests.
// Auth routes are protected by loginRateLimiter + authLimiter instead.
app.use(trackRequestTiming());
app.use(blockedIpCheck());
if (isProduction) {
  app.use(botProtection({ blockBots: false })); // log only
  app.use(antiScrapingProtection());
}

// ---------- Compression ----------
app.use(compression());

// ---------- Logging ----------
app.use(morgan(isProduction ? 'combined' : 'dev'));

// ---------- Rate Limiting (with security logging) ----------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: isProduction ? 600 : 1000,  // 600 = ~40 req/min; a normal SPA session uses 15-30 per page load
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitLogger,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitLogger,
});


// Per-session (user/token) rate limiter for AI routes
const aiLimiter = sessionRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Rate limit exceeded. Please wait before sending another request.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------- CORS ----------
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: isProduction
    ? (origin, callback) => {
        // On Vercel, API and frontend are same-origin (no origin header)
        // Same-origin requests on Vercel have no origin header
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : ALLOWED_ORIGINS,
  credentials: true,
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page', 'X-Total-Pages', 'Retry-After'],
}));

// ---------- Body Parsing ----------
app.use(express.json({ limit: '10mb' }));

// ---------- Input Sanitization ----------
app.use(sanitizeBody({ stripTags: true, maxLength: 50000 }));

// ---------- Global Injection Detection ----------
// Detects SQL injection, command injection, XSS, and path traversal attempts.
// Auth routes are excluded because they use per-field validate() middleware with
// allowInjection:true for password fields — the global scan causes false positives
// on legitimate password characters like $, &, |.
// Data routes (observations, incidents, actions) are excluded because they accept
// AI-generated text (descriptions, recommendations) that contains words like "--",
// "node", "curl" etc. that match injection patterns but are safe (queries are parameterized).
// These routes use per-field allowInjection:true in their validate() schemas instead.
app.use(detectInjections({ logOnly: false, excludePaths: ['/api/auth', '/api/ai/', '/api/agent/', '/api/observations', '/api/incidents', '/api/actions', '/api/risk-assessments', '/api/permits', '/api/inspections'] }));

// ---------- Serve Frontend (Production) ----------
if (isProduction) {
  const frontendDist = path.join(__dirname, '..', 'dist');
  app.use(express.static(frontendDist, {
    maxAge: '1y',
    etag: true,
  }));
}

// ---------- Health check (no auth) ----------
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;
  
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - start;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'error';
    console.error('[Health] DB connection error:', err.message);
  }
  
  const isHealthy = dbStatus === 'connected';
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    server: 'Safedify AI Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
    },
  });
});



// ---------- API Routes ----------
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/2fa', authLimiter, twoFactorRoutes);
app.use('/api', apiLimiter, dataRoutes);
app.use('/api/agent', aiGenerationLimiter(), agentRoutes);
app.use('/api/ai', aiGenerationLimiter(), aiRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/environmental', apiLimiter, environmentalRoutes);
app.use('/api/uploads', apiLimiter, uploadRoutes);
app.use('/api/audit-logs', apiLimiter, auditRoutes);
app.use('/api/export', apiLimiter, exportRoutes);
app.use('/api/search', apiLimiter, searchRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/org', apiLimiter, orgRoutes);

// ---------- OpenAPI spec (requires auth) ----------
const openapiPath = path.join(__dirname, 'openapi.yaml');
if (existsSync(openapiPath)) {
  app.get('/api/docs/openapi.yaml', authenticate, (_req, res) => {
    res.set('Content-Type', 'text/yaml');
    res.send(readFileSync(openapiPath, 'utf-8'));
  });
}

// ---------- SPA Fallback (Production) ----------
if (isProduction) {
  const frontendDist = path.join(__dirname, '..', 'dist');
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ---------- Global Error Handler (with security logging) ----------
app.use(securityErrorHandler());

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  if (!isProduction) console.error(err.stack);
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
  });
});

// Run DB init in the background — do NOT await at module level.
// Awaiting here caused a 140-second block (28 sequential queries × 5s connection timeout)
// on Neon/Supabase cold starts, making every request hang until the client aborted.
// All patches are idempotent (IF NOT EXISTS) so skipping them on the first request is safe.
initializeDatabase().catch(err => console.warn('[DB] Init warning:', err.message));
seedDefaultUsers();

// ---------- Export for Vercel serverless ----------
export default app;

// ---------- Start (standalone / Docker) ----------
async function start() {
  // --- JWT Secret Validation ---
  const jwtSecret = process.env.JWT_SECRET || '';
  const DEFAULT_SECRETS = ['safedify-secret-key-change-in-production', 'change-me-to-a-long-random-string', ''];
  if (isProduction && DEFAULT_SECRETS.includes(jwtSecret)) {
    console.error('\n\x1b[31m[FATAL] JWT_SECRET is not set or uses a default value.\x1b[0m');
    console.error('Set a strong, unique JWT_SECRET environment variable before running in production.');
    console.error('Example: JWT_SECRET=$(openssl rand -base64 48)\n');
    process.exit(1);
  }

  // In production/Docker, bind to 0.0.0.0 to accept external connections
  // In development, bind to 127.0.0.1 for security
  const HOST = process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');
  const server = app.listen(PORT, HOST, () => {
    console.log(`\n========================================`);
    console.log(`  Safedify AI Server (${NODE_ENV})`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/api/health`);
    console.log(`  Agent: ${process.env.GEMINI_API_KEY ? 'ENABLED' : 'DISABLED (no API key)'}`);
    if (isProduction) console.log(`  Frontend: Serving from /dist`);
    console.log(`========================================\n`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Only start the HTTP server when running standalone (not when imported for tests / Vercel)
// ESM-compatible entry point check using Node's built-in fileURLToPath (works on Linux + Windows)
const argvEntry = process.argv[1];
const isEntryPoint = argvEntry
  ? fileURLToPath(import.meta.url).toLowerCase() === path.resolve(argvEntry).toLowerCase()
  : false;
if (isEntryPoint) {
  start().catch(console.error);
}
