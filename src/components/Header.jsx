import { useState } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
  Menu,
  X,
  User,
  Bell,
  Users,
  Settings,
  Dumbbell,
  FileBarChart,
  MessageSquare,
  Star,
  Wallet,
  RefreshCw,
  MapPin,
  Receipt,
  Megaphone,
  History,
  HandCoins,
  CalendarCheck,
  UserX,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LOGO_CEDS_WORDMARK } from '../assets/logoWordmark';
import BuscadorRapido from './BuscadorRapido';

const TITULOS = {
  '/perfil': 'Mi Perfil',
  '/horarios': 'Horarios',
  '/reservas': 'Mis Reservas',
  '/mis-clases': 'Mis Clases',
  '/alumnos': 'Alumnos',
  '/dashboard': 'Dashboard',
  '/usuarios': 'Usuarios',
  '/clases-admin': 'Clases',
  '/planes': 'Planes',
  '/coaches': 'Coaches',
  '/configuracion': 'Configuración',
  '/reportes': 'Reportes',
  '/privacidad': 'Política de Privacidad',
  '/terminos': 'Términos y Condiciones',
  '/notas-coach': 'Nota de Coach',
  '/finanzas': 'Finanzas',
  '/renovaciones': 'Por contactar',
  '/pruebas': 'Sesiones de prueba',
  '/seguimiento': 'Alumnos en riesgo',
  '/gimnasio': 'El gimnasio',
  '/gastos': 'Gastos',
  '/pago-coaches': 'Pago a coaches',
  '/avisos': 'Avisos',
  '/actividad': 'Historial de cambios',
  '/ingreso-detalle': 'Ingresos',
  '/ingresos-graficos': 'Gráficos de ingresos',
  '/clases-realizadas': 'Clases realizadas',
  '/reservas-activas': 'Reservas',
  '/mas': 'Más',
  '/general': 'General',
  '/mi-rutina': 'Mi Rutina',
  '/progreso': 'Progreso',
  '/mis-evaluaciones': 'Mis evaluaciones',
};

const SUBTITULOS = {
  '/perfil': 'Tu cuenta y estadísticas',
  '/horarios': 'Selecciona el horario que mejor se adapte a ti',
  '/reservas': 'Tus próximas sesiones',
  '/mis-clases': 'Tus próximas clases',
  '/alumnos': 'Tus alumnos inscritos',
  '/dashboard': 'Resumen general del gimnasio',
  '/usuarios': 'Gestiona tus socios',
  '/clases-admin': 'Administra tus horarios',
  '/planes': 'Gestiona tus planes',
  '/coaches': 'Tu equipo de entrenadores',
  '/configuracion': 'Ajustes de la app',
  '/finanzas': 'Resumen financiero del gimnasio',
  '/renovaciones': 'Renovaciones y alumnos que no vienen',
  '/pruebas': 'Personas que quieren probar',
  '/seguimiento': 'Escríbeles antes de que se vayan',
  '/gimnasio': 'Contacto, horario y reglamento',
  '/gastos': 'Registra los gastos del gimnasio',
  '/pago-coaches': 'Clases realizadas y pago del mes',
  '/avisos': 'Envía avisos al celular de tus alumnos',
  '/actividad': 'Quién hizo cada cambio y cuándo',
  '/ingreso-detalle': 'Pagos, proyección y cobros del mes',
  '/ingresos-graficos': 'Evolución mensual de tus ingresos',
  '/mas': 'Más opciones',
  '/general': 'Noticias y novedades del gym',
  '/mi-rutina': 'Tu plan de entrenamiento',
  '/progreso': 'Tu evolución en el tiempo',
  '/mis-evaluaciones': 'Lo que opinan de tus clases',
};

function formatearFechaNotif(fechaISO) {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Menú del admin, ordenado por secciones
const MENU_ADMIN = [
  {
    titulo: 'Alumnos',
    items: [
      { to: '/renovaciones', label: 'Por contactar', icon: RefreshCw },
      { to: '/pruebas', label: 'Sesiones de prueba', icon: CalendarCheck },
    ],
  },
  {
    titulo: 'Dinero',
    items: [
      { to: '/finanzas', label: 'Finanzas', icon: Wallet },
      { to: '/gastos', label: 'Gastos', icon: Receipt },
      { to: '/pago-coaches', label: 'Pago a coaches', icon: HandCoins },
      { to: '/reportes', label: 'Reportes', icon: FileBarChart },
    ],
  },
  {
    titulo: 'Comunicación',
    items: [
      { to: '/avisos', label: 'Avisos a alumnos', icon: Megaphone },
      { to: '/notas-coach', label: 'Notas de coaches', icon: MessageSquare },
    ],
  },
  {
    titulo: 'Gimnasio',
    items: [
      { to: '/coaches', label: 'Coaches', icon: Users },
      { to: '/configuracion', label: 'Configuración', icon: Settings },
      { to: '/actividad', label: 'Historial de cambios', icon: History },
    ],
  },
];

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [notifAbiertas, setNotifAbiertas] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const location = useLocation();
  const {
    usuarioActual,
    logout,
    notificaciones,
    marcarNotificacionLeida,
    rolEfectivo,
    cambiarVista,
  } = useAuth();

  const esDetalleHorario = location.pathname.startsWith('/horarios/');
  const esRutina = location.pathname.startsWith('/rutinas/');
  const esSegPersonal = location.pathname.startsWith('/seguimiento-personal/');

  const titulo = esDetalleHorario
    ? 'Detalle del horario'
    : esSegPersonal
    ? 'Seguimiento personal'
    : esRutina
    ? 'Mi Rutina'
    : TITULOS[location.pathname] || 'CED&S';

  const subtitulo = esDetalleHorario
    ? 'Revisa el detalle antes de reservar'
    : esSegPersonal
    ? 'Objetivo, mediciones y avance'
    : esRutina
    ? 'Tu plan de entrenamiento'
    : SUBTITULOS[location.pathname];

  const misNotificaciones = notificaciones.filter(
    (n) => n.usuario_id === usuarioActual.id
  );
  const noLeidas = misNotificaciones.filter((n) => !n.leida).length;

  function toggleNotificaciones() {
    setNotifAbiertas(!notifAbiertas);
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-black border-b border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.6)] relative overflow-hidden">
        {/* Esquina decorativa: triángulo en 3 tonos de celeste con textura de puntos */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(rgba(3,205,230,0.18) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 40%, #000 100%)',
            maskImage: 'linear-gradient(90deg, transparent 40%, #000 100%)',
          }}
        />
        <div
          className="absolute top-0 right-0 w-[128px] h-full pointer-events-none bg-[#02586a]"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
        />
        <div
          className="absolute top-0 right-0 w-[100px] h-[77%] pointer-events-none bg-[#0298ae]"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
        />
        <div
          className="absolute top-0 right-0 w-[70px] h-[54%] pointer-events-none bg-cyan-brand"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
        />
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-24 bg-cyan-brand/10 blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-[84px_1fr_84px] items-center px-2 pt-[calc(0.4rem+env(safe-area-inset-top))]">
          <div className="flex justify-start">
            <button
              onClick={() => setMenuAbierto(true)}
              className="text-white/80 p-2 rounded-lg hover:bg-white/5 active:scale-90 transition-all"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex justify-center">
            {/* Siempre el logo de la app: está hecho para fondo oscuro */}
            <img
              src={LOGO_CEDS_WORDMARK}
              alt="CED&S"
              className="w-[104px] h-auto object-contain"
            />
          </div>

          <div className="flex items-center justify-end gap-0.5">
            {rolEfectivo !== 'usuario' && (
              <button
                onClick={() => setBuscando(true)}
                className="text-white p-2 rounded-full bg-black/45 hover:bg-black/60 active:scale-90 transition-all"
                aria-label="Buscar alumno"
              >
                <Search size={18} />
              </button>
            )}
            <button
              onClick={toggleNotificaciones}
              className="relative text-white p-2 rounded-full bg-black/45 hover:bg-black/60 active:scale-90 transition-all"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
              {noLeidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-white text-ink text-[9px] font-bold rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center shadow">
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="relative px-6 pt-1 pb-2.5 text-center">
          <p className="font-display text-lg text-white leading-none tracking-wide">
            {titulo}
          </p>
          {subtitulo && (
            <p className="text-white/40 text-[11px] mt-1">{subtitulo}</p>
          )}
        </div>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-cyan-brand to-transparent opacity-80" />
      </header>

      {buscando && <BuscadorRapido onCerrar={() => setBuscando(false)} />}

      {notifAbiertas && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="w-80 max-w-[85vw] bg-ink h-full border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <p className="text-white font-display text-lg">Notificaciones</p>
              <button
                onClick={() => setNotifAbiertas(false)}
                className="text-white/50"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {misNotificaciones.length === 0 && (
                <p className="text-white/30 text-sm text-center py-10 px-4">
                  No tienes notificaciones.
                </p>
              )}
              {misNotificaciones.map((n) => (
                <button
                  key={n.id}
                  onClick={() => marcarNotificacionLeida(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 ${
                    n.leida ? 'opacity-50' : 'bg-cyan-brand/5'
                  }`}
                >
                  <p className="text-white text-sm">{n.mensaje}</p>
                  <p className="text-white/30 text-xs mt-1">
                    {formatearFechaNotif(n.creado_en)}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div
            className="flex-1 bg-black/60"
            onClick={() => setNotifAbiertas(false)}
          />
        </div>
      )}

      {menuAbierto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-72 bg-ink h-full border-r border-white/10 p-5 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <img
                src={LOGO_CEDS_WORDMARK}
                alt="CED&S"
                className="h-10 object-contain"
              />
              <button
                onClick={() => setMenuAbierto(false)}
                className="text-white/50"
                aria-label="Cerrar menú"
              >
                <X size={22} />
              </button>
            </div>

            <p className="text-white/40 text-xs mb-1">Sesión iniciada como</p>
            <p className="text-white text-sm mb-4">{usuarioActual.nombre}</p>

            {(usuarioActual.rol === 'head_coach' ||
              usuarioActual.rol === 'coach') && (
              <div className="mb-6">
                <p className="text-white/40 text-xs mb-1.5">Verme como</p>
                <div className="flex bg-white/[0.04] border border-white/10 rounded-lg p-1">
                  {(usuarioActual.rol === 'head_coach'
                    ? [
                        { valor: 'head_coach', label: 'Admin' },
                        { valor: 'coach', label: 'Coach' },
                        { valor: 'usuario', label: 'Usuario' },
                      ]
                    : [
                        { valor: 'coach', label: 'Coach' },
                        { valor: 'usuario', label: 'Usuario' },
                      ]
                  ).map((opcion) => (
                    <button
                      key={opcion.valor}
                      onClick={() => cambiarVista(opcion.valor)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        rolEfectivo === opcion.valor
                          ? 'bg-cyan-brand text-ink'
                          : 'text-white/50'
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <nav className="flex flex-col gap-1 flex-1">
              <NavLink
                to="/perfil"
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-cyan-brand/15 text-cyan-brand'
                      : 'text-white/70 hover:bg-white/5'
                  }`
                }
              >
                <User size={18} />
                Mi Perfil
              </NavLink>
              <NavLink
                to="/gimnasio"
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-cyan-brand/15 text-cyan-brand'
                      : 'text-white/70 hover:bg-white/5'
                  }`
                }
              >
                <MapPin size={18} />
                El gimnasio
              </NavLink>

              {(usuarioActual.rol === 'coach' ||
                usuarioActual.rol === 'head_coach') &&
                rolEfectivo !== 'usuario' && (
                  <NavLink
                    to="/mis-evaluaciones"
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-cyan-brand/15 text-cyan-brand'
                          : 'text-white/70 hover:bg-white/5'
                      }`
                    }
                  >
                    <Star size={18} />
                    Mis evaluaciones
                  </NavLink>
                )}

              {usuarioActual.rol === 'head_coach' &&
                MENU_ADMIN.map((grupo) => (
                  <div key={grupo.titulo} className="mt-3">
                    <p className="text-white/30 text-[10px] font-semibold uppercase tracking-[0.15em] px-3 mb-1">
                      {grupo.titulo}
                    </p>
                    {grupo.items.map(({ to, label, icon: Icono }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setMenuAbierto(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-cyan-brand/15 text-cyan-brand'
                              : 'text-white/70 hover:bg-white/5'
                          }`
                        }
                      >
                        <Icono size={18} />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                ))}
            </nav>

            <button
              onClick={logout}
              className="text-white/50 text-sm border border-white/10 rounded-lg py-2.5 mt-4 hover:text-white hover:border-white/30 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
          <div
            className="flex-1 bg-black/60"
            onClick={() => setMenuAbierto(false)}
          />
        </div>
      )}
    </>
  );
}
