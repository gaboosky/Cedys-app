import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Calendar,
  LayoutGrid,
  UserCheck,
  DollarSign,
  Dumbbell,
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
      <p className="font-display text-3xl text-white mb-6">Dashboard</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat icon={Users} label="Usuarios activos" value={totalUsuarios} />
        <Stat icon={Users} label="Coaches" value={totalCoaches} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
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
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat
          icon={UserCheck}
          label="Solicitudes pendientes"
          value={solicitudesPendientes}
          destacar={solicitudesPendientes > 0}
        />
        <Stat icon={Dumbbell} label="Rutinas activas" value={rutinasActivas} />
      </div>

      <div className="bg-cyan-brand/10 border border-cyan-brand/30 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={16} className="text-cyan-brand" />
          <p className="text-white/60 text-sm">Ingreso mensual estimado</p>
        </div>
        <p className="font-display text-3xl text-cyan-brand">
          ${ingresoMensualEstimado.toLocaleString('es-CL')}
        </p>
        <p className="text-white/30 text-xs mt-1">
          Según planes activos asignados
        </p>
      </div>

      {planesPorVencer.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/60 text-sm font-medium mb-2">
            Planes por vencer
          </p>
          <div className="flex flex-col gap-1">
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
          : 'bg-white/5 border-white/10'
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
