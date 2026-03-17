import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSyncQueue,
  addToSyncQueue,
  getOfflineQueue,
  queueOfflineRequest,
  processSyncQueue,
} from '../services/offlineService';

describe('offlineService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Display Queue ──────────────────────────────────────────

  describe('getSyncQueue / addToSyncQueue', () => {
    it('returns empty array when nothing stored', () => {
      expect(getSyncQueue()).toEqual([]);
    });

    it('adds an entry with correct shape', () => {
      addToSyncQueue('SAVE_INCIDENT', 'Incident at Zone A', { foo: 1 });
      const q = getSyncQueue();
      expect(q).toHaveLength(1);
      expect(q[0]).toMatchObject({
        action: 'SAVE_INCIDENT',
        description: 'Incident at Zone A',
        payload: { foo: 1 },
      });
      expect(q[0]!.id).toMatch(/^sync-/);
      expect(q[0]!.timestamp).toBeGreaterThan(0);
    });

    it('accumulates multiple entries', () => {
      addToSyncQueue('A', 'first');
      addToSyncQueue('B', 'second');
      expect(getSyncQueue()).toHaveLength(2);
    });
  });

  // ── Offline Request Queue ──────────────────────────────────

  describe('getOfflineQueue / queueOfflineRequest', () => {
    it('returns empty array initially', () => {
      expect(getOfflineQueue()).toEqual([]);
    });

    it('queues a request with API details', () => {
      queueOfflineRequest('POST', '/incidents', { type: 'Near Miss' }, 'Create incident');
      const q = getOfflineQueue();
      expect(q).toHaveLength(1);
      expect(q[0]).toMatchObject({
        method: 'POST',
        path: '/incidents',
        body: { type: 'Near Miss' },
        description: 'Create incident',
      });
    });

    it('also mirrors to display queue', () => {
      queueOfflineRequest('PUT', '/actions/1', { status: 'Closed' });
      expect(getSyncQueue()).toHaveLength(1);
    });
  });

  // ── processSyncQueue ───────────────────────────────────────

  describe('processSyncQueue', () => {
    it('returns 0 when nothing queued', async () => {
      expect(await processSyncQueue()).toBe(0);
    });

    it('replays queued requests via fetch and clears them on success', async () => {
      // Queue two requests
      queueOfflineRequest('POST', '/incidents', { type: 'Fire' });
      queueOfflineRequest('PUT', '/actions/1', { status: 'Done' });
      expect(getOfflineQueue()).toHaveLength(2);

      // Mock fetch to succeed
      const origFetch = globalThis.fetch;
      globalThis.fetch = (async () => ({
        ok: true,
        json: async () => ({ id: '1' }),
      })) as any;

      try {
        const synced = await processSyncQueue();
        expect(synced).toBe(2);
        expect(getOfflineQueue()).toHaveLength(0);
        expect(getSyncQueue()).toHaveLength(0);
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it('keeps failed items in queue for retry', async () => {
      queueOfflineRequest('POST', '/incidents', { type: 'Spill' });

      // Mock fetch to fail
      const origFetch = globalThis.fetch;
      globalThis.fetch = (async () => ({ ok: false, status: 500 })) as any;

      try {
        const synced = await processSyncQueue();
        expect(synced).toBe(0);
        expect(getOfflineQueue()).toHaveLength(1);
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });
});
