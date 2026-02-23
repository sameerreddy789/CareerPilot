const CACHE_NAME = 'nextstep-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/profile.html',
    '/interview.html',
    '/roadmap.html',
    '/resume.html',
    '/skill-gap.html',
    '/feedback.html',
    '/onboarding.html',
    '/auth.html',
    '/css/styles.css',
    '/css/animated-background.css',
    '/css/page-transitions.css',
    '/css/profile-redesign.css',
    '/css/profile-page.css',
    '/css/dashboard-page.css',
    '/css/interview-page.css',
    '/css/resume-page.css',
    '/css/roadmap-page.css',
    '/css/skill-gap-page.css',
    '/css/feedback-page.css',
    '/css/index-page.css',
    '/favicon.svg'
];

// Install - pre-cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch - network first for HTML/API, cache first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests and external URLs
    if (event.request.method !== 'GET') return;
    if (url.origin !== location.origin) return;

    // HTML pages: network first, fallback to cache
    if (event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Static assets: cache first, fallback to network
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            });
        })
    );
});
