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

// Semana de lunes a sábado que contiene la fecha dada
function diasDeLaSemana(base) {
  const d = new Date(base);
  const dow = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
}

function VistaSemanal({ reservas, onElegirDia, diaElegido }) {
  const [offset, setOffset] = useState(0);
  const base = new Date();
  base.setDate(base.getDate() + offset * 7);
  const dias = diasDeLaSemana(base);
  const hoy = isoLocal(new Date());
  const porFecha = reservas.reduce((acc, r) => {
    acc[r.fecha] = (acc[r.fecha] || 0) + 1;
    return acc;
  }, {});
  const titulo = `${dias[0].getDate()} ${dias[0].toLocaleDateString('es-CL', { month: 'short' })} – ${dias[6].getDate()} ${dias[6].toLocaleDateString('es-CL', { month: 'short' })}`;

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={() => setOffset(offset - 1)} className="text-white/40 text-sm px-2" aria-label="Semana anterior">
          ‹
        </button>
        <p className="text-white/60 text-xs">{offset === 0 ? 'Esta semana' : titulo}</p>
        <button onClick={() => setOffset(offset + 1)} className="text-white/40 text-sm px-2" aria-label="Semana siguiente">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dias.map((d) => {
          const key = isoLocal(d);
          const n = porFecha[key] || 0;
          const esHoy = key === hoy;
          const elegido = diaElegido === key;
          return (
            <button
              key={key}
              onClick={() => onElegirDia(elegido ? null : key)}
              className={`flex flex-col items-center rounded-xl py-2 transition-colors ${
                elegido ? 'bg-cyan-brand text-ink' : esHoy ? 'bg-white/10 text-white' : 'text-white/60'
              }`}
            >
              <span className="text-[10px] uppercase">
                {d.toLocaleDateString('es-CL', { weekday: 'short' }).slice(0, 2)}
              </span>
              <span className="text-sm font-semibold">{d.getDate()}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1 ${
                  n > 0 ? (elegido ? 'bg-ink' : 'bg-cyan-brand') : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EstadoAsistencia({ asistio }) {
  if (asistio === true)
    return (
      <span className="flex items-center gap-1 text-cyan-brand text-xs">
        <CalendarCheck size={15} /> Asististe
      </span>
    );
  if (asistio === false)
    return (
      <span className="flex items-center gap-1 text-red-300 text-xs">
        <XCircle size={15} /> No asististe
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-white/35 text-xs">
      <HelpCircle size={15} /> Sin marcar
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

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white leading-tight">
        Mis Reservas
      </p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        Tu agenda de entrenamiento
      </p>

      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('proximas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'proximas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Próximas
        </button>
        <button
          onClick={() => setTab('utilizadas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'utilizadas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Utilizadas
        </button>
      </div>

      {tab === 'proximas' && (
        <>
          <EvaluacionPendiente />
          <VistaSemanal reservas={proximas} diaElegido={diaElegido} onElegirDia={setDiaElegido} />
          {proximas.length > 0 && (
            <button
              onClick={exportarTodas}
              className="w-full flex items-center justify-center gap-2 bg-white/[0.06] border border-white/10 text-white/80 rounded-xl py-2.5 text-sm mb-5"
            >
              <CalendarPlus size={15} />{' '}
              {proximas.length === 1 ? 'Agregar mi clase al calendario' : `Agregar mis ${proximas.length} clases al calendario`}
            </button>
          )}
          {diaElegido && proximasVisibles.length === 0 && proximas.length > 0 && (
            <p className="text-white/40 text-sm text-center py-6">No tienes clases reservadas ese día.</p>
          )}
          {proximas.length === 0 && (
            <div className="text-center py-16">
              <Calendar size={40} className="text-white/15 mx-auto mb-4" />
              <p className="text-white font-display text-xl mb-1">
                Aún no tienes reservas
              </p>
              <p className="text-white/40 text-sm mb-6">
                Agenda tu próxima sesión y comienza a entrenar.
              </p>
              <button
                onClick={() => navigate('/horarios')}
                className="bg-cyan-brand text-ink font-bold rounded-2xl px-6 py-3 text-sm tracking-wide transition-transform active:scale-[0.98]"
              >
                VER HORARIOS
              </button>
            </div>
          )}

          {proxima &&
            (() => {
              const tardia = esCancelacionTardia(
                proxima.fecha,
                proxima.horario.hora,
                horasAnticipacion
              );
              const confirmandoEsta = confirmando === proxima.id;

              return (
                <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-6 mb-6 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />

                  <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase mb-3">
                    Próxima sesión
                  </p>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">
                    {proxima.dia_semana}
                  </p>
                  <p
                    className="font-display text-white leading-none"
                    style={{ fontSize: '3.25rem' }}
                  >
                    {proxima.horario.hora}
                  </p>
                  <p className="text-white/50 text-sm mt-2 mb-4">
                    {proxima.dia_numero} de {proxima.mes}
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    <User size={15} className="text-cyan-brand/70" />
                    <span className="text-white/70 text-sm">
                      {proxima.horario.coach_nombre}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 bg-cyan-brand/15 border border-cyan-brand/30 text-cyan-brand text-xs font-semibold px-3 py-1.5 rounded-full">
                    <Check size={13} /> RESERVA CONFIRMADA
                  </div>

                  {!confirmandoEsta ? (
                    <button
                      onClick={() => setConfirmando(proxima.id)}
                      className="flex items-center gap-1.5 text-red-400/80 text-sm mt-5 hover:text-red-400 transition-colors"
                    >
                      <X size={15} /> Cancelar esta reserva
                    </button>
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
              );
            })()}

          {resto.length > 0 && (
            <>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                Próximas reservas
              </p>
              <div className="flex flex-col gap-2">
                {resto.map((r) => {
                  const tardia = esCancelacionTardia(
                    r.fecha,
                    r.horario.hora,
                    horasAnticipacion
                  );
                  const confirmandoEsta = confirmando === r.id;

                  return (
                    <div
                      key={r.id}
                      className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/40 text-[11px] uppercase tracking-wide">
                            {r.dia_semana} · {r.dia_numero} de {r.mes}
                          </p>
                          <p className="text-white font-display text-2xl leading-tight mt-0.5">
                            {r.horario.hora}
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {r.horario.coach_nombre}
                          </p>
                        </div>
                        {!confirmandoEsta && (
                          <button
                            onClick={() => setConfirmando(r.id)}
                            className="text-red-400/70 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            aria-label="Cancelar reserva"
                          >
                            <X size={17} />
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
        </>
      )}

      {tab === 'utilizadas' && (
        <>
          {utilizadas.length > 0 && (
            <>
              <select
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand mb-3"
              >
                {mesesDisponibles.map((m) => (
                  <option key={m} value={m} className="bg-ink">
                    {nombreMes(m)}
                  </option>
                ))}
                <option value="todos" className="bg-ink">
                  Todos los meses
                </option>
              </select>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3">
                  <p className="text-white/40 text-[11px] uppercase tracking-wide">Reservadas</p>
                  <p className="text-white font-display text-2xl leading-tight">{delMes.length}</p>
                  <p className="text-white/35 text-[11px]">clases</p>
                </div>
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3">
                  <p className="text-white/40 text-[11px] uppercase tracking-wide">Asististe</p>
                  <p className="text-cyan-brand font-display text-2xl leading-tight">{asistidasMes}</p>
                  <p className="text-white/35 text-[11px]">clases</p>
                </div>
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3">
                  <p className="text-white/40 text-[11px] uppercase tracking-wide">Faltaste</p>
                  <p className="text-white font-display text-2xl leading-tight">{faltasMes}</p>
                  <p className="text-white/35 text-[11px]">clases</p>
                </div>
              </div>
              {delMes.length === 0 && (
                <p className="text-white/35 text-sm text-center py-8">No tuviste clases en {nombreMes(mesFiltro).toLowerCase()}.</p>
              )}
            </>
          )}
          {utilizadas.length === 0 && (
            <div className="text-center py-16">
              <CalendarCheck size={40} className="text-white/15 mx-auto mb-4" />
              <p className="text-white/30 text-sm">
                Aún no tienes reservas utilizadas.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {delMes.map((r) => (
              <div
                key={r.id}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-[11px] uppercase tracking-wide">
                      {r.dia_semana} · {r.dia_numero} de {r.mes}
                    </p>
                    <p className="text-white/80 font-display text-2xl leading-tight mt-0.5">
                      {r.horario.hora}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {r.horario.coach_nombre}
                    </p>
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
