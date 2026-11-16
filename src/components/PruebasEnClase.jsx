import { MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { numeroWhatsapp } from '../lib/seguimiento';

const ACTIVAS = ['pendiente', 'contactado', 'agendada'];

// Personas que agendaron una prueba (desde cedys.cl/conoce) para esta clase y fecha
export function pruebasDeClase(solicitudes, horarioId, fecha, { conEvaluaciones = true } = {}) {
  return (solicitudes || []).filter(
    (s) =>
      String(s.horario_id) === String(horarioId) &&
      s.fecha === fecha &&
      ACTIVAS.includes(s.estado) &&
      (conEvaluaciones || s.servicio !== 'bioimpedancia')
  );
}

const ETIQUETA = {
  small_group: 'Clase de prueba',
  hiit: 'Prueba HIIT',
  bioimpedancia: 'Bioimpedancia',
};

export default function PruebasEnClase({ horarioId, fecha }) {
  const { solicitudesPrueba } = useAuth();
  const lista = pruebasDeClase(solicitudesPrueba, horarioId, fecha);
  if (!lista.length) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-1.5">
      {lista.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-2 bg-amber-300/[0.06] border border-amber-300/25 rounded-lg px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-white text-sm truncate flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-300 shrink-0" />
              {s.nombre}
            </p>
            <p className="text-amber-200/70 text-[11px]">
              {ETIQUETA[s.servicio] || 'Prueba'} · sin cuenta
              {s.comentario ? ` · ${s.comentario}` : ''}
            </p>
          </div>
          {s.telefono && (
            <a
              href={`https://wa.me/${numeroWhatsapp(s.telefono)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#25D366] p-1.5 shrink-0"
              aria-label="WhatsApp"
            >
              <MessageCircle size={16} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
