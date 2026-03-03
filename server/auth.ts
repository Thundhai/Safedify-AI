import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'safedify-secret-key-change-in-production';
const JWT_EXPIRES = '7d';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  avatar?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ---------- Helpers ----------

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user: AuthUser): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES });
};

// ---------- Middleware ----------

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
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
    // Check role by name against the roles DB
    const userRoleRow = db.prepare('SELECT permissions FROM roles WHERE name = ?').get(req.user.role) as any;
    const userRoleName = req.user.role;
    if (roles.includes(userRoleName)) { next(); return; }
    res.status(403).json({ error: 'Insufficient permissions for this action' });
  };
};

/** Require the user's role to include a specific permission key */
export const requirePermission = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // Admin bypass
    if (req.user.role === 'Admin') { next(); return; }
    const roleRow = db.prepare('SELECT permissions FROM roles WHERE name = ?').get(req.user.role) as any;
    if (!roleRow) { res.status(403).json({ error: 'Role not found' }); return; }
    const perms: string[] = JSON.parse(roleRow.permissions || '[]');
    const hasAll = permissions.every(p => perms.includes(p));
    if (hasAll) { next(); return; }
    res.status(403).json({ error: 'Insufficient permissions for this action' });
  };
};

// ---------- Seed default admin (only when SEED_DEMO_USERS=true) ----------

export const seedDefaultUsers = async () => {
  if (process.env.SEED_DEMO_USERS !== 'true') {
    // Skip seeding demo users in production — set SEED_DEMO_USERS=true in .env to enable
    return;
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@safedify.com');
  if (!existing) {
    const hash = await hashPassword('password');
    const users = [
      { id: uuid(), name: 'John Doe', email: 'admin@safedify.com', role: 'Manager', tier: 'Enterprise', avatar: 'JD' },
      { id: uuid(), name: 'Robert Fox', email: 'worker@safedify.com', role: 'Worker', tier: 'Free', avatar: 'RF' },
      { id: uuid(), name: 'Sarah Connor', email: 'supervisor@safedify.com', role: 'Supervisor', tier: 'Pro', avatar: 'SC' },
    ];

    const insert = db.prepare(
      'INSERT INTO users (id, name, email, password_hash, role, tier, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    for (const u of users) {
      insert.run(u.id, u.name, u.email, hash, u.role, u.tier, u.avatar);
    }
    console.log('[Auth] Seeded demo users (SEED_DEMO_USERS=true)');
  }
};
