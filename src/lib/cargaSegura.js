import { lazy } from 'react';

// Después de publicar una versión nueva, una pestaña abierta con la versión
// anterior puede pedir una parte de la app que ya no existe. En ese caso se
// recarga la página una vez (trae la versión nueva) en vez de mostrar un error.
const CLAVE = 'cedys_recarga_por_version';

export function esErrorDeCarga(error) {
  const texto = String(error?.message || error || '');
  return /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically|ChunkLoadError|Unable to preload CSS/i.test(
    texto
  );
}

export function recargarUnaVez() {
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE) || 0);
    if (Date.now() - ultima < 20000) return false; // ya se intentó recién: no entrar en un ciclo
    sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    /* sin almacenamiento: se recarga igual */
  }
  window.location.reload();
  return true;
}

export function lazySeguro(importar) {
  return lazy(() =>
    importar().catch((error) => {
      if (esErrorDeCarga(error) && recargarUnaVez()) {
        // La página se está recargando: se queda esperando sin mostrar error
        return new Promise(() => {});
      }
      throw error;
    })
  );
}
