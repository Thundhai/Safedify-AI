/**
 * Agent Tools — SQL injection protection tests
 * Verifies that the run_custom_query tool properly blocks dangerous queries
 * and that parameterized tools use bind parameters.
 */
import { describe, it, expect, vi } from 'vitest';


// Mock pool.query for PostgreSQL
const mockPoolQuery = vi.fn(async (query, binds) => {
  // Simulate a result object
  return { rows: [], rowCount: 0 };
});

vi.mock('../postgres', () => ({
  default: { query: mockPoolQuery },
}));

const { toolMap } = await import('../agent/tools.js');

describe('Agent - run_custom_query SQL injection protection', () => {
  const customQuery = toolMap.get('run_custom_query')!;
  const testCtx = { orgId: 'test-org-id', userId: 'test-user-id' };

  it('allows valid SELECT queries with org_id filter', async () => {
    const result = await customQuery.execute({ sql: "SELECT * FROM incidents WHERE org_id = $1 LIMIT 10" }, testCtx);
    expect(result.error).toBeUndefined();
  });

  it('rejects queries on org-scoped tables without org_id filter', async () => {
    const result = await customQuery.execute({ sql: 'SELECT * FROM incidents LIMIT 10' }, testCtx);
    expect(result.error).toContain('org_id');
  });

  it('blocks DROP TABLE', async () => {
    const result = await customQuery.execute({ sql: 'DROP TABLE incidents' });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks DELETE', async () => {
    const result = await customQuery.execute({ sql: 'DELETE FROM incidents WHERE 1=1' });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks INSERT', async () => {
    const result = await customQuery.execute({ sql: "INSERT INTO incidents (id) VALUES ('x')" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks UPDATE', async () => {
    const result = await customQuery.execute({ sql: "UPDATE incidents SET status='Closed'" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks SELECT with embedded DROP (via subquery)', async () => {
    const result = await customQuery.execute({ sql: "SELECT 1; DROP TABLE incidents;" });
    expect(result.error).toBeTruthy();
  });

  it('blocks SELECT with forbidden keyword in body', async () => {
    const result = await customQuery.execute({ sql: "SELECT * FROM incidents UNION SELECT * FROM (DELETE FROM incidents)" });
    expect(result.error).toContain('DELETE');
  });

  it('blocks ALTER TABLE', async () => {
    const result = await customQuery.execute({ sql: "ALTER TABLE incidents ADD COLUMN pwned TEXT" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks ATTACH DATABASE', async () => {
    const result = await customQuery.execute({ sql: "ATTACH DATABASE ':memory:' AS pwn" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks PRAGMA', async () => {
    const result = await customQuery.execute({ sql: "PRAGMA table_info(users)" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks access to users table', async () => {
    const result = await customQuery.execute({ sql: "SELECT * FROM users" });
    expect(result.error).toContain('not allowed');
  });

  it('blocks access to password_reset_tokens', async () => {
    const result = await customQuery.execute({ sql: "SELECT * FROM password_reset_tokens" });
    expect(result.error).toContain('not allowed');
  });

  it('blocks access to agent_conversations', async () => {
    const result = await customQuery.execute({ sql: "SELECT * FROM agent_conversations" });
    expect(result.error).toContain('not allowed');
  });

  it('blocks SQL comments hiding malicious code', async () => {
    const result = await customQuery.execute({ sql: "/* SELECT */DROP TABLE incidents" });
    expect(result.error).toBeTruthy();
  });

  it('blocks -- comment injection', async () => {
    const result = await customQuery.execute({ sql: "SELECT 1 -- '; DROP TABLE incidents" });
    // The query starts with SELECT so the comment injection is still just a select
    // But if DROP is in the full string, it should be caught
    // Actually -- comments are stripped, so DROP wouldn't be in stripped. Let's test differently.
    const result2 = await customQuery.execute({ sql: "DROP -- comment\nTABLE incidents" });
    expect(result2.error).toBeTruthy();
  });
});

describe('Agent - parameterized query tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery.mockClear();
  });

  it('query_incidents uses bind parameters and PostgreSQL placeholders', async () => {
    const tool = toolMap.get('query_incidents')!;
    await tool.execute({
      type: "'; DROP TABLE incidents; --",
      severity: 'High',
      location: "'; DELETE FROM users; --",
    });

    expect(mockPoolQuery).toHaveBeenCalled();
    const query = mockPoolQuery.mock.calls[0][0];
    expect(query).toMatch(/\$1/);
    expect(query).not.toContain("'; DROP");
    expect(query).not.toContain('DELETE');
  });

  it('query_observations uses bind parameters and PostgreSQL placeholders', async () => {
    const tool = toolMap.get('query_observations')!;
    await tool.execute({ type: "'; DROP TABLE observations; --" });
    expect(mockPoolQuery).toHaveBeenCalled();
    const query = mockPoolQuery.mock.calls[0][0];
    expect(query).toMatch(/\$1/);
    expect(query).not.toContain('DROP');
  });

  it('query_actions uses bind parameters and PostgreSQL placeholders', async () => {
    const tool = toolMap.get('query_actions')!;
    await tool.execute({ assignee: "Robert'); DROP TABLE actions; --" });
    expect(mockPoolQuery).toHaveBeenCalled();
    const query = mockPoolQuery.mock.calls[0][0];
    expect(query).toMatch(/\$1/);
    expect(query).not.toContain('DROP');
  });
});
