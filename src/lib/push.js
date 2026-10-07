import { supabase } from './supabase';

const VAPID_PUBLIC_KEY =
  'BEepiRZA_rUDUwdjYut0b2DrhLKbPf_vziPT-x3WRt_-F67RrErNpR-0cY9Jc-Qf9OAM45NV_wmYzDdW9o7xPXc';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function mismaLlave(suscripcion) {
  const actual = suscripcion.options?.applicationServerKey;
  if (!actual) return true; // el navegador no informa la llave: se asume que está bien
  const a = new Uint8Array(actual);
  const b = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export function pushDisponible() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function activarNotificacionesPush(usuarioId) {
  if (!pushDisponible())
    return {
      ok: false,
      mensaje: /iphone|ipad/i.test(navigator.userAgent)
        ? 'En iPhone primero instala la app: en Safari aprieta Compartir → "Agregar a pantalla de inicio", ábrela desde ese ícono y vuelve a activar.'
        : 'Tu navegador no soporta notificaciones push.',
    };

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted')
    return { ok: false, mensaje: 'No diste permiso para las notificaciones.' };

  const registro = await navigator.serviceWorker.ready;

  let suscripcion = await registro.pushManager.getSubscription();
  // Si el celular quedó suscrito con la llave antigua, se vuelve a suscribir con la nueva.
  if (suscripcion && !mismaLlave(suscripcion)) {
    await suscripcion.unsubscribe();
    suscripcion = null;
  }
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

  // Notificación de prueba: confirma que el servidor puede mandar avisos a este celular.
  const { data, error: errorPrueba } = await supabase.functions.invoke('enviar-push', {
    body: { usuario_id: usuarioId, mensaje: '¡Listo! Las notificaciones están activadas.' },
  });
  if (errorPrueba || !data?.ok)
    return {
      ok: false,
      mensaje:
        'Tu celular quedó activado, pero el servidor no pudo mandar la notificación de prueba (revisar la función enviar-push en Supabase).',
    };
  if (!data.enviadas)
    return { ok: false, mensaje: 'Se activó, pero la notificación de prueba no se pudo entregar. Intenta de nuevo.' };
  return { ok: true, mensaje: 'Notificaciones activadas. Te debería llegar una de prueba.' };
}

export async function yaEstaSuscrito() {
  if (!pushDisponible()) return false;
  const registro = await navigator.serviceWorker.ready;
  const suscripcion = await registro.pushManager.getSubscription();
  return !!suscripcion && mismaLlave(suscripcion);
}
