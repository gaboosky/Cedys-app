import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ChevronRight } from 'lucide-react';

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
        className="flex items-center gap-1 text-white/50 text-sm mb-6"
      >
        <ArrowLeft size={16} /> Volver a semanas
      </button>

      <p className="font-display text-3xl text-white leading-none mb-6">Días</p>

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
            className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <p className="text-white font-display text-xl">{d.nombre}</p>
            <ChevronRight size={18} className="text-white/30" />
          </button>
        ))}
      </div>
    </div>
  );
}
