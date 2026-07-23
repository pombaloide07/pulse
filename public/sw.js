/* Pulse — Service Worker: recebe Web Push e trata clique na notificação.
   Servido em /sw.js (escopo '/'). O HashRouter vive no #, fora do scope. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Pulse", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Pulse";
  const options = {
    body: data.body || "",
    icon: data.icon || "/pulse.svg",
    badge: data.badge || "/pulse.svg",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* ok */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
    })()
  );
});

// assinatura pode ser invalidada pelo push service — reassina em silêncio
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const appKey = event.oldSubscription?.options?.applicationServerKey;
        if (appKey) {
          await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appKey,
          });
        }
      } catch {
        /* o app re-sincroniza no próximo boot */
      }
    })()
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
