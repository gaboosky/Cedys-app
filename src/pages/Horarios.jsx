import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservaBloqueada, horaAFecha } from '../lib/horarioUtils';
import {
  Check,
  AlertCircle,
  Ticket,
  Sunrise,
  Sunset,
  ChevronRight,
  Clock,
} from 'lucide-react';

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
        diaCorto: nombreCapitalizado.slice(0, 3),
        numero: fecha.getDate(),
        esHoy: offset === 0,
      });
    }
    offset++;
  }
  return dias;
}

export default function Horarios() {
  const {
    horarios: todosHorarios,
    reservas,
    usuarioActual,
    sesionesRestantes,
    horarioEstaCancelado,
    horasAnticipacion,
    solicitudFueraPlazoDe,
    motivoNoPuedeReservar,
    coachDeClase,
  } = useAuth();
  // Las clases HIIT tienen su propia pestaña
  const horarios = todosHorarios.filter((h) => h.tipo !== 'hiit');
  const navigate = useNavigate();
  const [seleccionado, setSeleccionado] = useState(null);
  const [diaElegido, setDiaElegido] = useState(null);

  const restantes = sesionesRestantes(usuarioActual);
  const dias = proximosDiasHabiles(7);
  // Aviso general si el alumno no puede reservar (sin plan, vencido, congelado...)
  const avisoPlan = motivoNoPuedeReservar(usuarioActual, null, dias[0]?.key);

  function contarInscritos(horarioId, fecha) {
    return reservas.filter(
      (r) =>
        r.horario_id === horarioId &&
        r.fecha === fecha &&
        r.estado === 'confirmada'
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

  function clasesDelDia(dia) {
    return horarios
      .filter((h) =>
        h.fecha_unica ? h.fecha_unica === dia.key : h.dia === dia.nombreDia
      )
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  function estadoDe(h, dia) {
    const inscritos = contarInscritos(h.id, dia.key);
    const cupos = Math.max(0, h.cupo_max - inscritos);
    const lleno = cupos === 0;
    const reservada = estaReservada(h.id, dia.key);
    const cancelada = horarioEstaCancelado(h.id, dia.key);
    const yaPaso = horaAFecha(dia.key, h.hora).getTime() <= Date.now();
    const cerradaPorTiempo = reservaBloqueada(
      dia.key,
      h.hora,
      horasAnticipacion
    );
    // Clase de hoy que ya cerró reservas pero aún no empieza: se puede pedir hora fuera de plazo.
    const fueraDePlazo =
      !reservada && !cancelada && cerradaPorTiempo && dia.esHoy && !yaPaso;
    const solicitudPendiente =
      solicitudFueraPlazoDe(h.id, dia.key)?.estado === 'pendiente';
    // Las clases llenas SÍ se pueden abrir (para anotarse en la lista de espera).
    const deshabilitada =
      !reservada &&
      (cancelada || yaPaso || (cerradaPorTiempo && !fueraDePlazo));

    let etiqueta;
    let tono = 'neutro';
    if (reservada) {
      etiqueta = yaPaso ? 'Asististe' : '¡Te esperamos!';
      tono = 'reservada';
    } else if (cancelada) {
      etiqueta = 'Cancelada';
      tono = 'cancelada';
    } else if (yaPaso) {
      etiqueta = 'Finalizó';
      tono = 'apagada';
    } else if (solicitudPendiente) {
      etiqueta = 'En revisión';
      tono = 'amarillo';
    } else if (fueraDePlazo) {
      etiqueta = 'Pedir hora';
      tono = 'amarillo';
    } else if (cerradaPorTiempo) {
      etiqueta = 'Cerrada';
      tono = 'apagada';
    } else if (lleno) {
      etiqueta = 'Lleno · lista de espera';
      tono = 'amarillo';
    } else if (cupos <= 2) {
      etiqueta = `¡Últimos ${cupos === 1 ? 'cupo' : `${cupos} cupos`}!`;
      tono = 'amarillo';
    } else {
      etiqueta = `${cupos} cupos libres`;
      tono = 'libre';
    }
    return {
      inscritos,
      cupos,
      lleno,
      reservada,
      cancelada,
      yaPaso,
      fueraDePlazo,
      solicitudPendiente,
      deshabilitada,
      etiqueta,
      tono,
    };
  }

  // Día que se muestra: el elegido, o hoy (si a hoy ya no le quedan clases, el siguiente día).
  const diaPorDefecto =
    dias.find((d) => clasesDelDia(d).some((h) => !estadoDe(h, d).yaPaso)) ||
    dias[0];
  const diaActivo = dias.find((d) => d.key === diaElegido) || diaPorDefecto;
  const clasesActivas = diaActivo ? clasesDelDia(diaActivo) : [];

  const PERIODOS = [
    { nombre: 'Mañana · AM', icono: Sunrise, desde: '00:00', hasta: '12:00' },
    { nombre: 'Tarde · PM', icono: Sunset, desde: '12:00', hasta: '24:00' },
  ];

  return (
    <div className="min-h-screen bg-ink pb-24 pt-5">
      <div className="px-6">
        {avisoPlan && (
          <div className="flex items-start gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-2.5 mb-4">
            <AlertCircle
              size={16}
              className="text-yellow-300 shrink-0 mt-0.5"
            />
            <p className="text-yellow-100/90 text-sm">{avisoPlan}</p>
          </div>
        )}

        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-white font-display text-2xl leading-none">
              ¿Cuándo entrenas?
            </p>
            <p className="text-white/40 text-xs mt-1.5">
              Elige un día y reserva tu clase
            </p>
          </div>
          {restantes !== null && (
            <div className="flex items-center gap-1.5 bg-cyan-brand/10 border border-cyan-brand/30 rounded-full pl-2 pr-3 py-1 shrink-0">
              <Ticket size={13} className="text-cyan-brand" />
              <span className="text-cyan-brand text-xs font-semibold">
                {restantes} {restantes === 1 ? 'sesión' : 'sesiones'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Selector de días */}
      <div
        className="flex gap-2 overflow-x-auto px-6 pb-2 no-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        {dias.map((d) => {
          const activo = d.key === diaActivo?.key;
          const tengoClase = clasesDelDia(d).some((h) =>
            estaReservada(h.id, d.key)
          );
          return (
            <button
              key={d.key}
              onClick={() => setDiaElegido(d.key)}
              className={`relative shrink-0 w-[54px] rounded-2xl py-2.5 flex flex-col items-center border transition-colors duration-150 [-webkit-tap-highlight-color:transparent] select-none ${
                activo
                  ? 'bg-cyan-brand border-cyan-brand text-ink'
                  : 'bg-white/[0.04] border-white/10 text-white'
              }`}
            >
              <span
                className={`text-[10px] uppercase font-semibold whitespace-nowrap ${
                  activo ? 'text-ink/70' : 'text-white/40'
                }`}
              >
                {d.esHoy ? 'Hoy' : d.diaCorto}
              </span>
              <span className="font-display text-xl leading-tight">
                {d.numero}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                  tengoClase
                    ? activo
                      ? 'bg-ink'
                      : 'bg-cyan-brand'
                    : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="px-6 mt-3">
        {diaActivo && (
          <p className="text-white/40 text-xs mb-3">
            {diaActivo.esHoy ? 'Hoy, ' : `${diaActivo.nombreDia} `}
            {diaActivo.fechaCorta}
          </p>
        )}

        {clasesActivas.length === 0 && (
          <div className="text-center py-12">
            <Clock size={30} className="text-white/15 mx-auto mb-3" />
            <p className="text-white/35 text-sm">No hay clases este día.</p>
          </div>
        )}

        {PERIODOS.map((periodo) => {
          const delPeriodo = clasesActivas.filter(
            (h) => h.hora >= periodo.desde && h.hora < periodo.hasta
          );
          if (delPeriodo.length === 0) return null;
          const Icono = periodo.icono;
          return (
            <div key={periodo.nombre} className="mb-5">
              <p className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-wide mb-2">
                <Icono size={13} /> {periodo.nombre}
              </p>
              <div className="flex flex-col gap-2">
                {delPeriodo.map((h) => {
                  const e = estadoDe(h, diaActivo);
                  const clave = `${h.id}_${diaActivo.key}`;
                  const estaSeleccionado = seleccionado === clave;
                  const coach = coachDeClase(h, diaActivo.key).nombre || '';
                  const iniciales = coach
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase();
                  const destacada = e.reservada || estaSeleccionado;
                  const apagada = e.deshabilitada && !e.reservada;

                  const colorEtiqueta = destacada
                    ? 'text-ink/75'
                    : {
                        libre: 'text-cyan-brand',
                        amarillo: 'text-yellow-200',
                        cancelada: 'text-red-300/80',
                        apagada: 'text-white/35',
                        neutro: 'text-white/50',
                      }[e.tono];

                  const puntos = Math.min(h.cupo_max, 12);
                  return (
                    <button
                      key={h.id}
                      onClick={() =>
                        !e.deshabilitada &&
                        seleccionarHorario(h.id, diaActivo.key)
                      }
                      disabled={e.deshabilitada}
                      className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                        destacada
                          ? 'bg-cyan-brand border-cyan-brand text-ink'
                          : e.solicitudPendiente
                          ? 'bg-yellow-400/10 border-yellow-400/40 text-white'
                          : e.fueraDePlazo
                          ? 'bg-white/[0.04] border-dashed border-yellow-400/40 text-white active:scale-[0.98]'
                          : e.cancelada
                          ? 'bg-red-500/5 border-red-500/20 text-white/35'
                          : apagada
                          ? 'bg-white/[0.02] border-white/[0.06] text-white/30'
                          : 'bg-white/[0.05] border-white/10 text-white hover:border-cyan-brand/50 active:scale-[0.98]'
                      } ${estaSeleccionado ? 'scale-[1.02]' : ''}`}
                    >
                      {/* Hora */}
                      <div className="w-[62px] shrink-0">
                        <p
                          className={`font-display text-2xl leading-none ${
                            e.cancelada
                              ? 'line-through decoration-red-400/50'
                              : ''
                          }`}
                        >
                          {h.hora}
                        </p>
                      </div>

                      <div
                        className={`w-px self-stretch ${
                          destacada ? 'bg-ink/20' : 'bg-white/10'
                        }`}
                      />

                      {/* Coach y cupos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {coach && (
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                destacada
                                  ? 'bg-ink/15 text-ink'
                                  : apagada
                                  ? 'bg-white/5 text-white/30'
                                  : 'bg-cyan-brand/15 text-cyan-brand'
                              }`}
                            >
                              {iniciales}
                            </span>
                          )}
                          <p
                            className={`text-sm truncate ${
                              destacada
                                ? 'text-ink/80'
                                : apagada
                                ? 'text-white/30'
                                : 'text-white/70'
                            }`}
                          >
                            {coach ? `con ${coach.split(' ')[0]}` : 'Clase'}
                          </p>
                        </div>
                        {!e.cancelada && !apagada && (
                          <div className="flex items-center gap-1 mt-2">
                            {Array.from({ length: puntos }).map((_, i) => (
                              <span
                                key={i}
                                className={`h-1.5 flex-1 max-w-[18px] rounded-full ${
                                  i < e.inscritos
                                    ? destacada
                                      ? 'bg-ink/60'
                                      : e.lleno || e.cupos <= 2
                                      ? 'bg-yellow-300/80'
                                      : 'bg-cyan-brand/80'
                                    : destacada
                                    ? 'bg-ink/15'
                                    : 'bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        <p
                          className={`text-[11px] font-medium mt-1 ${colorEtiqueta}`}
                        >
                          {e.etiqueta}
                        </p>
                      </div>

                      {destacada ? (
                        <div className="w-8 h-8 rounded-full bg-ink/15 flex items-center justify-center shrink-0">
                          <Check size={17} className="text-ink" />
                        </div>
                      ) : (
                        !e.deshabilitada && (
                          <ChevronRight
                            size={18}
                            className="text-white/30 shrink-0"
                          />
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
