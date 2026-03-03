import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
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

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address' });
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email) as any;

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: 'If the email exists, a reset link has been generated.' });
      return;
    }

    // Invalidate any previous unused tokens for this user
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const id = uuid();
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.prepare(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
    ).run(id, user.id, token, expiresAt);

    // Build the reset link (frontend HashRouter)
    const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 4500}`;
    const resetLink = `${baseUrl}/#/reset-password?token=${token}`;

    // Log the reset link only in development (in production, send via email)
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      console.log(`\n========================================`);
      console.log(`  PASSWORD RESET REQUEST`);
      console.log(`  User: ${user.name} (${user.email})`);
      console.log(`  Token: ${token}`);
      console.log(`  Link: ${resetLink}`);
      console.log(`  Expires: ${expiresAt}`);
      console.log(`========================================\n`);
    }

    res.json({ message: 'If the email exists, a reset link has been generated.' });
  } catch (err: any) {
    console.error('[Auth] Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    // Password policy: minimum 8 characters
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Find valid, unused token
    const resetRow = db.prepare(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0'
    ).get(token) as any;

    if (!resetRow) {
      res.status(400).json({ error: 'Invalid or already used reset token' });
      return;
    }

    // Check expiry
    if (new Date(resetRow.expires_at) < new Date()) {
      db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetRow.id);
      res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
      return;
    }

    // Update the user's password
    const hash = await hashPassword(password);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, resetRow.user_id);

    // Mark token as used
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetRow.id);

    console.log(`[Auth] Password reset successful for user ${resetRow.user_id}`);
    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err: any) {
    console.error('[Auth] Reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

export default router;
