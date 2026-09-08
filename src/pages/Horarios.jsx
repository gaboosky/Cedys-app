import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservaBloqueada } from '../lib/horarioUtils';
import { Check } from 'lucide-react';

function proximosDiasHabiles(cantidad = 7) {
  const dias = [];
  const hoy = new Date();
  let offset = 0;

  while (dias.length < cantidad) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + offset);
    const diaSemanaNum = fecha.getDay();

    if (diaSemanaNum !== 0) {
      const nombreDia = fecha.toLocaleDateString('es-CL', { weekday: 'long' });
      const nombreCapitalizado =
        nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
      const fechaCorta = fecha.toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
      });
      dias.push({
        key: fecha.toISOString().slice(0, 10),
        nombreDia: nombreCapitalizado,
        fechaCorta,
        esHoy: offset === 0,
      });
    }
    offset++;
  }
  return dias;
}

export default function Horarios() {
  const {
    horarios,
    reservas,
    usuarioActual,
    sesionesRestantes,
    horarioEstaCancelado,
  } = useAuth();
  const navigate = useNavigate();
  const [seleccionado, setSeleccionado] = useState(null);

  const restantes = sesionesRestantes(usuarioActual);
  const dias = proximosDiasHabiles(7);

  function contarInscritos(horarioId, fecha) {
    return reservas.filter(
      (r) => r.horario_id === horarioId && r.fecha === fecha
    ).length;
  }

  function estaReservada(horarioId, fecha) {
    return reservas.some(
      (r) =>
        r.horario_id === horarioId &&
        r.fecha === fecha &&
        r.usuario_id === usuarioActual.id
    );
  }

  function seleccionarHorario(horarioId, fecha) {
    const clave = `${horarioId}_${fecha}`;
    setSeleccionado(clave);
    setTimeout(() => {
      navigate(`/horarios/${horarioId}/${fecha}`);
    }, 220);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex items-center justify-between mb-6">
        <p className="font-display text-3xl text-white">Horarios</p>
        {restantes !== null && (
          <span className="text-cyan-brand text-sm font-medium">
            {restantes} sesiones disponibles
          </span>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {dias.map((dia) => {
          const horariosDelDia = horarios
            .filter((h) =>
              h.fecha_unica
                ? h.fecha_unica === dia.key
                : h.dia === dia.nombreDia
            )
            .sort((a, b) => a.hora.localeCompare(b.hora));

          return (
            <div key={dia.key}>
              <p className="text-white font-display text-lg leading-none">
                {dia.esHoy ? 'Hoy' : dia.nombreDia}
              </p>
              <p className="text-white/40 text-xs mb-2">{dia.fechaCorta}</p>

              {horariosDelDia.length === 0 ? (
                <p className="text-white/25 text-xs">Sin horarios este día.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {horariosDelDia.map((h) => {
                    const clave = `${h.id}_${dia.key}`;
                    const inscritos = contarInscritos(h.id, dia.key);
                    const lleno = inscritos >= h.cupo_max;
                    const reservada = estaReservada(h.id, dia.key);
                    const cancelada = horarioEstaCancelado(h.id, dia.key);
                    const bloqueada =
                      !reservada &&
                      (reservaBloqueada(dia.key, h.hora) || cancelada);
                    const deshabilitada = (lleno || bloqueada) && !reservada;
                    const estaSeleccionado = seleccionado === clave;

                    return (
                      <button
                        key={h.id}
                        onClick={() =>
                          !deshabilitada && seleccionarHorario(h.id, dia.key)
                        }
                        disabled={deshabilitada}
                        title={
                          cancelada
                            ? 'Esta clase fue cancelada'
                            : bloqueada
                            ? 'Cierra 4 horas antes de que empiece'
                            : undefined
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                          estaSeleccionado
                            ? 'bg-cyan-brand text-ink border-cyan-brand scale-110'
                            : reservada
                            ? 'bg-cyan-brand text-ink border-cyan-brand'
                            : deshabilitada
                            ? 'bg-white/5 text-white/20 border-white/10 cursor-not-allowed'
                            : 'bg-white/5 text-white border-white/15 hover:border-cyan-brand/60 active:scale-95'
                        }`}
                      >
                        {estaSeleccionado ? (
                          <span className="flex items-center gap-1">
                            <Check size={14} /> {h.hora}
                          </span>
                        ) : (
                          h.hora
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
