import { vencimientoDe, hoyLocalISO } from './ingresos';

export const DIAS_SIN_VENIR = 14;
// Si el admin ya contactó al alumno hace menos de esto, no se cuenta como pendiente.
export const DIAS_CONTACTO_VIGENTE = 7;

function diasDesde(fechaISO, hoyISO) {
  return Math.round((Date.parse(hoyISO + 'T12:00:00') - Date.parse(fechaISO + 'T12:00:00')) / 86400000);
}

export function diasDesdeContacto(u) {
  if (!u.ultimo_contacto_seguimiento) return null;
  return Math.floor((Date.now() - new Date(u.ultimo_contacto_seguimiento).getTime()) / 86400000);
}

export function contactadoReciente(u) {
  const d = diasDesdeContacto(u);
  return d !== null && d < DIAS_CONTACTO_VIGENTE;
}

// Alumnos activos que podrían dejar el gimnasio:
//  - sinVenir: plan vigente, sin clases hace 14 días o más y sin reservas próximas.
//  - vencidos: plan vencido y sin renovar.
export function alumnosEnRiesgo(usuarios, reservas, planes, diasRenovacion) {
  const hoy = hoyLocalISO();
  const ultima = {};
  const proxima = {};
  for (const r of reservas) {
    if (r.fecha <= hoy && r.asistio !== false) {
      if (!ultima[r.usuario_id] || r.fecha > ultima[r.usuario_id]) ultima[r.usuario_id] = r.fecha;
    }
    if (r.fecha >= hoy) proxima[r.usuario_id] = true;
  }

  const sinVenir = [];
  const vencidos = [];
  for (const u of usuarios) {
    if (u.rol !== 'usuario' || u.estado !== 'activo' || !u.plan_id) continue;
    const v = vencimientoDe(u, planes, diasRenovacion);
    const ultimaClase = ultima[u.id] || null;
    const diasSinVenir = ultimaClase ? diasDesde(ultimaClase, hoy) : null;
    if (v && v.dias < 0) {
      vencidos.push({ usuario: u, venceHace: -v.dias, vence: v.vence, ultimaClase, diasSinVenir });
      continue;
    }
    if (proxima[u.id]) continue;
    // Recién inscritos (renovaron hace menos de 14 días) y sin clases todavía: aún no es riesgo.
    const desdeRenovacion = u.fecha_ultima_renovacion ? diasDesde(u.fecha_ultima_renovacion, hoy) : null;
    const referencia = diasSinVenir ?? desdeRenovacion;
    if (referencia === null || referencia < DIAS_SIN_VENIR) continue;
    sinVenir.push({ usuario: u, ultimaClase, diasSinVenir, vence: v?.vence || null });
  }
  sinVenir.sort((a, b) => (b.diasSinVenir ?? 9999) - (a.diasSinVenir ?? 9999));
  vencidos.sort((a, b) => a.venceHace - b.venceHace);
  return { sinVenir, vencidos };
}

export function pendientesDeContacto(usuarios, reservas, planes, diasRenovacion) {
  const { sinVenir, vencidos } = alumnosEnRiesgo(usuarios, reservas, planes, diasRenovacion);
  return [...sinVenir, ...vencidos.filter((x) => x.venceHace <= 60)].filter((x) => !contactadoReciente(x.usuario))
    .length;
}

// Número para WhatsApp: si escribieron 9 dígitos que empiezan con 9 (celular chileno), se agrega el 56.
export function numeroWhatsapp(telefono) {
  const d = String(telefono || '').replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('9')) return '56' + d;
  if (d.length === 8) return '569' + d;
  return d;
}
