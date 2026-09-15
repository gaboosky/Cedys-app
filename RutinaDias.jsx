import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ChevronRight, Calendar } from 'lucide-react';

export default function RutinaDias() {
  const { rutinaId, semanaId } = useParams();
  const navigate = useNavigate();
  const { obtenerDias } = useAuth();
  const [dias, setDias] = useState(null);

  useEffect(() => {
    obtenerDias(semanaId).then(setDias);
  }, [semanaId]);

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate(`/rutinas/${rutinaId}`)}
        className="flex items-center gap-1 text-white/40 text-sm mb-6 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={15} /> Volver a semanas
      </button>

      {dias === null && <p className="text-white/30 text-sm">Cargando...</p>}
      {dias && dias.length === 0 && (
        <p className="text-white/30 text-sm">
          Esta semana todavía no tiene días cargados.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {dias?.map((d) => (
          <button
            key={d.id}
            onClick={() =>
              navigate(`/rutinas/${rutinaId}/semanas/${semanaId}/dias/${d.id}`)
            }
            className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-4 transition-transform active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-cyan-brand" />
            </div>
            <p className="text-white font-display text-xl flex-1 text-left leading-tight">
              {d.nombre}
            </p>
            <ChevronRight size={18} className="text-cyan-brand/60" />
          </button>
        ))}
      </div>
    </div>
  );
}
