import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { horaAFecha } from '../../lib/horarioUtils';
import {
  Calendar,
  CalendarCheck,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFechaLarga(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  return capitalizar(
    fecha.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  );
}

function formatFechaCorta(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  return capitalizar(
    fecha.toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  );
}

// Convierte un Date a "YYYY-MM-DD" usando el calendario LOCAL (no UTC).
// fecha.toISOString() convierte a UTC y puede saltar al día siguiente en horario
// de tarde/noche en Chile (UTC-3).
function soloFechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function proximosDias(cantidad = 14) {
  const dias = [];
  const hoy = new Date();
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);
    const key = soloFechaLocal(fecha);
    dias.push({
      key,
      label: formatFechaLarga(key),
      corta: formatFechaCorta(key),
      esHoy: i === 0,
    });
  }
  return dias;
}

function Avatar({ nombre }) {
  return (
    <div className="w-10 h-10 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
      <span className="text-cyan-brand font-display text-sm">
        {nombre?.charAt(0)?.toUpperCase() || '?'}
      </span>
    </div>
  );
}

export default function ReservasActivas() {
  const { reservas, horarios, usuarios } = useAuth();
  const [tab, setTab] = useState('activas');
  const dias = proximosDias(14);
  const [diaAbierto, setDiaAbierto] = useState(null);

  const ahora = Date.now();

  const todas = reservas
    .filter((r) => r.estado === 'confirmada')
    .map((r) => ({
      ...r,
      horario: horarios.find((h) => h.id === r.horario_id),
      usuario: usuarios.find((u) => u.id === r.usuario_id),
    }))
    .filter((r) => r.horario && r.usuario);

  // --- Tab Activas: próximas reservas, agrupadas por día (solo días con reservas) ---
  const activas = todas.filter(
    (r) => horaAFecha(r.fecha, r.horario.hora).getTime() >= ahora
  );

  const diasConReservas = dias
    .map((d) => ({
      ...d,
      reservasDelDia: activas
        .filter((r) => r.fecha === d.key)
        .sort((a, b) => a.horario.hora.localeCompare(b.horario.hora)),
    }))
    .filter((d) => d.reservasDelDia.length > 0);

  // --- Tab Pasadas: reservas ya ocurridas, agrupadas por fecha (más reciente primero) ---
  const pasadas = todas
    .filter((r) => horaAFecha(r.fecha, r.horario.hora).getTime() < ahora)
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        b.horario.hora.localeCompare(a.horario.hora)
    )
    .slice(0, 200);

  const pasadasPorFecha = pasadas.reduce((acc, r) => {
    if (!acc[r.fecha]) acc[r.fecha] = [];
    acc[r.fecha].push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex items-center gap-2 mb-5">
        <Calendar size={18} className="text-cyan-brand" />
        <p className="text-white font-display text-lg">Reservas</p>
      </div>

      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab('activas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'activas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Activas
        </button>
        <button
          onClick={() => setTab('pasadas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'pasadas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Pasadas
        </button>
      </div>

      {tab === 'activas' && (
        <>
          {diasConReservas.length === 0 ? (
            <div className="text-center py-16">
              <Calendar size={40} className="text-white/15 mx-auto mb-4" />
              <p className="text-white/30 text-sm">
                No hay reservas activas por ahora.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {diasConReservas.map((d, index) => {
                const abierto =
                  diaAbierto === null ? index === 0 : diaAbierto === d.key;

                return (
                  <div
                    key={d.key}
                    className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => setDiaAbierto(abierto ? '' : d.key)}
                      className="w-full flex items-center justify-between p-4"
                    >
                      <div className="text-left">
                        <p className="text-white font-display text-lg">
                          {d.esHoy ? 'Hoy' : d.corta}
                        </p>
                        <p className="text-white/40 text-xs">
                          {d.reservasDelDia.length} reserva
                          {d.reservasDelDia.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {abierto ? (
                        <ChevronUp size={18} className="text-white/40" />
                      ) : (
                        <ChevronDown size={18} className="text-white/40" />
                      )}
                    </button>

                    {abierto && (
                      <div className="border-t border-white/10 flex flex-col gap-2 p-3">
                        {d.reservasDelDia.map((r) => (
                          <div
                            key={r.id}
                            className="bg-black/20 border border-white/10 rounded-xl p-3.5 flex items-center gap-3"
                          >
                            <Avatar nombre={r.usuario.nombre} />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">
                                {r.usuario.nombre}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock
                                  size={11}
                                  className="text-cyan-brand/60"
                                />
                                <span className="text-white/40 text-xs">
                                  {r.horario.hora}
                                </span>
                                {r.horario.coach_nombre && (
                                  <>
                                    <span className="text-white/20">·</span>
                                    <span className="text-white/40 text-xs truncate">
                                      {r.horario.coach_nombre}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {r.usuario.telefono && (
                              <a
                                href={`https://wa.me/${r.usuario.telefono.replace(
                                  /\D/g,
                                  ''
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-cyan-brand/70 text-xs bg-cyan-brand/10 border border-cyan-brand/20 rounded-full px-2.5 py-1 shrink-0"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'pasadas' && (
        <>
          {pasadas.length === 0 ? (
            <div className="text-center py-16">
              <CalendarCheck size={40} className="text-white/15 mx-auto mb-4" />
              <p className="text-white/30 text-sm">
                Aún no hay reservas pasadas.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(pasadasPorFecha).map(([fecha, items]) => (
                <div key={fecha}>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                    {formatFechaLarga(fecha)}
                  </p>
                  <div className="flex flex-col gap-2">
                    {items.map((r) => (
                      <div
                        key={r.id}
                        className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 opacity-80"
                      >
                        <Avatar nombre={r.usuario.nombre} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 text-sm font-medium truncate">
                            {r.usuario.nombre}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock size={11} className="text-white/30" />
                            <span className="text-white/40 text-xs">
                              {r.horario.hora}
                            </span>
                            {r.horario.coach_nombre && (
                              <>
                                <span className="text-white/20">·</span>
                                <span className="text-white/40 text-xs truncate">
                                  {r.horario.coach_nombre}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <CalendarCheck
                          size={16}
                          className="text-white/20 shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
