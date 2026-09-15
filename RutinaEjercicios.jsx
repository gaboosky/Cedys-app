import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const SECCIONES = [
  { key: 'calentamiento', label: 'Calentamiento' },
  { key: 'trabajo', label: 'Trabajo' },
  { key: 'cierre', label: 'Cierre' },
];

export default function RutinaEjercicios() {
  const { rutinaId, semanaId, diaId } = useParams();
  const navigate = useNavigate();
  const { obtenerEjercicios } = useAuth();
  const [ejercicios, setEjercicios] = useState(null);

  useEffect(() => {
    obtenerEjercicios(diaId).then(setEjercicios);
  }, [diaId]);

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate(`/rutinas/${rutinaId}/semanas/${semanaId}`)}
        className="flex items-center gap-1 text-white/40 text-sm mb-6 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={15} /> Volver a días
      </button>

      {ejercicios === null && (
        <p className="text-white/30 text-sm">Cargando...</p>
      )}

      {ejercicios &&
        SECCIONES.map(({ key, label }) => {
          const items = ejercicios.filter((e) => e.seccion === key);
          if (items.length === 0) return null;
          return (
            <div key={key} className="mb-8">
              <p className="text-cyan-brand text-xs font-semibold tracking-[0.15em] uppercase mb-3">
                {label}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((ej) => (
                  <div
                    key={ej.id}
                    className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white font-semibold text-base leading-snug">
                        {ej.ejercicio}
                      </p>
                      {ej.referencia_url && (
                        <a
                          href={ej.referencia_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-brand shrink-0 transition-transform active:scale-90"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                      {ej.series && <Dato label="Series" valor={ej.series} />}
                      {ej.repeticiones && (
                        <Dato label="Reps" valor={ej.repeticiones} />
                      )}
                      {ej.rir && ej.rir !== '-' && (
                        <Dato label="RIR" valor={ej.rir} />
                      )}
                      {ej.peso_referencia && (
                        <Dato label="Peso" valor={ej.peso_referencia} />
                      )}
                      {ej.descanso && (
                        <Dato label="Descanso" valor={ej.descanso} />
                      )}
                    </div>
                    {ej.notas && (
                      <p className="text-white/70 text-sm mt-2.5 italic">
                        {ej.notas}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function Dato({ label, valor }) {
  return (
    <span className="text-white/85 text-sm font-medium">
      <span className="text-white/55 font-normal">{label}:</span> {valor}
    </span>
  );
}
