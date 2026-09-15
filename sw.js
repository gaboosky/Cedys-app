import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Hace que la versión nueva de la app se active de inmediato,
// en vez de esperar a que cierres la app por completo.
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  let datos = { titulo: 'CED&S', mensaje: 'Tienes una notificación nueva.' };
  try {
    datos = event.data.json();
  } catch (e) {
    // si no viene en JSON, se usa el mensaje por defecto
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo || 'CED&S', {
      body: datos.mensaje,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
