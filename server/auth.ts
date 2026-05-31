import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import pool from './postgres';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production');
  }
  console.warn('\x1b[33m[WARN] Using default JWT_SECRET — set JWT_SECRET env var for production\x1b[0m');
  return 'safedify-dev-secret-not-for-production';
})();

// Security: Shorter token expiration (24h instead of 7d)
// For longer sessions, implement refresh tokens
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

// Account lockout configuration
export const LOCKOUT_CONFIG = {
  maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  lockoutDurationMs: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15') * 60 * 1000,
};

// Password complexity requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*(),.?":{}|<>',
};

/**
 * Validate password meets complexity requirements
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return { valid: false, error: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters` };
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (PASSWORD_REQUIREMENTS.requireSpecial && !new RegExp(`[${PASSWORD_REQUIREMENTS.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
    return { valid: false, error: `Password must contain at least one special character (${PASSWORD_REQUIREMENTS.specialChars})` };
  }
  return { valid: true };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  avatar?: string;
  org_id?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ---------- Helpers ----------

// bcrypt cost factor: 12 is recommended for 2024+ (takes ~300ms to hash)
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user: AuthUser): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES as string & jwt.SignOptions['expiresIn'] });
};

/**
 * Generate a cryptographically secure random token
 */
export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a token for storage (one-way, prevents token theft from DB)
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ---------- TOTP Secret Encryption (AES-256-GCM) ----------

const TOTP_ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY;
const _totpDerivedKey: Buffer | null = TOTP_ENCRYPTION_KEY
  ? crypto.scryptSync(TOTP_ENCRYPTION_KEY, 'safedify-totp-v1', 32)
  : null;

if (!TOTP_ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: TOTP_ENCRYPTION_KEY environment variable must be set in production');
  }
  console.warn('\x1b[33m[SECURITY] TOTP_ENCRYPTION_KEY not set — TOTP secrets will be stored unencrypted\x1b[0m');
}

/**
 * Encrypt a TOTP secret for storage. Uses AES-256-GCM with a derived key.
 * Format: iv_hex:tag_hex:ciphertext_hex
 */
export const encryptTotpSecret = (plaintext: string): string => {
  if (!_totpDerivedKey) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', _totpDerivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Decrypt a TOTP secret from storage.
 * Handles both encrypted (enc:iv:tag:ct) and legacy plaintext hex formats.
 */
export const decryptTotpSecret = (stored: string): string => {
  if (!stored) return stored;
  if (!stored.startsWith('enc:')) return stored; // Legacy plaintext hex
  if (!_totpDerivedKey) return stored;
  const parts = stored.split(':');
  if (parts.length !== 4) return stored;
  try {
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const encrypted = Buffer.from(parts[3], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', _totpDerivedKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return stored; // Decryption failed — treat as legacy plaintext
  }
};

// ---------- Middleware ----------

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  (async () => {
    try {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

      // Re-check user still exists and get fresh role/tier from DB
      const result = await pool.query('SELECT id, name, email, role, tier, avatar, org_id, must_change_password FROM users WHERE id = $1', [decoded.id]);
      const dbUser = result.rows[0];
      if (!dbUser) {
        res.status(401).json({ error: 'User account no longer exists' });
        return;
      }

      // SECURITY: Block all API access when password change is required
      // Only allow the change-password endpoint itself
      if (dbUser.must_change_password) {
        const allowedPaths = ['/api/auth/change-password', '/api/auth/me'];
        const reqPath = req.originalUrl?.split('?')[0] || req.path;
        if (!allowedPaths.includes(reqPath)) {
          res.status(403).json({ 
            error: 'Password change required before accessing the application.',
            requiresPasswordChange: true
          });
          return;
        }
      }

      // Use DB values (not stale JWT values) for role/tier
      req.user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        tier: dbUser.tier,
        avatar: dbUser.avatar,
        org_id: dbUser.org_id,
      };
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  })();
};

// ---------- RBAC Middleware ----------

/** Require the user to have one of the listed roles */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // Admin always passes
    if (req.user.role === 'Admin') { next(); return; }
    if (roles.includes(req.user.role)) { next(); return; }
    res.status(403).json({ error: 'Insufficient permissions for this action' });
  };
};

/** Require the user's role to include a specific permission key */
export const requirePermission = (...permissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // Admin bypass
    if (req.user.role === 'Admin') { next(); return; }
    const result = await pool.query('SELECT permissions FROM roles WHERE name = $1', [req.user.role]);
    const roleRow = result.rows[0];
    if (!roleRow) { res.status(403).json({ error: 'Role not found' }); return; }
    const perms: string[] = JSON.parse(roleRow.permissions || '[]');
    const hasAll = permissions.every(p => perms.includes(p));
    if (hasAll) { next(); return; }
    res.status(403).json({ error: 'Insufficient permissions for this action' });
  };
};

// ---------- Seed default admin ----------

export const seedDefaultUsers = () => {
  // On Vercel, the /tmp SQLite DB is ephemeral — users must be re-seeded every cold start.
  // Locally, seeding only runs when SEED_DEMO_USERS=true.
  const isVercel = !!process.env.VERCEL;
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isVercel && process.env.SEED_DEMO_USERS !== 'true') {
    return;
  }
  (async () => {
    try {
      const result = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@safedify.com']);
      const existing = result.rows[0];
      if (!existing) {
        // Use higher cost factor for seeded users
        const hash = bcrypt.hashSync('admin123', 12);
        // Use valid UUIDs for user IDs
        const users = [
          { id: uuid(), name: 'John Doe', email: 'admin@safedify.com', role: 'Admin', tier: 'Enterprise', avatar: 'JD' },
          { id: uuid(), name: 'Robert Fox', email: 'worker@safedify.com', role: 'Worker', tier: 'Pro', avatar: 'RF' },
          { id: uuid(), name: 'Sarah Connor', email: 'supervisor@safedify.com', role: 'HSE Supervisor', tier: 'Pro', avatar: 'SC' },
        ];

        // In production, seeded users MUST change their password on first login
        // This prevents usage of the well-known demo password 'admin123'
        const mustChangePassword = isProduction;

        // Use transaction for atomicity
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Step 1: Insert users with org_id = NULL to avoid circular FK
          // (organizations.owner_id → users AND users.org_id → organizations)
          for (const u of users) {
            await client.query(
              `INSERT INTO users (id, name, email, password_hash, role, tier, avatar, org_id, email_verified, must_change_password, password_changed_at) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, TRUE, $8, NOW())`,
              [u.id, u.name, u.email, hash, u.role, u.tier, u.avatar, mustChangePassword]
            );
          }

          // Step 2: Create org with admin as owner
          const adminUser = users.find(u => u.role === 'Admin')!;
          const demoOrgId = uuid();
          const orgInsert = await client.query(
            `INSERT INTO organizations (id, name, slug, plan, owner_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (slug) DO NOTHING RETURNING id`,
            [demoOrgId, 'Demo Organization', 'demo', 'Enterprise', adminUser.id]
          );
          const orgId = orgInsert.rows[0]?.id || (await client.query('SELECT id FROM organizations WHERE slug = $1', ['demo'])).rows[0]?.id;

          // Step 3: Update all users with org_id
          for (const u of users) {
            await client.query('UPDATE users SET org_id = $1 WHERE id = $2', [orgId, u.id]);
          }

          await client.query('COMMIT');
          console.log(`[Auth] Seeded demo users + org (must_change_password: ${mustChangePassword})`);
        } catch (dbErr: any) {
          await client.query('ROLLBACK');
          console.error('[Auth] Seed transaction failed:', dbErr.message);
          throw dbErr;
        } finally {
          client.release();
        }
      }
    } catch (err: any) {
      console.error('[Auth] Failed to seed users (database may not be configured):', err.message);
    }
  })();
};
