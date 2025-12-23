/* ===================================
   KINESIA - Service Worker
   Cache et fonctionnement offline
   =================================== */

const CACHE_NAME = 'kinesia-v1.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/app.html',
  '/css/variables.css',
  '/css/reset.css',
  '/css/global.css',
  '/css/components.css',
  '/css/login.css',
  '/js/config.js',
  '/js/supabase-client.js',
  '/js/auth.js',
  '/js/utils.js',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  
  // Activer immédiatement le nouveau SW
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prendre le contrôle de tous les clients immédiatement
  return self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-HTTP
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Stratégie : Network First pour les API, Cache First pour les assets
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    // Network First pour les API
    event.respondWith(networkFirst(request));
  } else if (url.hostname === 'rxrgbvoqubejvejsppux.supabase.co' || 
             url.hostname === 'andreaprogra.app.n8n.cloud') {
    // Network Only pour Supabase et N8N
    event.respondWith(fetch(request));
  } else {
    // Cache First pour les assets statiques
    event.respondWith(cacheFirst(request));
  }
});

// Stratégie Cache First
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Depuis cache:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    // Mettre en cache les réponses valides
    if (response && response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Erreur fetch:', error);
    
    // Retourner une page offline si disponible
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) return offlinePage;
    }
    
    throw error;
  }
}

// Stratégie Network First
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Mettre en cache les réponses valides
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Erreur réseau, tentative cache:', error);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

// Écouter les messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

// Synchronisation en arrière-plan (optionnel pour plus tard)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-consultations') {
    console.log('[SW] Synchronisation des consultations...');
    event.waitUntil(syncConsultations());
  }
});

async function syncConsultations() {
  // TODO: Implémenter la synchronisation des données hors ligne
  console.log('[SW] Synchronisation terminée');
}

// Notification push (optionnel pour plus tard)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'KINESIA';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/assets/images/icon-192x192.png',
    badge: '/assets/images/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Click sur une notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/app.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, la focus
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});