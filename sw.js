// IELTS Prep Studio Service Worker (Network-First with Cache Fallback)
const CACHE_NAME = 'ielts-prep-studio-v9.2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './ielts_prep_studio_open_academic_edition.html',
  './firebase-config.js',
  './manifest.json',
  './js/listening-hub.js',
  './js/examiner-studio-pro.js',
  './data/exam-traps.json',
  './js/academic-lexicon.js',
  './data/listening.json',
  './js/ielts-api-features.js',
  './js/storage-sync.js',
  './data/lexicon.json',
  './data/reading.json',
  './data/writing.json',
  './data/speaking.json',
  './data/free-bundle.json',
  './data/vip-bundle.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-caching notice:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  const LIVE_API_HOSTS = [
    'api.openalex.org',
    'api.semanticscholar.org',
    'api.worldbank.org',
    'restcountries.com',
    'api.open-meteo.com',
    'itunes.apple.com',
    'api.dictionaryapi.dev',
    'api.datamuse.com',
    'api.languagetool.org',
    'api.mymemory.translated.net',
    'en.wikipedia.org',
    'www.reddit.com',
    'ielts-prep-studio-backend.lyan123-lh.workers.dev'
  ];

  if (LIVE_API_HOSTS.some((host) => url.hostname.includes(host))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network first, falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
