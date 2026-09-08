import { useAuth } from '../../context/AuthContext';

export default function Coaches() {
  const { usuarios, horarios } = useAuth();
  const coaches = usuarios.filter((u) => u.rol === 'coach');

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white mb-6">Coaches</p>

      <div className="flex flex-col gap-2">
        {coaches.map((c) => {
          const horariosDelCoach = horarios.filter((h) => h.coach_id === c.id);
          return (
            <div
              key={c.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <p className="text-white font-display text-xl">{c.nombre}</p>
              <p className="text-white/40 text-sm mb-2">
                {c.correo} · {c.telefono}
              </p>
              <p className="text-white/30 text-xs">
                {horariosDelCoach.length} horario(s) asignado(s)
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
