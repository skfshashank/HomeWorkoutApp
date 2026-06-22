const CACHE_NAME = 'openfit-v2';
const BASE = self.location.pathname.replace(/sw\.js$/, '');
const ASSETS = [
  'index.html',
  'manifest.json',
  'sw.js',
  'css/main.css',
  'css/components.css',
  'css/animations.css',
  'js/app.js',
  'js/data/exercises.js',
  'js/data/plans.js',
  'js/data/challenges.js',
  'js/data/quotes.js',
  'js/models/profile.js',
  'js/models/workout.js',
  'js/models/progress.js',
  'js/services/storage.js',
  'js/services/audio.js',
  'js/services/voice.js',
  'js/services/generator.js',
  'js/services/rpe.js',
  'js/services/timer.js',
  'js/services/motion.js',
  'js/services/desk.js',
  'js/views/home.js',
  'js/views/workouts.js',
  'js/views/trainer.js',
  'js/views/challenge.js',
  'js/views/progress.js',
  'js/views/profile.js',
  'assets/icons/icon-512.svg',
  'assets/plans/challenge_30day_v1.json',
  'assets/plans/exercise_catalog_v1.json',
  'assets/plans/quotes_v1.json',
  'assets/plans/workout_plans_v1.json'
].map((file) => new URL(file, self.location).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(new URL('index.html', self.location).toString()));
    })
  );
});

