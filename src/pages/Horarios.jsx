import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservaBloqueada, horaAFecha } from '../lib/horarioUtils';
import { Check, AlertCircle } from 'lucide-react';

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
    motivoNoPuedeReservar,
    coachDeClase,
  } = useAuth();
  const navigate = useNavigate();
  const [seleccionado, setSeleccionado] = useState(null);

  const restantes = sesionesRestantes(usuarioActual);
  const dias = proximosDiasHabiles(7);
  // Aviso general si el alumno no puede reservar (sin plan, vencido, congelado...)
  const avisoPlan = motivoNoPuedeReservar(usuarioActual, null, dias[0]?.key);

  function contarInscritos(horarioId, fecha) {
    return reservas.filter(
      (r) => r.horario_id === horarioId && r.fecha === fecha && r.estado === 'confirmada'
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
      {avisoPlan && (
        <div className="flex items-start gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-2.5 mb-4">
          <AlertCircle size={16} className="text-yellow-300 shrink-0 mt-0.5" />
          <p className="text-yellow-100/90 text-sm">{avisoPlan}</p>
        </div>
      )}
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
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {horariosDelDia.map((h) => {
                    const clave = `${h.id}_${dia.key}`;
                    const inscritos = contarInscritos(h.id, dia.key);
                    const cupos = Math.max(0, h.cupo_max - inscritos);
                    const lleno = cupos === 0;
                    const reservada = estaReservada(h.id, dia.key);
                    const cancelada = horarioEstaCancelado(h.id, dia.key);
                    const yaPaso = horaAFecha(dia.key, h.hora).getTime() <= Date.now();
                    const cerradaPorTiempo = reservaBloqueada(dia.key, h.hora, horasAnticipacion);
                    // Clase de hoy que ya cerró reservas pero aún no empieza: se puede pedir hora fuera de plazo.
                    const fueraDePlazo =
                      !reservada && !cancelada && cerradaPorTiempo && dia.esHoy && !yaPaso;
                    const solicitudPendiente =
                      solicitudFueraPlazoDe(h.id, dia.key)?.estado === 'pendiente';
                    // Las clases llenas SÍ se pueden abrir (para anotarse en la lista de espera).
                    const deshabilitada =
                      !reservada && (cancelada || yaPaso || (cerradaPorTiempo && !fueraDePlazo));
                    const estaSeleccionado = seleccionado === clave;

                    let etiqueta;
                    let colorEtiqueta = 'text-white/45';
                    if (reservada) {
                      etiqueta = 'Reservada';
                      colorEtiqueta = 'text-ink/70';
                    } else if (cancelada) {
                      etiqueta = 'Cancelada';
                      colorEtiqueta = 'text-red-300/80';
                    } else if (yaPaso) {
                      etiqueta = 'Finalizó';
                    } else if (solicitudPendiente) {
                      etiqueta = 'En revisión';
                      colorEtiqueta = 'text-yellow-200';
                    } else if (fueraDePlazo) {
                      etiqueta = 'Pedir hora';
                      colorEtiqueta = 'text-yellow-200/80';
                    } else if (cerradaPorTiempo) {
                      etiqueta = 'Cerrada';
                    } else if (lleno) {
                      etiqueta = 'Lleno · espera';
                      colorEtiqueta = 'text-yellow-200/80';
                    } else {
                      etiqueta = `${cupos} cupo${cupos !== 1 ? 's' : ''}`;
                      colorEtiqueta = cupos <= 2 ? 'text-yellow-200/80' : 'text-cyan-brand/80';
                    }

                    return (
                      <button
                        key={h.id}
                        onClick={() => !deshabilitada && seleccionarHorario(h.id, dia.key)}
                        disabled={deshabilitada}
                        className={`rounded-xl border px-2 py-2 text-left transition-all duration-200 ${
                          estaSeleccionado || reservada
                            ? 'bg-cyan-brand text-ink border-cyan-brand'
                            : solicitudPendiente
                            ? 'bg-yellow-400/15 text-yellow-100 border-yellow-400/40'
                            : fueraDePlazo
                            ? 'bg-white/5 text-white/70 border-dashed border-yellow-400/40 active:scale-95'
                            : cancelada
                            ? 'bg-red-500/5 text-white/30 border-red-500/20 line-through decoration-red-400/50'
                            : deshabilitada
                            ? 'bg-white/[0.03] text-white/25 border-white/10'
                            : lleno
                            ? 'bg-white/5 text-white/70 border-yellow-400/25 active:scale-95'
                            : 'bg-white/5 text-white border-white/15 hover:border-cyan-brand/60 active:scale-95'
                        } ${estaSeleccionado ? 'scale-105' : ''}`}
                      >
                        <span className="flex items-center gap-1 text-base font-semibold leading-tight">
                          {(estaSeleccionado || reservada) && <Check size={14} />}
                          {h.hora}
                        </span>
                        <span className={`block text-[11px] leading-tight mt-0.5 no-underline ${colorEtiqueta}`}>
                          {etiqueta}
                        </span>
                        {coachDeClase(h, dia.key).nombre && (
                          <span
                            className={`block text-[10px] leading-tight mt-0.5 truncate ${
                              estaSeleccionado || reservada ? 'text-ink/60' : 'text-white/35'
                            }`}
                          >
                            {coachDeClase(h, dia.key).nombre.split(' ')[0]}
                          </span>
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
