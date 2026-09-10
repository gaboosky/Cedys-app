import { supabase } from './supabase';

const VAPID_PUBLIC_KEY =
  'BFsSjApMXyn0F8NkyDhJw_MrmwgV7mpu98K1G0PszrPTdhaAoWR30-yOiIJu75lwiCaw89xey3mUTYYAmEw7bm4';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function pushDisponible() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function activarNotificacionesPush(usuarioId) {
  if (!pushDisponible())
    return {
      ok: false,
      mensaje: 'Tu navegador no soporta notificaciones push.',
    };

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted')
    return { ok: false, mensaje: 'No diste permiso para las notificaciones.' };

  const registro = await navigator.serviceWorker.ready;

  let suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) {
    suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = suscripcion.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      usuario_id: usuarioId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' }
  );

  if (error)
    return {
      ok: false,
      mensaje: 'No se pudo guardar la suscripción: ' + error.message,
    };
  return { ok: true, mensaje: 'Notificaciones activadas.' };
}

export async function yaEstaSuscrito() {
  if (!pushDisponible()) return false;
  const registro = await navigator.serviceWorker.ready;
  const suscripcion = await registro.pushManager.getSubscription();
  return !!suscripcion;
}
