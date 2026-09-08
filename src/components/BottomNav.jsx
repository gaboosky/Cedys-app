import { NavLink } from 'react-router-dom';
import {
  User,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Users,
  CreditCard,
  MoreHorizontal,
  Newspaper,
  Dumbbell,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const TABS_USUARIO = [
  { to: '/general', label: 'General', icon: Newspaper },
  { to: '/horarios', label: 'Horarios', icon: Calendar },
  { to: '/reservas', label: 'Mis Reservas', icon: ClipboardList },
  { to: '/mi-rutina', label: 'Rutina', icon: Dumbbell },
  { to: '/progreso', label: 'Progreso', icon: TrendingUp },
];

export const TABS_COACH = [
  { to: '/general', label: 'General', icon: Newspaper },
  { to: '/mis-clases', label: 'Mis Clases', icon: Calendar },
  { to: '/alumnos', label: 'Alumnos', icon: Users },
];

export const TABS_ADMIN = [
  { to: '/general', label: 'General', icon: Newspaper },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clases-admin', label: 'Clases', icon: Calendar },
  { to: '/planes', label: 'Planes', icon: CreditCard },
  { to: '/Usuarios', label: 'Usuarios', icon: Users },
  { to: '/coaches', label: 'Coach', icon: Users },
];

export default function BottomNav() {
  const { usuarioActual } = useAuth();

  const tabs =
    usuarioActual.rol === 'head_coach'
      ? TABS_ADMIN
      : usuarioActual.rol === 'coach'
      ? TABS_COACH
      : TABS_USUARIO;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-ink border-t border-white/10 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-cyan-brand' : 'text-white/40'
              }`
            }
          >
            <Icon size={22} strokeWidth={2} />
            <span className="text-[11px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
