import { useAuth } from '../../context/AuthContext';
import { MessageSquare } from 'lucide-react';

function formatFecha(fechaISO) {
  return new Date(fechaISO).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotasCoach() {
  const { notasCoach, usuarios, horarios } = useAuth();

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="text-white/40 text-xs mb-6">
        Notas que tus coaches han dejado sobre sus clases
      </p>

      {notasCoach.length === 0 && (
        <div className="text-center py-16">
          <MessageSquare size={36} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Aún no hay notas de coaches.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {notasCoach.map((n) => {
          const coach = usuarios.find((u) => u.id === n.coach_id);
          const horario = horarios.find((h) => h.id === n.horario_id);
          return (
            <div
              key={n.id}
              className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-white text-sm font-medium">
                  {coach?.nombre || 'Coach'}
                </p>
                <p className="text-white/30 text-xs">
                  {formatFecha(n.creado_en)}
                </p>
              </div>
              {horario && (
                <p className="text-cyan-brand/80 text-xs mb-2">
                  Clase de las {horario.hora} · {n.fecha}
                </p>
              )}
              <p className="text-white/70 text-sm">{n.nota}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
