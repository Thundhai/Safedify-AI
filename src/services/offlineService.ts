
export const SYNC_QUEUE_KEY = 'hse_sync_queue';

export interface SyncTask {
  id: string;
  action: string; // e.g., 'SAVE_INCIDENT', 'SAVE_INSPECTION'
  description: string; // For UI display
  timestamp: number;
  payload?: any; // Optional: store actual data delta if needed for real backend
}

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
    id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    action,
    description,
    timestamp: Date.now(),
    payload
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

export const processSyncQueue = async (): Promise<number> => {
  const queue = getSyncQueue();
  if (queue.length === 0) return 0;

  console.log(`[Offline Service] Attempting to sync ${queue.length} items...`);

  const remainingQueue: SyncTask[] = [];
  let processedCount = 0;

  for (const task of queue) {
    try {
      // Simulate processing individual task
      // In a real app, this would switch/case on task.action and call specific API endpoints
      await new Promise((resolve, reject) => {
        // Simulate mostly successful sync, occasional failure if needed for testing
        const isSuccess = true; 
        setTimeout(() => isSuccess ? resolve(true) : reject(new Error("Network timeout")), 800);
      });
      
      console.log(`[Offline Service] Successfully synced: ${task.description}`);
      processedCount++;
    } catch (error) {
      console.error(`[Offline Service] Sync failed for item: ${task.description}`, error);
      // Keep in queue to retry later
      remainingQueue.push(task);
    }
  }

  // Update queue with only failed items
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
  
  return processedCount;
};

/**
 * Compresses an image file to a lower resolution and quality JPEG.
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

        // Resize logic
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Return compressed Base64
            resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
            reject(new Error("Canvas context failed"));
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
