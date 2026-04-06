/**
 * Organization Routes — org management, invites, member management
 *
 * GET    /api/org              — get current user's org details
 * PUT    /api/org              — update org name (owner only)
 * GET    /api/org/members      — list org members
 * DELETE /api/org/members/:id  — remove a member (owner/Admin only)
 * POST   /api/org/invite       — send invite to join org
 * GET    /api/org/invites      — list pending invites
 * DELETE /api/org/invites/:id  — revoke an invite
 */
import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import pool from '../postgres';
import { AuthRequest, authenticate, requireRole, hashToken } from '../auth.js';
import { validate, validateParams, ValidationSchema, sanitizeString } from '../middleware/inputValidation.js';
import { sendEmail } from '../services/emailService.js';
import { logAudit } from './auditRoutes.js';

const router = Router();
router.use(authenticate);

// Validation schemas
const updateOrgSchema: ValidationSchema = {
  name: { type: 'string', required: true, maxLength: 200, trim: true },
};

const inviteSchema: ValidationSchema = {
  email: { type: 'email', required: true, maxLength: 254 },
  role: { type: 'string', required: false, maxLength: 50 },
};

const uuidParamSchema: ValidationSchema = {
  id: { type: 'uuid', required: true },
};

// ---------- Get current org ----------
router.get('/', async (req: AuthRequest, res: Response) => {
  const orgId = req.user?.org_id;
  if (!orgId) {
    res.status(404).json({ error: 'No organization found' });
    return;
  }

  const result = await pool.query(
    'SELECT id, name, slug, plan, owner_id, created_at FROM organizations WHERE id = $1',
    [orgId]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const org = result.rows[0];
  const memberCount = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE org_id = $1',
    [orgId]
  );

  res.json({
    ...org,
    memberCount: parseInt(memberCount.rows[0]?.count || '0', 10),
    isOwner: org.owner_id === req.user?.id,
  });
});

// ---------- Update org name (owner or Admin) ----------
router.put('/', validate(updateOrgSchema), async (req: AuthRequest, res: Response) => {
  const orgId = req.user?.org_id;
  if (!orgId) { res.status(404).json({ error: 'No organization found' }); return; }

  // Only owner or Admin can update
  const orgResult = await pool.query('SELECT owner_id FROM organizations WHERE id = $1', [orgId]);
  const org = orgResult.rows[0];
  if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }
  if (org.owner_id !== req.user?.id && req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Only the organization owner or Admin can update organization details' });
    return;
  }

  const name = sanitizeString(req.body.name, { stripHtml: true, maxLength: 200 }).trim();
  if (!name) { res.status(400).json({ error: 'Name is required' }); return; }

  await pool.query('UPDATE organizations SET name = $1 WHERE id = $2', [name, orgId]);
  logAudit(req, { action: 'update', entityType: 'organization', entityId: orgId, details: `Renamed to "${name}"` });
  res.json({ message: 'Organization updated', name });
});

// ---------- List members ----------
router.get('/members', async (req: AuthRequest, res: Response) => {
  const orgId = req.user?.org_id;
  if (!orgId) { res.status(404).json({ error: 'No organization found' }); return; }

  const result = await pool.query(
    `SELECT id, name, email, role, avatar, created_at 
     FROM users WHERE org_id = $1 ORDER BY created_at ASC`,
    [orgId]
  );

  // Get owner_id to mark on response
  const orgResult = await pool.query('SELECT owner_id FROM organizations WHERE id = $1', [orgId]);
  const ownerId = orgResult.rows[0]?.owner_id;

  res.json(result.rows.map(m => ({
    ...m,
    isOwner: m.id === ownerId,
  })));
});

// ---------- Remove member (owner/Admin only, cannot remove self) ----------
router.delete('/members/:id', validateParams(uuidParamSchema), async (req: AuthRequest, res: Response) => {
  const orgId = req.user?.org_id;
  if (!orgId) { res.status(404).json({ error: 'No organization found' }); return; }

  const memberId = req.params.id as string;
  if (memberId === req.user?.id) {
    res.status(400).json({ error: 'Cannot remove yourself from the organization' });
    return;
  }

  // Only owner or Admin can remove members
  const orgResult = await pool.query('SELECT owner_id FROM organizations WHERE id = $1', [orgId]);
  const org = orgResult.rows[0];
  if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }
  if (org.owner_id !== req.user?.id && req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Only the organization owner or Admin can remove members' });
    return;
  }

  // Cannot remove the owner
  if (memberId === org.owner_id) {
    res.status(400).json({ error: 'Cannot remove the organization owner' });
    return;
  }

  // Verify user is in this org
  const memberResult = await pool.query('SELECT id, name FROM users WHERE id = $1 AND org_id = $2', [memberId, orgId]);
  if (!memberResult.rows[0]) {
    res.status(404).json({ error: 'Member not found in this organization' });
    return;
  }

  // Set org_id to NULL (effectively removing from org)
  await pool.query('UPDATE users SET org_id = NULL WHERE id = $1', [memberId]);
  logAudit(req, { action: 'delete', entityType: 'org_member', entityId: memberId, details: `Removed ${memberResult.rows[0].name}` });
  res.json({ message: 'Member removed from organization' });
});

// ---------- Send invite ----------
router.post('/invite', validate(inviteSchema), async (req: AuthRequest, res: Response) => {
  const orgId = req.user?.org_id;
  if (!orgId) { res.status(404).json({ error: 'No organization found' }); return; }

  // Only owner or Admin can invite
  const orgResult = await pool.query('SELECT owner_id, name FROM organizations WHERE id = $1', [orgId]);
  const org = orgResult.rows[0];
  if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }
  if (org.owner_id !== req.user?.id && req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Only the organization owner or Admin can send invites' });
    return;
  }

  const email = sanitizeString(req.body.email, { stripHtml: true, maxLength: 254 }).trim().toLowerCase();
  const role = sanitizeString(req.body.role || 'Worker', { stripHtml: true, maxLength: 50 });

  // Check if user already in org
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 AND org_id = $2', [email, orgId]);
  if (existingUser.rows[0]) {
    res.status(409).json({ error: 'User is already a member of this organization' });
    return;
  }

  // Check for pending invite
  const existingInvite = await pool.query(
    'SELECT id FROM org_invites WHERE org_id = $1 AND email = $2 AND accepted = FALSE AND expires_at > NOW()',
    [orgId, email]
  );
  if (existingInvite.rows[0]) {
    res.status(409).json({ error: 'An active invite already exists for this email' });
    return;
  }

  const id = uuid();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token); // Store only the hash in DB
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await pool.query(
    `INSERT INTO org_invites (id, org_id, email, role, token, expires_at, invited_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, orgId, email, role, tokenHash, expiresAt.toISOString(), req.user?.id]
  );

  // Send invite email
  const appUrl = process.env.APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173';
  const inviteLink = `${appUrl}/#/register?invite=${token}`;

  await sendEmail({
    to: email,
    subject: `You're invited to join ${org.name} on Safedify`,
    text: `Hi,\n\n${req.user?.name} has invited you to join ${org.name} on Safedify.\n\nClick here to accept: ${inviteLink}\n\nThis invite expires in 7 days.`,
    html: `<p>Hi,</p><p><strong>${req.user?.name}</strong> has invited you to join <strong>${org.name}</strong> on Safedify.</p><p><a href="${inviteLink}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invite</a></p><p>This invite expires in 7 days.</p>`,
  });

  logAudit(req, { action: 'create', entityType: 'org_invite', entityId: id, details: `Invited ${email} as ${role}` });
  res.status(201).json({ message: 'Invite sent', id, email, role, expiresAt });
});

// ---------- List pending invites ----------
router.get('/invites', async (req: AuthRequest, res: Response) => {
  const orgId = req.user?.org_id;
  if (!orgId) { res.status(404).json({ error: 'No organization found' }); return; }

  const result = await pool.query(
    `SELECT i.id, i.email, i.role, i.expires_at, i.accepted, i.created_at, u.name as invited_by_name
     FROM org_invites i
     LEFT JOIN users u ON u.id = i.invited_by
     WHERE i.org_id = $1
     ORDER BY i.created_at DESC`,
    [orgId]
  );
  res.json(result.rows);
});

// ---------- Revoke invite ----------
router.delete('/invites/:id', validateParams(uuidParamSchema), async (req: AuthRequest, res: Response) => {
  const orgId = req.user?.org_id;
  if (!orgId) { res.status(404).json({ error: 'No organization found' }); return; }

  // Only owner or Admin can revoke
  const orgResult = await pool.query('SELECT owner_id FROM organizations WHERE id = $1', [orgId]);
  const org = orgResult.rows[0];
  if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }
  if (org.owner_id !== req.user?.id && req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Only the organization owner or Admin can revoke invites' });
    return;
  }

  const result = await pool.query(
    'DELETE FROM org_invites WHERE id = $1 AND org_id = $2 RETURNING email',
    [req.params.id, orgId]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }

  logAudit(req, { action: 'delete', entityType: 'org_invite', entityId: req.params.id as string, details: `Revoked invite for ${result.rows[0].email}` });
  res.json({ message: 'Invite revoked' });
});

export default router;
