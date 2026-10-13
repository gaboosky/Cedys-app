import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  mesActualKey,
  mesDe,
  totalDe,
  pendientesDeCobro,
  formatearPesos,
  vencimientoDe,
} from '../../lib/ingresos';
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
  Check,
  ChevronRight,
  Snowflake,
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
    congelaciones,
  } = useAuth();
  const pruebasPendientes = (solicitudesPrueba || []).filter(
    (s) => s.estado === 'pendiente'
  ).length;
  const enRiesgo = pendientesDeContacto(
    usuarios,
    reservas,
    planes,
    diasRenovacion
  );
  const cumpleanos = cumpleanosProximos(usuarios, 7);
  const fueraPlazoPendientes = (solicitudesFueraPlazo || []).filter(
    (s) => s.estado === 'pendiente'
  ).length;
  const navigate = useNavigate();
  const ausenciasPendientes = (ausenciasCoach || []).filter(
    (a) => a.estado === 'pendiente'
  ).length;

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
  const ingresoMes = totalDe(
    (pagos || []).filter((p) => mesDe(p.fecha) === mesHoy)
  );
  const pendientesCobro = pendientesDeCobro(usuarios, planes, diasRenovacion);
  const porCobrar = pendientesCobro.reduce((acc, p) => acc + p.monto, 0);

  // Clases de hoy (sin contar las canceladas)
  const NOMBRES_DIA = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];
  const clasesHoy = horarios.filter(
    (h) =>
      (h.fecha_unica
        ? h.fecha_unica === hastaMes
        : h.dia === NOMBRES_DIA[ahora.getDay()]) &&
      !horarioEstaCancelado(h.id, hastaMes)
  ).length;

  // Clases que ya pasaron, tuvieron alumnos y nadie finalizó (últimos 30 días)
  const hace30 = (() => {
    const d = new Date(hastaMes + 'T12:00:00');
    d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();
  const sinFinalizar = clasesPorFinalizarEnRango(hace30, hastaMes).length;

  // Mismos criterios que la página "Por contactar"
  const conPlan = usuarios.filter(
    (u) => u.estado !== 'inactivo' && u.estado !== 'pendiente' && u.plan_id
  );
  const estadosPlan = conPlan.map((u) =>
    vencimientoDe(u, planes, diasRenovacion)
  );
  const vencidos = estadosPlan.filter((v) => v && v.dias <= 0).length;
  const porVencer = estadosPlan.filter(
    (v) => !v || (v.dias > 0 && v.dias <= 7)
  ).length;
  const congelacionesPendientes = (congelaciones || []).filter(
    (c) => c.estado === 'pendiente'
  ).length;
  const plural = (n, uno, varios) => (n === 1 ? uno : varios.replace('#', n));
  const pendientes = [
    {
      clave: 'registros',
      cantidad: solicitudesPendientes,
      icon: UserCheck,
      color: 'bg-cyan-brand/15 text-cyan-brand',
      ir: '/usuarios#solicitudes-pendientes',
      texto: plural(
        solicitudesPendientes,
        '1 registro por aprobar',
        '# registros por aprobar'
      ),
    },
    {
      clave: 'pruebas',
      cantidad: pruebasPendientes,
      icon: CalendarCheck,
      color: 'bg-cyan-brand/15 text-cyan-brand',
      ir: '/pruebas',
      texto: plural(
        pruebasPendientes,
        '1 persona pidió sesión de prueba',
        '# personas pidieron sesión de prueba'
      ),
    },
    {
      clave: 'fuera',
      cantidad: fueraPlazoPendientes,
      icon: Clock,
      color: 'bg-yellow-400/15 text-yellow-200',
      ir: '/usuarios#fuera-de-plazo',
      texto: plural(
        fueraPlazoPendientes,
        '1 pedido de hora fuera de plazo',
        '# pedidos de hora fuera de plazo'
      ),
    },
    {
      clave: 'congelar',
      cantidad: congelacionesPendientes,
      icon: Snowflake,
      color: 'bg-sky-400/15 text-sky-200',
      ir: '/usuarios',
      texto: plural(
        congelacionesPendientes,
        '1 pedido de congelar plan',
        '# pedidos de congelar plan'
      ),
    },
    {
      clave: 'ausencias',
      cantidad: ausenciasPendientes,
      icon: Clock,
      color: 'bg-yellow-400/15 text-yellow-200',
      ir: '/clases-admin',
      texto: plural(
        ausenciasPendientes,
        '1 coach no puede hacer su clase',
        '# avisos de coaches que no pueden hacer su clase'
      ),
    },
    {
      clave: 'sin_finalizar',
      cantidad: sinFinalizar,
      icon: ClipboardCheck,
      color: 'bg-yellow-400/15 text-yellow-200',
      ir: '/clases-realizadas#por-finalizar',
      texto: plural(
        sinFinalizar,
        '1 clase sin finalizar',
        '# clases sin finalizar'
      ),
    },
    {
      clave: 'por_vencer',
      cantidad: porVencer,
      icon: AlertTriangle,
      color: 'bg-yellow-400/15 text-yellow-200',
      ir: '/renovaciones?tab=renovar',
      texto: plural(
        porVencer,
        '1 plan por vencer o sin pago',
        '# planes por vencer o sin pago'
      ),
    },
    {
      clave: 'vencidos',
      cantidad: vencidos,
      icon: AlertTriangle,
      color: 'bg-red-500/15 text-red-300',
      ir: '/renovaciones?tab=vencidos',
      texto: plural(vencidos, '1 plan vencido', '# planes vencidos'),
    },
    {
      clave: 'riesgo',
      cantidad: enRiesgo,
      icon: UserX,
      color: 'bg-orange-400/15 text-orange-300',
      ir: '/renovaciones?tab=sin_venir',
      texto: plural(
        enRiesgo,
        '1 alumno sin venir (2+ semanas)',
        '# alumnos sin venir (2+ semanas)'
      ),
    },
  ].filter((p) => p.cantidad > 0);

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
            ? `Por cobrar ${formatearPesos(porCobrar)} (${
                pendientesCobro.length
              } alumno${
                pendientesCobro.length !== 1 ? 's' : ''
              }) · toca para ver el detalle`
            : 'Pagos registrados este mes · toca para ver el detalle'}
        </p>
      </div>

      {/* Pendientes: todo lo que hay que resolver, en un solo lugar */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-white text-sm font-semibold">Pendientes</p>
          {pendientes.length > 0 && (
            <span className="text-[11px] font-semibold bg-yellow-400/20 text-yellow-200 rounded-full px-2 py-0.5">
              {pendientes.reduce((acc, p) => acc + p.cantidad, 0)}
            </span>
          )}
        </div>
        {pendientes.length === 0 ? (
          <p className="text-cyan-brand text-sm px-4 pb-4 flex items-center gap-1.5">
            <Check size={15} /> Todo al día
          </p>
        ) : (
          pendientes.map((p) => (
            <button
              key={p.clave}
              onClick={() => navigate(p.ir)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 border-t border-white/5 text-left hover:bg-white/[0.03] transition-colors"
            >
              <span className="flex items-center gap-2.5 text-sm text-white/85 min-w-0">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${p.color}`}
                >
                  <p.icon size={14} />
                </span>
                <span className="truncate">{p.texto}</span>
              </span>
              <ChevronRight size={16} className="text-white/30 shrink-0" />
            </button>
          ))
        )}
      </div>

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
          icon={Users}
          label="Coaches"
          value={totalCoaches}
          onClick={() => navigate('/coaches')}
        />
        <Stat
          icon={CalendarCheck}
          label="Clases realizadas (mes)"
          value={clasesRealizadasMes}
          onClick={() => navigate('/clases-realizadas')}
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
              const saludo = `¡Feliz cumpleaños ${
                (u.nombre || '').split(' ')[0]
              }! 🎉🎂 Todo el equipo de CED&S te desea un gran día. ¡Te esperamos para celebrarlo entrenando! 💪`;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">
                      {u.nombre} {enDias === 0 && '🎂'}
                    </p>
                    <p
                      className={`text-xs ${
                        enDias === 0 ? 'text-pink-300' : 'text-white/45'
                      }`}
                    >
                      {enDias === 0
                        ? `Hoy cumple ${edad}`
                        : `${fecha.toLocaleDateString('es-CL', {
                            weekday: 'long',
                            day: 'numeric',
                          })} · cumple ${edad}`}
                    </p>
                  </div>
                  {numero && (
                    <a
                      href={`https://wa.me/${numero}?text=${encodeURIComponent(
                        saludo
                      )}`}
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
