// Safedify AI Service Worker - PWA Offline Support
const CACHE_NAME = 'safedify-ai-v2';
const STATIC_CACHE = 'safedify-static-v2';
const DYNAMIC_CACHE = 'safedify-dynamic-v2';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/',
  '/incidents',
  '/incidents/new',
  '/observations', 
  '/observations/new',
  '/analytics',
  '/emergency',
  '/inspections',
  '/workers',
  '/ppe'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting(); // Take control immediately
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests differently
  if (url.pathname.includes('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  // Handle other requests (assets, etc.)
  event.respondWith(handleResourceRequest(event.request));
});

// Handle navigation requests with offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // If no cache, return offline page
  return caches.match('/') || createOfflineResponse();
}

// Handle API requests with caching strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first for API calls
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache GET requests only
      if (request.method === 'GET') {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] API request failed, checking cache:', error);
    
    // For GET requests, try to serve from cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
  }

  // Return error response for failed API calls
  return new Response(
    JSON.stringify({ 
      error: 'Network unavailable', 
      offline: true,
      timestamp: Date.now() 
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Handle static resource requests  
async function handleResourceRequest(request) {
  // Try cache first for resources
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Resource request failed:', error);
  }

  // Return placeholder for failed resources
  return createResourcePlaceholder(request);
}

// Create offline response
function createOfflineResponse() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Safedify AI - Offline</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 2rem; 
          background: #f1f5f9; 
        }
        .container { 
          max-width: 400px; 
          margin: 0 auto; 
          background: white; 
          padding: 2rem; 
          border-radius: 12px; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        .title { font-size: 1.5rem; font-weight: bold; color: #1e293b; margin-bottom: 1rem; }
        .message { color: #64748b; margin-bottom: 2rem; line-height: 1.6; }
        .button { 
          background: #2563eb; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 1rem;
        }
        .button:hover { background: #1d4ed8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🛡️</div>
        <div class="title">Safedify AI</div>
        <div class="message">
          You're currently offline. Some features may be limited, but you can still access cached content and report incidents.
        </div>
        <button class="button" onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Create placeholder for failed resources
function createResourcePlaceholder(request) {
  const url = new URL(request.url);
  
  if (url.pathname.endsWith('.css')) {
    return new Response('/* Offline CSS placeholder */', {
      headers: { 'Content-Type': 'text/css' }
    });
  }
  
  if (url.pathname.endsWith('.js')) {
    return new Response('// Offline JS placeholder', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
  
  return new Response('Offline', { status: 503 });
}

// Background sync for form submissions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'incident-report') {
    event.waitUntil(syncIncidentReports());
  }
  
  if (event.tag === 'observation-report') {
    event.waitUntil(syncObservationReports());
  }
});

// Sync incident reports when back online
async function syncIncidentReports() {
  console.log('[SW] Syncing incident reports...');
  
  try {
    // Get cached incident reports from IndexedDB
    const pendingReports = await getCachedIncidentReports();
    
    for (const report of pendingReports) {
      try {
        const response = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        
        if (response.ok) {
          await removeCachedIncidentReport(report.id);
          console.log('[SW] Synced incident report:', report.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync incident report:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync observation reports
async function syncObservationReports() {
  console.log('[SW] Syncing observation reports...');
  // Similar implementation for observations
}

// Placeholder functions for IndexedDB operations
async function getCachedIncidentReports() {
  // Would integrate with IndexedDB to get pending reports
  return [];
}

async function removeCachedIncidentReport(id) {
  // Would remove synced report from IndexedDB
  console.log('[SW] Removed cached report:', id);
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [200, 100, 200],
      data: data,
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

console.log('[SW] Service worker script loaded');