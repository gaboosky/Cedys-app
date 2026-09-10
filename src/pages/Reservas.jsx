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
} from 'lucide-react';

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
  } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('proximas');
  const [confirmando, setConfirmando] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  const ahora = Date.now();

  const todasMisReservas = reservas
    .filter((r) => r.usuario_id === usuarioActual.id)
    .map((r) => ({
      ...r,
      horario: horarios.find((h) => h.id === r.horario_id),
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

  const proxima = proximas[0];
  const resto = proximas.slice(1);

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
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
          {utilizadas.length === 0 && (
            <div className="text-center py-16">
              <CalendarCheck size={40} className="text-white/15 mx-auto mb-4" />
              <p className="text-white/30 text-sm">
                Aún no tienes reservas utilizadas.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {utilizadas.map((r) => (
              <div
                key={r.id}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 opacity-70"
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
                  <CalendarCheck size={18} className="text-white/20" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
