import { hoyLocalISO } from './ingresos';

export const OBJETIVOS = [
  { valor: 'bajar_peso', label: 'Bajar de peso' },
  { valor: 'subir_masa', label: 'Ganar masa muscular' },
  { valor: 'recomposicion', label: 'Recomposición corporal' },
  { valor: 'rendimiento', label: 'Mejorar rendimiento' },
  { valor: 'salud', label: 'Salud y bienestar' },
];

export function etiquetaObjetivo(valor) {
  return OBJETIVOS.find((o) => o.valor === valor)?.label || 'Objetivo personal';
}

// Medidas que se registran. "mejor" = dirección deseada según el objetivo
// (+1 subir, -1 bajar, 0 neutro).
export const MEDIDAS = [
  { clave: 'peso', label: 'Peso', unidad: 'kg' },
  { clave: 'grasa', label: '% grasa', unidad: '%' },
  { clave: 'musculo', label: '% músculo', unidad: '%' },
  { clave: 'cintura', label: 'Cintura', unidad: 'cm' },
  { clave: 'cadera', label: 'Cadera', unidad: 'cm' },
  { clave: 'pecho', label: 'Pecho', unidad: 'cm' },
  { clave: 'brazo', label: 'Brazo', unidad: 'cm' },
  { clave: 'muslo', label: 'Muslo', unidad: 'cm' },
];

const DIRECCION = {
  bajar_peso: {
    peso: -1,
    grasa: -1,
    musculo: 1,
    cintura: -1,
    cadera: -1,
    pecho: 0,
    brazo: 0,
    muslo: -1,
  },
  subir_masa: {
    peso: 1,
    grasa: -1,
    musculo: 1,
    cintura: 0,
    cadera: 0,
    pecho: 1,
    brazo: 1,
    muslo: 1,
  },
  recomposicion: {
    peso: 0,
    grasa: -1,
    musculo: 1,
    cintura: -1,
    cadera: -1,
    pecho: 0,
    brazo: 1,
    muslo: 0,
  },
  rendimiento: {
    peso: 0,
    grasa: -1,
    musculo: 1,
    cintura: 0,
    cadera: 0,
    pecho: 0,
    brazo: 0,
    muslo: 0,
  },
  salud: {
    peso: 0,
    grasa: -1,
    musculo: 1,
    cintura: -1,
    cadera: 0,
    pecho: 0,
    brazo: 0,
    muslo: 0,
  },
};

export function direccionDeseada(objetivo, clave) {
  return DIRECCION[objetivo]?.[clave] ?? 0;
}

const DIA = 86400000;
const t = (iso) => Date.parse(iso + 'T12:00:00');
const sumarDias = (iso, n) => {
  const d = new Date(t(iso) + n * DIA);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
};

export function numero(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function formatear(v, unidad, decimales = 1) {
  if (v === null || v === undefined) return '—';
  const txt = Number(v).toLocaleString('es-CL', {
    maximumFractionDigits: decimales,
    minimumFractionDigits: 0,
  });
  return unidad === '%' ? `${txt}%` : `${txt} ${unidad}`;
}

// Pendiente (cambio por día) con mínimos cuadrados; necesita 2 puntos o más.
function pendiente(puntos) {
  if (puntos.length < 2) return null;
  const xs = puntos.map((p) => (t(p.fecha) - t(puntos[0].fecha)) / DIA);
  const ys = puntos.map((p) => p.valor);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? null : num / den;
}

// Serie de una medida, ordenada por fecha (desde el inicio del plan, o todas si no hay plan).
export function serie(mediciones, clave, desde) {
  return mediciones
    .filter((m) => numero(m[clave]) !== null && (!desde || m.fecha >= desde))
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        String(a.creado_en || '').localeCompare(String(b.creado_en || ''))
    )
    .map((m) => ({ fecha: m.fecha, valor: numero(m[clave]) }));
}

// Resumen completo para el dashboard.
export function resumenSeguimiento({ plan, mediciones, reservas, usuarioId }) {
  const hoy = hoyLocalISO();
  const propias = (mediciones || []).filter(
    (m) => String(m.usuario_id) === String(usuarioId)
  );
  // Se toman las mediciones desde un mes antes del inicio (la evaluación inicial suele ser antes)
  const desde = plan ? sumarDias(plan.fecha_inicio, -30) : null;

  let semana = null;
  let fin = null;
  let sesiones = null;
  if (plan) {
    const transcurridos = Math.floor((t(hoy) - t(plan.fecha_inicio)) / DIA);
    semana = Math.min(
      plan.semanas,
      Math.max(0, Math.floor(transcurridos / 7) + 1)
    );
    fin = sumarDias(plan.fecha_inicio, plan.semanas * 7 - 1);
    const meta = plan.semanas * plan.sesiones_semana;
    const hechas = (reservas || []).filter(
      (r) =>
        String(r.usuario_id) === String(usuarioId) &&
        r.asistio === true &&
        r.fecha >= plan.fecha_inicio &&
        r.fecha <= fin &&
        r.fecha <= hoy
    ).length;
    sesiones = { hechas, meta };
  }

  const medidas = MEDIDAS.map((m) => {
    const s = serie(propias, m.clave, desde);
    if (s.length === 0)
      return { ...m, serie: s, inicial: null, actual: null, cambio: null };
    const inicial = s[0].valor;
    const actual = s[s.length - 1].valor;
    return {
      ...m,
      serie: s,
      inicial,
      actual,
      cambio: actual - inicial,
      fechaActual: s[s.length - 1].fecha,
    };
  });

  const peso = medidas.find((m) => m.clave === 'peso');
  const grasa = medidas.find((m) => m.clave === 'grasa');

  // Ritmo semanal de peso
  const p = pendiente(peso.serie);
  const ritmoSemanal = p === null ? null : p * 7;

  // Avance hacia la meta (peso; si no hay meta de peso, % grasa)
  let meta = null;
  const base =
    numero(plan?.peso_meta) !== null && peso.actual !== null
      ? peso
      : numero(plan?.grasa_meta) !== null && grasa.actual !== null
      ? grasa
      : null;
  if (base) {
    const objetivo =
      base.clave === 'peso' ? numero(plan.peso_meta) : numero(plan.grasa_meta);
    const total = objetivo - base.inicial;
    const hecho = base.actual - base.inicial;
    const pct =
      total === 0 ? 100 : Math.max(0, Math.min(100, (hecho / total) * 100));
    const falta = objetivo - base.actual;
    let fechaEstimada = null;
    const ritmoDia = pendiente(base.serie);
    if (
      ritmoDia &&
      Math.abs(falta) > 0.05 &&
      Math.sign(ritmoDia) === Math.sign(falta)
    ) {
      const dias = Math.ceil(falta / ritmoDia);
      if (dias > 0 && dias < 730) fechaEstimada = sumarDias(hoy, dias);
    }
    meta = {
      clave: base.clave,
      unidad: base.unidad,
      label: base.label,
      objetivo,
      pct,
      falta,
      fechaEstimada,
      logrado: Math.abs(falta) <= 0.05 || pct >= 100,
    };
  }

  const estatura = numero(plan?.estatura_cm);
  const imc =
    estatura && peso.actual ? peso.actual / (estatura / 100) ** 2 : null;

  const historial = [...propias].sort(
    (a, b) =>
      b.fecha.localeCompare(a.fecha) ||
      String(b.creado_en || '').localeCompare(String(a.creado_en || ''))
  );

  return {
    semana,
    fin,
    sesiones,
    medidas,
    ritmoSemanal,
    meta,
    imc,
    historial,
    hayDatos: propias.length > 0,
  };
}

export function etiquetaImc(imc) {
  if (imc === null) return '';
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}
