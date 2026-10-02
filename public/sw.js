/* HisaabKitaab service worker - INSTALL ONLY.
 * Purpose: lets browsers treat the site as an installable app (PWA).
 * It deliberately does NOT cache anything or serve offline pages (offline mode is out of scope):
 * every request goes straight to the network, so money data is never stale.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
// A fetch handler (even a pass-through one) satisfies installability checks in some browsers.
self.addEventListener("fetch", () => {});
