import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setAuthToken, getAuthToken, apiGetIncidents, apiCreateIncident } from '../services/apiService';
import { getOfflineQueue } from '../services/offlineService';

// We need to mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('apiService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    setAuthToken(null);
    localStorage.clear();
  });

  // ── Token management ───────────────────────────────────────

  describe('setAuthToken / getAuthToken', () => {
    it('stores and retrieves token', () => {
      setAuthToken('abc123');
      expect(getAuthToken()).toBe('abc123');
      expect(localStorage.getItem('safedify_token')).toBe('abc123');
    });

    it('clears token', () => {
      setAuthToken('abc123');
      setAuthToken(null);
      expect(getAuthToken()).toBeNull();
    });

    it('reads from localStorage as fallback', () => {
      localStorage.setItem('safedify_token', 'from-storage');
      // Force internal state to null
      setAuthToken(null);
      localStorage.setItem('safedify_token', 'from-storage');
      expect(getAuthToken()).toBe('from-storage');
    });
  });

  // ── apiFetch (through public wrappers) ─────────────────────

  describe('apiFetch', () => {
    it('sends GET with auth header', async () => {
      setAuthToken('my-jwt');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', type: 'Near Miss' }],
      });

      const result = await apiGetIncidents();
      expect(result).toEqual([{ id: '1', type: 'Near Miss' }]);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/incidents');
      expect(opts.headers['Authorization']).toBe('Bearer my-jwt');
    });

    it('throws on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Not found' }),
      });

      await expect(apiGetIncidents()).rejects.toThrow('Not found');
    });

    it('queues POST when offline', async () => {
      (globalThis as any).__setOnLine(false);
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await apiCreateIncident({ type: 'Fire', description: 'blaze' });

      // Should return optimistic placeholder
      expect(result._offline).toBe(true);
      expect(result.id).toMatch(/^offline-/);

      // Should be in the offline queue
      const queue = getOfflineQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].method).toBe('POST');
      expect(queue[0].path).toBe('/incidents');
    });

    it('throws on network error when online (not queued)', async () => {
      (globalThis as any).__setOnLine(true);
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(apiCreateIncident({ type: 'Fire' })).rejects.toThrow('Failed to fetch');
      expect(getOfflineQueue()).toHaveLength(0);
    });
  });
});
