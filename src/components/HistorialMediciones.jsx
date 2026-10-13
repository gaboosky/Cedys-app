import { useState } from 'react';
import { Pencil, Trash2, MessageSquare } from 'lucide-react';
import { MEDIDAS, formatear } from '../lib/seguimientoPersonal';

function fechaLarga(iso) {
  const t = new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Lista de mediciones (de la más reciente a la más antigua).
export default function HistorialMediciones({ lista, onEditar, onEliminar }) {
  const [borrando, setBorrando] = useState(null);
  if (!lista || lista.length === 0) return null;
  return (
    <div>
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
        Historial de mediciones
      </p>
      <div className="flex flex-col gap-2">
        {lista.map((m) => (
          <div
            key={m.id}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white text-sm font-medium">
                  {fechaLarga(m.fecha)}
                </p>
                {m.registrado_por && (
                  <p className="text-white/35 text-[11px]">
                    Registró {m.registrado_por}
                  </p>
                )}
              </div>
              {onEditar && (
                <div className="flex items-center gap-1 shrink-0">
                  {borrando === m.id ? (
                    <span className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => onEliminar(m.id)}
                        className="text-red-400 font-semibold"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => setBorrando(null)}
                        className="text-white/50"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => onEditar(m)}
                        aria-label="Editar"
                        className="p-1.5 text-cyan-brand"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setBorrando(m.id)}
                        aria-label="Eliminar"
                        className="p-1.5 text-white/30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {MEDIDAS.filter(
                (d) => m[d.clave] !== null && m[d.clave] !== undefined
              ).map((d) => (
                <span
                  key={d.clave}
                  className="text-[11px] bg-white/[0.06] rounded-full px-2 py-1 text-white/80"
                >
                  {d.label}:{' '}
                  <span className="text-white font-semibold">
                    {formatear(Number(m[d.clave]), d.unidad)}
                  </span>
                </span>
              ))}
            </div>
            {m.comentario && (
              <p className="text-white/60 text-xs mt-2 flex items-start gap-1.5">
                <MessageSquare size={12} className="shrink-0 mt-0.5" />{' '}
                {m.comentario}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
