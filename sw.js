/* SHIFRA Web Push service worker */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'SHIFRA', body: event.data ? event.data.text() : 'عندك إشعار جديد.' };
  }

  const title = payload.title || 'إشعار جديد من SHIFRA';
  const options = {
    body: payload.body || 'عندك إشعار جديد داخل SHIFRA.',
    tag: payload.tag || 'shifra-notification',
    renotify: true,
    requireInteraction: false,
    data: payload.data || { url: '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification?.data?.url || '/';

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of clientList) {
      try {
        const targetUrl = new URL(target, self.location.origin).href;
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) await client.navigate(targetUrl);
          return;
        }
      } catch {}
    }

    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
