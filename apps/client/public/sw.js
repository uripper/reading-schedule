self.addEventListener("install", () => {
  globalThis.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(globalThis.clients.claim());
});

self.addEventListener("fetch", () => {
  // Placeholder SW for offline strategy wiring. Replace with Workbox generated routes.
});
