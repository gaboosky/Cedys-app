import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { esCancelacionTardia, horaAFecha } from '../lib/horarioUtils';
import {
  Calendar,
  X,
  AlertTriangle,
  Check,
  User,
  CalendarCheck,
  CalendarPlus,
  XCircle,
  HelpCircle,
  Plus,
  Clock,
  Trophy,
} from 'lucide-react';
import { descargarIcs, eventoDeReserva } from '../lib/calendario';
import EvaluarClase, { EvaluacionPendiente, sePuedeEvaluar } from '../components/EvaluarClase';

const pad = (n) => String(n).padStart(2, '0');
function isoLocal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Día, número y mes de una reserva a partir de su fecha ("2026-10-08")
function partesFecha(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00');
  return {
    dia_semana: d.toLocaleDateString('es-CL', { weekday: 'long' }),
    dia_numero: d.getDate(),
    mes: d.toLocaleDateString('es-CL', { month: 'long' }),
  };
}


const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function inicialesDe(nombre) {
  return String(nombre || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

// "Hoy · en 3 h", "Mañana", "En 4 días"
function cuantoFalta(fechaISO, hora) {
  const inicio = horaAFecha(fechaISO, hora).getTime();
  const hoy = isoLocal(new Date());
  const manana = isoLocal(new Date(Date.now() + 86400000));
  if (fechaISO === hoy) {
    const min = Math.max(0, Math.round((inicio - Date.now()) / 60000));
    if (min < 60) return `Hoy · en ${min} min`;
    return `Hoy · en ${Math.round(min / 60)} h`;
  }
  if (fechaISO === manana) return 'Mañana';
  const dias = Math.round(
    (Date.parse(fechaISO + 'T12:00:00') - Date.parse(hoy + 'T12:00:00')) / 86400000
  );
  return `En ${dias} días`;
}

// Cuadrito tipo calendario: día de la semana, número y mes
function FechaCuadro({ fechaISO, tono = 'normal' }) {
  const d = new Date(fechaISO + 'T12:00:00');
  const dia = d.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '').slice(0, 3);
  const estilos = {
    normal: 'bg-white/[0.06] border-white/10 text-white',
    cyan: 'bg-cyan-brand/15 border-cyan-brand/30 text-cyan-brand',
    rojo: 'bg-red-500/10 border-red-500/25 text-red-300',
    gris: 'bg-white/[0.03] border-white/10 text-white/45',
  }[tono];
  return (
    <div className={`w-[54px] shrink-0 rounded-xl border py-1.5 text-center ${estilos}`}>
      <p className="text-[10px] uppercase font-semibold opacity-70 leading-none">{dia}</p>
      <p className="font-display text-2xl leading-tight">{d.getDate()}</p>
      <p className="text-[10px] uppercase opacity-60 leading-none">{MESES_CORTOS[d.getMonth()]}</p>
    </div>
  );
}

// Selector de días con el mismo estilo que Horarios.
// Muestra desde hoy hasta la última clase reservada (mínimo 7 días, sin domingos salvo que haya clase).
function VistaSemanal({ reservas, onElegirDia, diaElegido }) {
  const porFecha = reservas.reduce((acc, r) => {
    acc[r.fecha] = (acc[r.fecha] || 0) + 1;
    return acc;
  }, {});
  const hoy = new Date();
  const hoyISO = isoLocal(hoy);
  const ultima = reservas.reduce((m, r) => (r.fecha > m ? r.fecha : m), hoyISO);
  const dias = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const key = isoLocal(d);
    if (key > ultima && dias.length >= 7) break;
    if (d.getDay() === 0 && !porFecha[key]) continue;
    const nombre = d.toLocaleDateString('es-CL', { weekday: 'long' });
    dias.push({
      key,
      numero: d.getDate(),
      diaCorto: (nombre.charAt(0).toUpperCase() + nombre.slice(1)).slice(0, 3),
      esHoy: key === hoyISO,
    });
  }

  return (
    <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
      <button
        onClick={() => onElegirDia(null)}
        className={`shrink-0 w-[52px] rounded-2xl py-2.5 flex flex-col items-center justify-center border transition-all active:scale-95 ${
          !diaElegido
            ? 'bg-cyan-brand border-cyan-brand text-ink shadow-[0_6px_20px_-6px_rgba(0,200,230,0.6)]'
            : 'bg-white/[0.04] border-white/10 text-white'
        }`}
      >
        <span className={`text-[10px] uppercase font-semibold ${!diaElegido ? 'text-ink/70' : 'text-white/40'}`}>Ver</span>
        <span className="font-display text-base leading-tight">Todas</span>
        <span className="w-1.5 h-1.5 mt-0.5" />
      </button>
      {dias.map((d) => {
        const activo = diaElegido === d.key;
        const tengoClase = !!porFecha[d.key];
        return (
          <button
            key={d.key}
            onClick={() => onElegirDia(activo ? null : d.key)}
            className={`shrink-0 w-[52px] rounded-2xl py-2.5 flex flex-col items-center border transition-all active:scale-95 ${
              activo
                ? 'bg-cyan-brand border-cyan-brand text-ink shadow-[0_6px_20px_-6px_rgba(0,200,230,0.6)]'
                : 'bg-white/[0.04] border-white/10 text-white'
            }`}
          >
            <span className={`text-[10px] uppercase font-semibold ${activo ? 'text-ink/70' : 'text-white/40'}`}>
              {d.esHoy ? 'Hoy' : d.diaCorto}
            </span>
            <span className="font-display text-xl leading-tight">{d.numero}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                tengoClase ? (activo ? 'bg-ink' : 'bg-cyan-brand') : 'bg-transparent'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function EstadoAsistencia({ asistio }) {
  if (asistio === true)
    return (
      <span className="flex items-center gap-1 bg-cyan-brand/15 text-cyan-brand text-[11px] font-semibold rounded-full px-2.5 py-1">
        <CalendarCheck size={13} /> Asististe
      </span>
    );
  if (asistio === false)
    return (
      <span className="flex items-center gap-1 bg-red-500/10 text-red-300 text-[11px] font-semibold rounded-full px-2.5 py-1">
        <XCircle size={13} /> Faltaste
      </span>
    );
  return (
    <span className="flex items-center gap-1 bg-white/[0.06] text-white/45 text-[11px] font-semibold rounded-full px-2.5 py-1">
      <HelpCircle size={13} /> Sin marcar
    </span>
  );
}

function PanelCancelacion({
  tardia,
  cancelando,
  onConfirmar,
  onMantener,
  horasAnticipacion,
}) {
  return (
    <div className="mt-4 pt-4 border-t border-white/10 animate-[fadeIn_0.2s_ease]">
      {tardia ? (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-xs font-semibold uppercase tracking-wide mb-0.5">
              Cancelación tardía
            </p>
            <p className="text-red-300/90 text-sm">
              Al cancelar con menos de {horasAnticipacion} horas de
              anticipación, la sesión será descontada igualmente.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-white/50 text-sm mb-3">
          ¿Quieres cancelar esta reserva?
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onConfirmar}
          disabled={cancelando}
          className="flex-1 bg-red-500/80 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
        >
          {cancelando ? 'Cancelando...' : 'Sí, cancelar reserva'}
        </button>
        <button
          onClick={onMantener}
          className="flex-1 bg-white/10 text-white rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
        >
          Mantener reserva
        </button>
      </div>
    </div>
  );
}

export default function Reservas() {
  const {
    reservas,
    horarios,
    usuarioActual,
    cancelarReserva,
    horasAnticipacion,
    infoGimnasio,
    coachDeClase,
  } = useAuth();
  const [diaElegido, setDiaElegido] = useState(null);
  const navigate = useNavigate();
  const [tab, setTab] = useState('proximas');
  const [confirmando, setConfirmando] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(() => isoLocal(new Date()).slice(0, 7)); // 'AAAA-MM' o 'todos'

  const ahora = Date.now();

  const todasMisReservas = reservas
    .filter((r) => r.usuario_id === usuarioActual.id)
    .map((r) => ({
      ...r,
      ...partesFecha(r.fecha),
      horario: (() => {
        const h = horarios.find((x) => x.id === r.horario_id);
        // Si ese día hay un coach de reemplazo, se muestra ese
        return h ? { ...h, coach_nombre: coachDeClase(h, r.fecha).nombre } : null;
      })(),
    }))
    .filter((r) => r.horario);

  const proximas = todasMisReservas
    .filter((r) => horaAFecha(r.fecha, r.horario.hora).getTime() >= ahora)
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        a.horario.hora.localeCompare(b.horario.hora)
    );

  const utilizadas = todasMisReservas
    .filter((r) => horaAFecha(r.fecha, r.horario.hora).getTime() < ahora)
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        b.horario.hora.localeCompare(a.horario.hora)
    );

  async function handleConfirmarCancelacion(reservaId) {
    setCancelando(true);
    await cancelarReserva(reservaId);
    setCancelando(false);
    setConfirmando(null);
  }

  const proximasVisibles = diaElegido ? proximas.filter((r) => r.fecha === diaElegido) : proximas;
  const proxima = proximasVisibles[0];
  const resto = proximasVisibles.slice(1);

  // Filtro por mes en "Utilizadas": el mes actual + los meses en que tiene clases
  const mesActual = isoLocal(new Date()).slice(0, 7);
  const mesesDisponibles = [...new Set([mesActual, ...utilizadas.map((r) => r.fecha.slice(0, 7))])].sort().reverse();
  const nombreMes = (m) => {
    const t = new Date(m + '-15T12:00:00').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const delMes = mesFiltro === 'todos' ? utilizadas : utilizadas.filter((r) => r.fecha.slice(0, 7) === mesFiltro);
  const asistidasMes = delMes.filter((r) => r.asistio === true).length;
  const faltasMes = delMes.filter((r) => r.asistio === false).length;

  function exportarTodas() {
    descargarIcs(
      proximas.map((r) => eventoDeReserva(r, r.horario, infoGimnasio?.direccion)),
      'mis-clases-cedys.ics'
    );
  }

  const porcentajeAsistencia =
    asistidasMes + faltasMes > 0 ? Math.round((asistidasMes / (asistidasMes + faltasMes)) * 100) : null;

  function agregarUna(r) {
    descargarIcs([eventoDeReserva(r, r.horario, infoGimnasio?.direccion)], 'clase-cedys.ics');
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white leading-tight">Mis Reservas</p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        {proximas.length === 0
          ? 'Tu agenda de entrenamiento'
          : proximas.length === 1
          ? 'Tienes 1 clase agendada'
          : `Tienes ${proximas.length} clases agendadas`}
      </p>

      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab('proximas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'proximas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Próximas{proximas.length > 0 ? ` (${proximas.length})` : ''}
        </button>
        <button
          onClick={() => setTab('utilizadas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'utilizadas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Historial
        </button>
      </div>

      {tab === 'proximas' && (
        <>
          {proximas.length > 0 && (
            <VistaSemanal reservas={proximas} diaElegido={diaElegido} onElegirDia={setDiaElegido} />
          )}

          {diaElegido && proximasVisibles.length === 0 && proximas.length > 0 && (
            <p className="text-white/40 text-sm text-center py-6">No tienes clases reservadas ese día.</p>
          )}

          {proximas.length === 0 && (
            <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/20 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink text-center px-6 py-12 mb-6">
              <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-cyan-brand/15 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={30} className="text-cyan-brand" />
                </div>
                <p className="text-white font-display text-2xl mb-1">Tu agenda está libre</p>
                <p className="text-white/50 text-sm mb-6">¿Cuándo te vemos? Reserva tu próxima clase.</p>
                <button
                  onClick={() => navigate('/horarios')}
                  className="inline-flex items-center gap-2 bg-cyan-brand text-ink font-bold rounded-2xl px-6 py-3 text-sm transition-transform active:scale-[0.98]"
                >
                  <Plus size={16} /> Reservar una clase
                </button>
              </div>
            </div>
          )}

          {proxima &&
            (() => {
              const tardia = esCancelacionTardia(proxima.fecha, proxima.horario.hora, horasAnticipacion);
              const confirmandoEsta = confirmando === proxima.id;
              return (
                <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-5">
                  <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">
                        Tu próxima clase
                      </p>
                      <span className="flex items-center gap-1 bg-cyan-brand text-ink text-[11px] font-bold rounded-full px-2.5 py-1">
                        <Clock size={12} /> {cuantoFalta(proxima.fecha, proxima.horario.hora)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <FechaCuadro fechaISO={proxima.fecha} tono="cyan" />
                      <div>
                        <p className="font-display text-white leading-none" style={{ fontSize: '3rem' }}>
                          {proxima.horario.hora}
                        </p>
                        <p className="text-white/50 text-sm mt-1">
                          {proxima.dia_semana.charAt(0).toUpperCase() + proxima.dia_semana.slice(1)} {proxima.dia_numero} de {proxima.mes}
                        </p>
                      </div>
                    </div>

                    {proxima.horario.coach_nombre && (
                      <div className="flex items-center gap-2 mt-4">
                        <span className="w-7 h-7 rounded-full bg-cyan-brand/15 text-cyan-brand flex items-center justify-center text-[11px] font-bold">
                          {inicialesDe(proxima.horario.coach_nombre)}
                        </span>
                        <span className="text-white/70 text-sm">Entrenas con {proxima.horario.coach_nombre}</span>
                      </div>
                    )}

                    {!confirmandoEsta ? (
                      <div className="grid grid-cols-2 gap-2 mt-5">
                        <button
                          onClick={() => agregarUna(proxima)}
                          className="flex items-center justify-center gap-1.5 bg-white/10 text-white rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
                        >
                          <CalendarPlus size={15} /> A mi calendario
                        </button>
                        <button
                          onClick={() => setConfirmando(proxima.id)}
                          className="flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
                        >
                          <X size={15} /> Cancelar
                        </button>
                      </div>
                    ) : (
                      <PanelCancelacion
                        tardia={tardia}
                        cancelando={cancelando}
                        onConfirmar={() => handleConfirmarCancelacion(proxima.id)}
                        onMantener={() => setConfirmando(null)}
                        horasAnticipacion={horasAnticipacion}
                      />
                    )}
                  </div>
                </div>
              );
            })()}

          <EvaluacionPendiente />

          {resto.length > 0 && (
            <>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Después</p>
              <div className="flex flex-col gap-2">
                {resto.map((r) => {
                  const tardia = esCancelacionTardia(r.fecha, r.horario.hora, horasAnticipacion);
                  const confirmandoEsta = confirmando === r.id;
                  return (
                    <div key={r.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3">
                      <div className="flex items-center gap-3">
                        <FechaCuadro fechaISO={r.fecha} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-display text-2xl leading-none">{r.horario.hora}</p>
                          <p className="text-white/45 text-xs mt-1 truncate">
                            {cuantoFalta(r.fecha, r.horario.hora)}
                            {r.horario.coach_nombre ? ` · con ${r.horario.coach_nombre.split(' ')[0]}` : ''}
                          </p>
                        </div>
                        {!confirmandoEsta && (
                          <button
                            onClick={() => setConfirmando(r.id)}
                            className="w-9 h-9 rounded-full bg-red-500/10 text-red-300 flex items-center justify-center shrink-0 transition-transform active:scale-95"
                            aria-label="Cancelar reserva"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      {confirmandoEsta && (
                        <PanelCancelacion
                          tardia={tardia}
                          cancelando={cancelando}
                          onConfirmar={() => handleConfirmarCancelacion(r.id)}
                          onMantener={() => setConfirmando(null)}
                          horasAnticipacion={horasAnticipacion}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {proximas.length > 0 && (
            <div className="flex flex-col gap-2 mt-5">
              <button
                onClick={() => navigate('/horarios')}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-cyan-brand/40 text-cyan-brand rounded-2xl py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
              >
                <Plus size={16} /> Reservar otra clase
              </button>
              {proximas.length > 1 && (
                <button
                  onClick={exportarTodas}
                  className="flex items-center justify-center gap-1.5 text-white/40 text-xs py-2"
                >
                  <CalendarPlus size={13} /> Agregar mis {proximas.length} clases al calendario
                </button>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'utilizadas' && (
        <>
          {utilizadas.length > 0 && (
            <>
              {/* Meses */}
              <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1 mb-4" style={{ scrollbarWidth: 'none' }}>
                {[...mesesDisponibles, 'todos'].map((m) => {
                  const activo = mesFiltro === m;
                  const texto =
                    m === 'todos'
                      ? 'Todos'
                      : m === mesActual
                      ? 'Este mes'
                      : nombreMes(m).replace(/ de \d{4}$/, (x) => (m.slice(0, 4) === mesActual.slice(0, 4) ? '' : x));
                  return (
                    <button
                      key={m}
                      onClick={() => setMesFiltro(m)}
                      className={`shrink-0 rounded-full px-4 py-1.5 text-sm border transition-colors ${
                        activo
                          ? 'bg-cyan-brand border-cyan-brand text-ink font-semibold'
                          : 'bg-white/[0.04] border-white/10 text-white/60'
                      }`}
                    >
                      {texto}
                    </button>
                  );
                })}
              </div>

              {/* Resumen */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-[11px] uppercase tracking-wide">Asistencia</p>
                    <p className="text-white font-display text-3xl leading-tight">
                      {porcentajeAsistencia === null ? '—' : `${porcentajeAsistencia}%`}
                    </p>
                  </div>
                  {porcentajeAsistencia !== null && porcentajeAsistencia >= 80 && (
                    <span className="flex items-center gap-1 bg-yellow-400/15 text-yellow-200 text-xs font-semibold rounded-full px-3 py-1">
                      <Trophy size={13} /> ¡Muy constante!
                    </span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-2 flex">
                  {delMes.length > 0 && (
                    <>
                      <div className="h-full bg-cyan-brand" style={{ width: `${(asistidasMes / delMes.length) * 100}%` }} />
                      <div className="h-full bg-red-400/70" style={{ width: `${(faltasMes / delMes.length) * 100}%` }} />
                    </>
                  )}
                </div>
                <div className="flex gap-4 mt-3 text-xs">
                  <span className="flex items-center gap-1.5 text-white/60">
                    <span className="w-2 h-2 rounded-full bg-cyan-brand" /> {asistidasMes} asististe
                  </span>
                  <span className="flex items-center gap-1.5 text-white/60">
                    <span className="w-2 h-2 rounded-full bg-red-400/70" /> {faltasMes} faltaste
                  </span>
                  <span className="flex items-center gap-1.5 text-white/40">
                    <span className="w-2 h-2 rounded-full bg-white/20" /> {delMes.length} en total
                  </span>
                </div>
              </div>

              {delMes.length === 0 && (
                <p className="text-white/35 text-sm text-center py-8">
                  No tuviste clases en {nombreMes(mesFiltro).toLowerCase()}.
                </p>
              )}
            </>
          )}
          {utilizadas.length === 0 && (
            <div className="text-center py-16">
              <CalendarCheck size={40} className="text-white/15 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Aún no tienes clases en tu historial.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {delMes.map((r) => (
              <div key={r.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <FechaCuadro
                    fechaISO={r.fecha}
                    tono={r.asistio === true ? 'cyan' : r.asistio === false ? 'rojo' : 'gris'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/85 font-display text-2xl leading-none">{r.horario.hora}</p>
                    {r.horario.coach_nombre && (
                      <p className="text-white/40 text-xs mt-1 truncate">con {r.horario.coach_nombre}</p>
                    )}
                  </div>
                  <EstadoAsistencia asistio={r.asistio} />
                </div>
                {sePuedeEvaluar(r, r.horario.hora) && <EvaluarClase reserva={r} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
