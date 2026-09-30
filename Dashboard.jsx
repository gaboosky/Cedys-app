import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Calendar,
  LayoutGrid,
  UserCheck,
  DollarSign,
  AlertTriangle,
  CalendarCheck,
  Clock,
} from 'lucide-react';

export default function Dashboard() {
  const {
    usuarios,
    horarios,
    reservas,
    planes,
    clasesRealizadasConAlumnosEnRango,
    solicitudesFueraPlazo,
  } = useAuth();
  const fueraPlazoPendientes = (solicitudesFueraPlazo || []).filter(
    (s) => s.estado === 'pendiente'
  ).length;
  const navigate = useNavigate();

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

  const ingresoMensualEstimado = usuarios
    .filter((u) => u.estado === 'activo' && u.plan_id && !u.excluido_ingreso)
    .reduce(
      (acc, u) =>
        acc +
        (u.plan_monto_personalizado || planes[u.plan_id]?.valor_con_iva || 0),
      0
    );

  const planesPorVencer = usuarios.filter((u) => {
    if (!u.plan_id) return false;
    const plan = planes[u.plan_id];
    if (!plan || plan.cantidad_sesiones === null) return false;
    return plan.cantidad_sesiones - u.sesiones_usadas <= 1;
  });

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
            Ingreso mensual estimado
          </p>
        </div>
        <p
          className="font-display text-white leading-none"
          style={{ fontSize: '2.5rem' }}
        >
          ${ingresoMensualEstimado.toLocaleString('es-CL')}
        </p>
        <p className="text-white/40 text-xs mt-2">
          Según planes activos asignados · toca para ver el detalle
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

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat
          icon={Users}
          label="Usuarios activos"
          value={totalUsuarios}
          onClick={() => navigate('/usuarios')}
        />
        <Stat
          icon={Users}
          label="Coaches"
          value={totalCoaches}
          onClick={() => navigate('/coaches')}
        />
        <Stat
          icon={Calendar}
          label="Reservas activas"
          value={reservasActivas}
          onClick={() => navigate('/reservas-activas')}
        />
        <Stat
          icon={LayoutGrid}
          label="Horarios definidos"
          value={totalHorarios}
          onClick={() => navigate('/clases-admin')}
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

      {planesPorVencer.length > 0 && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle size={14} className="text-yellow-400" />
            <p className="text-white/60 text-sm font-medium">
              Planes por vencer
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {planesPorVencer.map((u) => (
              <p key={u.id} className="text-white/70 text-sm">
                {u.nombre} —{' '}
                {planes[u.plan_id].cantidad_sesiones - u.sesiones_usadas}{' '}
                sesión(es) restante(s)
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
