import { useAuth } from '../context/AuthContext';
import { LOGO_CEDS_WORDMARK } from '../assets/logoWordmark';
import {
  MapPin,
  Clock,
  MessageCircle,
  AtSign,
  ScrollText,
  Navigation,
  CalendarX,
  Users,
  Ticket,
  Timer,
  Check,
} from 'lucide-react';

function soloDigitos(s) {
  return String(s || '').replace(/\D/g, '');
}

// Información del gimnasio para el alumno: contacto, dirección, horario y reglamento.
export default function Gimnasio() {
  const { infoGimnasio, horasAnticipacion, usuarioActual } = useAuth();
  const info = infoGimnasio || {};
  const numero = soloDigitos(info.whatsapp);
  const linkWhatsapp = numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(
        `Hola, soy ${usuarioActual?.nombre || ''}. `
      )}`
    : null;
  const usuarioInstagram = String(info.instagram || '')
    .replace(/^@/, '')
    .trim();
  const linkMapa = info.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        info.direccion
      )}`
    : null;
  const lineasHorario = String(info.horario_atencion || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const reglasGimnasio = String(info.reglamento || '')
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

  const contactos = [
    linkWhatsapp && {
      href: linkWhatsapp,
      texto: 'WhatsApp',
      icono: MessageCircle,
      fondo: 'bg-[#25D366]/10 border-[#25D366]/25',
      circulo: 'bg-[#25D366] text-white',
    },
    usuarioInstagram && {
      href: `https://instagram.com/${usuarioInstagram}`,
      texto: 'Instagram',
      icono: AtSign,
      fondo: 'bg-pink-500/10 border-pink-500/25',
      circulo:
        'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white',
    },
    linkMapa && {
      href: linkMapa,
      texto: 'Cómo llegar',
      icono: Navigation,
      fondo: 'bg-cyan-brand/10 border-cyan-brand/25',
      circulo: 'bg-cyan-brand text-ink',
    },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-2xl mx-auto">
      {/* Portada */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-5">
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl" />
        <div className="relative">
          <img
            src={LOGO_CEDS_WORDMARK}
            alt={info.nombre || 'CED&S'}
            className="w-[130px] h-auto"
          />
          <p className="text-white/70 text-sm mt-4">
            Aquí estamos para ayudarte. ¡Te esperamos! 💪
          </p>
          {usuarioInstagram && (
            <p className="text-cyan-brand/80 text-xs mt-1">
              @{usuarioInstagram}
            </p>
          )}
        </div>
      </div>

      {/* Contacto rápido */}
      {contactos.length > 0 && (
        <div
          className={`grid gap-2 mb-5 ${
            contactos.length === 3
              ? 'grid-cols-3'
              : contactos.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {contactos.map((c) => {
            const Icono = c.icono;
            return (
              <a
                key={c.texto}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-2 border rounded-2xl py-4 transition-transform active:scale-95 ${c.fondo}`}
              >
                <span
                  className={`w-11 h-11 rounded-full flex items-center justify-center ${c.circulo}`}
                >
                  <Icono size={20} />
                </span>
                <span className="text-white text-xs font-medium">
                  {c.texto}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* Dirección */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-2 flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-cyan-brand/15 text-cyan-brand flex items-center justify-center shrink-0">
          <MapPin size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[11px] uppercase tracking-wide">
            Dirección
          </p>
          <p className="text-white text-sm mt-0.5">
            {info.direccion || 'Pronto'}
          </p>
          {linkMapa && (
            <a
              href={linkMapa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-brand text-xs font-semibold mt-2"
            >
              <Navigation size={12} /> Abrir en el mapa
            </a>
          )}
        </div>
      </div>

      {/* Horario */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0">
          <Clock size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[11px] uppercase tracking-wide">
            Horario de atención
          </p>
          {lineasHorario.length === 0 ? (
            <p className="text-white/35 text-sm mt-0.5">Pronto</p>
          ) : (
            <div className="flex flex-col gap-1 mt-1">
              {lineasHorario.map((l, i) => (
                <p key={i} className="text-white text-sm">
                  {l}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reglamento */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <ScrollText size={13} /> Reglamento
      </p>
      <div className="flex flex-col gap-2 mb-4">
        <Regla
          icono={CalendarX}
          titulo={`Cancela con ${horasAnticipacion} horas de anticipación`}
        >
          Si cancelas después, la sesión se descuenta igual.
        </Regla>
        <Regla icono={Timer} titulo="Máximo 15 minutos de atraso">
          Pasado ese tiempo se pierde la sesión reservada.
        </Regla>
        <Regla icono={Users} titulo="¿Clase llena? Lista de espera">
          Anótate y te avisamos si se libera un cupo.
        </Regla>
        <Regla icono={Ticket} titulo="Plan vigente y con sesiones">
          Solo puedes reservar mientras tu plan esté al día.
        </Regla>
      </div>

      {reglasGimnasio.length > 0 && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <p className="text-white/40 text-[11px] uppercase tracking-wide mb-2">
            Además, en {info.nombre || 'CED&S'}
          </p>
          <div className="flex flex-col gap-2">
            {reglasGimnasio.map((r, i) => (
              <p key={i} className="text-white/80 text-sm flex gap-2">
                <Check size={15} className="text-cyan-brand shrink-0 mt-0.5" />
                <span>{r}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Regla({ icono: Icono, titulo, children }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex items-start gap-3">
      <span className="w-9 h-9 rounded-xl bg-white/[0.06] text-cyan-brand flex items-center justify-center shrink-0">
        <Icono size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-white text-sm font-medium">{titulo}</p>
        <p className="text-white/45 text-xs mt-0.5">{children}</p>
      </div>
    </div>
  );
}
