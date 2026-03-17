import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import pool from '../postgres';
import { 
  AuthRequest, hashPassword, comparePassword, generateToken, authenticate,
  LOCKOUT_CONFIG, validatePasswordStrength, generateSecureToken, hashToken
} from '../auth.js';
import { logAudit } from './auditRoutes.js';
import { sendEmail } from '../services/emailService.js';
import { logAuthSuccess, logAuthFailure, logSecurityEvent, getClientIp } from '../middleware/securityLogger.js';
import { registrationRateLimiter, honeypotProtection, recordLoginSuccess } from '../middleware/abuseProtection.js';
import { validate, ValidationSchema } from '../middleware/inputValidation.js';

// ============================================
// Validation Schemas
// ============================================
const loginSchema: ValidationSchema = {
  email: { type: 'email', required: true, maxLength: 255 },
  password: { type: 'string', required: true, minLength: 1, maxLength: 128, allowInjection: true },
};

const registerSchema: ValidationSchema = {
  name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
  email: { type: 'email', required: true, maxLength: 255 },
  password: { type: 'string', required: true, minLength: 8, maxLength: 128, allowInjection: true },
  role: { type: 'string', enum: ['Worker', 'HSE Supervisor', 'Manager', 'Admin'] },
};

const tokenSchema: ValidationSchema = {
  token: { type: 'string', required: true, minLength: 10, maxLength: 500 },
};

const passwordChangeSchema: ValidationSchema = {
  currentPassword: { type: 'string', required: true, maxLength: 128, allowInjection: true },
  newPassword: { type: 'string', required: true, minLength: 8, maxLength: 128, allowInjection: true },
};

const forgotPasswordSchema: ValidationSchema = {
  email: { type: 'email', required: true, maxLength: 255 },
};

const resetPasswordSchema: ValidationSchema = {
  token: { type: 'string', required: true, minLength: 10, maxLength: 500 },
  password: { type: 'string', required: true, minLength: 8, maxLength: 128, allowInjection: true },
};

const router = Router();

// ============================================
// Helper: Check if account is locked
// ============================================
async function isAccountLocked(userId: string): Promise<{ locked: boolean; remainingMs?: number }> {
  const { rows } = await pool.query(
    'SELECT locked_until FROM users WHERE id = $1',
    [userId]
  );
  const row = rows[0];
  if (!row?.locked_until) return { locked: false };
  
  const lockedUntil = new Date(row.locked_until);
  const now = new Date();
  if (lockedUntil > now) {
    return { locked: true, remainingMs: lockedUntil.getTime() - now.getTime() };
  }
  // Lock expired, reset
  await pool.query(
    'UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = $1',
    [userId]
  );
  return { locked: false };
}

// ============================================
// Helper: Record failed login attempt
// ============================================
async function recordFailedLogin(userId: string, email: string, req: AuthRequest): Promise<{ locked: boolean; attemptsRemaining: number }> {
  const { rows } = await pool.query(
    'UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, last_failed_login = NOW() RETURNING failed_login_attempts',
    [userId]
  );
  const attempts = rows[0]?.failed_login_attempts || 1;
  
  if (attempts >= LOCKOUT_CONFIG.maxAttempts) {
    const lockUntil = new Date(Date.now() + LOCKOUT_CONFIG.lockoutDurationMs);
    await pool.query('UPDATE users SET locked_until = $1 WHERE id = $2', [lockUntil.toISOString(), userId]);
    logAudit(req, { action: 'account_locked', entityType: 'user', entityId: userId, details: `Account locked after ${attempts} failed attempts` });
    return { locked: true, attemptsRemaining: 0 };
  }
  
  return { locked: false, attemptsRemaining: LOCKOUT_CONFIG.maxAttempts - attempts };
}

// ============================================
// Helper: Reset failed login attempts
// ============================================
async function resetFailedLogins(userId: string): Promise<void> {
  await pool.query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_failed_login = NULL WHERE id = $1',
    [userId]
  );
}

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const row = rows[0];
    if (!row) {
      // Use constant-time response to prevent username enumeration
      await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check account lockout
    const lockStatus = await isAccountLocked(row.id);
    if (lockStatus.locked) {
      const minutesRemaining = Math.ceil((lockStatus.remainingMs || 0) / 60000);
      logAudit(req, { action: 'login_blocked_locked', entityType: 'user', entityId: row.id, details: `Login attempt on locked account: ${email}` });
      res.status(423).json({ 
        error: `Account temporarily locked. Try again in ${minutesRemaining} minute(s).`,
        lockedUntil: new Date(Date.now() + (lockStatus.remainingMs || 0)).toISOString()
      });
      return;
    }

    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      const result = await recordFailedLogin(row.id, email, req);
      logAudit(req, { action: 'login_failed', entityType: 'user', entityId: row.id, details: `Failed login for ${email}` });
      logAuthFailure(req, email, 'Invalid password');
      
      if (result.locked) {
        logSecurityEvent({
          type: 'auth_lockout',
          severity: 'warning',
          email,
          ip: getClientIp(req),
          userAgent: (req.headers['user-agent'] || '').slice(0, 512),
          endpoint: req.path,
          method: req.method,
          details: `Account locked after ${LOCKOUT_CONFIG.maxAttempts} failed attempts`,
        });
        res.status(423).json({ 
          error: `Account locked due to too many failed attempts. Try again in ${Math.ceil(LOCKOUT_CONFIG.lockoutDurationMs / 60000)} minutes.`
        });
      } else {
        res.status(401).json({ 
          error: 'Invalid credentials',
          // Only hint at remaining attempts in non-production
          ...(process.env.NODE_ENV !== 'production' && { attemptsRemaining: result.attemptsRemaining })
        });
      }
      return;
    }

    // Check email verification (skip for existing users who registered before verification was required)
    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    if (requireVerification && row.email_verified === false && row.email_verification_token) {
      res.status(403).json({ 
        error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        requiresVerification: true
      });
      return;
    }

    // Reset failed login attempts on successful login
    await resetFailedLogins(row.id);

    const user = { id: row.id, name: row.name, email: row.email, role: row.role, tier: row.tier, avatar: row.avatar };

    // Check if 2FA is enabled
    if (row.totp_enabled) {
      logAudit(req, { action: 'login_2fa_required', entityType: 'user', entityId: row.id, details: `2FA challenge for ${email}` });
      res.json({ requires2FA: true, userId: row.id });
      return;
    }

    // Check if password change is required (for seeded/reset accounts)
    if (row.must_change_password) {
      const tempToken = generateToken(user);
      res.json({ 
        requiresPasswordChange: true, 
        token: tempToken, 
        user,
        message: 'You must change your password before continuing.'
      });
      return;
    }

    const token = generateToken(user);
    logAudit(req, { action: 'login', entityType: 'user', entityId: row.id, details: `User ${email} logged in` });
    logAuthSuccess(req, row.id, email);
    recordLoginSuccess(getClientIp(req)); // Reset IP-based login attempt counter
    res.json({ token, user });
  } catch (err: any) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/register
// Protected by: registration rate limit + honeypot field detection + input validation
router.post('/register', registrationRateLimiter(), honeypotProtection(), validate(registerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate password strength using centralized function
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.error });
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

    // Email verification setup
    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    const verificationToken = requireVerification ? generateSecureToken() : null;
    const verificationExpires = requireVerification ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, tier, avatar, email_verified, email_verification_token, email_verification_expires, password_changed_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [id, name, email, hash, safeRole, 'Pro', avatar, !requireVerification, verificationToken, verificationExpires]
    );

    // Send verification email if required
    if (requireVerification && verificationToken) {
      const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 4500}`;
      const verifyLink = `${baseUrl}/#/verify-email?token=${verificationToken}`;
      
      await sendEmail({
        to: email,
        subject: 'Verify your Safedify account',
        text: `Welcome to Safedify!\n\nPlease verify your email by clicking the link below:\n\n${verifyLink}\n\nThis link expires in 24 hours.\n\nIf you didn't create this account, please ignore this email.`,
        html: `
          <h2>Welcome to Safedify!</h2>
          <p>Please verify your email address to complete your registration.</p>
          <p><a href="${verifyLink}" style="display:inline-block;padding:12px 24px;background:#f97316;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Verify Email</a></p>
          <p style="color:#666;font-size:12px;">This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
        `
      });

      logAudit(req, { action: 'register', entityType: 'user', entityId: id, details: `New user registered (pending verification): ${email}` });
      res.status(201).json({ 
        message: 'Registration successful. Please check your email to verify your account.',
        requiresVerification: true
      });
      return;
    }

    const user = { id, name, email, role: safeRole, tier: 'Pro', avatar };
    const token = generateToken(user);
    logAudit(req, { action: 'register', entityType: 'user', entityId: id, details: `New user registered: ${email}` });
    res.status(201).json({ token, user });
  } catch (err: any) {
    console.error('[Auth] Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT id, email, email_verification_expires FROM users WHERE email_verification_token = $1 AND email_verified = FALSE',
      [token]
    );
    const user = rows[0];

    if (!user) {
      res.status(400).json({ error: 'Invalid or already used verification token' });
      return;
    }

    // Check expiration
    if (new Date(user.email_verification_expires) < new Date()) {
      res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
      return;
    }

    // Mark email as verified
    await pool.query(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1',
      [user.id]
    );

    logAudit(req, { action: 'email_verified', entityType: 'user', entityId: user.id, details: `Email verified: ${user.email}` });
    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err: any) {
    console.error('[Auth] Email verification error:', err.message);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT id, name, email_verified FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];

    // Always return success to prevent enumeration
    if (!user || user.email_verified) {
      res.json({ message: 'If the email exists and is not verified, a new verification link has been sent.' });
      return;
    }

    // Generate new token
    const verificationToken = generateSecureToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      'UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3',
      [verificationToken, verificationExpires, user.id]
    );

    const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 4500}`;
    const verifyLink = `${baseUrl}/#/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: email,
      subject: 'Verify your Safedify account',
      text: `Please verify your email by clicking this link:\n\n${verifyLink}\n\nThis link expires in 24 hours.`
    });

    logAudit(req, { action: 'verification_resent', entityType: 'user', entityId: user.id, details: `Verification email resent to ${email}` });
    res.json({ message: 'If the email exists and is not verified, a new verification link has been sent.' });
  } catch (err: any) {
    console.error('[Auth] Resend verification error:', err.message);
    res.status(500).json({ error: 'Failed to resend verification email.' });
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
      // Add small delay to prevent timing attacks
      await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
      res.json({ message: 'If the email exists, a reset link has been sent.' });
      return;
    }

    // Invalidate any previous unused tokens for this user
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);

    // Generate a secure random token (store hashed version in DB)
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const id = uuid();
    // Token expires in 1 hour (security best practice)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await pool.query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [id, user.id, tokenHash, expiresAt]
    );

    // Build the reset link (frontend HashRouter)
    const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 4500}`;
    const resetLink = `${baseUrl}/#/reset-password?token=${token}`;

    // Send password reset email
    await sendEmail({
      to: user.email,
      subject: 'Reset your Safedify password',
      text: `Hi ${user.name},\n\nYou requested to reset your password. Click the link below:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email or contact support if you're concerned.`,
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You requested to reset your password. Click the button below:</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#f97316;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a></p>
        <p style="color:#666;font-size:12px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      `
    });

    // Log in development only (not the token itself for security)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Auth] Password reset email sent to ${user.email} (expires: ${expiresAt})`);
    }

    logAudit(req, { action: 'password_reset_request', entityType: 'user', entityId: user.id, details: `Password reset requested for ${email}` });
    res.json({ message: 'If the email exists, a reset link has been sent.' });
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

    // Validate password strength (same rules as registration)
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.error });
      return;
    }

    // Hash the incoming token to compare with stored hash
    const tokenHash = hashToken(token);

    // Find valid, unused token
    const { rows: resetRows } = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE',
      [tokenHash]
    );
    const resetRow = resetRows[0];

    if (!resetRow) {
      res.status(400).json({ error: 'Invalid or already used reset token' });
      return;
    }

    // Check expiry
    if (new Date(resetRow.expires_at) < new Date()) {
      await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetRow.id]);
      res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
      return;
    }

    // Update the user's password and record change timestamp
    const hash = await hashPassword(password);
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW(), must_change_password = FALSE WHERE id = $2',
      [hash, resetRow.user_id]
    );

    // Mark token as used
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetRow.id]);

    // Invalidate all other reset tokens for this user (security)
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1', [resetRow.user_id]);

    logAudit(req, { action: 'password_reset', entityType: 'user', entityId: resetRow.user_id, details: 'Password reset completed' });
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

    // Validate new password strength
    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.error });
      return;
    }

    // Prevent reusing the same password
    if (currentPassword === newPassword) {
      res.status(400).json({ error: 'New password must be different from current password' });
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
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW(), must_change_password = FALSE WHERE id = $2',
      [hash, userId]
    );
    logAudit(req, { action: 'password_change', entityType: 'user', entityId: userId, details: 'Password changed via profile' });
    res.json({ message: 'Password changed successfully.' });
  } catch (err: any) {
    console.error('[Auth] Change password error:', err.message);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

export default router;
