import { useAuth } from '../context/AuthContext';
import { MapPin, Clock, MessageCircle, Instagram, ScrollText, ExternalLink } from 'lucide-react';

function soloDigitos(s) {
  return String(s || '').replace(/\D/g, '');
}

// Información del gimnasio para el alumno: contacto, dirección, horario y reglamento.
export default function Gimnasio() {
  const { infoGimnasio, horasAnticipacion, usuarioActual } = useAuth();
  const info = infoGimnasio || {};
  const numero = soloDigitos(info.whatsapp);
  const linkWhatsapp = numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(`Hola, soy ${usuarioActual?.nombre || ''}. `)}`
    : null;
  const usuarioInstagram = String(info.instagram || '').replace(/^@/, '').trim();

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-2xl mx-auto">
      <p className="font-display text-3xl text-white leading-tight">{info.nombre || 'CED&S'}</p>
      <p className="text-white/40 text-xs mt-1 mb-6">Ciencias del Entrenamiento para el Deporte y la Salud</p>

      {linkWhatsapp && (
        <a
          href={linkWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-ink font-bold rounded-2xl py-3.5 text-sm mb-3 active:scale-[0.98] transition-transform"
        >
          <MessageCircle size={18} /> Escribir por WhatsApp
        </a>
      )}
      {usuarioInstagram && (
        <a
          href={`https://instagram.com/${usuarioInstagram}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-white/[0.06] border border-white/10 text-white rounded-2xl py-3 text-sm mb-6"
        >
          <Instagram size={16} /> @{usuarioInstagram}
        </a>
      )}

      <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/10 mb-6">
        <Fila icono={MapPin} titulo="Dirección">
          {info.direccion ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.direccion)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-sm inline-flex items-center gap-1"
            >
              {info.direccion} <ExternalLink size={12} className="text-white/40" />
            </a>
          ) : (
            <span className="text-white/35 text-sm">Pronto</span>
          )}
        </Fila>
        <Fila icono={Clock} titulo="Horario de atención">
          <span className="text-white text-sm whitespace-pre-line">{info.horario_atencion || 'Pronto'}</span>
        </Fila>
      </div>

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <ScrollText size={13} /> Reglamento
      </p>
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
        <Regla>
          Puedes reservar y cancelar hasta {horasAnticipacion} horas antes de la clase. Si cancelas después, la sesión
          se descuenta igual.
        </Regla>
        <Regla>Si la clase está llena, anótate en la lista de espera: te avisamos si se libera un cupo.</Regla>
        <Regla>Solo puedes reservar mientras tu plan esté vigente y te queden sesiones.</Regla>
        {info.reglamento && (
          <p className="text-white/80 text-sm whitespace-pre-line border-t border-white/10 pt-3">{info.reglamento}</p>
        )}
      </div>
    </div>
  );
}

function Fila({ icono: Icono, titulo, children }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <Icono size={18} className="text-cyan-brand/70 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-white/40 text-xs">{titulo}</p>
        {children}
      </div>
    </div>
  );
}

function Regla({ children }) {
  return (
    <p className="text-white/70 text-sm flex gap-2">
      <span className="text-cyan-brand">•</span>
      <span>{children}</span>
    </p>
  );
}
