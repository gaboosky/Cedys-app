// Revisa que un correo sea válido antes de crear una cuenta:
// 1) formato, 2) errores de tipeo en dominios comunes (gmial.com, gmail.comt...),
// 3) que el dominio exista y reciba correos (consulta pública de DNS).

const DOMINIOS_COMUNES = [
  'gmail.com', 'hotmail.com', 'hotmail.es', 'hotmail.cl', 'outlook.com', 'outlook.es', 'outlook.cl',
  'live.com', 'live.cl', 'yahoo.com', 'yahoo.es', 'yahoo.cl', 'icloud.com', 'me.com', 'msn.com',
  'protonmail.com', 'proton.me', 'gmx.com', 'aol.com',
];

function distancia(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

export function revisarTipeo(correo) {
  const [usuario, dominio] = correo.split('@');
  if (!dominio || DOMINIOS_COMUNES.includes(dominio)) return null;
  let mejor = null;
  for (const comun of DOMINIOS_COMUNES) {
    const dist = distancia(dominio, comun);
    if (dist <= 2 && (!mejor || dist < mejor.dist)) mejor = { comun, dist };
  }
  return mejor ? `${usuario}@${mejor.comun}` : null;
}

async function dominioRecibeCorreos(dominio) {
  const controlador = new AbortController();
  const tiempo = setTimeout(() => controlador.abort(), 5000);
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(dominio)}&type=MX`, {
      signal: controlador.signal,
    });
    const datos = await r.json();
    if (datos.Status === 3) return false; // el dominio no existe
    if (datos.Status === 0) return Array.isArray(datos.Answer) && datos.Answer.length > 0;
    return true; // respuesta rara: no bloqueamos
  } catch {
    return true; // sin internet o servicio caído: no bloqueamos por esto
  } finally {
    clearTimeout(tiempo);
  }
}

export async function validarCorreo(correoIngresado) {
  const correo = (correoIngresado || '').trim().toLowerCase().replace(/\s+/g, '');

  if (!/^[^@]+@[^@]+\.[a-z]{2,}$/.test(correo)) {
    return { ok: false, correo, mensaje: 'El correo no tiene un formato válido (ejemplo: nombre@gmail.com).' };
  }

  const sugerencia = revisarTipeo(correo);
  if (sugerencia) {
    return { ok: false, correo, sugerencia, mensaje: `El correo "${correo}" parece tener un error. ¿Quisiste decir ${sugerencia}?` };
  }

  const dominio = correo.split('@')[1];
  if (!(await dominioRecibeCorreos(dominio))) {
    return { ok: false, correo, mensaje: `El dominio "${dominio}" no existe o no recibe correos. Revisa que esté bien escrito.` };
  }

  return { ok: true, correo };
}
