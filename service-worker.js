const CACHE_NAME = 'jc-path-lab-v5.6.1';
const ASSETS = [
  './',
  './index.html',
  './antigravity.css',
  './antigravity.js',
  './manifest.json'
];

// Instalación: Cachear archivos críticos
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activación: Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Estrategia Network-First: Siempre buscar lo más nuevo, usar caché solo como respaldo
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
