/**
 * Auth middleware & RBAC tests
 * Tests: authenticate, requireRole, requirePermission, password hashing, JWT tokens
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ---------- Mock pool before importing auth ----------
const mockPoolQuery = vi.fn();
vi.mock('../postgres', () => ({
  default: { query: mockPoolQuery },
}));

// Now import auth (it will use the mocked db)
const { authenticate, requireRole, requirePermission, hashPassword, comparePassword, generateToken } = await import('../auth.js');

const JWT_SECRET = 'safedify-dev-secret-not-for-production'; // matches default in auth.ts

// ---------- Helpers ----------
const mockUser = { id: 'u1', name: 'Test', email: 'test@test.com', role: 'Admin', tier: 'Enterprise', avatar: 'T' };

const createMockReqRes = (overrides: any = {}) => {
  const req: any = {
    headers: {},
    user: undefined,
    ...overrides,
  };
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
};

// ---------- Tests ----------

describe('Auth - Password Hashing', () => {
  it('hashes and verifies passwords correctly', async () => {
    const password = 'SecureP@ss123';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
    expect(await comparePassword(password, hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for same password (salt)', async () => {
    const h1 = await hashPassword('same');
    const h2 = await hashPassword('same');
    expect(h1).not.toBe(h2);
  });
});

describe('Auth - JWT Tokens', () => {
  it('generates valid JWT token', () => {
    const token = generateToken(mockUser);
    expect(token).toBeTruthy();
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    expect(decoded.id).toBe('u1');
    expect(decoded.email).toBe('test@test.com');
    expect(decoded.role).toBe('Admin');
  });

  it('token expires (has exp claim)', () => {
    const token = generateToken(mockUser);
    const decoded = jwt.decode(token) as any;
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});

describe('Auth - authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects request with no Authorization header', async () => {
    const { req, res, next } = createMockReqRes();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with invalid token format', async () => {
    const { req, res, next } = createMockReqRes({ headers: { authorization: 'InvalidToken' } });
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with expired/invalid JWT', async () => {
    const { req, res, next } = createMockReqRes({ headers: { authorization: 'Bearer invalidjwt123' } });
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects valid JWT if user no longer exists in DB', async () => {
    const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });
    const { req, res, next } = createMockReqRes({ headers: { authorization: `Bearer ${token}` } });
    mockPoolQuery.mockResolvedValue({ rows: [] }); // user not found in DB
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('no longer exists') }));
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts valid JWT and sets fresh user from DB', async () => {
    const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });
    const freshUser = { id: 'u1', name: 'Test Updated', email: 'test@test.com', role: 'Worker', tier: 'Free', avatar: 'TU' };
    mockPoolQuery.mockResolvedValue({ rows: [freshUser] });
    const { req, res, next } = createMockReqRes({ headers: { authorization: `Bearer ${token}` } });
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('Worker'); // uses DB value, not stale JWT
    expect(req.user.name).toBe('Test Updated');
  });
});

describe('RBAC - requireRole', () => {
  it('rejects unauthenticated request', async () => {
    const middleware = requireRole('Admin');
    const { req, res, next } = createMockReqRes();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows Admin to access any role-gated route', async () => {
    const middleware = requireRole('Worker');
    const { req, res, next } = createMockReqRes();
    req.user = { ...mockUser, role: 'Admin' };
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows matching role', async () => {
    const middleware = requireRole('Worker', 'HSE Supervisor');
    const { req, res, next } = createMockReqRes();
    req.user = { ...mockUser, role: 'HSE Supervisor' };
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects non-matching role', async () => {
    const middleware = requireRole('Admin');
    const { req, res, next } = createMockReqRes();
    req.user = { ...mockUser, role: 'Worker' };
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('RBAC - requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Admin bypasses permission check', async () => {
    const middleware = requirePermission('manage_users');
    const { req, res, next } = createMockReqRes();
    req.user = { ...mockUser, role: 'Admin' };
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(mockPoolQuery).not.toHaveBeenCalledWith(expect.stringContaining('permissions'));
  });

  it('allows user with required permission', async () => {
    const middleware = requirePermission('view_incidents');
    const { req, res, next } = createMockReqRes();
    req.user = { ...mockUser, role: 'HSE Supervisor' };
    mockPoolQuery.mockResolvedValue({ rows: [{ permissions: JSON.stringify(['view_incidents', 'create_incidents']) }] });
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects user missing required permission', async () => {
    const middleware = requirePermission('manage_users');
    const { req, res, next } = createMockReqRes();
    req.user = { ...mockUser, role: 'Worker' };
    mockPoolQuery.mockResolvedValue({ rows: [{ permissions: JSON.stringify(['view_incidents']) }] });
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when role not found in DB', async () => {
    const middleware = requirePermission('view_incidents');
    const { req, res, next } = createMockReqRes();
    req.user = { ...mockUser, role: 'Unknown' };
    mockPoolQuery.mockResolvedValue({ rows: [] });
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('requires ALL listed permissions', async () => {
    const middleware = requirePermission('view_incidents', 'manage_users');
    const { req, res, next } = createMockReqRes();
    req.user = { ...mockUser, role: 'HSE Supervisor' };
    mockPoolQuery.mockResolvedValue({ rows: [{ permissions: JSON.stringify(['view_incidents']) }] }); // missing manage_users
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
