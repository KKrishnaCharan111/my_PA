const CACHE_NAME = 'my-pa-v1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/js/sound.js',
  '/js/speech.js',
  '/js/nlp.js',
  '/js/api.js',
  '/js/calendar.js',
  '/js/notifications.js',
  '/js/habits.js',
  '/js/pomodoro.js',
  '/js/charts.js',
  '/js/app.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For API calls, try network first, then return cached or empty
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: 'Offline mode active' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first for all static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});

// Push Notifications & Interactive Action Handlers
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  if (action === 'mark-done' && data.taskId) {
    event.waitUntil(
      fetch(`/api/tasks/${data.taskId}/toggle`, { method: 'POST' }).then(() => {
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'TASK_COMPLETED_VIA_NOTIFICATION', taskId: data.taskId }));
        });
      })
    );
  } else if (action === 'snooze' && data.taskId) {
    // Schedule snooze notification in 15 mins
    event.waitUntil(
      self.registration.showNotification(`⏰ Snoozed Reminder: ${data.title || 'Task'}`, {
        body: 'Reminder was snoozed for 15 minutes.',
        icon: '/icons/icon-192.svg',
        tag: `task-snooze-${data.taskId}`
      })
    );
  } else {
    // Open or focus the app window
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  }
});
