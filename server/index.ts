import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Database init (creates tables on import)
import './db.js';

// Auth
import { seedDefaultUsers } from './auth.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import dataRoutes from './routes/dataRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import environmentalRoutes from './routes/environmentalRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '4000');
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// ---------- Security ----------
app.use(helmet({
  contentSecurityPolicy: false,  // frontend uses inline styles (Tailwind)
  crossOriginEmbedderPolicy: false,
}));

// ---------- Compression ----------
app.use(compression());

// ---------- Logging ----------
app.use(morgan(isProduction ? 'combined' : 'dev'));

// ---------- Rate Limiting ----------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: isProduction ? 100 : 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 200,
  message: { error: 'Too many login attempts, please try again later.' },
});

// ---------- CORS ----------
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: isProduction
    ? (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : ALLOWED_ORIGINS,
  credentials: true,
}));

// ---------- Body Parsing ----------
app.use(express.json({ limit: '10mb' }));

// ---------- Serve Frontend (Production) ----------
if (isProduction) {
  const frontendDist = path.join(__dirname, '..', 'dist');
  app.use(express.static(frontendDist, {
    maxAge: '1y',
    etag: true,
  }));
}

// ---------- Health check (no auth) ----------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'Safedify AI Backend',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    agent: !!process.env.GEMINI_API_KEY ? 'enabled' : 'disabled',
  });
});

// ---------- API Routes ----------
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter, dataRoutes);
app.use('/api/agent', apiLimiter, agentRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/environmental', apiLimiter, environmentalRoutes);

// ---------- SPA Fallback (Production) ----------
if (isProduction) {
  const frontendDist = path.join(__dirname, '..', 'dist');
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ---------- Global Error Handler ----------
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  if (!isProduction) console.error(err.stack);
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
  });
});

// ---------- Start ----------
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

  await seedDefaultUsers();

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

start().catch(console.error);
