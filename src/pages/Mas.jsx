import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users2,
  Settings,
  FileSpreadsheet,
  ChevronRight,
  Newspaper,
} from 'lucide-react';

export default function Mas() {
  const { usuarioActual, logout } = useAuth();

  const opciones = [
    { to: '/general', label: 'General', icon: Newspaper },
    { to: '/coaches', label: 'Coaches', icon: Users2 },
    { to: '/planilla', label: 'Planilla / Histórico', icon: FileSpreadsheet },
    { to: '/configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-10">
      <p className="font-display text-3xl text-white mb-6">Más</p>

      <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10 mb-6">
        {opciones.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <Icon size={18} className="text-cyan-brand/70" />
              <span className="text-white text-sm">{label}</span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </Link>
        ))}
      </div>

      <p className="text-white/30 text-xs mb-2">
        Sesión iniciada como {usuarioActual.nombre}
      </p>
      <button
        onClick={logout}
        className="w-full text-white/50 py-3 rounded-lg border border-white/10 hover:text-white hover:border-white/30 transition-colors text-sm"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
