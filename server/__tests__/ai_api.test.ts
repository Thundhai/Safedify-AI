// Integration test for /api/ai/status endpoint (TypeScript, Vitest)
// Requires a live DATABASE_URL — skipped when unavailable.

import { describe, it, expect } from 'vitest';

const hasDb = !!process.env.DATABASE_URL;

describe('AI API Endpoints', () => {
  it.skipIf(!hasDb)('should return healthy status for /api/ai/status (with auth)', async () => {
    const request = (await import('supertest')).default;
    const app = (await import('../index')).default;

    const TEST_USER = { email: 'admin@safedify.com', password: 'admin123' };

    // 1. Login to get JWT token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(TEST_USER);
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    const token = loginRes.body.token;

    // 2. Call /api/ai/status with Authorization header
    const res = await request(app)
      .get('/api/ai/status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status');
  }, 15000);
});
