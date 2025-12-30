const CACHE_NAME = 'rapports-pwa-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Installation du service worker
self.addEventListener('install', function(event) {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[ServiceWorker] Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.error('[ServiceWorker] Erreur lors du cache:', error);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', function(event) {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', function(event) {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers des domaines externes (sauf N8n)
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('n8n')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - retourner la réponse en cache
        if (response) {
          console.log('[ServiceWorker] Trouvé en cache:', event.request.url);
          return response;
        }

        // Pas en cache - aller chercher sur le réseau
        console.log('[ServiceWorker] Fetch réseau:', event.request.url);
        return fetch(event.request).then(
          function(response) {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Cloner la réponse car elle ne peut être consommée qu'une fois
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                // Ne mettre en cache que les ressources de notre domaine
                if (event.request.url.startsWith(self.location.origin)) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        ).catch(function(error) {
          console.error('[ServiceWorker] Erreur fetch:', error);
          
          // En cas d'erreur réseau, essayer de servir une page hors ligne
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
          
          throw error;
        });
      })
  );
});

// Gestion des notifications push (pour futures fonctionnalités)
self.addEventListener('push', function(event) {
  console.log('[ServiceWorker] Push reçu');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'Rapports Commerciaux',
        body: event.data.text() || 'Nouvelle notification'
      };
    }
  }

  const options = {
    body: notificationData.body || 'Nouveau rapport disponible',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Ccircle cx="48" cy="48" r="40" fill="%232196F3"/%3E%3Ctext x="48" y="58" text-anchor="middle" font-size="40" fill="white"%3E📋%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Ccircle cx="48" cy="48" r="40" fill="%232196F3"/%3E%3Ctext x="48" y="58" text-anchor="middle" font-size="30" fill="white"%3E📋%3C/text%3E%3C/svg%3E',
    vibrate: [100, 50, 100],
    data: notificationData.data || {},
    actions: [
      {
        action: 'open',
        title: 'Ouvrir l\'app',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="white" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/%3E%3C/svg%3E'
      },
      {
        action: 'dismiss',
        title: 'Ignorer',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="white" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/%3E%3C/svg%3E'
      }
    ],
    requireInteraction: false,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Rapports Commerciaux', 
      options
    )
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', function(event) {
  console.log('[ServiceWorker] Clic notification');
  
  event.notification.close();

  if (event.action === 'open') {
    // Ouvrir l'application
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(function(clientList) {
        // Si l'app est déjà ouverte, la focuser
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Sinon ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Ne rien faire, juste fermer la notification
    console.log('[ServiceWorker] Notification ignorée');
  } else {
    // Clic sur la notification elle-même (pas sur un bouton d'action)
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
    );
  }
});

// Gestion de la synchronisation en arrière-plan (pour futures fonctionnalités)
self.addEventListener('sync', function(event) {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'background-sync-reports') {
    event.waitUntil(
      // Ici on pourrait synchroniser les rapports non envoyés
      syncPendingReports()
    );
  }
});

// Fonction pour synchroniser les rapports en attente
function syncPendingReports() {
  return new Promise((resolve) => {
    console.log('[ServiceWorker] Synchronisation des rapports en attente');
    // TODO: Implémenter la logique de synchronisation
    // - Récupérer les rapports non envoyés depuis IndexedDB
    // - Les envoyer vers N8n
    // - Marquer comme envoyés
    resolve();
  });
}

// Gestion des erreurs
self.addEventListener('error', function(event) {
  console.error('[ServiceWorker] Erreur:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('[ServiceWorker] Promise rejetée:', event.reason);
});

// Nettoyage périodique du cache (optionnel)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Nettoyage cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});