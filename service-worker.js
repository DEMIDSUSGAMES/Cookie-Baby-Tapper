// service-worker.js - Сервис-воркер для офлайн-режима и PWA

const CACHE_NAME = 'cookie-baby-v3';
const APP_VERSION = '3.0.0';

// Файлы для кэширования
const CORE_FILES = [
  './',
  './index.html',
  './2-service-worker.js',
  './3-manifest.json',
  './5-404.html'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Установка...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Кэшируем основные файлы');
        return cache.addAll(CORE_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Активация...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Удаляем старый кэш', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к сторонним ресурсам
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Для стратегии Cache First
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        // Клонируем запрос
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then((response) => {
            // Проверяем валидность ответа
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Клонируем ответ
            const responseToCache = response.clone();
            
            // Кэшируем новые ресурсы
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Fallback для страниц
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            // Fallback для других ресурсов
            return new Response('Офлайн-режим', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Сообщения между Service Worker и страницей
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Фоновая синхронизация для сохранений
self.addEventListener('sync', (event) => {
  if (event.tag === 'save-sync') {
    event.waitUntil(
      // Здесь можно реализовать синхронизацию с облаком
      Promise.resolve()
    );
  }
});

// Пуш-уведомления (опционально)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Ваш малыш скучает!',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDUiIGZpbGw9IiNGRjk2NDMiLz48Y2lyY2xlIGN4PSIzNSIgY3k9IjQwIiByPSI1IiBmaWxsPSIjMzMzIi8+PGNpcmNsZSBjeD0iNjUiIGN5PSI0MCIgcj0iNSIgZmlsbD0iIzMzMyIvPjxwYXRoIGQ9Ik00MCw2NSBRNTAsNzUgNjAsNjUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PC9zdmc+',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'cookie-baby-notification'
    },
    actions: [
      {
        action: 'play',
        title: 'Играть',
        icon: './icons/play-icon.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: './icons/close-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Cookie Baby Tapper', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'play') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});