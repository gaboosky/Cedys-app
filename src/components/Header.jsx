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
    logoUrl,
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
      <header className="sticky top-0 z-40 bg-black border-b border-white/10 relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.6)]">
        <div
          className="absolute -top-8 -right-8 w-32 h-32 bg-cyan-brand pointer-events-none"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
        />
        <div
          className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-brandDark pointer-events-none"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
        />

        <div className="relative flex items-center justify-between px-3 pt-[calc(0.3rem+env(safe-area-inset-top))] pb-0">
          <button
            onClick={() => setMenuAbierto(true)}
            className="text-white/80 p-1.5 rounded-lg hover:bg-white/5 active:scale-90 transition-all"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-0.5">
            {rolEfectivo !== 'usuario' && (
              <button
                onClick={() => setBuscando(true)}
                className="text-white/80 p-1.5 rounded-lg hover:bg-white/5 active:scale-90 transition-all"
                aria-label="Buscar alumno"
              >
                <Search size={18} />
              </button>
            )}
            <button
              onClick={toggleNotificaciones}
              className="relative text-white/80 p-1.5 rounded-lg hover:bg-white/5 active:scale-90 transition-all"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
              {noLeidas > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-cyan-brand text-ink text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="relative flex justify-center pt-0 pb-0.5">
          <div className="absolute w-40 h-16 bg-cyan-brand/15 blur-3xl pointer-events-none" />
          <img
            src={logoUrl || LOGO_CEDS_WORDMARK}
            alt="CED&S"
            className="relative w-[130px] h-auto object-contain drop-shadow-[0_2px_8px_rgba(3,205,230,0.25)]"
          />
        </div>
        <div className="relative flex justify-center pb-1.5">
          <div className="w-12 h-[3px] rounded-full bg-cyan-brand shadow-[0_0_10px_rgba(3,205,230,0.6)]" />
        </div>

        <div className="relative pb-2.5 px-6 text-center">
          <p className="font-display text-lg text-white leading-none tracking-wide">
            {titulo}
          </p>
          {subtitulo && (
            <p className="text-white/40 text-[11px] mt-1">{subtitulo}</p>
          )}
        </div>
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
                src={logoUrl || LOGO_CEDS_WORDMARK}
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
