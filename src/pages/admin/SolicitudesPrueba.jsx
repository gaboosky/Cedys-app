import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, Phone, Mail, Trash2, CalendarCheck, Clock, Copy, Check, UserPlus, Gift, UserCheck } from 'lucide-react';

const ESTADOS = [
  { valor: 'pendiente', etiqueta: 'Pendiente', clase: 'bg-yellow-400/15 text-yellow-200 border-yellow-400/40' },
  { valor: 'contactado', etiqueta: 'Contactado', clase: 'bg-white/10 text-white/80 border-white/20' },
  { valor: 'agendada', etiqueta: 'Agendada', clase: 'bg-cyan-brand/15 text-cyan-brand border-cyan-brand/40' },
  { valor: 'descartada', etiqueta: 'Descartada', clase: 'bg-white/[0.03] text-white/40 border-white/10' },
];

import { numeroWhatsapp } from '../../lib/seguimiento';

const ultimos8 = (t) => String(t || '').replace(/\D/g, '').slice(-8);

// Alumno que se inscribió a partir de esta solicitud (por el link de registro, o por teléfono/correo).
function inscritoDe(s, usuarios) {
  return (
    usuarios.find((u) => u.rol === 'usuario' && String(u.origen_prueba_id) === String(s.id)) ||
    usuarios.find(
      (u) =>
        u.rol === 'usuario' &&
        ((s.correo && (u.correo || '').toLowerCase() === s.correo.toLowerCase()) ||
          (ultimos8(s.telefono).length === 8 && ultimos8(u.telefono) === ultimos8(s.telefono)))
    ) ||
    null
  );
}

function fechaHora(ts) {
  return new Date(ts).toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SolicitudesPrueba() {
  const {
    solicitudesPrueba,
    actualizarSolicitudPrueba,
    eliminarSolicitudPrueba,
    infoGimnasio,
    usuarios,
    regalarSesionReferido,
  } = useAuth();
  const [regalando, setRegalando] = useState(null);
  const [mensajeRegalo, setMensajeRegalo] = useState(null);
  const [filtro, setFiltro] = useState('activas'); // activas | todas | estado
  const [borrando, setBorrando] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const lista = (solicitudesPrueba || []).filter((s) =>
    filtro === 'activas' ? s.estado === 'pendiente' || s.estado === 'contactado' : filtro === 'todas' ? true : s.estado === filtro
  );
  const cuenta = (estado) => (solicitudesPrueba || []).filter((s) => s.estado === estado).length;
  const total = (solicitudesPrueba || []).length;
  const inscritas = (solicitudesPrueba || []).filter((s) => inscritoDe(s, usuarios)).length;

  function linkRegistro(s) {
    const q = new URLSearchParams({ p: s.id, n: s.nombre || '', t: s.telefono || '' });
    if (s.correo) q.set('c', s.correo);
    const texto = `Hola ${(s.nombre || '').split(' ')[0]}! Gracias por venir a tu sesión de prueba en ${
      infoGimnasio?.nombre || 'CED&S'
    } 💪 Si quieres seguir entrenando con nosotros, crea tu cuenta aquí (ya van tus datos): ${
      window.location.origin
    }/registro?${q.toString()}`;
    return `https://wa.me/${numeroWhatsapp(s.telefono)}?text=${encodeURIComponent(texto)}`;
  }

  async function regalar(s) {
    setRegalando(s.id);
    const r = await regalarSesionReferido(s, 1);
    setRegalando(null);
    setMensajeRegalo(r.mensaje);
    setTimeout(() => setMensajeRegalo(null), 3000);
  }

  function mensajeWhatsapp(s) {
    const nombre = (s.nombre || '').split(' ')[0];
    const texto = `Hola ${nombre}! Te escribimos de ${infoGimnasio?.nombre || 'CED&S'} 💪 Recibimos tu solicitud de sesión de prueba. ¿Qué día y horario te acomoda para agendarla?`;
    return `https://wa.me/${numeroWhatsapp(s.telefono)}?text=${encodeURIComponent(texto)}`;
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/prueba`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      // el navegador no permitió copiar
    }
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-3xl mx-auto">
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-5">
        <p className="text-white text-sm">
          Las personas piden su sesión de prueba desde la página de inicio de la app. Te llega un aviso cada vez que
          alguien la pide.
        </p>
        <button onClick={copiarLink} className="mt-2 flex items-center gap-1.5 text-cyan-brand text-xs font-semibold">
          {copiado ? <Check size={13} /> : <Copy size={13} />}
          {copiado ? 'Link copiado' : 'Copiar link directo al formulario (para Instagram o WhatsApp)'}
        </button>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3">
            <p className="text-white/40 text-[11px] uppercase tracking-wide">Solicitudes</p>
            <p className="text-white font-display text-2xl leading-tight">{total}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3">
            <p className="text-white/40 text-[11px] uppercase tracking-wide">Se inscribieron</p>
            <p className="text-cyan-brand font-display text-2xl leading-tight">{inscritas}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3">
            <p className="text-white/40 text-[11px] uppercase tracking-wide">Conversión</p>
            <p className="text-white font-display text-2xl leading-tight">{Math.round((inscritas / total) * 100)}%</p>
          </div>
        </div>
      )}
      {mensajeRegalo && <p className="text-cyan-brand text-sm mb-3">{mensajeRegalo}</p>}

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
        {[
          { v: 'activas', t: `Por gestionar (${cuenta('pendiente') + cuenta('contactado')})` },
          { v: 'agendada', t: `Agendadas (${cuenta('agendada')})` },
          { v: 'descartada', t: `Descartadas (${cuenta('descartada')})` },
          { v: 'todas', t: 'Todas' },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFiltro(f.v)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${
              filtro === f.v ? 'bg-cyan-brand text-ink' : 'bg-white/[0.06] text-white/50'
            }`}
          >
            {f.t}
          </button>
        ))}
      </div>

      {lista.length === 0 && (
        <div className="text-center py-14">
          <CalendarCheck size={36} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/35 text-sm">No hay solicitudes aquí.</p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {lista.map((s) => {
          const est = ESTADOS.find((e) => e.valor === s.estado) || ESTADOS[0];
          const inscrito = inscritoDe(s, usuarios);
          const referente = s.referido_por ? usuarios.find((u) => String(u.id) === String(s.referido_por)) : null;
          return (
            <div key={s.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{s.nombre}</p>
                  <p className="text-white/40 text-[11px] flex items-center gap-1">
                    <Clock size={11} /> Pedida el {fechaHora(s.creado_en)}
                  </p>
                </div>
                {inscrito ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border shrink-0 bg-cyan-brand text-ink border-cyan-brand font-semibold flex items-center gap-1">
                    <UserCheck size={11} /> Se inscribió
                  </span>
                ) : (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${est.clase}`}>{est.etiqueta}</span>
                )}
              </div>
              {referente && (
                <div className="mt-2 flex items-center justify-between gap-2 bg-cyan-brand/[0.06] border border-cyan-brand/20 rounded-lg px-3 py-2">
                  <p className="text-white/70 text-xs">
                    <Gift size={12} className="inline text-cyan-brand mr-1 -mt-0.5" />
                    Recomendado por <span className="text-white">{referente.nombre}</span>
                  </p>
                  {inscrito && !s.regalo_entregado && (
                    <button
                      onClick={() => regalar(s)}
                      disabled={regalando === s.id}
                      className="shrink-0 bg-cyan-brand text-ink text-[11px] font-semibold rounded-md px-2 py-1 disabled:opacity-50"
                    >
                      {regalando === s.id ? '...' : 'Regalar 1 sesión'}
                    </button>
                  )}
                  {s.regalo_entregado && <span className="text-cyan-brand text-[11px] shrink-0">Regalo entregado ✓</span>}
                </div>
              )}

              <div className="mt-2 flex flex-col gap-1 text-sm">
                <p className="text-white/80 flex items-center gap-1.5">
                  <Phone size={13} className="text-white/40" /> {s.telefono}
                </p>
                {s.correo && (
                  <p className="text-white/80 flex items-center gap-1.5 break-all">
                    <Mail size={13} className="text-white/40 shrink-0" /> {s.correo}
                  </p>
                )}
                {s.preferencia && (
                  <p className="text-white/70 text-xs">
                    <span className="text-white/40">Prefiere:</span> {s.preferencia}
                  </p>
                )}
                {s.comentario && (
                  <p className="text-white/70 text-xs whitespace-pre-line">
                    <span className="text-white/40">Comentario:</span> {s.comentario}
                  </p>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <a
                  href={mensajeWhatsapp(s)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => s.estado === 'pendiente' && actualizarSolicitudPrueba(s.id, { estado: 'contactado' })}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/40 rounded-lg py-2 text-[#7ee2a5] text-xs font-semibold"
                >
                  <MessageCircle size={13} /> WhatsApp
                </a>
                <a
                  href={`tel:${String(s.telefono || '').replace(/[^\d+]/g, '')}`}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-lg py-2 text-white/80 text-xs"
                >
                  <Phone size={13} /> Llamar
                </a>
              </div>
              {!inscrito && (
                <a
                  href={linkRegistro(s)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full flex items-center justify-center gap-1.5 bg-cyan-brand/10 border border-cyan-brand/40 rounded-lg py-2 text-cyan-brand text-xs font-semibold"
                >
                  <UserPlus size={13} /> Enviar link para inscribirse (con sus datos)
                </a>
              )}
              {inscrito && (
                <p className="mt-2 text-white/50 text-xs">
                  Cuenta creada: <span className="text-white">{inscrito.nombre}</span>
                  {inscrito.estado === 'pendiente' ? ' · pendiente de tu aprobación en Usuarios' : ''}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {ESTADOS.filter((e) => e.valor !== s.estado).map((e) => (
                  <button
                    key={e.valor}
                    onClick={() => actualizarSolicitudPrueba(s.id, { estado: e.valor })}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] text-white/60"
                  >
                    Marcar {e.etiqueta.toLowerCase()}
                  </button>
                ))}
                <div className="ml-auto">
                  {borrando === s.id ? (
                    <span className="flex items-center gap-2 text-xs">
                      <button onClick={() => eliminarSolicitudPrueba(s.id)} className="text-red-400 font-semibold">
                        Eliminar
                      </button>
                      <button onClick={() => setBorrando(null)} className="text-white/50">
                        No
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => setBorrando(s.id)} aria-label="Eliminar" className="text-white/30 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
