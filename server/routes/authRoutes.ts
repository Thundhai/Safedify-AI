import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { AuthRequest, hashPassword, comparePassword, generateToken, authenticate } from '../auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!row) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = { id: row.id, name: row.name, email: row.email, role: row.role, tier: row.tier, avatar: row.avatar };
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err: any) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password required' });
      return;
    }

    // Password policy: minimum 8 characters
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Restrict self-registration to safe roles only
    const allowedSelfRegRoles = ['Worker', 'HSE Supervisor'];
    const safeRole = (role && allowedSelfRegRoles.includes(role)) ? role : 'Worker';

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hash = await hashPassword(password);
    const id = uuid();
    const avatar = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, role, tier, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, email, hash, safeRole, 'Free', avatar);

    const user = { id, name, email, role: safeRole, tier: 'Free', avatar };
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err: any) {
    console.error('[Auth] Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
