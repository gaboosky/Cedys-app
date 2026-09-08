import { useState } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Menu, X, User, Bell, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TABS_USUARIO, TABS_COACH, TABS_ADMIN } from './BottomNav';
import { LOGO_CEDS } from '../assets/logo';

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
  '/mas': 'Más',
  '/planilla': 'Planilla / Histórico',
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
  '/mas': 'Más opciones',
  '/planilla': 'Historial y seguimiento',
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

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [notifAbiertas, setNotifAbiertas] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    usuarioActual,
    logout,
    logoUrl,
    notificaciones,
    marcarNotificacionLeida,
  } = useAuth();

  const esDetalleHorario = location.pathname.startsWith('/horarios/');
  const titulo = esDetalleHorario
    ? 'Detalle del horario'
    : TITULOS[location.pathname] || 'CED&S';
  const subtitulo = esDetalleHorario
    ? 'Revisa el detalle antes de reservar'
    : SUBTITULOS[location.pathname];

  const tabs =
    usuarioActual.rol === 'head_coach'
      ? TABS_ADMIN
      : usuarioActual.rol === 'coach'
      ? TABS_COACH
      : TABS_USUARIO;

  const misNotificaciones = notificaciones.filter(
    (n) => n.usuario_id === usuarioActual.id
  );
  const noLeidas = misNotificaciones.filter((n) => !n.leida).length;

  function irA(to) {
    setMenuAbierto(false);
    navigate(to);
  }

  function toggleNotificaciones() {
    setNotifAbiertas(!notifAbiertas);
  }

  return (
    <>
      <header className="sticky top-0 z-40">
        <div className="bg-gradient-to-b from-cyan-brand to-cyan-brandDark pb-16">
          <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <button
              onClick={() => setMenuAbierto(true)}
              className="text-ink/80 p-1.5 rounded-full hover:bg-black/5 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <button
              onClick={toggleNotificaciones}
              className="relative text-ink/80 p-1.5 rounded-full hover:bg-black/5 transition-colors"
              aria-label="Notificaciones"
            >
              <Bell size={20} />
              {noLeidas > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-ink text-cyan-brand text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="bg-ink">
          <div className="relative flex justify-center -mt-16">
            <div className="w-28 h-28 rounded-full bg-white border-2 border-cyan-brand shadow-lg flex items-center justify-center overflow-hidden p-3">
              <img
                src={logoUrl || LOGO_CEDS}
                alt="CED&S"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="pt-3 pb-5 px-6 text-center">
            <p className="font-display text-2xl text-white tracking-wide">
              {titulo}
            </p>
            {subtitulo && (
              <p className="text-white/40 text-xs mt-1">{subtitulo}</p>
            )}
          </div>
        </div>
      </header>

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
                src={logoUrl || LOGO_CEDS}
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
            <p className="text-white text-sm mb-6">{usuarioActual.nombre}</p>

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
              {tabs.map(({ to, label, icon: Icon }) => (
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
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}

              {usuarioActual.rol !== 'head_coach' && (
                <button
                  onClick={() => irA('/planilla')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 text-left"
                >
                  Planilla / Histórico
                </button>
              )}

              {usuarioActual.rol === 'head_coach' && (
                <button
                  onClick={() => irA('/mas')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 text-left"
                >
                  <MoreHorizontal size={18} />
                  Más
                </button>
              )}
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
