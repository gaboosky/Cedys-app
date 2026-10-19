import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Trophy,
  Receipt,
  Target,
} from 'lucide-react';
import FormularioPago from '../../components/FormularioPago';
import GraficoDona from '../../components/GraficoDona';
import BarrasHorizontales from '../../components/BarrasHorizontales';
import {
  MEDIOS_PAGO,
  TIPOS_PAGO,
  etiquetaMedio,
  mesDe,
  mesActualKey,
  sumarMeses,
  ultimosMeses,
  nombreMes,
  formatearPesos,
  totalDe,
  totalesPorMes,
  pendientesDeCobro,
  COLOR_MEDIO,
  hoyLocalISO,
} from '../../lib/ingresos';

// Pesos abreviados para ejes y etiquetas chicas: $1,2M · $350 mil
function pesosCorto(v) {
  const n = Number(v) || 0;
  if (n >= 1000000)
    return `$${(n / 1000000)
      .toFixed(n >= 10000000 ? 0 : 1)
      .replace('.', ',')}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)} mil`;
  return `$${n}`;
}

// Barras por mes con línea de promedio. Tocar una barra elige ese mes.
function GraficoMeses({ datos, seleccionado, onSeleccionar, promedio }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...datos.map((d) => d.valor), promedio || 0);
  const activo = datos.find((d) => d.key === (hover ?? seleccionado));
  const alto = 150;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 min-h-[22px]">
        <span className="text-white/50 text-xs">{activo?.largo}</span>
        <span className="text-white text-sm font-semibold tabular-nums">
          {activo ? formatearPesos(activo.valor) : ''}
        </span>
      </div>
      <div className="relative" style={{ height: alto }}>
        {/* Línea de promedio (encima de las barras) */}
        {promedio > 0 && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-10"
            style={{ bottom: `${(promedio / max) * 100}%` }}
          >
            <div className="border-t border-dashed border-white/35" />
            <span
              className={`absolute left-0 text-[10px] text-white/70 bg-ink/85 px-1 rounded ${
                promedio / max > 0.8 ? 'top-1' : '-top-4'
              }`}
            >
              promedio {pesosCorto(promedio)}
            </span>
          </div>
        )}
        <div className="absolute left-0 right-0 bottom-0 h-px bg-white/15" />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {datos.map((d) => {
            const es = d.key === (hover ?? seleccionado);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => {
                  setHover(null);
                  onSeleccionar(d.key);
                }}
                onPointerEnter={(e) =>
                  e.pointerType === 'mouse' && setHover(d.key)
                }
                onPointerLeave={() => setHover(null)}
                aria-label={`${d.largo}: ${formatearPesos(d.valor)}`}
                className="flex-1 h-full flex items-end justify-center"
              >
                <div
                  className={`w-full max-w-[26px] rounded-t-[4px] transition-colors ${
                    es ? 'bg-cyan-brand' : 'bg-cyan-brand/35'
                  }`}
                  style={{
                    height:
                      d.valor > 0
                        ? `max(${(d.valor / max) * 100}%, 3px)`
                        : '0px',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-[2px] mt-1.5">
        {datos.map((d) => (
          <span
            key={d.key}
            className={`flex-1 text-center text-[10px] ${
              d.key === seleccionado
                ? 'text-white font-semibold'
                : 'text-white/40'
            }`}
          >
            {d.corto}
          </span>
        ))}
      </div>
    </div>
  );
}

// Ingresos acumulados día a día: mes elegido vs. mes anterior (¿voy mejor o peor?)
function GraficoAcumulado({
  actual,
  anterior,
  diasMes,
  hastaDia,
  etiquetaActual,
  etiquetaAnterior,
}) {
  const [dia, setDia] = useState(null);
  const W = 320;
  const H = 150;
  const pad = { l: 6, r: 6, t: 10, b: 18 };
  const max = Math.max(
    1,
    actual[actual.length - 1] || 0,
    anterior[anterior.length - 1] || 0
  );
  const x = (d) =>
    pad.l + ((d - 1) / Math.max(1, diasMes - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const linea = (serie, hasta) =>
    serie
      .slice(0, hasta)
      .map(
        (v, i) =>
          `${i === 0 ? 'M' : 'L'}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`
      )
      .join(' ');
  const diaActivo = dia ?? hastaDia;
  const vAct = actual[Math.min(diaActivo, hastaDia) - 1] ?? 0;
  const vAnt = anterior[Math.min(diaActivo, anterior.length) - 1] ?? 0;

  function mover(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const d =
      Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (diasMes - 1)) + 1;
    setDia(Math.max(1, Math.min(diasMes, d)));
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-2 min-h-[34px]">
        <span className="text-white/50">Al día {diaActivo}</span>
        <span className="text-right">
          <span className="block text-white font-semibold tabular-nums">
            {diaActivo <= hastaDia ? formatearPesos(vAct) : '—'}{' '}
            <span className="text-white/45 font-normal">{etiquetaActual}</span>
          </span>
          <span className="block text-white/55 tabular-nums">
            {formatearPesos(vAnt)}{' '}
            <span className="text-white/40">{etiquetaAnterior}</span>
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none select-none"
        onPointerMove={mover}
        onPointerDown={mover}
        onPointerLeave={() => setDia(null)}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={pad.l}
            x2={W - pad.r}
            y1={pad.t + f * (H - pad.t - pad.b)}
            y2={pad.t + f * (H - pad.t - pad.b)}
            stroke="rgba(255,255,255,0.06)"
          />
        ))}
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={H - pad.b}
          y2={H - pad.b}
          stroke="rgba(255,255,255,0.15)"
        />
        <path
          d={linea(anterior, anterior.length)}
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
        <path
          d={linea(actual, hastaDia)}
          fill="none"
          stroke="#00c8e6"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hastaDia > 0 && (
          <circle
            cx={x(hastaDia)}
            cy={y(actual[hastaDia - 1] || 0)}
            r="4"
            fill="#00c8e6"
            stroke="#0a0a0a"
            strokeWidth="2"
          />
        )}
        {dia && (
          <line
            x1={x(dia)}
            x2={x(dia)}
            y1={pad.t}
            y2={H - pad.b}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
          />
        )}
        {[1, 10, 20, diasMes].map((d) => (
          <text
            key={d}
            x={x(d)}
            y={H - 4}
            fill="rgba(255,255,255,0.4)"
            fontSize="9"
            textAnchor={d === 1 ? 'start' : d === diasMes ? 'end' : 'middle'}
          >
            {d}
          </text>
        ))}
      </svg>
      <div className="flex gap-4 text-[11px] text-white/60 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-[3px] rounded bg-cyan-brand" />{' '}
          {etiquetaActual}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-white/45" />{' '}
          {etiquetaAnterior}
        </span>
      </div>
    </div>
  );
}

function fechaCorta(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });
}

export default function IngresoDetalle() {
  const navigate = useNavigate();
  const {
    usuarios,
    planes,
    pagos,
    diasRenovacion,
    actualizarPago,
    eliminarPago,
  } = useAuth();

  const mesHoy = mesActualKey();
  const mesInicial = new URLSearchParams(window.location.search).get('mes');
  const [mes, setMes] = useState(
    mesInicial && /^\d{4}-\d{2}$/.test(mesInicial) && mesInicial <= mesHoy
      ? mesInicial
      : mesHoy
  );
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [cobrandoId, setCobrandoId] = useState(null);
  const [verPendientes, setVerPendientes] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formEdicion, setFormEdicion] = useState({
    monto: '',
    medio: 'transferencia',
    fecha: '',
  });
  const [borrandoId, setBorrandoId] = useState(null);

  const totales = useMemo(() => totalesPorMes(pagos), [pagos]);
  const pagosMes = pagos
    .filter((p) => mesDe(p.fecha) === mes)
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        (b.creado_en || '').localeCompare(a.creado_en || '')
    );
  const totalMes = totalDe(pagosMes);
  const mesAnterior = sumarMeses(mes, -1);
  const totalAnterior = totales[mesAnterior] || 0;
  const diferencia = totalMes - totalAnterior;
  const variacionPct =
    totalAnterior > 0 ? Math.round((diferencia / totalAnterior) * 100) : null;

  const esMesActual = mes === mesHoy;
  const pendientes = esMesActual
    ? pendientesDeCobro(usuarios, planes, diasRenovacion)
    : [];
  const porCobrar = pendientes.reduce((acc, p) => acc + p.monto, 0);

  // --- Gráficos ---
  const [cantidadMeses, setCantidadMeses] = useState(6);
  const mesesGrafico = ultimosMeses(cantidadMeses, mesHoy);
  const datosMeses = mesesGrafico.map((k) => ({
    key: k,
    corto: nombreMes(k, { corto: true, conAnio: false }).slice(0, 3),
    largo: nombreMes(k),
    valor: totales[k] || 0,
  }));
  const conPagos = mesesGrafico.filter((k) => (totales[k] || 0) > 0);
  const promedioMensual =
    conPagos.length > 0
      ? conPagos.reduce((a, k) => a + totales[k], 0) / conPagos.length
      : 0;
  const mejorMes = mesesGrafico.reduce(
    (m, k) => ((totales[k] || 0) > (totales[m] || 0) ? k : m),
    mesesGrafico[0]
  );

  const diasEn = (k) => {
    const [a, m] = k.split('-').map(Number);
    return new Date(a, m, 0).getDate();
  };
  const acumular = (k, n) => {
    const porDia = Array(n).fill(0);
    for (const p of pagos)
      if (mesDe(p.fecha) === k)
        porDia[Number(p.fecha.slice(8, 10)) - 1] += Number(p.monto) || 0;
    let acc = 0;
    return porDia.map((v) => (acc += v));
  };
  const diasMesSel = diasEn(mes);
  const serieActual = acumular(mes, diasMesSel);
  const serieAnterior = acumular(mesAnterior, diasEn(mesAnterior));
  const hastaDia = esMesActual
    ? Number(hoyLocalISO().slice(8, 10))
    : diasMesSel;
  const anteriorMismoDia =
    serieAnterior[Math.min(hastaDia, serieAnterior.length) - 1] || 0;
  const difMismoDia = totalMes - anteriorMismoDia;

  const porMedio = MEDIOS_PAGO.map((m) => {
    const del = pagosMes.filter(
      (p) => (p.medio || 'transferencia') === m.valor
    );
    return {
      key: m.valor,
      etiqueta: m.label,
      valor: totalDe(del),
      color: COLOR_MEDIO[m.valor],
      detalle: `${del.length} pago${del.length !== 1 ? 's' : ''}`,
    };
  }).filter((i) => i.valor > 0);
  const porPlan = Object.values(
    pagosMes.reduce((acc, p) => {
      const key = p.plan_id || 'sin-plan';
      const etiqueta = p.plan_id
        ? planes[p.plan_id]?.nombre || 'Plan eliminado'
        : 'Pago suelto';
      if (!acc[key]) acc[key] = { key, etiqueta, valor: 0, n: 0 };
      acc[key].valor += Number(p.monto) || 0;
      acc[key].n += 1;
      return acc;
    }, {})
  )
    .map((i) => ({ ...i, detalle: `${i.n} pago${i.n !== 1 ? 's' : ''}` }))
    .sort((a, b) => b.valor - a.valor);
  const promedioPago = pagosMes.length > 0 ? totalMes / pagosMes.length : 0;
  const nombreMesSel = nombreMes(mes, { conAnio: false }).toLowerCase();
  const nombreMesAnt = nombreMes(mesAnterior, { conAnio: false }).toLowerCase();

  function abrirEdicion(p) {
    setEditandoId(p.id);
    setBorrandoId(null);
    setFormEdicion({
      monto: String(p.monto),
      medio: p.medio || 'transferencia',
      fecha: p.fecha,
    });
  }

  async function guardarEdicion(pagoId) {
    const resultado = await actualizarPago(pagoId, formEdicion);
    if (!resultado.ok) return alert(resultado.mensaje);
    setEditandoId(null);
  }

  async function confirmarBorrado(pagoId) {
    const resultado = await eliminarPago(pagoId);
    if (!resultado.ok) alert(resultado.mensaje);
    setBorrandoId(null);
  }

  const nombreDe = (id) =>
    usuarios.find((u) => u.id === id)?.nombre || 'Alumno eliminado';

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-white/50 text-sm mb-3"
      >
        <ArrowLeft size={16} /> Volver
      </button>
      <p className="font-display text-3xl text-white leading-tight">Ingresos</p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        Lo que pagan los alumnos, mes a mes
      </p>

      {/* Selector de mes */}
      <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-2 py-1.5 mb-4">
        <button
          onClick={() => setMes(sumarMeses(mes, -1))}
          className="p-2 text-white/60"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-white font-semibold">{nombreMes(mes)}</p>
        <button
          onClick={() => setMes(sumarMeses(mes, 1))}
          disabled={mes >= mesHoy}
          className="p-2 text-white/60 disabled:opacity-20"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Total del mes, en palabras */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-4">
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-white/70 text-sm">
            {esMesActual
              ? 'Este mes llevas recibido'
              : `En ${nombreMesSel} recibiste`}
          </p>
          <p className="font-display text-white text-5xl leading-none mt-1.5 tabular-nums">
            {formatearPesos(totalMes)}
          </p>
          <p className="text-white/45 text-xs mt-1.5">
            {pagosMes.length} pago{pagosMes.length !== 1 ? 's' : ''}
            {pagosMes.length > 0
              ? ` · promedio ${formatearPesos(promedioPago)} por pago`
              : ''}
          </p>

          {(totalAnterior > 0 || totalMes > 0) && (
            <p
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 mt-3 ${
                (esMesActual ? difMismoDia : diferencia) > 0
                  ? 'bg-green-400/15 text-green-300'
                  : (esMesActual ? difMismoDia : diferencia) < 0
                  ? 'bg-yellow-400/15 text-yellow-200'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              {(esMesActual ? difMismoDia : diferencia) > 0 ? (
                <TrendingUp size={13} />
              ) : (esMesActual ? difMismoDia : diferencia) < 0 ? (
                <TrendingDown size={13} />
              ) : (
                <Minus size={13} />
              )}
              {esMesActual
                ? difMismoDia === 0
                  ? `Igual que ${nombreMesAnt} a esta fecha`
                  : `${formatearPesos(Math.abs(difMismoDia))} ${
                      difMismoDia > 0 ? 'más' : 'menos'
                    } que ${nombreMesAnt} a esta fecha`
                : diferencia === 0
                ? `Igual que ${nombreMesAnt}`
                : `${formatearPesos(Math.abs(diferencia))} ${
                    diferencia > 0 ? 'más' : 'menos'
                  } que ${nombreMesAnt}${
                    variacionPct !== null
                      ? ` (${diferencia > 0 ? '+' : ''}${variacionPct}%)`
                      : ''
                  }`}
            </p>
          )}

          {esMesActual && totalMes + porCobrar > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-cyan-brand">
                  Cobrado {formatearPesos(totalMes)}
                </span>
                <span className="text-white/50">
                  Por cobrar {formatearPesos(porCobrar)}
                </span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px] bg-white/5">
                <div
                  className="bg-cyan-brand rounded-l-full"
                  style={{
                    width: `${(totalMes / (totalMes + porCobrar)) * 100}%`,
                  }}
                />
                <div className="bg-white/15 flex-1 rounded-r-full" />
              </div>
              <p className="text-white/45 text-[11px] mt-1.5">
                Si todos pagan, el mes cerraría en{' '}
                <span className="text-white font-semibold">
                  {formatearPesos(totalMes + porCobrar)}
                </span>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico 1: mes a mes */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <p className="text-white text-sm font-medium">Ingresos por mes</p>
            <p className="text-white/40 text-[11px]">
              Toca una barra para ver ese mes. La línea es tu promedio.
            </p>
          </div>
          <div className="flex bg-black/20 border border-white/10 rounded-lg p-0.5 shrink-0">
            {[6, 12].map((n) => (
              <button
                key={n}
                onClick={() => setCantidadMeses(n)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                  cantidadMeses === n
                    ? 'bg-cyan-brand text-ink'
                    : 'text-white/50'
                }`}
              >
                {n} meses
              </button>
            ))}
          </div>
        </div>
        <GraficoMeses
          datos={datosMeses}
          seleccionado={mes}
          onSeleccionar={setMes}
          promedio={promedioMensual}
        />
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-black/20 rounded-xl px-3 py-2">
            <p className="text-white/40 text-[10px] flex items-center gap-1">
              <Target size={11} /> Promedio mensual
            </p>
            <p className="text-white text-sm font-semibold tabular-nums">
              {formatearPesos(promedioMensual)}
            </p>
          </div>
          <div className="bg-black/20 rounded-xl px-3 py-2">
            <p className="text-white/40 text-[10px] flex items-center gap-1">
              <Trophy size={11} className="text-yellow-300" /> Mejor mes
            </p>
            <p className="text-white text-sm font-semibold tabular-nums">
              {(totales[mejorMes] || 0) > 0
                ? `${formatearPesos(totales[mejorMes])} · ${nombreMes(
                    mejorMes,
                    { corto: true, conAnio: false }
                  )}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico 2: acumulado día a día */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-3">
        <p className="text-white text-sm font-medium">
          ¿Vas mejor o peor que el mes pasado?
        </p>
        <p className="text-white/40 text-[11px] mb-2">
          Plata acumulada día a día. Si la línea celeste va por arriba, vas
          mejor. Desliza el dedo para ver cada día.
        </p>
        <GraficoAcumulado
          actual={serieActual}
          anterior={serieAnterior}
          diasMes={diasMesSel}
          hastaDia={hastaDia}
          etiquetaActual={nombreMes(mes, { conAnio: false })}
          etiquetaAnterior={nombreMes(mesAnterior, { conAnio: false })}
        />
      </div>

      {/* Gráficos 3 y 4: cómo pagan y qué planes */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <p className="text-white text-sm font-medium">¿Cómo te pagaron?</p>
          <p className="text-white/40 text-[11px] mb-4">
            Por medio de pago, en {nombreMesSel}
          </p>
          <GraficoDona
            items={porMedio}
            formatear={formatearPesos}
            vacio="Sin pagos este mes."
          />
        </div>
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <p className="text-white text-sm font-medium">¿Qué planes pagaron?</p>
          <p className="text-white/40 text-[11px] mb-3">
            Cuánto entró por cada plan en {nombreMesSel}
          </p>
          <BarrasHorizontales
            items={porPlan}
            formatear={formatearPesos}
            vacio="Sin pagos este mes."
          />
        </div>
      </div>

      {/* Proyección: solo para el mes en curso */}
      {esMesActual && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white text-sm font-medium flex items-center gap-1.5">
                <Receipt size={14} className="text-yellow-200" /> Por cobrar
                este mes
              </p>
              <p className="text-white text-xl font-display mt-1">
                {formatearPesos(porCobrar)}
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                Planes vencidos, por vencer o sin pago
              </p>
            </div>
            {pendientes.length > 0 && (
              <button
                onClick={() => setVerPendientes(!verPendientes)}
                className="flex items-center gap-1 text-yellow-200 text-xs bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-2.5 py-1.5 shrink-0"
              >
                {pendientes.length} por cobrar
                {verPendientes ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
            )}
          </div>

          {verPendientes && (
            <div className="flex flex-col gap-1.5 mt-3">
              {pendientes.map(({ usuario, monto }) => (
                <div key={usuario.id}>
                  <div className="flex items-center justify-between bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">
                        {usuario.nombre}
                      </p>
                      <p className="text-white/35 text-[11px]">
                        {planes[usuario.plan_id]?.nombre} ·{' '}
                        {usuario.fecha_ultima_renovacion
                          ? `último pago ${fechaCorta(
                              usuario.fecha_ultima_renovacion
                            )}`
                          : 'sin pagos'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white/70 text-xs tabular-nums">
                        {formatearPesos(monto)}
                      </span>
                      <button
                        onClick={() =>
                          setCobrandoId(
                            cobrandoId === usuario.id ? null : usuario.id
                          )
                        }
                        className="bg-cyan-brand text-ink text-[11px] font-semibold px-2 py-1 rounded-md"
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                  {cobrandoId === usuario.id && (
                    <div className="mt-1.5">
                      <FormularioPago
                        usuarioFijo={usuario}
                        soloRenovacion
                        onCancelar={() => setCobrandoId(null)}
                        onListo={() => setCobrandoId(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de pagos del mes */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/40 text-xs uppercase tracking-wide">
          Pagos de {nombreMes(mes, { conAnio: false }).toLowerCase()}
        </p>
        <button
          onClick={() => setMostrarNuevo(!mostrarNuevo)}
          className="flex items-center gap-1 bg-cyan-brand text-ink text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-transform active:scale-95"
        >
          <Plus size={14} /> Registrar pago
        </button>
      </div>

      {mostrarNuevo && (
        <div className="mb-3">
          <FormularioPago
            onCancelar={() => setMostrarNuevo(false)}
            onListo={() => setMostrarNuevo(false)}
          />
        </div>
      )}

      {pagosMes.length === 0 ? (
        <p className="text-white/30 text-sm py-6 text-center">
          No hay pagos registrados en este mes.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {pagosMes.map((p) => {
            const editando = editandoId === p.id;
            const borrando = borrandoId === p.id;
            return (
              <div
                key={p.id}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {nombreDe(p.usuario_id)}
                    </p>
                    <p className="text-white/40 text-xs">
                      {fechaCorta(p.fecha)} · {etiquetaMedio(p.medio)} ·{' '}
                      {TIPOS_PAGO[p.tipo] || 'Pago'}
                      {p.plan_id && planes[p.plan_id]
                        ? ` · ${planes[p.plan_id].nombre}`
                        : ''}
                    </p>
                    {p.nota && (
                      <p className="text-white/30 text-[11px] mt-0.5">
                        {p.nota}
                      </p>
                    )}
                  </div>
                  {!editando && !borrando && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-white font-display text-lg mr-1 tabular-nums">
                        {formatearPesos(p.monto)}
                      </span>
                      <button
                        onClick={() => abrirEdicion(p)}
                        className="text-cyan-brand/70 p-1.5 hover:text-cyan-brand"
                        aria-label="Editar pago"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setBorrandoId(p.id);
                          setEditandoId(null);
                        }}
                        className="text-red-400/60 p-1.5 hover:text-red-400"
                        aria-label="Borrar pago"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {editando && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formEdicion.monto}
                        onChange={(e) =>
                          setFormEdicion({
                            ...formEdicion,
                            monto: e.target.value,
                          })
                        }
                        className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-cyan-brand"
                      />
                      <input
                        type="date"
                        value={formEdicion.fecha}
                        onChange={(e) =>
                          setFormEdicion({
                            ...formEdicion,
                            fecha: e.target.value,
                          })
                        }
                        className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-cyan-brand"
                      />
                    </div>
                    <div className="flex bg-black/20 border border-white/10 rounded-lg p-1">
                      {MEDIOS_PAGO.map((m) => (
                        <button
                          key={m.valor}
                          type="button"
                          onClick={() =>
                            setFormEdicion({ ...formEdicion, medio: m.valor })
                          }
                          className={`flex-1 py-1 rounded-md text-[11px] font-medium ${
                            formEdicion.medio === m.valor
                              ? 'bg-cyan-brand text-ink'
                              : 'text-white/50'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => guardarEdicion(p.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-cyan-brand text-ink font-semibold rounded-lg py-1.5 text-xs"
                      >
                        <Check size={14} /> Guardar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white rounded-lg py-1.5 text-xs"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {borrando && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                    <p className="text-red-200 text-xs mb-2">
                      ¿Borrar este pago de {formatearPesos(p.monto)}?
                      {p.tipo !== 'manual' &&
                        ' El alumno volverá a quedar con el pago pendiente.'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmarBorrado(p.id)}
                        className="flex-1 bg-red-500/80 text-white font-semibold rounded-md py-1.5 text-xs"
                      >
                        Sí, borrar
                      </button>
                      <button
                        onClick={() => setBorrandoId(null)}
                        className="flex-1 bg-white/10 text-white rounded-md py-1.5 text-xs"
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
