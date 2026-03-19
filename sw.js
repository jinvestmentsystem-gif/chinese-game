// sw.js — Service worker: force no-cache for all JS/CSS/JSON assets
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
    );
  }
});
