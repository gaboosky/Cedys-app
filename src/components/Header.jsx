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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LOGO_CEDS_WORDMARK } from '../assets/logoWordmark';
import { LOGO_CEDS_CIRCULO } from '../assets/logoCirculo';

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

  const titulo = esDetalleHorario
    ? 'Detalle del horario'
    : esRutina
    ? 'Mi Rutina'
    : TITULOS[location.pathname] || 'CED&S';

  const subtitulo = esDetalleHorario
    ? 'Revisa el detalle antes de reservar'
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
      <header className="sticky top-0 z-40">
        <div className="bg-cyan-brandDark">
          <div className="flex items-center justify-between px-3 pt-[calc(0.625rem+env(safe-area-inset-top))] pb-14">
            <button
              onClick={() => setMenuAbierto(true)}
              className="text-ink/80 p-2 rounded-lg hover:bg-black/10 active:scale-90 transition-all"
              aria-label="Abrir menú"
            >
              <Menu size={21} />
            </button>
            <button
              onClick={toggleNotificaciones}
              className="relative text-ink/80 p-2 rounded-lg hover:bg-black/10 active:scale-90 transition-all"
              aria-label="Notificaciones"
            >
              <Bell size={19} />
              {noLeidas > 0 && (
                <span className="absolute top-1 right-1 bg-ink text-cyan-brand text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="bg-ink border-b border-white/10">
          <div className="relative flex justify-center -mt-14">
            <div className="w-20 h-20 rounded-full bg-white border-[3px] border-cyan-brand shadow-lg flex items-center justify-center overflow-hidden p-2">
              <img
                src={logoUrl || LOGO_CEDS_CIRCULO}
                alt="CED&S"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="pt-2 pb-5 px-6 text-center">
            <p className="font-display text-2xl text-white leading-none">
              {titulo}
            </p>
            {subtitulo && (
              <p className="text-white/40 text-sm mt-1.5">{subtitulo}</p>
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

            {usuarioActual.rol === 'head_coach' && (
              <div className="mb-6">
                <p className="text-white/40 text-xs mb-1.5">Verme como</p>
                <div className="flex bg-white/[0.04] border border-white/10 rounded-lg p-1">
                  {[
                    { valor: 'head_coach', label: 'Admin' },
                    { valor: 'coach', label: 'Coach' },
                    { valor: 'usuario', label: 'Usuario' },
                  ].map((opcion) => (
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

              {usuarioActual.rol === 'coach' && (
                <NavLink
                  to="/mi-rutina"
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-cyan-brand/15 text-cyan-brand'
                        : 'text-white/70 hover:bg-white/5'
                    }`
                  }
                >
                  <Dumbbell size={18} />
                  Rutina
                </NavLink>
              )}

              {usuarioActual.rol === 'head_coach' && (
                <>
                  <NavLink
                    to="/coaches"
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-cyan-brand/15 text-cyan-brand'
                          : 'text-white/70 hover:bg-white/5'
                      }`
                    }
                  >
                    <Users size={18} />
                    Coach
                  </NavLink>
                  <NavLink
                    to="/configuracion"
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-cyan-brand/15 text-cyan-brand'
                          : 'text-white/70 hover:bg-white/5'
                      }`
                    }
                  >
                    <Settings size={18} />
                    Configuración
                  </NavLink>
                  <NavLink
                    to="/reportes"
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-cyan-brand/15 text-cyan-brand'
                          : 'text-white/70 hover:bg-white/5'
                      }`
                    }
                  >
                    <FileBarChart size={18} />
                    Reportes
                  </NavLink>
                </>
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
