// Reed's service worker (R-041). It caches nothing: deploys would otherwise serve a stale app,
// and the reader already caches audio in the browser (R-027). It only answers navigations, so
// an installed Reed shows a clear message instead of a browser error when there is no network.
const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reed</title></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f3ecdf;color:#1f2a22;font-family:system-ui,sans-serif;padding:24px;text-align:center"><p>Reed necesita conexión para abrir. Vuelve a intentarlo cuando tengas internet.</p></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
