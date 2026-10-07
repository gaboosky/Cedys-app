import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservaBloqueada, horaAFecha } from '../lib/horarioUtils';
import { Check } from 'lucide-react';

// Convierte un Date a "YYYY-MM-DD" usando el calendario LOCAL (no UTC).
// fecha.toISOString() convierte a UTC y puede saltar al día siguiente en horario
// de tarde/noche en Chile (UTC-3), guardando la reserva con la fecha equivocada.
function soloFechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

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
        key: soloFechaLocal(fecha),
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
    horasAnticipacion,
    solicitudFueraPlazoDe,
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
      {restantes !== null && (
        <div className="flex justify-end mb-4">
          <span className="text-cyan-brand text-sm font-medium">
            {restantes} sesiones disponibles
          </span>
        </div>
      )}

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
                    const cerradaPorTiempo = reservaBloqueada(
                      dia.key,
                      h.hora,
                      horasAnticipacion
                    );
                    const bloqueada =
                      !reservada && (cerradaPorTiempo || cancelada);
                    // Clase de hoy que ya cerró reservas pero aún no empieza: se puede entrar a pedir hora fuera de plazo.
                    const fueraDePlazo =
                      !reservada &&
                      !cancelada &&
                      cerradaPorTiempo &&
                      dia.esHoy &&
                      horaAFecha(dia.key, h.hora).getTime() > Date.now();
                    const solicitudPendiente =
                      solicitudFueraPlazoDe(h.id, dia.key)?.estado ===
                      'pendiente';
                    const deshabilitada =
                      (lleno || bloqueada) && !reservada && !fueraDePlazo;
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
                            : fueraDePlazo
                            ? 'Reservas cerradas: puedes solicitar hora fuera de plazo'
                            : bloqueada
                            ? `Cierra ${horasAnticipacion} horas antes de que empiece`
                            : undefined
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                          estaSeleccionado
                            ? 'bg-cyan-brand text-ink border-cyan-brand scale-110'
                            : reservada
                            ? 'bg-cyan-brand text-ink border-cyan-brand'
                            : solicitudPendiente
                            ? 'bg-yellow-400/15 text-yellow-200 border-yellow-400/40'
                            : fueraDePlazo
                            ? 'bg-white/5 text-white/50 border-dashed border-yellow-400/40 active:scale-95'
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
