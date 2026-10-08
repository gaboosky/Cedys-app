import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, CalendarDays, TrendingUp, UserX, CalendarClock, ChevronRight, ChevronDown, ChevronUp, Receipt, PiggyBank } from 'lucide-react';
import GraficoBarrasMes from '../../components/GraficoBarrasMes';
import BarrasHorizontales from '../../components/BarrasHorizontales';
import GraficoDona from '../../components/GraficoDona';
import FormularioPago from '../../components/FormularioPago';
import {
  MEDIOS_PAGO, COLOR_MEDIO, hoyLocalISO, mesActualKey, sumarMeses, ultimosMeses, nombreMes,
  formatearPesos, totalDe, sumarDias, vencimientoDe, alumnosActivosPorMes,
} from '../../lib/ingresos';

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function ultimoDiaDelMes(mesKey) {
  const [anio, mes] = mesKey.split('-').map(Number);
  return `${mesKey}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`;
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
  { valor: 'hoy', label: 'Hoy' },
  { valor: '7', label: '7 días' },
  { valor: '30', label: '30 días' },
  { valor: 'mes', label: 'Este mes' },
  { valor: 'mes-anterior', label: 'Mes anterior' },
];

function iniciales(nombre) {
  const p = (nombre || '?').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase();
}

function Indicador({ icono: Icono, etiqueta, valor, detalle, destacado, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 border ${
        destacado ? 'bg-cyan-brand/[0.07] border-cyan-brand/40' : 'bg-white/[0.04] border-white/10'
      } ${onClick ? 'cursor-pointer transition-transform active:scale-[0.98] hover:border-cyan-brand/50' : ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-brand/15 flex items-center justify-center">
          <Icono size={15} className="text-cyan-brand" />
        </div>
        <p className="text-white/50 text-xs leading-tight">{etiqueta}</p>
      </div>
      <p className="text-white font-display text-2xl leading-none tabular-nums">{valor}</p>
      <p className="text-white/35 text-[11px] mt-1.5">{detalle}</p>
    </div>
  );
}

export default function Finanzas() {
  const navigate = useNavigate();
  const { usuarios, planes, pagos, reservas, horarios, horarioEstaCancelado, diasRenovacion, gastos } = useAuth();

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
  const pagosPeriodo = pagos.filter((p) => p.fecha >= desde && p.fecha <= hasta);
  const ingresosPeriodo = totalDe(pagosPeriodo);
  const gastosPeriodo = (gastos || []).filter((g) => g.fecha >= desde && g.fecha <= hasta);
  const totalGastos = gastosPeriodo.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  const utilidad = ingresosPeriodo - totalGastos;

  // --- Reservas de la semana (lunes a domingo) ---
  const hoyFecha = new Date(hoy + 'T00:00:00');
  const lunes = sumarDias(hoy, -((hoyFecha.getDay() + 6) % 7));
  const domingo = sumarDias(lunes, 6);
  const reservasSemana = reservas.filter((r) => r.fecha >= lunes && r.fecha <= domingo).length;
  let clasesSemana = 0;
  for (let i = 0; i < 7; i++) {
    const fecha = sumarDias(lunes, i);
    const diaNombre = NOMBRES_DIA[new Date(fecha + 'T00:00:00').getDay()];
    for (const h of horarios) {
      const aplica = h.fecha_unica ? h.fecha_unica === fecha : h.dia === diaNombre;
      if (aplica && !horarioEstaCancelado(h.id, fecha)) clasesSemana++;
    }
  }

  // --- Asistencia y no-show del período (solo clases ya pasadas y marcadas por el coach) ---
  const marcadas = reservas.filter(
    (r) => r.fecha >= desde && r.fecha <= hasta && r.fecha <= hoy && (r.asistio === true || r.asistio === false)
  );
  const asistieron = marcadas.filter((r) => r.asistio === true).length;
  const pctAsistencia = marcadas.length > 0 ? Math.round((asistieron / marcadas.length) * 100) : null;
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
  const conPlan = usuarios.filter((u) => u.estado === 'activo' && u.plan_id && planes[u.plan_id]);
  const distribucion = Object.values(
    conPlan.reduce((acc, u) => {
      const p = planes[u.plan_id];
      if (!acc[p.id]) acc[p.id] = { key: p.id, etiqueta: p.nombre, valor: 0 };
      acc[p.id].valor += 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b.valor - a.valor);

  // --- Medios de pago del período ---
  const porMedio = MEDIOS_PAGO.map((m) => {
    const delMedio = pagosPeriodo.filter((p) => (p.medio || 'transferencia') === m.valor);
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
  const renovacionesVisibles = verTodasRenov ? renovaciones : renovaciones.slice(0, 6);

  function etiquetaVence(v) {
    if (!v) return { texto: 'Sin pago', clase: 'bg-red-500/10 text-red-300 border-red-500/30' };
    if (v.dias < 0) {
      const n = Math.abs(v.dias);
      return { texto: `Venció hace ${n} día${n !== 1 ? 's' : ''}`, clase: 'bg-red-500/10 text-red-300 border-red-500/30' };
    }
    if (v.dias === 0) return { texto: 'Hoy', clase: 'bg-orange-400/10 text-orange-300 border-orange-400/30' };
    return {
      texto: `En ${v.dias} día${v.dias !== 1 ? 's' : ''}`,
      clase: 'bg-yellow-400/10 text-yellow-200 border-yellow-400/30',
    };
  }

  const fechaTexto = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-ink pb-24 px-4 md:px-8 pt-5">
      <div className="max-w-6xl mx-auto">
        {/* Pestañas */}
        <div className="flex gap-5 border-b border-white/10 mb-4">
          <button className="text-cyan-brand text-sm font-medium pb-2.5 border-b-2 border-cyan-brand -mb-px">
            Resumen financiero
          </button>
          <button onClick={() => navigate('/ingreso-detalle')} className="text-white/50 text-sm pb-2.5 hover:text-white">
            Pagos y cobros
          </button>
        </div>

        {/* Período */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4 flex flex-col md:flex-row md:items-end gap-3">
          <div>
            <p className="text-white/40 text-xs mb-1.5">Período</p>
            <div className="flex flex-wrap gap-1 bg-black/20 border border-white/10 rounded-lg p-1">
              {ATAJOS.map((a) => (
                <button
                  key={a.valor}
                  onClick={() => elegirAtajo(a.valor)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    atajo === a.valor ? 'bg-cyan-brand text-ink' : 'text-white/55'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 md:w-40">
              <p className="text-white/40 text-xs mb-1.5">Desde</p>
              <input
                type="date"
                value={desde}
                max={hasta}
                onChange={(e) => cambiarFecha('desde', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none focus:border-cyan-brand"
              />
            </div>
            <div className="flex-1 md:w-40">
              <p className="text-white/40 text-xs mb-1.5">Hasta</p>
              <input
                type="date"
                value={hasta}
                min={desde}
                onChange={(e) => cambiarFecha('hasta', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none focus:border-cyan-brand"
              />
            </div>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Indicador
            icono={DollarSign}
            etiqueta="Ingresos del período"
            valor={formatearPesos(ingresosPeriodo)}
            detalle={`${pagosPeriodo.length} pago${pagosPeriodo.length !== 1 ? 's' : ''} · ver detalle`}
            destacado
            onClick={() => navigate('/ingreso-detalle')}
          />
          <Indicador
            icono={CalendarDays}
            etiqueta="Reservas de la semana"
            valor={reservasSemana}
            detalle={`en ${clasesSemana} clase${clasesSemana !== 1 ? 's' : ''} programada${clasesSemana !== 1 ? 's' : ''}`}
          />
          <Indicador
            icono={TrendingUp}
            etiqueta="% de asistencia"
            valor={pctAsistencia === null ? '—' : `${pctAsistencia}%`}
            detalle={pctAsistencia === null ? 'Aún sin asistencia marcada' : `${asistieron} de ${marcadas.length} reservas marcadas`}
          />
          <Indicador
            icono={UserX}
            etiqueta="% no-show"
            valor={pctNoShow === null ? '—' : `${pctNoShow}%`}
            detalle={pctNoShow === null ? 'Aún sin asistencia marcada' : `${marcadas.length - asistieron} no llegaron`}
          />
        </div>

        {/* Gastos y utilidad */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Indicador
            icono={Receipt}
            etiqueta="Gastos del período"
            valor={formatearPesos(totalGastos)}
            detalle={`${gastosPeriodo.length} gasto${gastosPeriodo.length !== 1 ? 's' : ''} · ver y registrar`}
            onClick={() => navigate('/gastos')}
          />
          <Indicador
            icono={PiggyBank}
            etiqueta="Utilidad (ingresos − gastos)"
            valor={formatearPesos(utilidad)}
            detalle={utilidad >= 0 ? 'Resultado positivo' : 'Los gastos superan los ingresos'}
            destacado={utilidad >= 0}
          />
        </div>

        {/* Gráficos */}
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white text-sm font-medium">Alumnos activos por mes</p>
                <p className="text-white/35 text-[11px]">Últimos 6 meses · con plan vigente</p>
              </div>
              <span className="text-cyan-brand text-[11px] font-semibold bg-cyan-brand/10 border border-cyan-brand/25 rounded-full px-2 py-0.5">
                {activosMes[mesHoy] || 0} activos
              </span>
            </div>
            <GraficoBarrasMes
              datos={datosActivos}
              seleccionado={mesGrafico}
              onSeleccionar={setMesGrafico}
              formatear={(v) => `${v} alumno${v !== 1 ? 's' : ''}`}
              alto={150}
            />
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <div className="mb-3">
              <p className="text-white text-sm font-medium">Distribución por plan</p>
              <p className="text-white/35 text-[11px]">
                {conPlan.length} alumno{conPlan.length !== 1 ? 's' : ''} en {distribucion.length} plan
                {distribucion.length !== 1 ? 'es' : ''}
              </p>
            </div>
            <div className="max-h-[210px] overflow-y-auto pr-1">
              <BarrasHorizontales items={distribucion} formatear={(v) => `${v} alumno${v !== 1 ? 's' : ''}`} vacio="Aún no hay alumnos con plan." />
            </div>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-white text-sm font-medium">Medios de pago</p>
          <p className="text-white/35 text-[11px] mb-4">Ingresos del período por medio de pago</p>
          <GraficoDona items={porMedio} formatear={formatearPesos} vacio="Sin pagos en este período." />
        </div>

        {/* Próximas renovaciones */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-2 text-white text-sm font-medium">
              <CalendarClock size={16} className="text-cyan-brand" /> Próximas renovaciones
            </p>
            <span className="text-cyan-brand text-[11px] font-semibold bg-cyan-brand/10 border border-cyan-brand/25 rounded-full px-2 py-0.5">
              {estaSemana} esta semana
            </span>
          </div>

          {renovaciones.length === 0 ? (
            <p className="text-white/30 text-sm py-4">Nadie vence en los próximos 7 días.</p>
          ) : (
            <div>
              {renovacionesVisibles.map(({ u, v }) => {
                const etiqueta = etiquetaVence(v);
                const abierto = cobrandoId === u.id;
                return (
                  <div key={u.id} className="border-b border-white/[0.06] last:border-0">
                    <button
                      onClick={() => setCobrandoId(abierto ? null : u.id)}
                      className="w-full flex items-center gap-3 py-3 text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
                        <span className="text-cyan-brand text-xs font-semibold">{iniciales(u.nombre)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm truncate">{u.nombre}</p>
                        <p className="text-white/35 text-[11px] truncate">
                          {planes[u.plan_id]?.nombre}
                          {v ? ` · vence ${fechaTexto(v.vence)}` : ''}
                        </p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${etiqueta.clase}`}>
                        {etiqueta.texto}
                      </span>
                      <ChevronRight size={16} className={`text-white/30 transition-transform ${abierto ? 'rotate-90' : ''}`} />
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
                    <>Ver menos <ChevronUp size={14} /></>
                  ) : (
                    <>Ver las {renovaciones.length} <ChevronDown size={14} /></>
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
