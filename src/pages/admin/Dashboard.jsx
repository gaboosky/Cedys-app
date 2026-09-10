import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Calendar,
  LayoutGrid,
  UserCheck,
  DollarSign,
  Dumbbell,
  AlertTriangle,
} from 'lucide-react';

export default function Dashboard() {
  const { usuarios, horarios, reservas, planes, usuarioRutinas } = useAuth();

  const totalUsuarios = usuarios.filter(
    (u) => u.rol === 'usuario' && u.estado === 'activo'
  ).length;
  const totalCoaches = usuarios.filter((u) => u.rol === 'coach').length;
  const reservasActivas = reservas.length;
  const totalHorarios = horarios.length;
  const solicitudesPendientes = usuarios.filter(
    (u) => u.estado === 'pendiente'
  ).length;
  const rutinasActivas = usuarioRutinas.filter((ur) => ur.activa).length;

  const ingresoMensualEstimado = usuarios
    .filter((u) => u.rol === 'usuario' && u.estado === 'activo' && u.plan_id)
    .reduce((acc, u) => acc + (planes[u.plan_id]?.valor_con_iva || 0), 0);

  const planesPorVencer = usuarios.filter((u) => {
    if (!u.plan_id) return false;
    const plan = planes[u.plan_id];
    if (!plan || plan.cantidad_sesiones === null) return false;
    return plan.cantidad_sesiones - u.sesiones_usadas <= 1;
  });

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-6 mb-6 overflow-hidden">
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
          Según planes activos asignados
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat icon={Users} label="Usuarios activos" value={totalUsuarios} />
        <Stat icon={Users} label="Coaches" value={totalCoaches} />
        <Stat
          icon={Calendar}
          label="Reservas activas"
          value={reservasActivas}
        />
        <Stat
          icon={LayoutGrid}
          label="Horarios definidos"
          value={totalHorarios}
        />
        <Stat
          icon={UserCheck}
          label="Solicitudes pendientes"
          value={solicitudesPendientes}
          destacar={solicitudesPendientes > 0}
        />
        <Stat icon={Dumbbell} label="Rutinas activas" value={rutinasActivas} />
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

function Stat({ icon: Icon, label, value, destacar }) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        destacar
          ? 'bg-cyan-brand/10 border-cyan-brand/30'
          : 'bg-white/[0.04] border-white/10'
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
