import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, Check, UserX, CalendarX, ChevronRight, Info } from 'lucide-react';
import {
  alumnosEnRiesgo,
  contactadoReciente,
  diasDesdeContacto,
  numeroWhatsapp,
  DIAS_SIN_VENIR,
} from '../../lib/seguimiento';

function fechaCorta(fechaISO) {
  return new Date(fechaISO + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
}

function textoContacto(u) {
  const d = diasDesdeContacto(u);
  if (d === null) return null;
  if (d === 0) return 'Contactado hoy';
  if (d === 1) return 'Contactado ayer';
  return `Contactado hace ${d} días`;
}

export default function Seguimiento() {
  const navigate = useNavigate();
  const { usuarios, reservas, planes, diasRenovacion, infoGimnasio, marcarContactadoSeguimiento } = useAuth();
  const [tab, setTab] = useState('sinVenir');
  const [verInfo, setVerInfo] = useState(false);
  const gimnasio = infoGimnasio?.nombre || 'CED&S';

  const { sinVenir, vencidos } = alumnosEnRiesgo(usuarios, reservas, planes, diasRenovacion);
  // Los ya contactados esta semana quedan al final
  const ordenar = (lista) =>
    [...lista].sort((a, b) => Number(contactadoReciente(a.usuario)) - Number(contactadoReciente(b.usuario)));
  const lista = ordenar(tab === 'sinVenir' ? sinVenir : vencidos);
  const pendientes = (l) => l.filter((x) => !contactadoReciente(x.usuario)).length;

  function mensaje(item) {
    const nombre = (item.usuario.nombre || '').split(' ')[0];
    if (tab === 'vencidos') {
      return `Hola ${nombre}! Te escribimos de ${gimnasio} 💪 Vimos que tu plan venció el ${fechaCorta(
        item.vence
      )}. ¿Quieres renovarlo para seguir entrenando con nosotros? Si necesitas algo, cuéntanos.`;
    }
    return `Hola ${nombre}! Te extrañamos en ${gimnasio} 💪 ${
      item.diasSinVenir ? `Hace ${item.diasSinVenir} días que no vienes.` : 'Todavía no has venido a tu primera clase.'
    } ¿Te reservamos una clase esta semana? Si te pasó algo, cuéntanos y vemos cómo ayudarte.`;
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-white/50 text-sm">
          Alumnos que podrían dejar el gimnasio. Escríbeles a tiempo: retener a alguien sale más barato que conseguir uno
          nuevo.
        </p>
        <button
          onClick={() => setVerInfo(!verInfo)}
          aria-label="Cómo se calcula"
          className="w-8 h-8 shrink-0 rounded-full bg-cyan-brand/15 text-cyan-brand flex items-center justify-center"
        >
          <Info size={16} />
        </button>
      </div>
      {verInfo && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4 text-white/70 text-xs flex flex-col gap-1.5">
          <p>
            <span className="text-white font-semibold">Sin venir:</span> tienen el plan vigente, llevan {DIAS_SIN_VENIR} días o
            más sin venir a clases y no tienen ninguna reserva próxima.
          </p>
          <p>
            <span className="text-white font-semibold">Plan vencido:</span> su plan ya venció y no lo han renovado.
          </p>
          <p>
            Al tocar WhatsApp el alumno queda marcado como contactado y pasa al final de la lista por 7 días.
          </p>
        </div>
      )}

      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-5">
        {[
          { v: 'sinVenir', t: `Sin venir (${pendientes(sinVenir)})`, icon: UserX },
          { v: 'vencidos', t: `Plan vencido (${pendientes(vencidos)})`, icon: CalendarX },
        ].map((x) => (
          <button
            key={x.v}
            onClick={() => setTab(x.v)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === x.v ? 'bg-cyan-brand text-ink' : 'text-white/50'
            }`}
          >
            <x.icon size={14} /> {x.t}
          </button>
        ))}
      </div>

      {lista.length === 0 && (
        <p className="text-white/35 text-sm text-center py-12">
          {tab === 'sinVenir' ? '¡Todos tus alumnos están viniendo! 🎉' : 'No hay alumnos con el plan vencido.'}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {lista.map((item) => {
          const u = item.usuario;
          const reciente = contactadoReciente(u);
          const contacto = textoContacto(u);
          const numero = numeroWhatsapp(u.telefono);
          return (
            <div
              key={u.id}
              className={`bg-white/[0.04] border rounded-2xl p-4 ${reciente ? 'border-white/5 opacity-60' : 'border-white/10'}`}
            >
              <button onClick={() => navigate(`/usuarios/${u.id}`)} className="w-full flex items-center justify-between gap-2 text-left">
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{u.nombre}</p>
                  <p className="text-white/50 text-xs">
                    {tab === 'vencidos'
                      ? `Venció el ${fechaCorta(item.vence)} (hace ${item.venceHace} día${item.venceHace !== 1 ? 's' : ''})`
                      : item.diasSinVenir
                      ? `Última clase hace ${item.diasSinVenir} días (${fechaCorta(item.ultimaClase)})`
                      : 'Nunca ha venido a una clase'}
                  </p>
                  {tab === 'vencidos' && item.ultimaClase && (
                    <p className="text-white/35 text-[11px]">Última clase: {fechaCorta(item.ultimaClase)}</p>
                  )}
                  {contacto && (
                    <p className="text-cyan-brand/80 text-[11px] flex items-center gap-1 mt-0.5">
                      <Check size={11} /> {contacto}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </button>
              <div className="flex gap-2 mt-3">
                {numero ? (
                  <a
                    href={`https://wa.me/${numero}?text=${encodeURIComponent(mensaje(item))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => marcarContactadoSeguimiento(u.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/40 rounded-lg py-2 text-[#7ee2a5] text-xs font-semibold"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                ) : (
                  <span className="flex-1 text-center text-white/30 text-xs py-2">Sin teléfono</span>
                )}
                {!reciente && (
                  <button
                    onClick={() => marcarContactadoSeguimiento(u.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-lg py-2 text-white/70 text-xs"
                  >
                    <Check size={13} /> Ya lo contacté
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
