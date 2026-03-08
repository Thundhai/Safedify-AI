import { test, expect } from '@playwright/test';

// ---------- Health Check ----------

test('API health endpoint returns OK', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe('ok');
  expect(body.server).toContain('Safedify');
});

// ---------- Auth Flow ----------

test.describe('Authentication', () => {
  const testUser = {
    name: 'E2E Test User',
    email: `e2e-${Date.now()}@test.com`,
    password: 'TestPassword123!',
  };

  test('Register a new user', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { name: testUser.name, email: testUser.email, password: testUser.password },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(testUser.email);
    expect(body.user.role).toBe('Worker');
  });

  test('Reject duplicate registration', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { name: testUser.name, email: testUser.email, password: testUser.password },
    });
    expect(res.status()).toBe(409);
  });

  test('Login with valid credentials', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: testUser.email, password: testUser.password },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.token).toBeTruthy();
  });

  test('Reject invalid password', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: testUser.email, password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
  });

  test('Login with default admin', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'admin@safedify.com', password: 'admin123' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.user.role).toBe('Admin');
  });

  test('GET /me requires auth', async ({ request }) => {
    const res = await request.get('/api/auth/me');
    expect(res.status()).toBe(401);
  });

  test('GET /me succeeds with token', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'admin@safedify.com', password: 'admin123' },
    });
    const { token } = await loginRes.json();

    const meRes = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.ok()).toBeTruthy();
    const body = await meRes.json();
    expect(body.user.email).toBe('admin@safedify.com');
  });
});

// ---------- CRUD Operations ----------

test.describe('CRUD — Incidents', () => {
  let token: string;
  let incidentId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'admin@safedify.com', password: 'admin123' },
    });
    const body = await res.json();
    token = body.token;
  });

  test('Create incident', async ({ request }) => {
    const res = await request.post('/api/incidents', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'E2E Test Incident',
        description: 'Automated test incident',
        severity: 'Low',
        type: 'Near Miss',
        status: 'Open',
        location: 'Test Site',
        date: new Date().toISOString(),
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBeTruthy();
    incidentId = body.id;
  });

  test('List incidents includes the new one', async ({ request }) => {
    const res = await request.get('/api/incidents', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const items = Array.isArray(body) ? body : body.data;
    expect(items.some((i: any) => i.id === incidentId)).toBeTruthy();
  });

  test('Get single incident', async ({ request }) => {
    const res = await request.get(`/api/incidents/${incidentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.description).toBe('Automated test incident');
  });

  test('Update incident', async ({ request }) => {
    const res = await request.put(`/api/incidents/${incidentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Updated E2E Incident', status: 'Closed' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Delete incident', async ({ request }) => {
    const res = await request.delete(`/api/incidents/${incidentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });
});

// ---------- Search ----------

test.describe('Full-Text Search', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'admin@safedify.com', password: 'admin123' },
    });
    token = (await res.json()).token;
  });

  test('Search endpoint returns results structure', async ({ request }) => {
    const res = await request.get('/api/search?q=test', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBeTruthy();
  });
});

// ---------- Audit Logs ----------

test.describe('Audit Logs', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'admin@safedify.com', password: 'admin123' },
    });
    token = (await res.json()).token;
  });

  test('Admin can view audit logs', async ({ request }) => {
    const res = await request.get('/api/audit-logs', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });
});

// ---------- Export ----------

test.describe('Data Export', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'admin@safedify.com', password: 'admin123' },
    });
    token = (await res.json()).token;
  });

  test('Export incidents as CSV', async ({ request }) => {
    const res = await request.get('/api/export/incidents?format=csv', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()['content-type'];
    expect(contentType).toContain('text/csv');
  });

  test('Export incidents as JSON', async ({ request }) => {
    const res = await request.get('/api/export/incidents?format=json', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });
});

// ---------- Backup (Admin only) ----------

test.describe('Admin Backup', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'admin@safedify.com', password: 'admin123' },
    });
    token = (await res.json()).token;
  });

  test('List backups', async ({ request }) => {
    const res = await request.get('/api/admin/backups', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('Create manual backup', async ({ request }) => {
    const res = await request.post('/api/admin/backup', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.filename).toBeTruthy();
  });
});

// ---------- RBAC & Permission enforcement ----------

test.describe('RBAC enforcement', () => {
  let workerToken: string;

  test.beforeAll(async ({ request }) => {
    // Register a worker
    const res = await request.post('/api/auth/register', {
      data: { name: 'Worker User', email: `worker-${Date.now()}@test.com`, password: 'Worker1234' },
    });
    workerToken = (await res.json()).token;
  });

  test('Worker cannot access audit logs', async ({ request }) => {
    const res = await request.get('/api/audit-logs', {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('Worker cannot create backup', async ({ request }) => {
    const res = await request.post('/api/admin/backup', {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    expect(res.status()).toBe(403);
  });
});
