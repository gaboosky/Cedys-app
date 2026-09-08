import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFechaLarga(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  const texto = fecha.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return capitalizar(texto);
}

function proximosDiasHabiles(cantidad = 14) {
  const dias = [];
  const hoy = new Date();
  let offset = 0;
  while (dias.length < cantidad) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + offset);
    if (fecha.getDay() !== 0) {
      const nombreDia = capitalizar(
        fecha.toLocaleDateString('es-CL', { weekday: 'long' })
      );
      dias.push({ key: fecha.toISOString().slice(0, 10), nombreDia });
    }
    offset++;
  }
  return dias;
}

function nombreMes(mesKey) {
  const [anio, mes] = mesKey.split('-');
  const fecha = new Date(Number(anio), Number(mes) - 1, 1);
  return capitalizar(
    fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  );
}

function FilaAlumno({ item, onMarcar }) {
  const { usuario, reservaId, asistio } = item;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <span className="text-white text-sm block">{usuario.nombre}</span>
        <span className="text-white/30 text-xs">{usuario.telefono}</span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onMarcar(reservaId, true)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            asistio === true
              ? 'bg-cyan-brand text-ink'
              : 'bg-white/5 text-white/30'
          }`}
        >
          <Check size={15} />
        </button>
        <button
          onClick={() => onMarcar(reservaId, false)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            asistio === false
              ? 'bg-red-500/80 text-white'
              : 'bg-white/5 text-white/30'
          }`}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export default function MisClases() {
  const { usuarioActual, horarios, usuarios, reservas, marcarAsistencia } =
    useAuth();
  const [tab, setTab] = useState('proximas');
  const [abierta, setAbierta] = useState(null);
  const [mesFiltro, setMesFiltro] = useState('todos');

  const misHorarios = horarios.filter((h) => h.coach_id === usuarioActual.id);
  const misHorarioIds = misHorarios.map((h) => h.id);
  const hoyISO = new Date().toISOString().slice(0, 10);

  function inscritosDe(horarioId, fecha) {
    return reservas
      .filter((r) => r.horario_id === horarioId && r.fecha === fecha)
      .map((r) => {
        const usuario = usuarios.find((u) => u.id === r.usuario_id);
        return usuario
          ? { usuario, reservaId: r.id, asistio: r.asistio }
          : null;
      })
      .filter(Boolean);
  }

  const diasProximos = proximosDiasHabiles(14);

  const realizadasPorFecha = useMemo(() => {
    const grupos = {};
    reservas
      .filter((r) => misHorarioIds.includes(r.horario_id) && r.fecha < hoyISO)
      .forEach((r) => {
        if (!grupos[r.fecha]) grupos[r.fecha] = new Set();
        grupos[r.fecha].add(r.horario_id);
      });
    return grupos;
  }, [reservas, misHorarioIds, hoyISO]);

  const fechasRealizadas = Object.keys(realizadasPorFecha).sort().reverse();
  const mesesDisponibles = [
    ...new Set(fechasRealizadas.map((f) => f.slice(0, 7))),
  ];
  const fechasFiltradas =
    mesFiltro === 'todos'
      ? fechasRealizadas
      : fechasRealizadas.filter((f) => f.slice(0, 7) === mesFiltro);
  const totalClasesRealizadas = fechasFiltradas.reduce(
    (acc, f) => acc + realizadasPorFecha[f].size,
    0
  );

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white mb-4">Mis Clases</p>

      <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('proximas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'proximas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Próximas
        </button>
        <button
          onClick={() => setTab('realizadas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'realizadas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Realizadas
        </button>
      </div>

      {tab === 'proximas' && (
        <div className="flex flex-col gap-6">
          {diasProximos.map((dia) => {
            const horariosDelDia = misHorarios
              .filter((h) => h.dia === dia.nombreDia)
              .sort((a, b) => a.hora.localeCompare(b.hora));
            if (horariosDelDia.length === 0) return null;
            return (
              <div key={dia.key}>
                <p className="text-white/50 text-xs uppercase tracking-wide mb-2">
                  {formatFechaLarga(dia.key)}
                </p>
                <div className="flex flex-col gap-2">
                  {horariosDelDia.map((h) => {
                    const inscritos = inscritosDe(h.id, dia.key);
                    const claveAbierta = `${h.id}_${dia.key}`;
                    const abiertaAqui = abierta === claveAbierta;
                    return (
                      <div
                        key={h.id}
                        className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setAbierta(abiertaAqui ? null : claveAbierta)
                          }
                          className="w-full flex items-center justify-between p-4"
                        >
                          <p className="text-white font-display text-xl">
                            {h.hora}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-white/40 text-xs">
                              <Users size={13} /> {inscritos.length}/
                              {h.cupo_max}
                            </span>
                            {abiertaAqui ? (
                              <ChevronUp size={16} className="text-white/40" />
                            ) : (
                              <ChevronDown
                                size={16}
                                className="text-white/40"
                              />
                            )}
                          </div>
                        </button>
                        {abiertaAqui && (
                          <div className="border-t border-white/10 divide-y divide-white/5">
                            {inscritos.length === 0 && (
                              <p className="text-white/30 text-sm px-4 py-3">
                                Nadie inscrito todavía.
                              </p>
                            )}
                            {inscritos.map((item) => (
                              <FilaAlumno
                                key={item.reservaId}
                                item={item}
                                onMarcar={marcarAsistencia}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'realizadas' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
            >
              <option value="todos">Todos los meses</option>
              {mesesDisponibles.map((m) => (
                <option key={m} value={m}>
                  {nombreMes(m)}
                </option>
              ))}
            </select>
            <span className="text-cyan-brand text-sm font-medium">
              {totalClasesRealizadas} clases
            </span>
          </div>

          {fechasFiltradas.length === 0 && (
            <p className="text-white/30 text-sm">
              Aún no tienes clases realizadas.
            </p>
          )}

          <div className="flex flex-col gap-6">
            {fechasFiltradas.map((fecha) => {
              const horarioIdsDelDia = [...realizadasPorFecha[fecha]];
              return (
                <div key={fecha}>
                  <p className="text-white/50 text-xs uppercase tracking-wide mb-2">
                    {formatFechaLarga(fecha)}
                  </p>
                  <div className="flex flex-col gap-2">
                    {horarioIdsDelDia.map((horarioId) => {
                      const h = horarios.find((x) => x.id === horarioId);
                      if (!h) return null;
                      const inscritos = inscritosDe(horarioId, fecha);
                      const asistieron = inscritos.filter(
                        (i) => i.asistio === true
                      ).length;
                      const claveAbierta = `${horarioId}_${fecha}`;
                      const abiertaAqui = abierta === claveAbierta;
                      return (
                        <div
                          key={horarioId}
                          className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setAbierta(abiertaAqui ? null : claveAbierta)
                            }
                            className="w-full flex items-center justify-between p-4"
                          >
                            <p className="text-white font-display text-xl">
                              {h.hora}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-white/40 text-xs">
                                <Users size={13} /> {asistieron}/
                                {inscritos.length} asistieron
                              </span>
                              {abiertaAqui ? (
                                <ChevronUp
                                  size={16}
                                  className="text-white/40"
                                />
                              ) : (
                                <ChevronDown
                                  size={16}
                                  className="text-white/40"
                                />
                              )}
                            </div>
                          </button>
                          {abiertaAqui && (
                            <div className="border-t border-white/10 divide-y divide-white/5">
                              {inscritos.map((item) => (
                                <FilaAlumno
                                  key={item.reservaId}
                                  item={item}
                                  onMarcar={marcarAsistencia}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
