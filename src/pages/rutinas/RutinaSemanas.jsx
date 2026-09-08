import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ChevronRight, ExternalLink } from 'lucide-react';

export default function RutinaSemanas() {
  const { rutinaId } = useParams();
  const navigate = useNavigate();
  const { rutinas, obtenerSemanas } = useAuth();
  const [semanas, setSemanas] = useState(null);

  const rutina = rutinas.find((r) => r.id === rutinaId);

  useEffect(() => {
    obtenerSemanas(rutinaId).then(setSemanas);
  }, [rutinaId]);

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-white/50 text-sm mb-6"
      >
        <ArrowLeft size={16} /> Volver
      </button>

      <p className="font-display text-3xl text-white leading-none mb-1">
        {rutina?.nombre || 'Rutina'}
      </p>

      {rutina?.link_googlesheet && (
        <a
          href={rutina.link_googlesheet}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-cyan-brand text-xs mb-6"
        >
          <ExternalLink size={12} /> Ver en Google Sheets
        </a>
      )}

      {!rutina?.link_googlesheet && <div className="mb-6" />}

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
        Semanas
      </p>

      {semanas === null && <p className="text-white/30 text-sm">Cargando...</p>}
      {semanas && semanas.length === 0 && (
        <p className="text-white/30 text-sm">
          Esta rutina todavía no tiene semanas cargadas.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {semanas?.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/rutinas/${rutinaId}/semanas/${s.id}`)}
            className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <div className="text-left">
              <p className="text-white font-display text-xl">
                Semana {s.numero}
              </p>
              {s.objetivo && (
                <p className="text-white/40 text-sm">{s.objetivo}</p>
              )}
            </div>
            <ChevronRight size={18} className="text-white/30" />
          </button>
        ))}
      </div>
    </div>
  );
}
