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

// ---------- Seed default admin ----------

export const seedDefaultUsers = async () => {
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
    console.log('[Auth] Seeded default users');
  }
};
