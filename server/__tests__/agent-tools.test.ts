/**
 * Agent Tools — SQL injection protection tests
 * Verifies that the run_custom_query tool properly blocks dangerous queries
 * and that parameterized tools use bind parameters.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock db
const mockAll = vi.fn(() => []);
const mockGet = vi.fn(() => ({ c: 0, total: 0 }));
const mockPrepare = vi.fn(() => ({ get: mockGet, all: mockAll }));

vi.mock('../db.js', () => ({
  default: { prepare: mockPrepare },
}));

const { toolMap } = await import('../agent/tools.js');

describe('Agent - run_custom_query SQL injection protection', () => {
  const customQuery = toolMap.get('run_custom_query')!;

  it('allows valid SELECT queries', () => {
    const result = customQuery.execute({ sql: 'SELECT * FROM incidents LIMIT 10' });
    expect(result.error).toBeUndefined();
  });

  it('blocks DROP TABLE', () => {
    const result = customQuery.execute({ sql: 'DROP TABLE incidents' });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks DELETE', () => {
    const result = customQuery.execute({ sql: 'DELETE FROM incidents WHERE 1=1' });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks INSERT', () => {
    const result = customQuery.execute({ sql: "INSERT INTO incidents (id) VALUES ('x')" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks UPDATE', () => {
    const result = customQuery.execute({ sql: "UPDATE incidents SET status='Closed'" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks SELECT with embedded DROP (via subquery)', () => {
    const result = customQuery.execute({ sql: "SELECT 1; DROP TABLE incidents;" });
    expect(result.error).toContain('DROP');
  });

  it('blocks SELECT with forbidden keyword in body', () => {
    const result = customQuery.execute({ sql: "SELECT * FROM incidents UNION SELECT * FROM (DELETE FROM incidents)" });
    expect(result.error).toContain('DELETE');
  });

  it('blocks ALTER TABLE', () => {
    const result = customQuery.execute({ sql: "ALTER TABLE incidents ADD COLUMN pwned TEXT" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks ATTACH DATABASE', () => {
    const result = customQuery.execute({ sql: "ATTACH DATABASE ':memory:' AS pwn" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks PRAGMA', () => {
    const result = customQuery.execute({ sql: "PRAGMA table_info(users)" });
    expect(result.error).toContain('Only SELECT');
  });

  it('blocks access to users table', () => {
    const result = customQuery.execute({ sql: "SELECT * FROM users" });
    expect(result.error).toContain('not allowed');
  });

  it('blocks access to password_reset_tokens', () => {
    const result = customQuery.execute({ sql: "SELECT * FROM password_reset_tokens" });
    expect(result.error).toContain('not allowed');
  });

  it('blocks access to agent_conversations', () => {
    const result = customQuery.execute({ sql: "SELECT * FROM agent_conversations" });
    expect(result.error).toContain('not allowed');
  });

  it('blocks SQL comments hiding malicious code', () => {
    const result = customQuery.execute({ sql: "/* SELECT */DROP TABLE incidents" });
    expect(result.error).toBeTruthy();
  });

  it('blocks -- comment injection', () => {
    const result = customQuery.execute({ sql: "SELECT 1 -- '; DROP TABLE incidents" });
    // The query starts with SELECT so the comment injection is still just a select
    // But if DROP is in the full string, it should be caught
    // Actually -- comments are stripped, so DROP wouldn't be in stripped. Let's test differently.
    const result2 = customQuery.execute({ sql: "DROP -- comment\nTABLE incidents" });
    expect(result2.error).toBeTruthy();
  });
});

describe('Agent - parameterized query tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAll.mockReturnValue([]);
    mockGet.mockReturnValue({ c: 0, total: 0 });
  });

  it('query_incidents uses bind parameters instead of string interpolation', () => {
    const tool = toolMap.get('query_incidents')!;
    tool.execute({
      type: "'; DROP TABLE incidents; --",
      severity: 'High',
      location: "'; DELETE FROM users; --",
    });

    // db.prepare should be called with parameterized query (? placeholders)
    expect(mockPrepare).toHaveBeenCalled();
    const query = mockPrepare.mock.calls[0][0];
    expect(query).toContain('?');
    expect(query).not.toContain("'; DROP");
    expect(query).not.toContain("DELETE");

    // Malicious strings should be passed as bind parameters, not in SQL
    expect(mockAll).toHaveBeenCalled();
    const bindArgs = mockAll.mock.calls[0];
    expect(bindArgs).toContain("'; DROP TABLE incidents; --");
  });

  it('query_observations uses bind parameters', () => {
    const tool = toolMap.get('query_observations')!;
    tool.execute({ type: "'; DROP TABLE observations; --" });
    const query = mockPrepare.mock.calls[0][0];
    expect(query).toContain('type = ?');
    expect(query).not.toContain('DROP');
  });

  it('query_actions uses bind parameters', () => {
    const tool = toolMap.get('query_actions')!;
    tool.execute({ assignee: "Robert'); DROP TABLE actions; --" });
    const query = mockPrepare.mock.calls[0][0];
    expect(query).toContain('LIKE ?');
    expect(query).not.toContain('DROP');
  });
});
