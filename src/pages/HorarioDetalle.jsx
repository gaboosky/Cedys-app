import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservaBloqueada } from '../lib/horarioUtils';
import {
  ArrowLeft,
  Clock,
  User,
  Users,
  Check,
  AlertCircle,
  Bell,
} from 'lucide-react';

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
  } = useAuth();
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

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

  const reservada = reservas.some(
    (r) =>
      r.horario_id === horarioId &&
      r.fecha === fecha &&
      r.usuario_id === usuarioActual.id
  );
  const lleno = inscritos.length >= horario.cupo_max;
  const cuposDisponibles = Math.max(0, horario.cupo_max - inscritos.length);
  const cancelada = horarioEstaCancelado(horarioId, fecha);
  const mensajeCancelacion = mensajeCancelacionDe(horarioId, fecha);
  const bloqueada =
    reservaBloqueada(fecha, horario.hora, horasAnticipacion) || cancelada;
  const enListaEspera = estaEnListaEspera(horarioId, fecha);
  const totalEnEspera = listaEsperaDe(horarioId, fecha).length;

  const fechaObj = new Date(fecha + 'T00:00:00');
  const diaSemana = fechaObj.toLocaleDateString('es-CL', { weekday: 'long' });
  const fechaCorta = fechaObj.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
  });

  async function handleReservar() {
    setEnviando(true);
    const resultado = await reservarClase(horarioId, fecha);
    setEnviando(false);
    setMensaje(resultado);
    setTimeout(() => setMensaje(null), 3000);
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
            {horario.coach_nombre || 'Por confirmar'}
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
        <div className="w-full flex items-center justify-center gap-2 bg-cyan-brand/15 border border-cyan-brand/30 text-cyan-brand rounded-2xl py-4 font-medium">
          <Check size={18} /> Ya tienes esta reserva
        </div>
      ) : cancelada ? (
        <div className="w-full text-center bg-yellow-400/10 border border-yellow-400/30 text-yellow-200 rounded-2xl py-4 text-sm px-4">
          Esta clase fue cancelada
          {mensajeCancelacion ? `: ${mensajeCancelacion}` : ' para esta fecha.'}
        </div>
      ) : bloqueada ? (
        <div className="w-full text-center bg-white/5 border border-white/10 text-white/40 rounded-2xl py-4 text-sm">
          Ya no se puede reservar este horario (falta menos de 4 horas para que
          empiece)
        </div>
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
    </div>
  );
}
