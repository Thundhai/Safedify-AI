import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { AuthRequest, authenticate } from '../auth.js';
import { logAudit } from './auditRoutes.js';

const router = Router();

// ---------- TOTP helpers (RFC 6238 — no external deps) ----------

function generateSecret(length = 20): string {
  return crypto.randomBytes(length).toString('hex');
}

function base32Encode(hex: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = Buffer.from(hex, 'hex');
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
}

function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of encoded.toUpperCase()) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTOTP(secretHex: string, time?: number, window = 0): string {
  const epoch = Math.floor((time || Date.now()) / 1000);
  const counter = Math.floor(epoch / 30) + window;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter & 0xffffffff, 4);
  const hmac = crypto.createHmac('sha1', Buffer.from(secretHex, 'hex')).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset+1] << 16 | hmac[offset+2] << 8 | hmac[offset+3]) % 1000000;
  return code.toString().padStart(6, '0');
}

function verifyTOTP(secretHex: string, token: string): boolean {
  for (let w = -1; w <= 1; w++) {
    if (generateTOTP(secretHex, undefined, w) === token) return true;
  }
  return false;
}

// ---------- Ensure DB column ----------

try {
  db.exec(`ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0`);
} catch { /* column already exists */ }

// ---------- Routes ----------

// POST /api/auth/2fa/setup — Generate TOTP secret & QR URI
router.post('/setup', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const row = db.prepare('SELECT totp_enabled FROM users WHERE id = ?').get(user.id) as any;
    if (row?.totp_enabled) {
      res.status(400).json({ error: '2FA is already enabled. Disable it first to reconfigure.' });
      return;
    }

    const secretHex = generateSecret();
    const secretB32 = base32Encode(secretHex);

    // Store secret (not yet enabled until verified)
    db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secretHex, user.id);

    const issuer = 'Safedify';
    const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    res.json({ secret: secretB32, uri: otpauthUri });
  } catch (err: any) {
    console.error('[2FA] Setup error:', err.message);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// POST /api/auth/2fa/verify — Confirm setup with a valid TOTP code
router.post('/verify', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { token } = req.body;
    if (!token) { res.status(400).json({ error: 'Token is required' }); return; }

    const row = db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?').get(user.id) as any;
    if (!row?.totp_secret) { res.status(400).json({ error: 'No 2FA setup in progress' }); return; }
    if (row.totp_enabled) { res.status(400).json({ error: '2FA is already enabled' }); return; }

    if (!verifyTOTP(row.totp_secret, token)) {
      res.status(400).json({ error: 'Invalid verification code. Please try again.' });
      return;
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
    const backupHash = JSON.stringify(backupCodes);

    db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(user.id);

    // Store backup codes in a simple way (in production, hash these)
    try {
      db.exec(`ALTER TABLE users ADD COLUMN totp_backup_codes TEXT DEFAULT NULL`);
    } catch { /* already exists */ }
    db.prepare('UPDATE users SET totp_backup_codes = ? WHERE id = ?').run(backupHash, user.id);

    logAudit(req, { action: '2fa_enabled', entityType: 'user', entityId: user.id, details: '2FA enabled via TOTP' });

    res.json({ message: '2FA enabled successfully', backupCodes });
  } catch (err: any) {
    console.error('[2FA] Verify error:', err.message);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// POST /api/auth/2fa/validate — Validate TOTP code during login
router.post('/validate', (req: AuthRequest, res: Response) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) { res.status(400).json({ error: 'User ID and token are required' }); return; }

    const row = db.prepare('SELECT totp_secret, totp_enabled, totp_backup_codes FROM users WHERE id = ?').get(userId) as any;
    if (!row?.totp_enabled || !row?.totp_secret) {
      res.status(400).json({ error: '2FA is not enabled for this account' });
      return;
    }

    // Check TOTP
    if (verifyTOTP(row.totp_secret, token)) {
      res.json({ valid: true });
      return;
    }

    // Check backup codes
    if (row.totp_backup_codes) {
      try {
        const codes: string[] = JSON.parse(row.totp_backup_codes);
        const idx = codes.indexOf(token);
        if (idx !== -1) {
          codes.splice(idx, 1);
          db.prepare('UPDATE users SET totp_backup_codes = ? WHERE id = ?').run(JSON.stringify(codes), userId);
          res.json({ valid: true, backupCodeUsed: true, remainingBackupCodes: codes.length });
          return;
        }
      } catch { /* ignore parse errors */ }
    }

    res.status(401).json({ valid: false, error: 'Invalid 2FA code' });
  } catch (err: any) {
    console.error('[2FA] Validate error:', err.message);
    res.status(500).json({ error: 'Failed to validate 2FA' });
  }
});

// DELETE /api/auth/2fa — Disable 2FA
router.delete('/', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    db.prepare('UPDATE users SET totp_secret = NULL, totp_enabled = 0, totp_backup_codes = NULL WHERE id = ?').run(user.id);
    logAudit(req, { action: '2fa_disabled', entityType: 'user', entityId: user.id, details: '2FA disabled' });
    res.json({ message: '2FA has been disabled' });
  } catch (err: any) {
    console.error('[2FA] Disable error:', err.message);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// GET /api/auth/2fa/status — Check if 2FA is enabled
router.get('/status', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const row = db.prepare('SELECT totp_enabled FROM users WHERE id = ?').get(user.id) as any;
    res.json({ enabled: !!row?.totp_enabled });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check 2FA status' });
  }
});

export default router;
