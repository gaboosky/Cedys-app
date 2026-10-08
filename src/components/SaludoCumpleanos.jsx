import { useAuth } from '../context/AuthContext';
import { esMiCumpleanos } from '../lib/cumpleanos';

// Saludo en la app el día del cumpleaños del alumno o coach.
export default function SaludoCumpleanos() {
  const { usuarioActual, infoGimnasio } = useAuth();
  if (!esMiCumpleanos(usuarioActual)) return null;
  const nombre = (usuarioActual.nombre || '').split(' ')[0];
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-pink-400/20 via-cyan-brand/10 to-transparent border border-pink-300/30 rounded-2xl p-5 mb-5">
      <p className="text-3xl mb-1">🎉🎂</p>
      <p className="text-white text-lg font-semibold">¡Feliz cumpleaños, {nombre}!</p>
      <p className="text-white/65 text-sm mt-0.5">
        Todo el equipo de {infoGimnasio?.nombre || 'CED&S'} te desea un gran día. ¡Celébralo entrenando! 💪
      </p>
    </div>
  );
}
