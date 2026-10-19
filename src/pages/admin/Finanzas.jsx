import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarClock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import GraficoBarrasMes from '../../components/GraficoBarrasMes';
import BarrasHorizontales from '../../components/BarrasHorizontales';
import GraficoDona from '../../components/GraficoDona';
import FormularioPago from '../../components/FormularioPago';
import {
  MEDIOS_PAGO,
  COLOR_MEDIO,
  hoyLocalISO,
  mesActualKey,
  sumarMeses,
  ultimosMeses,
  nombreMes,
  formatearPesos,
  totalDe,
  sumarDias,
  vencimientoDe,
  alumnosActivosPorMes,
  pendientesDeCobro,
  mesDe,
} from '../../lib/ingresos';

const NOMBRES_DIA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

function ultimoDiaDelMes(mesKey) {
  const [anio, mes] = mesKey.split('-').map(Number);
  return `${mesKey}-${String(new Date(anio, mes, 0).getDate()).padStart(
    2,
    '0'
  )}`;
}

function rangoAtajo(atajo) {
  const hoy = hoyLocalISO();
  const mes = mesActualKey();
  if (atajo === 'hoy') return { desde: hoy, hasta: hoy };
  if (atajo === '7') return { desde: sumarDias(hoy, -6), hasta: hoy };
  if (atajo === '30') return { desde: sumarDias(hoy, -29), hasta: hoy };
  if (atajo === 'mes') return { desde: `${mes}-01`, hasta: hoy };
  const ant = sumarMeses(mes, -1);
  return { desde: `${ant}-01`, hasta: ultimoDiaDelMes(ant) };
}

const ATAJOS = [
  { valor: 'mes', label: 'Este mes' },
  { valor: 'mes-anterior', label: 'Mes anterior' },
  { valor: '30', label: 'Últimos 30 días' },
  { valor: '7', label: '7 días' },
];

// Semáforo: cada indicador dice si está bien, en atención o para revisar (con ícono + palabra, nunca solo color)
const SEMAFORO = {
  bien: {
    label: 'Bien',
    icono: CheckCircle2,
    clase: 'bg-green-400/10 text-green-300 border-green-400/30',
  },
  atencion: {
    label: 'Atención',
    icono: AlertTriangle,
    clase: 'bg-yellow-400/10 text-yellow-200 border-yellow-400/30',
  },
  revisar: {
    label: 'Revisar',
    icono: AlertOctagon,
    clase: 'bg-red-500/10 text-red-300 border-red-500/30',
  },
  info: {
    label: 'Dato',
    icono: Info,
    clase: 'bg-white/[0.06] text-white/60 border-white/15',
  },
};

function Kpi({
  titulo,
  valor,
  estado = 'info',
  explicacion,
  detalle,
  onClick,
  editando,
  oculto,
  onAlternar,
}) {
  const e = SEMAFORO[estado];
  const Icono = e.icono;
  if (oculto && !editando) return null;
  return (
    <div
      onClick={editando ? onAlternar : onClick}
      className={`relative bg-white/[0.04] border rounded-2xl p-4 flex flex-col transition-opacity ${
        editando
          ? 'cursor-pointer border-dashed border-cyan-brand/40'
          : 'border-white/10'
      } ${editando && oculto ? 'opacity-35' : ''} ${
        onClick && !editando
          ? 'cursor-pointer active:scale-[0.98] transition-transform'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-white/60 text-xs leading-tight">{titulo}</p>
        {editando ? (
          <span
            className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${
              oculto
                ? 'border-white/20 text-white/60'
                : 'border-cyan-brand/40 bg-cyan-brand/15 text-cyan-brand'
            }`}
          >
            {oculto ? <EyeOff size={11} /> : <Eye size={11} />}{' '}
            {oculto ? 'Oculta' : 'Visible'}
          </span>
        ) : (
          <span
            className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold border rounded-full px-1.5 py-0.5 ${e.clase}`}
          >
            <Icono size={11} /> {e.label}
          </span>
        )}
      </div>
      <p className="text-white font-display text-3xl leading-none tabular-nums mt-2">
        {valor}
      </p>
      {detalle && <p className="text-white/45 text-[11px] mt-1">{detalle}</p>}
      <p className="text-white/70 text-xs mt-2.5 pt-2.5 border-t border-white/[0.06] leading-snug">
        {explicacion}
      </p>
    </div>
  );
}

function iniciales(nombre) {
  const p = (nombre || '?').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase();
}

function Indicador({
  icono: Icono,
  etiqueta,
  valor,
  detalle,
  destacado,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 border ${
        destacado
          ? 'bg-cyan-brand/[0.07] border-cyan-brand/40'
          : 'bg-white/[0.04] border-white/10'
      } ${
        onClick
          ? 'cursor-pointer transition-transform active:scale-[0.98] hover:border-cyan-brand/50'
          : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-brand/15 flex items-center justify-center">
          <Icono size={15} className="text-cyan-brand" />
        </div>
        <p className="text-white/50 text-xs leading-tight">{etiqueta}</p>
      </div>
      <p className="text-white font-display text-2xl leading-none tabular-nums">
        {valor}
      </p>
      <p className="text-white/35 text-[11px] mt-1.5">{detalle}</p>
    </div>
  );
}

export default function Finanzas() {
  const navigate = useNavigate();
  const {
    usuarios,
    planes,
    pagos,
    reservas,
    horarios,
    horarioEstaCancelado,
    diasRenovacion,
    gastos,
    kpisOcultos = [],
    guardarKpisOcultos,
  } = useAuth();
  const [editandoKpis, setEditandoKpis] = useState(false);
  function propsKpi(id) {
    const oculto = kpisOcultos.includes(id);
    return {
      editando: editandoKpis,
      oculto,
      onAlternar: () =>
        guardarKpisOcultos?.(
          oculto ? kpisOcultos.filter((k) => k !== id) : [...kpisOcultos, id]
        ),
    };
  }

  const [atajo, setAtajo] = useState('mes');
  const [rango, setRango] = useState(rangoAtajo('mes'));
  const { desde, hasta } = rango;
  const [cobrandoId, setCobrandoId] = useState(null);
  const [verTodasRenov, setVerTodasRenov] = useState(false);

  function elegirAtajo(valor) {
    setAtajo(valor);
    setRango(rangoAtajo(valor));
  }
  function cambiarFecha(campo, valor) {
    if (!valor) return;
    setAtajo(null);
    setRango((r) => ({ ...r, [campo]: valor }));
  }

  const hoy = hoyLocalISO();

  // --- Ingresos del período ---
  const pagosPeriodo = pagos.filter(
    (p) => p.fecha >= desde && p.fecha <= hasta
  );
  const ingresosPeriodo = totalDe(pagosPeriodo);
  const gastosPeriodo = (gastos || []).filter(
    (g) => g.fecha >= desde && g.fecha <= hasta
  );
  const totalGastos = gastosPeriodo.reduce(
    (acc, g) => acc + (Number(g.monto) || 0),
    0
  );
  const utilidad = ingresosPeriodo - totalGastos;

  // --- Reservas de la semana (lunes a domingo) ---
  const hoyFecha = new Date(hoy + 'T00:00:00');
  const lunes = sumarDias(hoy, -((hoyFecha.getDay() + 6) % 7));
  const domingo = sumarDias(lunes, 6);
  const reservasSemana = reservas.filter(
    (r) => r.fecha >= lunes && r.fecha <= domingo
  ).length;
  let clasesSemana = 0;
  for (let i = 0; i < 7; i++) {
    const fecha = sumarDias(lunes, i);
    const diaNombre = NOMBRES_DIA[new Date(fecha + 'T00:00:00').getDay()];
    for (const h of horarios) {
      const aplica = h.fecha_unica
        ? h.fecha_unica === fecha
        : h.dia === diaNombre;
      if (aplica && !horarioEstaCancelado(h.id, fecha)) clasesSemana++;
    }
  }

  // --- Asistencia y no-show del período (solo clases ya pasadas y marcadas por el coach) ---
  const marcadas = reservas.filter(
    (r) =>
      r.fecha >= desde &&
      r.fecha <= hasta &&
      r.fecha <= hoy &&
      (r.asistio === true || r.asistio === false)
  );
  const asistieron = marcadas.filter((r) => r.asistio === true).length;
  const pctAsistencia =
    marcadas.length > 0
      ? Math.round((asistieron / marcadas.length) * 100)
      : null;
  const pctNoShow = marcadas.length > 0 ? 100 - pctAsistencia : null;

  // --- Alumnos activos por mes (últimos 6) ---
  const mesHoy = mesActualKey();
  const meses6 = ultimosMeses(6);
  const activosMes = useMemo(
    () => alumnosActivosPorMes(pagos, usuarios, planes, diasRenovacion, meses6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pagos, usuarios, planes, diasRenovacion, mesHoy]
  );
  const [mesGrafico, setMesGrafico] = useState(mesHoy);
  const datosActivos = meses6.map((k) => ({
    key: k,
    etiqueta: nombreMes(k, { corto: true, conAnio: false }).slice(0, 3),
    etiquetaLarga: nombreMes(k),
    valor: activosMes[k] || 0,
  }));

  // --- Distribución por plan (alumnos activos hoy) ---
  const conPlan = usuarios.filter(
    (u) => u.estado === 'activo' && u.plan_id && planes[u.plan_id]
  );
  const distribucion = Object.values(
    conPlan.reduce((acc, u) => {
      const p = planes[u.plan_id];
      if (!acc[p.id]) acc[p.id] = { key: p.id, etiqueta: p.nombre, valor: 0 };
      acc[p.id].valor += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.valor - a.valor);

  // --- Medios de pago del período ---
  const porMedio = MEDIOS_PAGO.map((m) => {
    const delMedio = pagosPeriodo.filter(
      (p) => (p.medio || 'transferencia') === m.valor
    );
    return {
      key: m.valor,
      etiqueta: m.label,
      valor: totalDe(delMedio),
      color: COLOR_MEDIO[m.valor],
      detalle: `${delMedio.length} pago${delMedio.length !== 1 ? 's' : ''}`,
    };
  }).filter((i) => i.valor > 0);

  // --- Próximas renovaciones (vencidos y los que vencen en 7 días) ---
  const renovaciones = usuarios
    .filter((u) => u.estado === 'activo' && u.plan_id && planes[u.plan_id])
    .map((u) => ({ u, v: vencimientoDe(u, planes, diasRenovacion) }))
    .filter(({ v }) => !v || v.dias <= 7)
    .sort((a, b) => (a.v?.dias ?? -9999) - (b.v?.dias ?? -9999));
  const estaSemana = renovaciones.filter(({ v }) => v && v.dias >= 0).length;
  const renovacionesVisibles = verTodasRenov
    ? renovaciones
    : renovaciones.slice(0, 6);

  function etiquetaVence(v) {
    if (!v)
      return {
        texto: 'Sin pago',
        clase: 'bg-red-500/10 text-red-300 border-red-500/30',
      };
    if (v.dias < 0) {
      const n = Math.abs(v.dias);
      return {
        texto: `Venció hace ${n} día${n !== 1 ? 's' : ''}`,
        clase: 'bg-red-500/10 text-red-300 border-red-500/30',
      };
    }
    if (v.dias === 0)
      return {
        texto: 'Hoy',
        clase: 'bg-orange-400/10 text-orange-300 border-orange-400/30',
      };
    return {
      texto: `En ${v.dias} día${v.dias !== 1 ? 's' : ''}`,
      clase: 'bg-yellow-400/10 text-yellow-200 border-yellow-400/30',
    };
  }

  // --- Indicadores de gestión, en palabras simples ---
  const ocupacionCupos = (() => {
    let cupos = 0;
    for (let i = 0; i < 7; i++) {
      const fecha = sumarDias(lunes, i);
      const diaNombre = NOMBRES_DIA[new Date(fecha + 'T00:00:00').getDay()];
      for (const h of horarios) {
        const aplica = h.fecha_unica
          ? h.fecha_unica === fecha
          : h.dia === diaNombre;
        if (aplica && !horarioEstaCancelado(h.id, fecha))
          cupos += Number(h.cupo_max) || 0;
      }
    }
    return cupos;
  })();
  const pctOcupacion =
    ocupacionCupos > 0
      ? Math.round((reservasSemana / ocupacionCupos) * 100)
      : null;
  const activosHoy = activosMes[mesHoy] || 0;
  const activosAntes = activosMes[sumarMeses(mesHoy, -1)] || 0;
  const difActivos = activosHoy - activosAntes;
  const cobros = pendientesDeCobro(usuarios, planes, diasRenovacion);
  const montoPorCobrar = cobros.reduce((acc, c) => acc + (c.monto || 0), 0);
  const pctGasto =
    ingresosPeriodo > 0
      ? Math.round((totalGastos / ingresosPeriodo) * 100)
      : totalGastos > 0
      ? 999
      : null;
  const promedioPorAlumno =
    activosHoy > 0 ? Math.round(ingresosPeriodo / activosHoy) : null;

  const estadoAsistencia =
    pctAsistencia === null
      ? 'info'
      : pctAsistencia >= 85
      ? 'bien'
      : pctAsistencia >= 70
      ? 'atencion'
      : 'revisar';
  const estadoOcupacion =
    pctOcupacion === null
      ? 'info'
      : pctOcupacion >= 70
      ? 'bien'
      : pctOcupacion >= 40
      ? 'atencion'
      : 'revisar';
  const estadoActivos =
    difActivos > 0 ? 'bien' : difActivos === 0 ? 'info' : 'atencion';
  const estadoCobro =
    cobros.length === 0 ? 'bien' : cobros.length <= 3 ? 'atencion' : 'revisar';
  const estadoGasto =
    pctGasto === null
      ? 'info'
      : pctGasto <= 70
      ? 'bien'
      : pctGasto <= 100
      ? 'atencion'
      : 'revisar';
  const estadoGeneral =
    utilidad > 0 ? 'bien' : utilidad === 0 ? 'atencion' : 'revisar';

  // --- Últimos 6 meses: entró vs salió ---
  const ingresosPorMes = meses6.map((k) => ({
    k,
    entra: totalDe(pagos.filter((p) => mesDe(p.fecha) === k)),
    sale: (gastos || [])
      .filter((g) => mesDe(g.fecha) === k)
      .reduce((acc, g) => acc + (Number(g.monto) || 0), 0),
  }));
  const maxMes = Math.max(
    1,
    ...ingresosPorMes.flatMap((m) => [m.entra, m.sale])
  );

  const nombrePeriodo =
    atajo === 'mes'
      ? 'este mes'
      : atajo === 'mes-anterior'
      ? 'el mes pasado'
      : atajo === '30'
      ? 'los últimos 30 días'
      : atajo === '7'
      ? 'los últimos 7 días'
      : 'este período';

  const fechaTexto = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
    });

  const maxBarra = Math.max(1, ingresosPeriodo, totalGastos);
  const EG = SEMAFORO[estadoGeneral];
  const IconoGeneral = EG.icono;

  return (
    <div className="min-h-screen bg-ink pb-24 px-4 md:px-8 pt-5">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <p className="font-display text-3xl text-white leading-tight">
              Finanzas
            </p>
            <p className="text-white/40 text-xs mt-1">
              Cómo va el gimnasio, en simple
            </p>
          </div>
          <button
            onClick={() => navigate('/ingreso-detalle')}
            className="flex items-center gap-1 text-cyan-brand text-xs font-semibold bg-cyan-brand/10 border border-cyan-brand/30 rounded-full px-3 py-1.5 shrink-0"
          >
            Pagos y cobros <ChevronRight size={13} />
          </button>
        </div>

        {/* Período */}
        <div
          className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 mb-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {ATAJOS.map((a) => (
            <button
              key={a.valor}
              onClick={() => elegirAtajo(a.valor)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                atajo === a.valor
                  ? 'bg-cyan-brand border-cyan-brand text-ink'
                  : 'bg-white/[0.04] border-white/10 text-white/60'
              }`}
            >
              {a.label}
            </button>
          ))}
          <button
            onClick={() => setAtajo(null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
              atajo === null
                ? 'bg-cyan-brand border-cyan-brand text-ink'
                : 'bg-white/[0.04] border-white/10 text-white/60'
            }`}
          >
            Elegir fechas
          </button>
        </div>
        {atajo === null && (
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => cambiarFecha('desde', e.target.value)}
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none focus:border-cyan-brand"
            />
            <input
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => cambiarFecha('hasta', e.target.value)}
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none focus:border-cyan-brand"
            />
          </div>
        )}
        <p className="text-white/35 text-[11px] mb-4">
          Del {fechaTexto(desde)} al {fechaTexto(hasta)}
        </p>

        {/* 1. ¿Cómo va el gimnasio? */}
        <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-4">
          <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">
                ¿Cómo va el gimnasio?
              </p>
              <span
                className={`flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2 py-0.5 ${EG.clase}`}
              >
                <IconoGeneral size={12} /> {EG.label}
              </span>
            </div>
            <p className="text-white text-lg leading-snug mt-2">
              {utilidad > 0
                ? `En ${nombrePeriodo} ganaste`
                : utilidad === 0
                ? `En ${nombrePeriodo} quedaste en cero`
                : `En ${nombrePeriodo} gastaste más de lo que entró. Perdiste:`}
            </p>
            <p
              className={`font-display text-5xl leading-none mt-1 tabular-nums ${
                utilidad > 0
                  ? 'text-green-300'
                  : utilidad < 0
                  ? 'text-red-300'
                  : 'text-white'
              }`}
            >
              {utilidad < 0 ? '−' : ''}
              {formatearPesos(Math.abs(utilidad))}
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <div
                onClick={() => navigate('/ingreso-detalle')}
                className="cursor-pointer"
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70 flex items-center gap-1">
                    Entró (pagos de alumnos){' '}
                    <ChevronRight size={12} className="text-white/30" />
                  </span>
                  <span className="text-white font-semibold tabular-nums">
                    {formatearPesos(ingresosPeriodo)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-cyan-brand rounded-full"
                    style={{ width: `${(ingresosPeriodo / maxBarra) * 100}%` }}
                  />
                </div>
              </div>
              <div
                onClick={() => navigate('/gastos')}
                className="cursor-pointer"
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70 flex items-center gap-1">
                    Salió (gastos){' '}
                    <ChevronRight size={12} className="text-white/30" />
                  </span>
                  <span className="text-white font-semibold tabular-nums">
                    {formatearPesos(totalGastos)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-red-400/80 rounded-full"
                    style={{ width: `${(totalGastos / maxBarra) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-white/45 text-[11px] mt-3">
              Ganancia = lo que entró menos lo que salió. Solo cuenta lo que
              está registrado en la app.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => navigate('/ingreso-detalle')}
                className="flex items-center justify-center gap-1 bg-cyan-brand text-ink text-xs font-semibold rounded-xl py-2.5"
              >
                Ver detalle de ingresos <ChevronRight size={14} />
              </button>
              <button
                onClick={() => navigate('/gastos')}
                className="flex items-center justify-center gap-1 bg-white/[0.07] border border-white/10 text-white text-xs font-semibold rounded-xl py-2.5"
              >
                Ver gastos <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Indicadores con semáforo */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/40 text-xs uppercase tracking-wide">
            Indicadores clave
          </p>
          <button
            onClick={() => setEditandoKpis((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 border ${
              editandoKpis
                ? 'bg-cyan-brand text-ink border-cyan-brand'
                : 'text-cyan-brand border-cyan-brand/30'
            }`}
          >
            {editandoKpis ? (
              <CheckCircle2 size={13} />
            ) : (
              <SlidersHorizontal size={13} />
            )}
            {editandoKpis ? 'Listo' : 'Elegir tarjetas'}
          </button>
        </div>
        {editandoKpis && (
          <p className="text-white/55 text-xs mb-2.5">
            Toca una tarjeta para esconderla o mostrarla. Se guarda para todos
            los administradores.
          </p>
        )}
        {!editandoKpis && kpisOcultos.length > 0 && (
          <p className="text-white/35 text-[11px] mb-2">
            {kpisOcultos.length} tarjeta{kpisOcultos.length !== 1 ? 's' : ''}{' '}
            escondida{kpisOcultos.length !== 1 ? 's' : ''} ·{' '}
            <button
              onClick={() => setEditandoKpis(true)}
              className="text-cyan-brand underline"
            >
              ver
            </button>
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-5">
          <Kpi
            {...propsKpi('gasto')}
            titulo="De cada $100 que entran, se gastan"
            valor={
              pctGasto === null
                ? '—'
                : pctGasto >= 999
                ? 'Todo'
                : `$${pctGasto}`
            }
            estado={estadoGasto}
            explicacion={
              pctGasto === null
                ? 'Aún no hay ingresos ni gastos en este período.'
                : pctGasto <= 70
                ? 'Bien: te queda margen. Lo ideal es gastar menos de $70 de cada $100.'
                : pctGasto <= 100
                ? 'Ojo: casi todo lo que entra se va en gastos.'
                : 'Los gastos son más que los ingresos. Revisa gastos o cobra lo pendiente.'
            }
            onClick={() => navigate('/gastos')}
          />
          <Kpi
            {...propsKpi('cobrar')}
            titulo="Dinero por cobrar"
            valor={formatearPesos(montoPorCobrar)}
            detalle={`${cobros.length} alumno${
              cobros.length !== 1 ? 's' : ''
            } con plan vencido, por vencer o sin pago`}
            estado={estadoCobro}
            explicacion={
              cobros.length === 0
                ? '¡Todos al día! No hay cobros pendientes.'
                : 'Es plata que deberías recibir pronto. Escríbeles desde "Por contactar".'
            }
            onClick={() => navigate('/renovaciones')}
          />
          <Kpi
            {...propsKpi('activos')}
            titulo="Alumnos activos"
            valor={activosHoy}
            detalle={
              difActivos === 0
                ? 'Igual que el mes pasado'
                : `${
                    difActivos > 0 ? '+' : ''
                  }${difActivos} vs. el mes pasado (${activosAntes})`
            }
            estado={estadoActivos}
            explicacion={
              difActivos > 0
                ? 'Estás creciendo: tienes más alumnos con plan vigente que el mes pasado.'
                : difActivos === 0
                ? 'Se mantiene la cantidad de alumnos con plan vigente.'
                : 'Tienes menos alumnos que el mes pasado. Revisa quién no renovó.'
            }
          />
          <Kpi
            {...propsKpi('asistencia')}
            titulo="Asistencia a clases"
            valor={pctAsistencia === null ? '—' : `${pctAsistencia}%`}
            detalle={
              pctAsistencia === null
                ? 'Aún sin asistencia marcada'
                : `${asistieron} de ${marcadas.length} reservas`
            }
            estado={estadoAsistencia}
            explicacion={
              pctAsistencia === null
                ? 'Se calcula cuando los coaches marcan la asistencia.'
                : `De cada 10 alumnos que reservan, llegan ${Math.round(
                    pctAsistencia / 10
                  )}. Lo ideal es 9 o más.`
            }
          />
          <Kpi
            {...propsKpi('ocupacion')}
            titulo="Ocupación de clases (esta semana)"
            valor={pctOcupacion === null ? '—' : `${pctOcupacion}%`}
            detalle={`${reservasSemana} reservas en ${ocupacionCupos} cupos`}
            estado={estadoOcupacion}
            explicacion={
              pctOcupacion === null
                ? 'No hay clases esta semana.'
                : pctOcupacion >= 70
                ? 'Tus clases están bien llenas.'
                : 'Hay cupos libres: buen momento para invitar alumnos nuevos o juntar horarios.'
            }
          />
          <Kpi
            {...propsKpi('por_alumno')}
            titulo="Ingreso por alumno activo"
            valor={
              promedioPorAlumno === null
                ? '—'
                : formatearPesos(promedioPorAlumno)
            }
            estado="info"
            explicacion={`En ${nombrePeriodo}, cada alumno activo dejó en promedio esto.`}
          />
        </div>

        {/* 3. Últimos 6 meses */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-white text-sm font-medium">
            Mes a mes: lo que entró y lo que salió
          </p>
          <div className="flex gap-3 text-[11px] text-white/50 mt-1 mb-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-brand" /> Entró
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400/80" /> Salió
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {ingresosPorMes.map((m) => {
              const res = m.entra - m.sale;
              return (
                <div
                  key={m.k}
                  className="grid grid-cols-[42px_1fr_auto] items-center gap-2"
                >
                  <span
                    className={`text-xs ${
                      m.k === mesHoy
                        ? 'text-white font-semibold'
                        : 'text-white/50'
                    }`}
                  >
                    {nombreMes(m.k, { corto: true, conAnio: false }).slice(
                      0,
                      3
                    )}
                  </span>
                  <div className="flex flex-col gap-[2px]">
                    <div
                      className="h-2 rounded-r bg-cyan-brand"
                      style={{
                        width: `${Math.max(
                          m.entra > 0 ? 2 : 0,
                          (m.entra / maxMes) * 100
                        )}%`,
                      }}
                    />
                    <div
                      className="h-2 rounded-r bg-red-400/80"
                      style={{
                        width: `${Math.max(
                          m.sale > 0 ? 2 : 0,
                          (m.sale / maxMes) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold tabular-nums w-[84px] text-right ${
                      res > 0
                        ? 'text-green-300'
                        : res < 0
                        ? 'text-red-300'
                        : 'text-white/40'
                    }`}
                  >
                    {res === 0 && m.entra === 0
                      ? '—'
                      : `${res < 0 ? '−' : '+'}${formatearPesos(
                          Math.abs(res)
                        )}`}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-white/40 text-[11px] mt-3">
            El número de la derecha es lo que ganaste (verde) o perdiste (rojo)
            cada mes.
          </p>
        </div>

        {/* 4. Alumnos y planes */}
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <p className="text-white text-sm font-medium">
              Alumnos activos por mes
            </p>
            <p className="text-white/40 text-[11px] mb-3">
              Alumnos con plan vigente. Toca una barra para ver el mes.
            </p>
            <GraficoBarrasMes
              datos={datosActivos}
              seleccionado={mesGrafico}
              onSeleccionar={setMesGrafico}
              formatear={(v) => `${v} alumno${v !== 1 ? 's' : ''}`}
              alto={130}
            />
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <p className="text-white text-sm font-medium">
              ¿Qué planes compran?
            </p>
            <p className="text-white/40 text-[11px] mb-3">
              {conPlan.length} alumno{conPlan.length !== 1 ? 's' : ''} activos
              repartidos en {distribucion.length} plan
              {distribucion.length !== 1 ? 'es' : ''}
            </p>
            <div className="max-h-[210px] overflow-y-auto pr-1">
              <BarrasHorizontales
                items={distribucion}
                formatear={(v) => `${v} alumno${v !== 1 ? 's' : ''}`}
                vacio="Aún no hay alumnos con plan."
              />
            </div>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-white text-sm font-medium">¿Cómo te pagan?</p>
          <p className="text-white/40 text-[11px] mb-4">
            Lo que entró en {nombrePeriodo}, separado por medio de pago
          </p>
          <GraficoDona
            items={porMedio}
            formatear={formatearPesos}
            vacio="Sin pagos en este período."
          />
        </div>

        {/* Próximas renovaciones */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-2 text-white text-sm font-medium">
              <CalendarClock size={16} className="text-cyan-brand" /> Próximas
              renovaciones
            </p>
            <span className="text-cyan-brand text-[11px] font-semibold bg-cyan-brand/10 border border-cyan-brand/25 rounded-full px-2 py-0.5">
              {estaSemana} esta semana
            </span>
          </div>

          {renovaciones.length === 0 ? (
            <p className="text-white/30 text-sm py-4">
              Nadie vence en los próximos 7 días.
            </p>
          ) : (
            <div>
              {renovacionesVisibles.map(({ u, v }) => {
                const etiqueta = etiquetaVence(v);
                const abierto = cobrandoId === u.id;
                return (
                  <div
                    key={u.id}
                    className="border-b border-white/[0.06] last:border-0"
                  >
                    <button
                      onClick={() => setCobrandoId(abierto ? null : u.id)}
                      className="w-full flex items-center gap-3 py-3 text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
                        <span className="text-cyan-brand text-xs font-semibold">
                          {iniciales(u.nombre)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm truncate">
                          {u.nombre}
                        </p>
                        <p className="text-white/35 text-[11px] truncate">
                          {planes[u.plan_id]?.nombre}
                          {v ? ` · vence ${fechaTexto(v.vence)}` : ''}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${etiqueta.clase}`}
                      >
                        {etiqueta.texto}
                      </span>
                      <ChevronRight
                        size={16}
                        className={`text-white/30 transition-transform ${
                          abierto ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    {abierto && (
                      <div className="pb-3">
                        <FormularioPago
                          usuarioFijo={u}
                          soloRenovacion
                          onCancelar={() => setCobrandoId(null)}
                          onListo={() => setCobrandoId(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {renovaciones.length > 6 && (
                <button
                  onClick={() => setVerTodasRenov(!verTodasRenov)}
                  className="w-full flex items-center justify-center gap-1 text-cyan-brand text-xs font-medium pt-3"
                >
                  {verTodasRenov ? (
                    <>
                      Ver menos <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      Ver las {renovaciones.length} <ChevronDown size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
