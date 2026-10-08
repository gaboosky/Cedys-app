import { hoyLocalISO } from './ingresos';

// Fecha del cumpleaños en un año dado (29 de febrero → 28 en años no bisiestos).
function cumpleEnAnio(fechaNacimiento, anio) {
  const [, m, d] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  const ultimo = new Date(anio, m, 0).getDate();
  return new Date(anio, m - 1, Math.min(d, ultimo), 12);
}

// Cumpleaños de hoy y de los próximos días (alumnos y coaches activos).
export function cumpleanosProximos(usuarios, dias = 7) {
  const hoy = new Date(hoyLocalISO() + 'T12:00:00');
  const lista = [];
  for (const u of usuarios) {
    if (u.estado !== 'activo' || !u.fecha_nacimiento) continue;
    let fecha = cumpleEnAnio(u.fecha_nacimiento, hoy.getFullYear());
    if (fecha < hoy && Math.round((hoy - fecha) / 86400000) > 0) fecha = cumpleEnAnio(u.fecha_nacimiento, hoy.getFullYear() + 1);
    const enDias = Math.round((fecha - hoy) / 86400000);
    if (enDias < 0 || enDias > dias) continue;
    const edad = fecha.getFullYear() - Number(u.fecha_nacimiento.slice(0, 4));
    lista.push({ usuario: u, fecha, enDias, edad });
  }
  return lista.sort((a, b) => a.enDias - b.enDias);
}

export function esMiCumpleanos(usuario) {
  if (!usuario?.fecha_nacimiento) return false;
  const hoy = new Date(hoyLocalISO() + 'T12:00:00');
  const fecha = cumpleEnAnio(usuario.fecha_nacimiento, hoy.getFullYear());
  return fecha.getMonth() === hoy.getMonth() && fecha.getDate() === hoy.getDate();
}
