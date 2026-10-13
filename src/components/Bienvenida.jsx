import { useState } from 'react';
import {
  Calendar,
  ClipboardList,
  Dumbbell,
  TrendingUp,
  X,
  LayoutDashboard,
  Users,
  FileBarChart,
} from 'lucide-react';

const PASOS_USUARIO = [
  {
    icon: Calendar,
    titulo: 'Reserva tus clases',
    texto:
      'Ve a Horarios, elige el día y la hora que te acomode, y confirma tu reserva en segundos.',
  },
  {
    icon: ClipboardList,
    titulo: 'Controla tus reservas',
    texto:
      'En Mis Reservas ves tu próxima sesión, y puedes cancelar si no vas a poder ir.',
  },
  {
    icon: Dumbbell,
    titulo: 'Tu rutina, siempre a mano',
    texto:
      'Revisa el plan que te armó tu coach, semana por semana, ejercicio por ejercicio.',
  },
  {
    icon: TrendingUp,
    titulo: 'Registra tu progreso',
    texto:
      'Anota tu peso y tus cargas en cada ejercicio para ver tu evolución en el tiempo.',
  },
];

const PASOS_COACH = [
  {
    icon: Calendar,
    titulo: 'Tus clases del día',
    texto:
      'En Mis Clases ves quién está inscrito y marcas asistencia con un solo toque.',
  },
  {
    icon: Users,
    titulo: 'Tus alumnos',
    texto:
      'Revisa la edad y el peso de cada alumno, e impórtales su rutina directo desde un Excel.',
  },
];

const PASOS_ADMIN = [
  {
    icon: LayoutDashboard,
    titulo: 'Tu resumen general',
    texto:
      'El Dashboard te muestra ingresos, socios activos y solicitudes pendientes de un vistazo.',
  },
  {
    icon: Users,
    titulo: 'Gestiona a tu equipo',
    texto: 'Aprueba usuarios, crea coaches, y define planes y horarios.',
  },
  {
    icon: FileBarChart,
    titulo: 'Reportes cuando los necesites',
    texto:
      'Descarga en Excel tu listado de socios, asistencia e ingresos, desde el menú.',
  },
];

export default function Bienvenida({ rol, onCerrar }) {
  const pasos =
    rol === 'head_coach'
      ? PASOS_ADMIN
      : rol === 'coach'
      ? PASOS_COACH
      : PASOS_USUARIO;
  const [paso, setPaso] = useState(0);
  const esUltimo = paso === pasos.length - 1;
  const actual = pasos[paso];
  const Icon = actual.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-ink border border-cyan-brand/25 rounded-3xl p-6 w-full max-w-sm relative">
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 text-white/40"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="w-14 h-14 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center mb-5">
          <Icon size={24} className="text-cyan-brand" />
        </div>

        <p className="font-display text-2xl text-white leading-tight mb-2">
          {actual.titulo}
        </p>
        <p className="text-white/60 text-sm mb-8">{actual.texto}</p>

        <div className="flex items-center justify-center gap-1.5 mb-5">
          {pasos.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === paso ? 'w-6 bg-cyan-brand' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => (esUltimo ? onCerrar() : setPaso(paso + 1))}
          className="w-full bg-cyan-brand text-ink font-bold rounded-xl py-3 text-sm tracking-wide transition-transform active:scale-[0.98]"
        >
          {esUltimo ? 'Comenzar' : 'Siguiente'}
        </button>

        {!esUltimo && (
          <button
            onClick={onCerrar}
            className="w-full text-white/30 text-xs mt-3 py-1"
          >
            Saltar
          </button>
        )}
      </div>
    </div>
  );
}
