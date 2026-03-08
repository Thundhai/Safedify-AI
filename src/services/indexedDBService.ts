/**
 * IndexedDB Cache Service
 * Provides offline data caching using IndexedDB (via 'idb' library).
 * Used as a read cache for all major data types so the app works offline.
 */
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'safedify-cache';
const DB_VERSION = 1;

// Store names matching the main data types
export const STORES = {
  incidents: 'incidents',
  actions: 'actions',
  inspections: 'inspections',
  observations: 'observations',
  riskAssessments: 'risk-assessments',
  documents: 'documents',
  workers: 'workers',
  meta: 'meta', // for timestamps, versions, etc.
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object stores for each data type
        Object.values(STORES).forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
      },
      blocked() {
        console.warn('[IDB] Database upgrade blocked by another tab');
      },
      blocking() {
        console.warn('[IDB] This tab is blocking a database upgrade');
      },
    });
  }
  return dbPromise;
}

// ─── Generic CRUD ────────────────────────────────────────────

/**
 * Get all records from a store
 */
export async function getCachedAll<T>(store: StoreName): Promise<T[]> {
  try {
    const db = await getDB();
    return (await db.getAll(store)) as T[];
  } catch (err) {
    console.warn(`[IDB] getCachedAll(${store}) failed:`, err);
    return [];
  }
}

/**
 * Get a single record by ID
 */
export async function getCachedById<T>(store: StoreName, id: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    return (await db.get(store, id)) as T | undefined;
  } catch (err) {
    console.warn(`[IDB] getCachedById(${store}, ${id}) failed:`, err);
    return undefined;
  }
}

/**
 * Store a single record (upsert)
 */
export async function setCached<T extends { id: string }>(store: StoreName, data: T): Promise<void> {
  try {
    const db = await getDB();
    await db.put(store, data);
  } catch (err) {
    console.warn(`[IDB] setCached(${store}) failed:`, err);
  }
}

/**
 * Bulk replace all records in a store (clear + add all).
 * Used when fresh API data arrives.
 */
export async function setCachedAll<T extends { id: string }>(store: StoreName, data: T[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    for (const item of data) {
      await tx.store.put(item);
    }
    await tx.done;

    // Update meta timestamp
    await setMeta(`${store}_lastSync`, Date.now());
  } catch (err) {
    console.warn(`[IDB] setCachedAll(${store}) failed:`, err);
  }
}

/**
 * Delete a single record
 */
export async function deleteCached(store: StoreName, id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(store, id);
  } catch (err) {
    console.warn(`[IDB] deleteCached(${store}, ${id}) failed:`, err);
  }
}

/**
 * Clear an entire store
 */
export async function clearStore(store: StoreName): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(store);
  } catch (err) {
    console.warn(`[IDB] clearStore(${store}) failed:`, err);
  }
}

// ─── Meta helpers ────────────────────────────────────────────

async function setMeta(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORES.meta, { id: key, value, updatedAt: Date.now() });
  } catch (err) {
    console.warn(`[IDB] setMeta failed:`, err);
  }
}

export async function getMeta(key: string): Promise<any> {
  try {
    const db = await getDB();
    const record = await db.get(STORES.meta, key);
    return record?.value;
  } catch (err) {
    console.warn(`[IDB] getMeta failed:`, err);
    return undefined;
  }
}

/**
 * Get timestamp (ms) of last sync for a store
 */
export async function getLastSyncTime(store: StoreName): Promise<number> {
  return (await getMeta(`${store}_lastSync`)) || 0;
}

// ─── Migration: move localStorage data to IndexedDB ─────────

const LS_KEYS_MAP: Record<string, StoreName> = {
  hse_incidents: STORES.incidents,
  hse_actions: STORES.actions,
  hse_inspections: STORES.inspections,
  hse_observations: STORES.observations,
  hse_risk_assessments: STORES.riskAssessments,
  hse_documents: STORES.documents,
  hse_workers: STORES.workers,
};

/**
 * One-time migration: copies data from localStorage into IndexedDB
 * then sets a flag so it only runs once.
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const MIGRATION_FLAG = 'idb_migration_done';
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return;

  console.log('[IDB] Migrating localStorage data to IndexedDB...');
  let migratedStores = 0;

  for (const [lsKey, storeName] of Object.entries(LS_KEYS_MAP)) {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        // Ensure each item has an `id` field
        const withIds = data.map((item, idx) => ({
          id: item.id || `migrated-${idx}-${Date.now()}`,
          ...item,
        }));
        await setCachedAll(storeName, withIds);
        migratedStores++;
        console.log(`[IDB] Migrated ${withIds.length} items from ${lsKey} → ${storeName}`);
      }
    } catch (err) {
      console.warn(`[IDB] Migration failed for ${lsKey}:`, err);
    }
  }

  localStorage.setItem(MIGRATION_FLAG, '1');
  console.log(`[IDB] Migration complete — ${migratedStores} stores migrated`);
}

// ─── Utility ─────────────────────────────────────────────────

/**
 * Clear entire database (useful for logout / data reset)
 */
export async function clearAllCaches(): Promise<void> {
  try {
    const db = await getDB();
    for (const name of Object.values(STORES)) {
      await db.clear(name);
    }
    console.log('[IDB] All caches cleared');
  } catch (err) {
    console.warn('[IDB] clearAllCaches failed:', err);
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
