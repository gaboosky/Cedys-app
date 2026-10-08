// Utilidades compartidas para calcular ingresos a partir de la tabla "pagos".

export const MEDIOS_PAGO = [
  { valor: 'transferencia', label: 'Transferencia' },
  { valor: 'efectivo', label: 'Efectivo' },
  { valor: 'tarjeta', label: 'Débito / crédito' },
  { valor: 'mercadopago', label: 'Mercado Pago (en línea)' },
];

export function etiquetaMedio(valor) {
  return MEDIOS_PAGO.find((m) => m.valor === valor)?.label || 'Otro';
}

export const TIPOS_PAGO = {
  primer_pago: 'Primer pago',
  renovacion: 'Renovación',
  manual: 'Pago manual',
};

const pad = (n) => String(n).padStart(2, '0');

// "YYYY-MM-DD" de hoy según el calendario local (no UTC).
export function hoyLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "YYYY-MM" a partir de "YYYY-MM-DD".
export function mesDe(fechaISO) {
  return (fechaISO || '').slice(0, 7);
}

export function mesActualKey() {
  return hoyLocalISO().slice(0, 7);
}

export function sumarMeses(mesKey, cantidad) {
  const [anio, mes] = mesKey.split('-').map(Number);
  const d = new Date(anio, mes - 1 + cantidad, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// Los últimos "cantidad" meses, del más antiguo al más reciente, terminando en hastaKey.
export function ultimosMeses(cantidad, hastaKey = mesActualKey()) {
  const meses = [];
  for (let i = cantidad - 1; i >= 0; i--) meses.push(sumarMeses(hastaKey, -i));
  return meses;
}

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function nombreMes(mesKey, { corto = false, conAnio = true } = {}) {
  const [anio, mes] = mesKey.split('-').map(Number);
  const d = new Date(anio, mes - 1, 1);
  const texto = d.toLocaleDateString('es-CL', {
    month: corto ? 'short' : 'long',
    ...(conAnio ? { year: 'numeric' } : {}),
  });
  return capitalizar(texto.replace('.', ''));
}

export function formatearPesos(valor) {
  const n = Math.round(Number(valor) || 0);
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('es-CL');
}

export function totalDe(pagos) {
  return pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
}

export function totalesPorMes(pagos) {
  const totales = {};
  for (const p of pagos) {
    const k = mesDe(p.fecha);
    totales[k] = (totales[k] || 0) + (Number(p.monto) || 0);
  }
  return totales;
}

// Monto que normalmente paga un alumno por su plan.
export function montoPlanDe(usuario, planes) {
  if (!usuario) return 0;
  const plan = usuario.plan_id ? planes[usuario.plan_id] : null;
  return Number(usuario.plan_monto_personalizado || plan?.valor_con_iva || 0);
}

// ¿Al alumno ya le toca pagar / renovar su plan? (ya llegó su fecha de vencimiento)
export function necesitaRenovar(usuario, planes, diasRenovacion = 30) {
  const vence = fechaVenceDe(usuario, planes, diasRenovacion);
  if (!vence) return true;
  return hoyLocalISO() >= vence;
}

// Alumnos activos con plan a los que ya les toca pagar: lo que falta por cobrar.
export function pendientesDeCobro(usuarios, planes, diasRenovacion = 30) {
  return usuarios
    .filter((u) => u.estado === 'activo' && u.plan_id && planes[u.plan_id])
    .filter((u) => necesitaRenovar(u, planes, diasRenovacion))
    .map((u) => ({ usuario: u, monto: montoPlanDe(u, planes) }))
    .sort((a, b) => (a.usuario.nombre || '').localeCompare(b.usuario.nombre || ''));
}

// Colores fijos por medio de pago (validados para el fondo oscuro; cada medio siempre tiene el mismo color).
export const COLOR_MEDIO = {
  transferencia: '#3987e5',
  efectivo: '#d95926',
  tarjeta: '#199e70',
  mercadopago: '#9b7be0',
};

const DIA_MS = 1000 * 60 * 60 * 24;

function fechaLocal(fechaISO) {
  return new Date(fechaISO + 'T00:00:00');
}

export function isoDeFecha(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function sumarDias(fechaISO, dias) {
  const d = fechaLocal(fechaISO);
  d.setDate(d.getDate() + dias);
  return isoDeFecha(d);
}

export function duracionPlanDe(usuario, planes, diasRenovacion = 30, planId) {
  const plan = planes[planId ?? usuario?.plan_id];
  return usuario?.plan_dias_personalizado || plan?.duracion_dias || diasRenovacion;
}

// Misma fecha N meses después (si el día no existe, usa el último del mes: 31 ene → 28 feb).
export function sumarMesesFecha(fechaISO, meses) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const ultimoDia = new Date(anio, mes - 1 + meses + 1, 0).getDate();
  return isoDeFecha(new Date(anio, mes - 1 + meses, Math.min(dia, ultimoDia)));
}

// Suma la duración del plan: en meses si es mensual/trimestral/etc. (30, 60, 90 días...), si no en días.
export function sumarDuracion(fechaISO, duracionDias) {
  const meses = Math.max(1, Math.round(duracionDias / 30));
  if (Math.abs(duracionDias - meses * 30) <= 3) return sumarMesesFecha(fechaISO, meses);
  return sumarDias(fechaISO, duracionDias);
}

// Fecha en que vence el plan actual del alumno ("YYYY-MM-DD"), o null si nunca ha pagado.
// Usa la fecha guardada al registrar el pago; si no existe, la calcula con la duración del plan.
export function fechaVenceDe(usuario, planes, diasRenovacion = 30) {
  if (!usuario) return null;
  if (usuario.fecha_vencimiento) return usuario.fecha_vencimiento;
  if (!usuario.fecha_ultima_renovacion) return null;
  return sumarDias(usuario.fecha_ultima_renovacion, duracionPlanDe(usuario, planes, diasRenovacion));
}

// Vencimiento sugerido para un pago nuevo: mismo día del mes que el vencimiento anterior
// (así el alumno mantiene su día de pago). Si no tenía, o quedaría antes del pago, cuenta desde la fecha del pago.
export function venceSugerido(usuario, planes, diasRenovacion, fechaPagoISO) {
  const duracion = duracionPlanDe(usuario, planes, diasRenovacion);
  const anterior = fechaVenceDe(usuario, planes, diasRenovacion);
  if (anterior) {
    const desdeAnterior = sumarDuracion(anterior, duracion);
    if (desdeAnterior > fechaPagoISO) return desdeAnterior;
  }
  return sumarDuracion(fechaPagoISO, duracion);
}

// Fecha de vencimiento del plan actual y días que faltan (negativo = vencido).
export function vencimientoDe(usuario, planes, diasRenovacion = 30) {
  if (!usuario.plan_id) return null;
  const vence = fechaVenceDe(usuario, planes, diasRenovacion);
  if (!vence) return null;
  const dias = Math.round((fechaLocal(vence) - fechaLocal(hoyLocalISO())) / DIA_MS);
  return { vence, dias };
}

// Alumnos con plan vigente en cada mes, calculado con los pagos de plan
// (cada pago cubre desde su fecha hasta su fecha + la duración del plan).
export function alumnosActivosPorMes(pagos, usuarios, planes, diasRenovacion, meses) {
  const porUsuario = Object.fromEntries(usuarios.map((u) => [u.id, u]));
  const periodos = pagos
    .filter((p) => p.tipo !== 'manual')
    .map((p) => {
      const dur = duracionPlanDe(porUsuario[p.usuario_id], planes, diasRenovacion, p.plan_id);
      const hasta = p.vence ? sumarDias(p.vence, -1) : sumarDias(p.fecha, dur - 1);
      return { usuario: p.usuario_id, desde: p.fecha, hasta };
    });
  const resultado = {};
  for (const m of meses) {
    const [anio, mes] = m.split('-').map(Number);
    const inicio = `${m}-01`;
    const fin = `${m}-${pad(new Date(anio, mes, 0).getDate())}`;
    const activos = new Set(periodos.filter((x) => x.desde <= fin && x.hasta >= inicio).map((x) => x.usuario));
    resultado[m] = activos.size;
  }
  return resultado;
}
