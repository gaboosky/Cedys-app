import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservaBloqueada, horaAFecha } from '../lib/horarioUtils';
import {
  ArrowLeft,
  Clock,
  User,
  Users,
  Check,
  AlertCircle,
  Bell,
  Hourglass,
  Send,
  CalendarPlus,
  Repeat,
} from 'lucide-react';
import { descargarIcs, eventoDeReserva } from '../lib/calendario';

function sumarSemanas(fechaISO, semanas) {
  const d = new Date(fechaISO + 'T00:00:00');
  d.setDate(d.getDate() + 7 * semanas);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fechaCortaDe(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function HorarioDetalle() {
  const { horarioId, fecha } = useParams();
  const navigate = useNavigate();
  const {
    horarios,
    reservas,
    usuarios,
    usuarioActual,
    reservarClase,
    horarioEstaCancelado,
    mensajeCancelacionDe,
    horasAnticipacion,
    estaEnListaEspera,
    anotarseListaEspera,
    quitarseListaEspera,
    listaEsperaDe,
    solicitudFueraPlazoDe,
    solicitarFueraDePlazo,
    motivoNoPuedeReservar,
    reservarVarias,
    infoGimnasio,
    coachDeClase,
  } = useAuth();
  const [semanasRepetir, setSemanasRepetir] = useState(4);
  const [resultadoRepetir, setResultadoRepetir] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const yaEnviando = useRef(false);

  const horario = horarios.find((h) => h.id === horarioId);

  if (!horario) {
    return (
      <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
        <button
          onClick={() => navigate('/horarios')}
          className="flex items-center gap-1 text-white/50 text-sm mb-6"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <p className="text-white/50 text-sm">Este horario ya no existe.</p>
      </div>
    );
  }

  const inscritos = reservas
    .filter((r) => r.horario_id === horarioId && r.fecha === fecha)
    .map((r) => usuarios.find((u) => u.id === r.usuario_id))
    .filter(Boolean);

  const miReserva = reservas.find(
    (r) =>
      r.horario_id === horarioId &&
      r.fecha === fecha &&
      r.usuario_id === usuarioActual.id
  );
  const reservada = !!miReserva;
  const motivoPlan = motivoNoPuedeReservar(usuarioActual, horarioId, fecha);
  const lleno = inscritos.length >= horario.cupo_max;
  const cuposDisponibles = Math.max(0, horario.cupo_max - inscritos.length);
  const cancelada = horarioEstaCancelado(horarioId, fecha);
  const mensajeCancelacion = mensajeCancelacionDe(horarioId, fecha);
  const bloqueada =
    reservaBloqueada(fecha, horario.hora, horasAnticipacion) || cancelada;
  const enListaEspera = estaEnListaEspera(horarioId, fecha);
  const totalEnEspera = listaEsperaDe(horarioId, fecha).length;

  // Hora fuera de plazo: solo para clases de HOY que ya cerraron reservas pero todavía no empiezan.
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(hoy.getDate()).padStart(2, '0')}`;
  const yaEmpezo = horaAFecha(fecha, horario.hora).getTime() <= Date.now();
  const puedeSolicitarFueraPlazo = !cancelada && fecha === hoyISO && !yaEmpezo;
  const solicitud = solicitudFueraPlazoDe(horarioId, fecha);

  const fechaObj = new Date(fecha + 'T00:00:00');
  const diaSemana = fechaObj.toLocaleDateString('es-CL', { weekday: 'long' });
  const fechaCorta = fechaObj.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
  });

  async function handleReservar() {
    if (yaEnviando.current) return;
    yaEnviando.current = true;
    setEnviando(true);
    const resultado = await reservarClase(horarioId, fecha);
    setEnviando(false);
    yaEnviando.current = false;
    setMensaje(resultado);
    setTimeout(() => setMensaje(null), 3000);
  }

  async function handleSolicitarFueraPlazo() {
    if (yaEnviando.current) return;
    yaEnviando.current = true;
    setEnviando(true);
    const resultado = await solicitarFueraDePlazo(horarioId, fecha);
    setEnviando(false);
    yaEnviando.current = false;
    setMensaje(resultado);
    setTimeout(() => setMensaje(null), 4000);
  }

  async function handleRepetir() {
    if (yaEnviando.current) return;
    yaEnviando.current = true;
    setEnviando(true);
    const fechas = Array.from({ length: Number(semanasRepetir) }, (_, i) => sumarSemanas(fecha, i));
    const r = await reservarVarias(horarioId, fechas);
    setEnviando(false);
    yaEnviando.current = false;
    setResultadoRepetir(r);
  }

  function agregarAlCalendario() {
    if (!miReserva) return;
    descargarIcs([eventoDeReserva(miReserva, { ...horario, coach_nombre: coachDeClase(horario, fecha).nombre }, infoGimnasio.direccion)], `clase-${fecha}.ics`);
  }

  async function handleListaEspera() {
    setEnviando(true);
    const resultado = await anotarseListaEspera(horarioId, fecha);
    setEnviando(false);
    setMensaje(resultado);
    setTimeout(() => setMensaje(null), 4000);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate('/horarios')}
        className="flex items-center gap-1 text-white/40 text-sm mb-8 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={15} /> Cambiar horario
      </button>

      <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase mb-1">
        Reserva CED&S
      </p>
      <p className="text-white font-display text-2xl leading-tight">
        Confirma tu sesión
      </p>
      <p className="text-white/40 text-xs mt-1 mb-6">
        Revisa los detalles antes de reservar
      </p>

      {/* Tarjeta hero */}
      <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-6 mb-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
        <div className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-widest mb-3">
          <Clock size={13} className="text-cyan-brand" />
          {diaSemana}
        </div>
        <p
          className="font-display text-white leading-none"
          style={{ fontSize: '3.5rem' }}
        >
          {horario.hora}
        </p>
        <p className="text-white/50 text-sm mt-2 capitalize">{fechaCorta}</p>
      </div>

      {/* Info secundaria */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <User size={16} className="text-cyan-brand/70 mb-2" />
          <p className="text-white/40 text-[10px] uppercase tracking-wide">
            Entrenador
          </p>
          <p className="text-white text-sm font-medium mt-0.5">
            {coachDeClase(horario, fecha).nombre || 'Por confirmar'}
          </p>
        </div>
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <Users size={16} className="text-cyan-brand/70 mb-2" />
          <p className="text-white/40 text-[10px] uppercase tracking-wide">
            Disponibilidad
          </p>
          <p className="text-white text-sm font-medium mt-0.5">
            {cuposDisponibles} cupo{cuposDisponibles !== 1 ? 's' : ''}{' '}
            disponible{cuposDisponibles !== 1 ? 's' : ''}
          </p>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-cyan-brand rounded-full transition-all"
              style={{
                width: `${(inscritos.length / horario.cupo_max) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
        Alumnos inscritos
      </p>
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/10 mb-8">
        {inscritos.length === 0 && (
          <p className="text-white/30 text-sm px-4 py-4">
            Nadie inscrito todavía.
          </p>
        )}
        {inscritos.map((u) => (
          <div key={u.id} className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-brand/15 border border-cyan-brand/40 flex items-center justify-center">
              <span className="text-cyan-brand text-xs font-display">
                {u.nombre.charAt(0)}
              </span>
            </div>
            <span className="text-white text-sm">{u.nombre}</span>
          </div>
        ))}
      </div>

      {mensaje && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
            mensaje.ok
              ? 'bg-cyan-brand/15 text-cyan-brand border border-cyan-brand/30'
              : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}
        >
          {mensaje.ok ? <Check size={16} /> : <AlertCircle size={16} />}
          {mensaje.mensaje}
        </div>
      )}

      {reservada ? (
        <div className="flex flex-col gap-2">
          <div className="w-full flex items-center justify-center gap-2 bg-cyan-brand/15 border border-cyan-brand/30 text-cyan-brand rounded-2xl py-4 font-medium">
            <Check size={18} /> Ya tienes esta reserva
          </div>
          <button
            onClick={agregarAlCalendario}
            className="w-full flex items-center justify-center gap-2 bg-white/[0.06] border border-white/10 text-white/80 rounded-2xl py-3 text-sm"
          >
            <CalendarPlus size={16} /> Agregar a mi calendario
          </button>
        </div>
      ) : cancelada ? (
        <div className="w-full text-center bg-yellow-400/10 border border-yellow-400/30 text-yellow-200 rounded-2xl py-4 text-sm px-4">
          Esta clase fue cancelada
          {mensajeCancelacion ? `: ${mensajeCancelacion}` : ' para esta fecha.'}
        </div>
      ) : motivoPlan ? (
        <div className="w-full flex items-start gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-100 rounded-2xl py-4 px-4 text-sm">
          <AlertCircle size={18} className="shrink-0 text-yellow-300" />
          <span>{motivoPlan}</span>
        </div>
      ) : bloqueada ? (
        solicitud?.estado === 'pendiente' ? (
          <div className="w-full flex flex-col items-center justify-center gap-1 bg-yellow-400/10 border border-yellow-400/30 text-yellow-200 rounded-2xl py-4 px-4 text-center">
            <span className="flex items-center gap-2 font-medium">
              <Hourglass size={18} /> A espera de aprobación
            </span>
            <span className="text-yellow-200/60 text-xs">
              El administrador revisará tu solicitud y te llegará una
              notificación.
            </span>
          </div>
        ) : solicitud?.estado === 'rechazada' ? (
          <div className="w-full text-center bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl py-4 text-sm px-4">
            Tu solicitud fuera de plazo para esta clase no fue aprobada.
          </div>
        ) : puedeSolicitarFueraPlazo ? (
          <div className="flex flex-col gap-2">
            <p className="text-white/40 text-xs text-center">
              Las reservas para esta clase ya cerraron (faltan menos de{' '}
              {horasAnticipacion} horas), pero puedes pedirle al administrador
              que te deje entrar.
            </p>
            <button
              onClick={handleSolicitarFueraPlazo}
              disabled={enviando}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-base tracking-wide transition-all active:scale-[0.98] bg-yellow-400/15 border border-yellow-400/40 text-yellow-200 disabled:opacity-50"
            >
              <Send size={17} />
              {enviando ? 'Enviando...' : 'Solicitar hora fuera de plazo'}
            </button>
          </div>
        ) : (
          <div className="w-full text-center bg-white/5 border border-white/10 text-white/40 rounded-2xl py-4 text-sm">
            Ya no se puede reservar este horario (falta menos de{' '}
            {horasAnticipacion} horas para que empiece)
          </div>
        )
      ) : lleno ? (
        enListaEspera ? (
          <div className="w-full flex items-center justify-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-200 rounded-2xl py-4 font-medium">
            <Bell size={18} /> Estás en la lista de espera
          </div>
        ) : (
          <button
            onClick={handleListaEspera}
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-base tracking-wide transition-all active:scale-[0.98] bg-yellow-400/15 border border-yellow-400/30 text-yellow-200 disabled:opacity-50"
          >
            <Bell size={18} />
            {enviando
              ? 'Anotando...'
              : `Anotarme en lista de espera${
                  totalEnEspera > 0 ? ` (${totalEnEspera})` : ''
                }`}
          </button>
        )
      ) : (
        <button
          onClick={handleReservar}
          disabled={enviando}
          className="w-full rounded-2xl py-4 font-bold text-base tracking-wide transition-all active:scale-[0.98] bg-cyan-brand text-ink hover:bg-cyan-brandLight"
        >
          {enviando ? 'Reservando...' : '✓ CONFIRMAR RESERVA'}
        </button>
      )}

      {/* Reserva recurrente: solo horarios fijos que se repiten cada semana */}
      {!horario.fecha_unica && !cancelada && !motivoPlan && !(bloqueada && !reservada) && (
        <div className="mt-4 bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <p className="flex items-center gap-2 text-white text-sm font-semibold">
            <Repeat size={15} className="text-cyan-brand" /> Repetir cada semana
          </p>
          <p className="text-white/40 text-xs mt-1">
            Reserva este mismo horario ({diaSemana} {horario.hora}) varias semanas seguidas. Se saltan las semanas
            llenas o canceladas.
          </p>
          <div className="flex gap-2 mt-3">
            <select
              value={semanasRepetir}
              onChange={(e) => {
                setSemanasRepetir(e.target.value);
                setResultadoRepetir(null);
              }}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
            >
              {[2, 4, 6, 8].map((n) => (
                <option key={n} value={n} className="bg-ink">
                  {n} semanas
                </option>
              ))}
            </select>
            <button
              onClick={handleRepetir}
              disabled={enviando}
              className="flex-1 bg-white/10 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 active:scale-[0.98]"
            >
              {enviando ? 'Reservando...' : `Reservar ${semanasRepetir} semanas`}
            </button>
          </div>
          {resultadoRepetir && (
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-cyan-brand text-xs font-semibold">
                {resultadoRepetir.reservadas} clase{resultadoRepetir.reservadas !== 1 ? 's' : ''} nueva
                {resultadoRepetir.reservadas !== 1 ? 's' : ''} reservada{resultadoRepetir.reservadas !== 1 ? 's' : ''}
              </p>
              {resultadoRepetir.detalle.map((d) => (
                <p key={d.fecha} className={`text-xs ${d.ok ? 'text-white/60' : 'text-red-300/80'}`}>
                  {d.ok ? '✓' : '✕'} {fechaCortaDe(d.fecha)} · {d.motivo}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
