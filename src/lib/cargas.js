// Registro de cargas (pesos) por ejercicio: cálculos y mensajes.

// Mismo ejercicio aunque esté en otra semana o día: se compara por nombre.
export function normalizarEjercicio(nombre) {
  return (nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Primer número que aparezca en un texto ("20 kg" → 20, "17,5" → 17.5).
export function numeroDeTexto(texto) {
  const m = String(texto || '').replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function formatearKg(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return `${Number.isInteger(n) ? n : n.toLocaleString('es-CL', { maximumFractionDigits: 2 })} kg`;
}

// Registros de un alumno para un ejercicio, del más reciente al más antiguo.
export function historialEjercicio(registros, usuarioId, nombreEjercicio) {
  const clave = normalizarEjercicio(nombreEjercicio);
  return registros
    .filter((r) => r.usuario_id === usuarioId && normalizarEjercicio(r.ejercicio) === clave)
    .sort((a, b) => (b.creado_en || '').localeCompare(a.creado_en || ''));
}

// "+5,9%" / "−3%" con formato chileno.
export function formatearPct(pct, conSigno = true) {
  if (pct === null || pct === undefined) return '';
  const texto = Math.abs(pct).toLocaleString('es-CL', { maximumFractionDigits: 1 });
  if (!conSigno || pct === 0) return `${texto}%`;
  return `${pct > 0 ? '+' : '−'}${texto}%`;
}

export function variacionPct(nuevo, anterior) {
  if (!anterior || Number(anterior) === 0) return null;
  return Math.round(((Number(nuevo) - Number(anterior)) / Number(anterior)) * 1000) / 10;
}

// Mensaje motivacional comparando con la vez anterior.
export function mensajeProgreso(nuevo, anterior) {
  if (anterior === null || anterior === undefined) {
    return {
      tipo: 'primero',
      titulo: '¡Primer registro de este ejercicio!',
      texto: 'Desde aquí vamos a medir tu avance. Cada kilo cuenta.',
    };
  }
  const pct = variacionPct(nuevo, anterior);
  if (pct > 0) {
    const titulo = pct >= 10 ? `¡Subiste ${formatearPct(pct, false)}! Gran salto` : `¡Subiste ${formatearPct(pct, false)} desde la última vez!`;
    return {
      tipo: 'sube',
      titulo,
      texto: `Pasaste de ${formatearKg(anterior)} a ${formatearKg(nuevo)}. Sigue avanzando, vas muy bien.`,
    };
  }
  if (pct < 0) {
    return {
      tipo: 'baja',
      titulo: `Bajaste ${formatearPct(pct, false)} esta vez`,
      texto: 'Escuchar a tu cuerpo también es entrenar. La próxima vuelves con todo.',
    };
  }
  return {
    tipo: 'igual',
    titulo: 'Mismo peso que la última vez',
    texto: 'La constancia también es progreso. Cuando lo sientas fácil, súbele un poco.',
  };
}

// Resumen por ejercicio de un alumno: primer y último peso, variación y cantidad de registros.
// Clave de un registro: el ejercicio específico de la rutina (semana + día + ejercicio).
// Si un registro antiguo no tiene el ejercicio, se agrupa por nombre.
export function claveRegistro(r) {
  return r.ejercicio_id ? `id:${r.ejercicio_id}` : `n:${normalizarEjercicio(r.ejercicio)}`;
}

// "Semana 2 · Día 1" (o "" si no se sabe)
export function etiquetaSesion(r) {
  const partes = [];
  if (r?.semana !== null && r?.semana !== undefined) partes.push(`Semana ${r.semana}`);
  if (r?.dia) partes.push(r.dia);
  return partes.join(' · ');
}

// Resumen por ejercicio de la rutina (cada semana y día por separado, porque los pesos varían según estos)
export function resumenPorEjercicio(registros, usuarioId) {
  const grupos = {};
  for (const r of registros) {
    if (r.usuario_id !== usuarioId) continue;
    const clave = claveRegistro(r);
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(r);
  }
  return Object.entries(grupos)
    .map(([clave, lista]) => {
      const orden = [...lista].sort((a, b) => (a.creado_en || '').localeCompare(b.creado_en || ''));
      const primero = orden[0];
      const ultimo = orden[orden.length - 1];
      // Punto de partida: el peso que tenía la rutina antes del primer cambio (si se conoce)
      const inicio = primero.peso_anterior !== null && primero.peso_anterior !== undefined ? Number(primero.peso_anterior) : Number(primero.peso);
      const hayComparacion = orden.length > 1 || (primero.peso_anterior !== null && primero.peso_anterior !== undefined);
      const conSesion = orden.find((x) => x.semana !== null && x.semana !== undefined) || ultimo;
      return {
        clave,
        ejercicio: ultimo.ejercicio,
        semana: conSesion.semana ?? null,
        dia: conSesion.dia ?? null,
        diaOrden: conSesion.dia_orden ?? null,
        sesion: etiquetaSesion(conSesion),
        primero: inicio,
        ultimo: Number(ultimo.peso),
        variacion: hayComparacion ? variacionPct(ultimo.peso, inicio) : null,
        registros: orden.length,
        cambios: hayComparacion,
        fechaPrimero: primero.creado_en,
        fechaUltimo: ultimo.creado_en,
        lista: orden,
      };
    })
    .sort(
      (a, b) =>
        (a.semana ?? 999) - (b.semana ?? 999) ||
        (a.diaOrden ?? 999) - (b.diaOrden ?? 999) ||
        String(a.dia || '').localeCompare(String(b.dia || '')) ||
        (b.fechaUltimo || '').localeCompare(a.fechaUltimo || '')
    );
}

// Último cambio de peso de un ejercicio específico de la rutina.
export function ultimoCambioDe(registros, ejercicioId) {
  return (registros || [])
    .filter((r) => r.ejercicio_id === ejercicioId)
    .sort((a, b) => (b.creado_en || '').localeCompare(a.creado_en || ''))[0] || null;
}

// Peso vigente de un ejercicio: el último cambio registrado o, si nunca se cambió, el de la rutina.
export function pesoVigente(ej, registros) {
  const ultimo = ultimoCambioDe(registros, ej.id);
  if (ultimo) return { valor: Number(ultimo.peso), texto: String(Number(ultimo.peso)).replace('.', ',') };
  return { valor: numeroDeTexto(ej.peso_referencia), texto: ej.peso_referencia || null };
}

// "6 oct · 16:35"
export function fechaHoraRegistro(creadoEn) {
  if (!creadoEn) return '';
  const d = new Date(creadoEn);
  const fecha = d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fecha} · ${hora}`;
}

export function fechaRegistro(creadoEn) {
  if (!creadoEn) return '';
  return new Date(creadoEn).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}
