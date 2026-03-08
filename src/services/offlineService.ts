/**
 * Offline Service — Queues failed API requests when the browser is offline
 * and replays them when connectivity is restored.
 *
 * Two queues:
 *  1. OFFLINE_QUEUE_KEY  — machine-readable API requests to replay
 *  2. SYNC_QUEUE_KEY     — human-readable log entries shown in the UI
 */

// ─── Types ───────────────────────────────────────────────────

export interface QueuedRequest {
  id: string;
  method: string;       // POST | PUT | DELETE
  path: string;         // e.g. /incidents
  body: any;            // JSON payload
  timestamp: number;
  description: string;  // human-readable label
}

/** Display-only entry used by the Layout sync badge */
export interface SyncTask {
  id: string;
  action: string;
  description: string;
  timestamp: number;
  payload?: any;
}

// ─── Storage Keys ────────────────────────────────────────────

const OFFLINE_QUEUE_KEY = 'hse_offline_queue';
export const SYNC_QUEUE_KEY = 'hse_sync_queue';

// ─── Service Worker Integration ──────────────────────────────

/**
 * Initialize service worker message listener for background sync
 */
export const initOfflineSync = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_REQUESTED') {
        console.log('[Offline] Received sync request from Service Worker');
        processSyncQueue().then((count) => {
          if (count > 0) {
            console.log(`[Offline] Synced ${count} items via background sync`);
          }
        });
      }
    });
  }

  // Also sync when coming back online
  window.addEventListener('online', () => {
    console.log('[Offline] Network restored, syncing...');
    requestBackgroundSync();
    processSyncQueue();
  });
};

/**
 * Request a background sync if supported
 */
export const requestBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register('safedify-sync');
      console.log('[Offline] Background sync registered');
    } catch (err) {
      console.warn('[Offline] Background sync not available:', err);
    }
  }
};

// ─── Offline Request Queue (machine-readable) ───────────────

export const getOfflineQueue = (): QueuedRequest[] => {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveOfflineQueue = (queue: QueuedRequest[]) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

/**
 * Queue a failed mutating API request for later replay.
 * Called automatically by apiFetch when navigator.onLine is false.
 */
export const queueOfflineRequest = (
  method: string,
  path: string,
  body: any,
  description?: string
) => {
  const queue = getOfflineQueue();
  const entry: QueuedRequest = {
    id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    method,
    path,
    body,
    timestamp: Date.now(),
    description: description || `${method} ${path}`,
  };
  queue.push(entry);
  saveOfflineQueue(queue);

  // Mirror into the display queue so the UI badge updates
  addToSyncQueue(entry.description, entry.description, { ref: entry.id });
};

// ─── Display Sync Queue (UI badge / list) ────────────────────

export const getSyncQueue = (): SyncTask[] => {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addToSyncQueue = (action: string, description: string, payload?: any) => {
  const queue = getSyncQueue();
  queue.push({
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    description,
    timestamp: Date.now(),
    payload,
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

// ─── Process / Replay ────────────────────────────────────────

/**
 * Replay all queued offline requests.
 * Returns the number of successfully synced items.
 *
 * Uses a plain fetch with the stored auth token to avoid
 * a circular import with apiService.
 */
export const processSyncQueue = async (): Promise<number> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    // Nothing queued — clear the display queue too
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
    return 0;
  }

  console.log(`[Offline] Replaying ${queue.length} queued request(s)…`);

  const remaining: QueuedRequest[] = [];
  let synced = 0;

  for (const req of queue) {
    try {
      const token = localStorage.getItem('safedify_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';
      const res = await fetch(`${API_BASE}${req.path}`, {
        method: req.method,
        headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`[Offline] ✓ Synced: ${req.description}`);
      synced++;
    } catch (err) {
      console.warn(`[Offline] ✗ Failed: ${req.description}`, err);
      remaining.push(req); // keep for next retry
    }
  }

  // Persist only the failed items
  saveOfflineQueue(remaining);

  // Rebuild the display queue to match remaining items
  const displayQueue = remaining.map(r => ({
    id: `sync-${r.id}`,
    action: r.description,
    description: r.description,
    timestamp: r.timestamp,
    payload: { ref: r.id },
  }));
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(displayQueue));

  console.log(`[Offline] Sync complete — ${synced} succeeded, ${remaining.length} pending`);
  return synced;
};

// ─── Image Compression ──────────────────────────────────────

/**
 * Compresses an image file to a lower-resolution JPEG.
 * Essential for offline storage quotas and fast uploads.
 */
export const compressImage = (file: File, maxWidth = 1024, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          reject(new Error('Canvas context failed'));
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
