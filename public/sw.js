/// <reference lib="webworker" />

/**
 * Service Worker for Safedify PWA
 * - Caches static assets for offline use
 * - Queues failed API requests for background sync
 * - Supports install prompts and push notifications
 */

const CACHE_NAME = 'safedify-v2';
const STATIC_CACHE = 'safedify-static-v2';
const RUNTIME_CACHE = 'safedify-runtime-v2';

// Assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API routes that should use network-first strategy
const API_ROUTES = ['/api/'];

// ─── Install ─────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  (event as ExtendableEvent).waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching static assets');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
    })
  );
});

// ─── Activate ────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  (event as ExtendableEvent).waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      (self as unknown as ServiceWorkerGlobalScope).clients.claim();
    })
  );
});

// ─── Fetch ───────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const fetchEvent = event as FetchEvent;
  const url = new URL(fetchEvent.request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // API requests: network-first with offline fallback
  if (API_ROUTES.some((route) => url.pathname.startsWith(route))) {
    fetchEvent.respondWith(networkFirst(fetchEvent.request));
    return;
  }

  // HTML pages (index.html, navigation): network-first so deploys take effect immediately
  if (fetchEvent.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    fetchEvent.respondWith(networkFirst(fetchEvent.request));
    return;
  }

  // Static assets (JS/CSS with hashes): cache-first
  fetchEvent.respondWith(cacheFirst(fetchEvent.request));
});

// ─── Strategies ──────────────────────────────────────────────

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline page if available
    const offlinePage = await caches.match('/index.html');
    if (offlinePage) return offlinePage;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // For GET requests, try cache
    if (request.method === 'GET') {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    // For mutations, return offline error (app will queue them)
    return new Response(
      JSON.stringify({ error: 'Offline', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Background Sync ─────────────────────────────────────────

self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === 'safedify-sync') {
    console.log('[SW] Background sync triggered');
    syncEvent.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync(): Promise<void> {
  // Notify all clients to process their offline queues
  const clients = await (self as unknown as ServiceWorkerGlobalScope).clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_REQUESTED' });
  }
}

// ─── Push Notifications ──────────────────────────────────────

self.addEventListener('push', (event) => {
  const pushEvent = event as PushEvent;
  let data = { title: 'Safedify', body: 'New notification', icon: '/icons/icon-192.png' };
  
  if (pushEvent.data) {
    try {
      data = { ...data, ...pushEvent.data.json() };
    } catch {
      data.body = pushEvent.data.text();
    }
  }

  pushEvent.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/icons/icon-192.png',
      tag: 'safedify-notification',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  const notifEvent = event as NotificationEvent;
  notifEvent.notification.close();
  notifEvent.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).clients.openWindow('/')
  );
});

// ─── Message handling ────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
  }
});

// Type declarations
declare const self: ServiceWorkerGlobalScope;

interface SyncEvent extends ExtendableEvent {
  tag: string;
}

interface PushEvent extends ExtendableEvent {
  data: PushMessageData | null;
}

interface NotificationEvent extends ExtendableEvent {
  notification: Notification;
  action: string;
}
