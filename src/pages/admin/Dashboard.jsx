import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mesActualKey, mesDe, totalDe, pendientesDeCobro, formatearPesos, vencimientoDe } from '../../lib/ingresos';
import { pendientesDeContacto, numeroWhatsapp } from '../../lib/seguimiento';
import { cumpleanosProximos } from '../../lib/cumpleanos';
import {
  Users,
  Calendar,
  LayoutGrid,
  UserCheck,
  DollarSign,
  AlertTriangle,
  CalendarCheck,
  Clock,
  ClipboardCheck,
  UserX,
  Cake,
  MessageCircle,
} from 'lucide-react';

export default function Dashboard() {
  const {
    usuarios,
    horarios,
    reservas,
    planes,
    clasesRealizadasConAlumnosEnRango,
    clasesPorFinalizarEnRango,
    horarioEstaCancelado,
    sesionesRestantes,
    solicitudesFueraPlazo,
    ausenciasCoach,
    pagos,
    diasRenovacion,
    solicitudesPrueba,
  } = useAuth();
  const pruebasPendientes = (solicitudesPrueba || []).filter((s) => s.estado === 'pendiente').length;
  const enRiesgo = pendientesDeContacto(usuarios, reservas, planes, diasRenovacion);
  const cumpleanos = cumpleanosProximos(usuarios, 7);
  const fueraPlazoPendientes = (solicitudesFueraPlazo || []).filter(
    (s) => s.estado === 'pendiente'
  ).length;
  const navigate = useNavigate();
  const ausenciasPendientes = (ausenciasCoach || []).filter((a) => a.estado === 'pendiente').length;

  const pad = (n) => String(n).padStart(2, '0');
  const ahora = new Date();
  const desdeMes = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-01`;
  const hastaMes = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(
    ahora.getDate()
  )}`;
  const clasesRealizadasMes = clasesRealizadasConAlumnosEnRango(
    desdeMes,
    hastaMes
  ).length;

  const totalUsuarios = usuarios.filter((u) => u.estado === 'activo').length;
  const totalCoaches = usuarios.filter(
    (u) => u.rol === 'coach' || u.rol === 'head_coach'
  ).length;
  const reservasActivas = reservas.length;
  const totalHorarios = horarios.length;
  const solicitudesPendientes = usuarios.filter(
    (u) => u.estado === 'pendiente'
  ).length;

  // Ingresos reales del mes: suma de los pagos registrados este mes.
  const mesHoy = mesActualKey();
  const ingresoMes = totalDe((pagos || []).filter((p) => mesDe(p.fecha) === mesHoy));
  const pendientesCobro = pendientesDeCobro(usuarios, planes, diasRenovacion);
  const porCobrar = pendientesCobro.reduce((acc, p) => acc + p.monto, 0);

  // Alumnos por renovar: vencen en 7 días o menos (o ya vencieron), o les queda 1 clase o ninguna
  const planesPorVencer = usuarios
    .filter((u) => u.rol === 'usuario' && u.estado === 'activo' && u.plan_id)
    .map((u) => {
      const v = vencimientoDe(u, planes, diasRenovacion);
      const restantes = sesionesRestantes(u);
      let motivo = null;
      if (v && v.dias < 0) motivo = `venció hace ${-v.dias} día${v.dias === -1 ? '' : 's'}`;
      else if (v && v.dias === 0) motivo = 'vence hoy';
      else if (v && v.dias <= 7) motivo = `vence en ${v.dias} día${v.dias === 1 ? '' : 's'}`;
      else if (restantes !== null && restantes <= 1) motivo = restantes <= 0 ? 'sin clases disponibles' : 'le queda 1 clase';
      return motivo ? { u, motivo, orden: v ? v.dias : 99 } : null;
    })
    .filter(Boolean)
    .sort((x, y) => x.orden - y.orden);

  // Clases de hoy (sin contar las canceladas)
  const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const clasesHoy = horarios.filter(
    (h) =>
      (h.fecha_unica ? h.fecha_unica === hastaMes : h.dia === NOMBRES_DIA[ahora.getDay()]) &&
      !horarioEstaCancelado(h.id, hastaMes)
  ).length;

  // Clases que ya pasaron, tuvieron alumnos y nadie finalizó (últimos 30 días)
  const hace30 = (() => {
    const d = new Date(hastaMes + 'T12:00:00');
    d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();
  const sinFinalizar = clasesPorFinalizarEnRango(hace30, hastaMes).length;

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div
        onClick={() => navigate('/ingreso-detalle')}
        className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-6 mb-6 overflow-hidden cursor-pointer transition-transform active:scale-[0.99]"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
        <div className="flex items-center gap-1.5 mb-1">
          <DollarSign size={14} className="text-cyan-brand" />
          <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">
            Ingresos del mes
          </p>
        </div>
        <p
          className="font-display text-white leading-none"
          style={{ fontSize: '2.5rem' }}
        >
          {formatearPesos(ingresoMes)}
        </p>
        <p className="text-white/40 text-xs mt-2">
          {pendientesCobro.length > 0
            ? `Por cobrar ${formatearPesos(porCobrar)} (${pendientesCobro.length} alumno${pendientesCobro.length !== 1 ? 's' : ''}) · toca para ver el detalle`
            : 'Pagos registrados este mes · toca para ver el detalle'}
        </p>
      </div>

      {fueraPlazoPendientes > 0 && (
        <button
          onClick={() => navigate('/usuarios#fuera-de-plazo')}
          className="w-full flex items-center justify-between bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-4 py-3 mb-6 transition-transform active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-yellow-200 text-sm font-medium">
            <Clock size={16} />
            {fueraPlazoPendientes} solicitud
            {fueraPlazoPendientes !== 1 ? 'es' : ''} de hora fuera de plazo
          </span>
          <span className="text-yellow-200/70 text-xs">Revisar →</span>
        </button>
      )}

      {pruebasPendientes > 0 && (
        <button
          onClick={() => navigate('/pruebas')}
          className="w-full flex items-center justify-between bg-cyan-brand/10 border border-cyan-brand/40 rounded-2xl px-4 py-3 mb-3 transition-transform active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-cyan-brand text-sm font-medium">
            <CalendarCheck size={16} />
            {pruebasPendientes === 1
              ? '1 persona pidió una sesión de prueba'
              : `${pruebasPendientes} personas pidieron sesión de prueba`}
          </span>
          <span className="text-cyan-brand/70 text-xs">Contactar →</span>
        </button>
      )}

      {enRiesgo > 0 && (
        <button
          onClick={() => navigate('/seguimiento')}
          className="w-full flex items-center justify-between bg-orange-400/10 border border-orange-400/30 rounded-2xl px-4 py-3 mb-3 transition-transform active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-orange-200 text-sm font-medium">
            <UserX size={16} />
            {enRiesgo === 1 ? '1 alumno en riesgo de irse' : `${enRiesgo} alumnos en riesgo de irse`}
          </span>
          <span className="text-orange-200/70 text-xs">Ver →</span>
        </button>
      )}

      {ausenciasPendientes > 0 && (
        <button
          onClick={() => navigate('/clases-admin')}
          className="w-full flex items-center justify-between bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-4 py-3 mb-6 transition-transform active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-yellow-200 text-sm font-medium">
            <Clock size={16} />
            {ausenciasPendientes === 1
              ? 'Un coach avisó que no puede hacer una clase'
              : `${ausenciasPendientes} avisos de coaches que no pueden hacer su clase`}
          </span>
          <span className="text-yellow-200/70 text-xs">Ver clases →</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat
          icon={Users}
          label="Alumnos activos"
          value={totalUsuarios}
          onClick={() => navigate('/usuarios')}
        />
        <Stat
          icon={Calendar}
          label="Clases de hoy"
          value={clasesHoy}
          onClick={() => navigate('/clases-admin')}
        />
        <Stat
          icon={AlertTriangle}
          label="Por renovar (7 días)"
          value={planesPorVencer.length}
          destacar={planesPorVencer.length > 0}
          onClick={() => navigate('/renovaciones')}
        />
        <Stat
          icon={ClipboardCheck}
          label="Clases sin finalizar"
          value={sinFinalizar}
          destacar={sinFinalizar > 0}
          onClick={() => navigate('/clases-realizadas#por-finalizar')}
        />
        <Stat
          icon={CalendarCheck}
          label="Clases realizadas (mes)"
          value={clasesRealizadasMes}
          onClick={() => navigate('/clases-realizadas')}
        />
        <Stat
          icon={UserCheck}
          label="Solicitudes pendientes"
          value={solicitudesPendientes}
          destacar={solicitudesPendientes > 0}
          onClick={() => navigate('/usuarios#solicitudes-pendientes')}
        />
      </div>

      {cumpleanos.length > 0 && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
          <p className="flex items-center gap-1.5 text-white/60 text-sm font-medium mb-3">
            <Cake size={14} className="text-pink-300" /> Cumpleaños de la semana
          </p>
          <div className="flex flex-col gap-2">
            {cumpleanos.map(({ usuario: u, fecha, enDias, edad }) => {
              const numero = numeroWhatsapp(u.telefono);
              const saludo = `¡Feliz cumpleaños ${(u.nombre || '').split(' ')[0]}! 🎉🎂 Todo el equipo de CED&S te desea un gran día. ¡Te esperamos para celebrarlo entrenando! 💪`;
              return (
                <div key={u.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">
                      {u.nombre} {enDias === 0 && '🎂'}
                    </p>
                    <p className={`text-xs ${enDias === 0 ? 'text-pink-300' : 'text-white/45'}`}>
                      {enDias === 0
                        ? `Hoy cumple ${edad}`
                        : `${fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric' })} · cumple ${edad}`}
                    </p>
                  </div>
                  {numero && (
                    <a
                      href={`https://wa.me/${numero}?text=${encodeURIComponent(saludo)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 shrink-0 bg-[#25D366]/15 border border-[#25D366]/40 rounded-lg px-2.5 py-1.5 text-[#7ee2a5] text-xs font-semibold"
                    >
                      <MessageCircle size={12} /> Saludar
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {planesPorVencer.length > 0 && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="flex items-center gap-1.5 text-white/60 text-sm font-medium">
              <AlertTriangle size={14} className="text-yellow-400" /> Planes por renovar
            </p>
            <button onClick={() => navigate('/renovaciones')} className="text-cyan-brand text-xs">
              Ver todos →
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {planesPorVencer.slice(0, 8).map(({ u, motivo }) => (
              <p key={u.id} className="text-white/70 text-sm flex justify-between gap-2">
                <span className="truncate">{u.nombre}</span>
                <span className="text-white/45 text-xs shrink-0">{motivo}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, destacar, onClick }) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 border transition-transform ${
        destacar
          ? 'bg-cyan-brand/10 border-cyan-brand/30'
          : 'bg-white/[0.04] border-white/10'
      } ${
        clickable
          ? 'cursor-pointer active:scale-[0.97] hover:border-white/20'
          : ''
      }`}
    >
      <Icon
        size={18}
        className={`mb-2 ${
          destacar ? 'text-cyan-brand' : 'text-cyan-brand/70'
        }`}
      />
      <p className="font-display text-3xl text-white leading-none">{value}</p>
      <p className="text-white/40 text-xs mt-1">{label}</p>
    </div>
  );
}
