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
  '/terminos': 'Términos y Condiciones',
  '/notas-coach': 'Nota de Coach',
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
        <div
          className="relative shadow-[0_6px_16px_-4px_rgba(0,0,0,0.5)] overflow-hidden"
          style={{
            backgroundImage:
              'linear-gradient(135deg, #03CDE6, #02A6BA), ' +
              'radial-gradient(circle at 12% 30%, rgba(255,255,255,0.35) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 38% 70%, rgba(255,255,255,0.25) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 62% 20%, rgba(255,255,255,0.3) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 85% 55%, rgba(255,255,255,0.2) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 95% 15%, rgba(255,255,255,0.3) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 22% 85%, rgba(255,255,255,0.2) 0.5px, transparent 1px)',
            backgroundSize:
              'cover, 140px 140px, 140px 140px, 140px 140px, 140px 140px, 140px 140px, 140px 140px',
          }}
        >
          <div className="flex items-center justify-between px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-9">
            <button
              onClick={() => setMenuAbierto(true)}
              className="text-ink/80 p-1.5 rounded-lg hover:bg-black/10 active:scale-90 transition-all"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={toggleNotificaciones}
              className="relative text-ink/80 p-1.5 rounded-lg hover:bg-black/10 active:scale-90 transition-all"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
              {noLeidas > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-ink text-cyan-brand text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </div>

        <div
          className="bg-ink border-b border-white/10 relative"
          style={{
            backgroundImage:
              'radial-gradient(circle at 8% 20%, rgba(3,205,230,0.5) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 30% 75%, rgba(255,255,255,0.3) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 55% 15%, rgba(3,205,230,0.4) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 78% 60%, rgba(255,255,255,0.25) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 92% 30%, rgba(3,205,230,0.4) 0.5px, transparent 1px), ' +
              'radial-gradient(circle at 15% 90%, rgba(255,255,255,0.2) 0.5px, transparent 1px)',
            backgroundSize: '160px 160px',
          }}
        >
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-40 h-40 rounded-full bg-cyan-brand/10 blur-2xl pointer-events-none" />
          <div className="relative flex justify-center -mt-9">
            <div className="w-16 h-16 rounded-full bg-white border-[3px] border-cyan-brand shadow-lg flex items-center justify-center overflow-hidden p-1.5">
              <img
                src={logoUrl || LOGO_CEDS_CIRCULO}
                alt="CED&S"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="relative pt-1 pb-3 px-6 text-center">
            <p className="font-display text-xl text-white leading-none">
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
                  <NavLink
                    to="/notas-coach"
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-cyan-brand/15 text-cyan-brand'
                          : 'text-white/70 hover:bg-white/5'
                      }`
                    }
                  >
                    <MessageSquare size={18} />
                    Nota de Coach
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
