import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import pool from '../postgres';
import { AuthRequest, hashPassword, comparePassword, generateToken, authenticate } from '../auth.js';
import { logAudit } from './auditRoutes.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const row = rows[0];
    if (!row) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      logAudit(req, { action: 'login_failed', entityType: 'user', entityId: row.id, details: `Failed login for ${email}` });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = { id: row.id, name: row.name, email: row.email, role: row.role, tier: row.tier, avatar: row.avatar };

    // Check if 2FA is enabled
    if (row.totp_enabled) {
      logAudit(req, { action: 'login_2fa_required', entityType: 'user', entityId: row.id, details: `2FA challenge for ${email}` });
      res.json({ requires2FA: true, userId: row.id });
      return;
    }

    const token = generateToken(user);
    logAudit(req, { action: 'login', entityType: 'user', entityId: row.id, details: `User ${email} logged in` });
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

    const { rows: existingRows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const existing = existingRows[0];
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hash = await hashPassword(password);
    const id = uuid();
    const avatar = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role, tier, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, name, email, hash, safeRole, 'Pro', avatar]
    );

    const user = { id, name, email, role: safeRole, tier: 'Pro', avatar };
    const token = generateToken(user);
    logAudit(req, { action: 'register', entityType: 'user', entityId: id, details: `New user registered: ${email}` });
    res.status(201).json({ token, user });
  } catch (err: any) {
    console.error('[Auth] Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login/2fa — Complete login after 2FA verification
router.post('/login/2fa', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, token: totpToken } = req.body;
    if (!userId || !totpToken) {
      res.status(400).json({ error: 'User ID and 2FA code required' });
      return;
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const row = rows[0];
    if (!row || !row.totp_enabled || !row.totp_secret) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    // Verify TOTP using the same logic as twoFactorRoutes
    const crypto = await import('crypto');
    async function verifyTOTP(secretHex: string, token: string): Promise<boolean> {
      for (let w = -1; w <= 1; w++) {
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / 30) + w;
        const counterBuf = Buffer.alloc(8);
        counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
        counterBuf.writeUInt32BE(counter & 0xffffffff, 4);
        const hmac = crypto.createHmac('sha1', Buffer.from(secretHex, 'hex')).update(counterBuf).digest();
        const offset = hmac[hmac.length - 1] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset+1] << 16 | hmac[offset+2] << 8 | hmac[offset+3]) % 1000000;
        if (code.toString().padStart(6, '0') === token) return true;
      }
      // Check backup codes
      if (row.totp_backup_codes) {
        try {
          const codes: string[] = JSON.parse(row.totp_backup_codes);
          const idx = codes.indexOf(token);
          if (idx !== -1) {
            codes.splice(idx, 1);
            await pool.query('UPDATE users SET totp_backup_codes = $1 WHERE id = $2', [JSON.stringify(codes), userId]);
            return true;
          }
        } catch { /* ignore */ }
      }
      return false;
    }

    if (!(await verifyTOTP(row.totp_secret, totpToken))) {
      logAudit(req, { action: '2fa_failed', entityType: 'user', entityId: userId, details: 'Invalid 2FA code' });
      res.status(401).json({ error: 'Invalid 2FA code' });
      return;
    }

    const user = { id: row.id, name: row.name, email: row.email, role: row.role, tier: row.tier, avatar: row.avatar };
    const jwtToken = generateToken(user);
    logAudit(req, { action: 'login', entityType: 'user', entityId: row.id, details: `User ${row.email} logged in with 2FA` });
    res.json({ token: jwtToken, user });
  } catch (err: any) {
    console.error('[Auth] 2FA login error:', err.message);
    res.status(500).json({ error: '2FA verification failed' });
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

    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    const user = rows[0];

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: 'If the email exists, a reset link has been generated.' });
      return;
    }

    // Invalidate any previous unused tokens for this user
    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE user_id = $1 AND used = 0', [user.id]);

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const id = uuid();
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await pool.query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [id, user.id, token, expiresAt]
    );

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

    logAudit(req, { action: 'password_reset_request', entityType: 'user', entityId: user?.id || 'unknown', details: `Password reset requested for ${email}` });
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
    const { rows: resetRows } = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = 0',
      [token]
    );
    const resetRow = resetRows[0];

    if (!resetRow) {
      res.status(400).json({ error: 'Invalid or already used reset token' });
      return;
    }

    // Check expiry
    if (new Date(resetRow.expires_at) < new Date()) {
      await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = $1', [resetRow.id]);
      res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
      return;
    }

    // Update the user's password
    const hash = await hashPassword(password);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, resetRow.user_id]);

    // Mark token as used
    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = $1', [resetRow.id]);

    logAudit(req, { action: 'password_reset', entityType: 'user', entityId: resetRow.user_id, details: 'Password reset completed' });
    console.log(`[Auth] Password reset successful for user ${resetRow.user_id}`);
    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err: any) {
    console.error('[Auth] Reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// PUT /api/auth/profile — Update name/avatar
router.put('/profile', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters' });
      return;
    }
    const trimmed = name.trim();
    const avatar = trimmed.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
    (async () => {
      await pool.query('UPDATE users SET name = $1, avatar = $2 WHERE id = $3', [trimmed, avatar, userId]);
      const { rows: updatedRows } = await pool.query('SELECT id, name, email, role, tier, avatar FROM users WHERE id = $1', [userId]);
      const updated = updatedRows[0];
      const token = generateToken(updated);
      logAudit(req, { action: 'profile_update', entityType: 'user', entityId: userId, details: `Profile updated: name → ${trimmed}` });
      res.json({ token, user: updated });
    })();
  } catch (err: any) {
    console.error('[Auth] Profile update error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/auth/change-password — Change password (requires current password)
router.put('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password required' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const row = rows[0];
    if (!row) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await comparePassword(currentPassword, row.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const hash = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
    logAudit(req, { action: 'password_change', entityType: 'user', entityId: userId, details: 'Password changed via profile' });
    res.json({ message: 'Password changed successfully.' });
  } catch (err: any) {
    console.error('[Auth] Change password error:', err.message);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

export default router;
