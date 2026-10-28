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
  TrendingUp,
  TrendingDown,
  Sun,
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
    usuarioActual,
    coachDeClase,
    gastos,
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

  // Alumnos con el plan al día (los "Vigentes" de Usuarios): sin contar
  // coaches, cuentas desactivadas ni planes vencidos.
  const totalUsuarios = usuarios.filter((u) => {
    if (u.rol !== 'usuario' || u.estado !== 'activo') return false;
    const v = vencimientoDe(u, planes, diasRenovacion);
    return v && v.dias > 0;
  }).length;
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
  const listaClasesHoy = horarios
    .filter(
      (h) =>
        (h.fecha_unica
          ? h.fecha_unica === hastaMes
          : h.dia === NOMBRES_DIA[ahora.getDay()]) &&
        !horarioEstaCancelado(h.id, hastaMes)
    )
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .map((h) => ({
      h,
      inscritos: reservas.filter(
        (r) =>
          r.horario_id === h.id &&
          r.fecha === hastaMes &&
          r.estado === 'confirmada'
      ).length,
      coach: coachDeClase
        ? coachDeClase(h, hastaMes).nombre || h.coach_nombre
        : h.coach_nombre,
    }));
  const clasesHoy = listaClasesHoy.length;
  const alumnosHoy = listaClasesHoy.reduce((acc, c) => acc + c.inscritos, 0);
  const horaAhora = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

  // Comparación de ingresos con el mes pasado, hasta el mismo día
  const mesAnteriorKey = (() => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  })();
  const ingresoMesAnteriorMismoDia = totalDe(
    (pagos || []).filter(
      (p) =>
        mesDe(p.fecha) === mesAnteriorKey &&
        Number((p.fecha || '').slice(8, 10)) <= ahora.getDate()
    )
  );
  const variacionIngreso =
    ingresoMesAnteriorMismoDia > 0
      ? Math.round(
          ((ingresoMes - ingresoMesAnteriorMismoDia) /
            ingresoMesAnteriorMismoDia) *
            100
        )
      : null;
  // Finanzas del mes: ingresos − gastos (igual que la página Finanzas)
  const gastosMes = (gastos || [])
    .filter((g) => mesDe(g.fecha) === mesHoy)
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  const resultadoMes = ingresoMes - gastosMes;
  const pctCobrado =
    ingresoMes + porCobrar > 0
      ? Math.round((ingresoMes / (ingresoMes + porCobrar)) * 100)
      : 100;
  const primerNombre =
    (usuarioActual?.nombre || '').trim().split(/\s+/)[0] || '';
  const saludo =
    ahora.getHours() < 12
      ? 'Buenos días'
      : ahora.getHours() < 20
      ? 'Buenas tardes'
      : 'Buenas noches';
  const fechaHoyTexto = ahora.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

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
      <p className="font-display text-3xl text-white leading-tight">
        {saludo}
        {primerNombre ? `, ${primerNombre}` : ''}
      </p>
      <p className="text-white/40 text-xs mt-1 mb-5 first-letter:uppercase">
        {fechaHoyTexto}
      </p>

      {/* Ingresos */}
      <div
        onClick={() => navigate('/ingreso-detalle')}
        className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-5 cursor-pointer transition-transform active:scale-[0.99]"
      >
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">
              <DollarSign size={13} /> Ingresos del mes
            </p>
            <ChevronRight size={16} className="text-white/30" />
          </div>
          <p
            className="font-display text-white leading-none mt-2"
            style={{ fontSize: '2.5rem' }}
          >
            {formatearPesos(ingresoMes)}
          </p>
          {variacionIngreso !== null && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 mt-2 ${
                variacionIngreso >= 0
                  ? 'bg-green-400/15 text-green-300'
                  : 'bg-yellow-400/15 text-yellow-200'
              }`}
            >
              {variacionIngreso >= 0 ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              {variacionIngreso >= 0 ? '+' : ''}
              {variacionIngreso}% vs. el mes pasado a esta fecha
            </span>
          )}
          {porCobrar > 0 && (
            <>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-4 flex">
                <div
                  className="h-full bg-cyan-brand"
                  style={{ width: `${pctCobrado}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] mt-1.5">
                <span className="text-cyan-brand">Cobrado {pctCobrado}%</span>
                <span className="text-white/45">
                  Por cobrar {formatearPesos(porCobrar)} ·{' '}
                  {pendientesCobro.length} alumno
                  {pendientesCobro.length !== 1 ? 's' : ''}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Finanzas del mes: ingresos − gastos */}
      <button
        onClick={() => navigate('/finanzas')}
        className="w-full -mt-3 mb-5 bg-white/[0.04] border border-white/10 rounded-2xl p-3 text-left transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/40 text-[11px] uppercase tracking-wide">
            Finanzas del mes
          </p>
          <ChevronRight size={15} className="text-white/30" />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 text-center">
          <div>
            <p className="text-white text-sm font-semibold">
              {formatearPesos(ingresoMes)}
            </p>
            <p className="text-white/40 text-[10px]">Ingresos</p>
          </div>
          <span className="text-white/30 text-sm">−</span>
          <div>
            <p className="text-red-300 text-sm font-semibold">
              {formatearPesos(gastosMes)}
            </p>
            <p className="text-white/40 text-[10px]">Gastos</p>
          </div>
          <span className="text-white/30 text-sm">=</span>
          <div
            className={`rounded-xl py-1 ${
              resultadoMes >= 0 ? 'bg-green-400/10' : 'bg-red-500/10'
            }`}
          >
            <p
              className={`text-sm font-bold ${
                resultadoMes >= 0 ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {resultadoMes < 0 ? '−' : ''}
              {formatearPesos(Math.abs(resultadoMes))}
            </p>
            <p className="text-white/40 text-[10px]">Resultado</p>
          </div>
        </div>
      </button>

      {/* Hoy en el gym */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-wide">
            <Sun size={13} /> Hoy en el gym
          </p>
          <p className="text-white/40 text-xs">
            {clasesHoy} clase{clasesHoy !== 1 ? 's' : ''} · {alumnosHoy} alumno
            {alumnosHoy !== 1 ? 's' : ''}
          </p>
        </div>
        {listaClasesHoy.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-white/40 text-sm">
            Hoy no hay clases.
          </div>
        ) : (
          <div
            className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {listaClasesHoy.map(({ h, inscritos, coach }) => {
              const paso = h.hora.slice(0, 5) < horaAhora;
              const lleno = inscritos >= h.cupo_max;
              return (
                <button
                  key={h.id}
                  onClick={() => navigate('/clases-admin')}
                  className={`shrink-0 w-[118px] rounded-2xl border p-3 text-left transition-transform active:scale-[0.97] ${
                    paso
                      ? 'bg-white/[0.02] border-white/[0.06] opacity-60'
                      : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <p className="font-display text-2xl text-white leading-none">
                    {h.hora.slice(0, 5)}
                  </p>
                  <p className="text-white/45 text-[11px] mt-1 truncate">
                    {(coach || '').split(' ')[0] || 'Sin coach'}
                  </p>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${
                        lleno ? 'bg-yellow-300' : 'bg-cyan-brand'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (inscritos / Math.max(1, h.cupo_max)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p
                    className={`text-[11px] mt-1 ${
                      lleno ? 'text-yellow-200' : 'text-white/55'
                    }`}
                  >
                    {inscritos}/{h.cupo_max}{' '}
                    {lleno ? '· lleno' : paso ? '· pasó' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pendientes: todo lo que hay que resolver, en un solo lugar */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-white text-sm font-semibold">Por resolver</p>
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
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}
                >
                  <p.icon size={15} />
                </span>
                <span className="truncate">{p.texto}</span>
              </span>
              <ChevronRight size={16} className="text-white/30 shrink-0" />
            </button>
          ))
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        <Stat
          icon={Users}
          label="Alumnos activos"
          value={totalUsuarios}
          color="text-cyan-brand"
          onClick={() => navigate('/usuarios')}
        />
        <Stat
          icon={Calendar}
          label="Clases hoy"
          value={clasesHoy}
          color="text-amber-300"
          onClick={() => navigate('/clases-admin')}
        />
        <Stat
          icon={CalendarCheck}
          label="Realizadas mes"
          value={clasesRealizadasMes}
          color="text-emerald-300"
          onClick={() => navigate('/clases-realizadas')}
        />
        <Stat
          icon={UserCheck}
          label="Coaches"
          value={totalCoaches}
          color="text-violet-300"
          onClick={() => navigate('/coaches')}
        />
      </div>

      {cumpleanos.length > 0 && (
        <div className="bg-pink-400/[0.05] border border-pink-400/20 rounded-2xl p-4 mb-4">
          <p className="flex items-center gap-1.5 text-white/70 text-sm font-medium mb-3">
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

function Stat({
  icon: Icon,
  label,
  value,
  color = 'text-cyan-brand',
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-2.5 border bg-white/[0.04] border-white/10 text-center transition-transform active:scale-[0.97]"
    >
      <Icon size={16} className={`mx-auto ${color}`} />
      <p className="font-display text-2xl text-white leading-none mt-1.5">
        {value}
      </p>
      <p className="text-white/40 text-[10px] leading-tight mt-1">{label}</p>
    </button>
  );
}
