/**
 * OFFLINE STORAGE SERVICE
 * Provides IndexedDB-based storage for offline functionality
 * Handles form data caching and sync when connection is restored
 */

interface OfflineData {
  id: string;
  type: 'incident' | 'observation' | 'inspection' | 'permit';
  data: any;
  timestamp: number;
  synced: boolean;
}

interface OfflineFormSubmission {
  id: string;
  type: string;
  formData: any;
  timestamp: number;
  retryCount: number;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'safedify-offline';
  private readonly DB_VERSION = 1;
  private readonly STORES = {
    forms: 'pending-forms',
    cache: 'cache-data',
    analytics: 'analytics-cache'
  };

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores
        if (!db.objectStoreNames.contains(this.STORES.forms)) {
          const formsStore = db.createObjectStore(this.STORES.forms, { keyPath: 'id' });
          formsStore.createIndex('type', 'type', { unique: false });
          formsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.STORES.cache)) {
          const cacheStore = db.createObjectStore(this.STORES.cache, { keyPath: 'id' });
          cacheStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.STORES.analytics)) {
          const analyticsStore = db.createObjectStore(this.STORES.analytics, { keyPath: 'id' });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Form submission caching for offline mode
  async cacheFormSubmission(type: string, formData: any): Promise<string> {
    if (!this.db) await this.init();

    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const submission: OfflineFormSubmission = {
      id,
      type,
      formData,
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.forms], 'readwrite');
      const store = transaction.objectStore(this.STORES.forms);
      const request = store.add(submission);

      request.onsuccess = () => {
        console.log(`📝 Cached ${type} form submission:`, id);
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending form submissions
  async getPendingSubmissions(): Promise<OfflineFormSubmission[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.forms], 'readonly');
      const store = transaction.objectStore(this.STORES.forms);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Remove synced form submission
  async removeSubmission(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.forms], 'readwrite');
      const store = transaction.objectStore(this.STORES.forms);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('✅ Removed synced submission:', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Update retry count for failed submissions
  async updateRetryCount(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.forms], 'readwrite');
      const store = transaction.objectStore(this.STORES.forms);
      
      store.get(id).onsuccess = (event) => {
        const submission = (event.target as IDBRequest).result;
        if (submission) {
          submission.retryCount++;
          store.put(submission).onsuccess = () => resolve();
        } else {
          reject(new Error('Submission not found'));
        }
      };
    });
  }

  // Cache analytics data for offline viewing
  async cacheAnalyticsData(type: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    const cacheEntry = {
      id: `analytics-${type}-${Date.now()}`,
      type: 'analytics',
      data,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.analytics], 'readwrite');
      const store = transaction.objectStore(this.STORES.analytics);
      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached analytics data
  async getCachedAnalyticsData(type?: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.analytics], 'readonly');
      const store = transaction.objectStore(this.STORES.analytics);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        if (type) {
          resolve(results.filter(item => item.data?.type === type));
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Cache general application data
  async cacheData(key: string, data: any, type?: string): Promise<void> {
    if (!this.db) await this.init();

    const cacheEntry: OfflineData = {
      id: key,
      type: (type as any) || 'general',
      data,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.cache], 'readwrite');
      const store = transaction.objectStore(this.STORES.cache);
      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached data
  async getCachedData(key: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.cache], 'readonly');
      const store = transaction.objectStore(this.STORES.cache);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Check if we're online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Sync all pending data when back online
  async syncPendingData(): Promise<void> {
    if (!this.isOnline()) {
      console.log('🔌 Still offline, skipping sync');
      return;
    }

    console.log('🔄 Starting offline data sync...');
    
    try {
      const pendingSubmissions = await this.getPendingSubmissions();
      
      for (const submission of pendingSubmissions) {
        try {
          await this.syncFormSubmission(submission);
          await this.removeSubmission(submission.id);
        } catch (error) {
          console.error('❌ Failed to sync submission:', submission.id, error);
          await this.updateRetryCount(submission.id);
        }
      }
      
      console.log('✅ Offline sync completed');
    } catch (error) {
      console.error('❌ Sync process failed:', error);
    }
  }

  // Sync individual form submission
  private async syncFormSubmission(submission: OfflineFormSubmission): Promise<void> {
    const endpoint = this.getEndpointForType(submission.type);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission.formData)
    });

    if (!response.ok) {
      throw new Error(`Sync failed with status: ${response.status}`);
    }

    console.log(`✅ Synced ${submission.type}:`, submission.id);
  }

  // Get API endpoint for form type
  private getEndpointForType(type: string): string {
    const endpoints: Record<string, string> = {
      incident: '/api/incidents',
      observation: '/api/observations',
      inspection: '/api/inspections',
      permit: '/api/permits',
      'risk-assessment': '/api/risk-assessments'
    };
    
    return endpoints[type] || '/api/forms';
  }

  // Get offline status
  async getOfflineStatus(): Promise<{
    pendingSubmissions: number;
    cachedData: number;
    lastSync: number | null;
  }> {
    const pendingSubmissions = await this.getPendingSubmissions();
    const cachedAnalytics = await this.getCachedAnalyticsData();
    
    return {
      pendingSubmissions: pendingSubmissions.length,
      cachedData: cachedAnalytics.length,
      lastSync: localStorage.getItem('lastSyncTime') ? 
        parseInt(localStorage.getItem('lastSyncTime')!) : null
    };
  }

  // Clear all offline data
  async clearOfflineData(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.STORES.forms, this.STORES.cache, this.STORES.analytics], 
        'readwrite'
      );

      let completed = 0;
      const total = 3;

      const checkComplete = () => {
        completed++;
        if (completed === total) resolve();
      };

      transaction.objectStore(this.STORES.forms).clear().onsuccess = checkComplete;
      transaction.objectStore(this.STORES.cache).clear().onsuccess = checkComplete;
      transaction.objectStore(this.STORES.analytics).clear().onsuccess = checkComplete;
      
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorageService();

// Initialize on first import
offlineStorage.init().catch(console.error);

// Listen for online/offline events
window.addEventListener('online', () => {
  console.log('🌐 Back online! Starting sync...');
  offlineStorage.syncPendingData();
  localStorage.setItem('lastSyncTime', Date.now().toString());
});

window.addEventListener('offline', () => {
  console.log('📱 Gone offline. Caching mode enabled.');
});

export default offlineStorage;