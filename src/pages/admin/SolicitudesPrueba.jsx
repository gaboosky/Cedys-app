import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  MessageCircle,
  Phone,
  Mail,
  Trash2,
  CalendarCheck,
  Clock,
  Copy,
  Check,
  UserPlus,
  Gift,
  UserCheck,
  X,
  MessageSquareText,
  ExternalLink,
  Settings2,
  ChevronDown,
  CalendarDays,
} from 'lucide-react';

const ESTADOS = [
  {
    valor: 'pendiente',
    etiqueta: 'Pendiente',
    clase: 'bg-yellow-400/15 text-yellow-200 border-yellow-400/40',
  },
  {
    valor: 'contactado',
    etiqueta: 'Contactado',
    clase: 'bg-white/10 text-white/80 border-white/20',
  },
  {
    valor: 'agendada',
    etiqueta: 'Agendada',
    clase: 'bg-cyan-brand/15 text-cyan-brand border-cyan-brand/40',
  },
  {
    valor: 'asistio',
    etiqueta: 'Vino',
    clase: 'bg-cyan-brand/15 text-cyan-brand border-cyan-brand/40',
  },
  {
    valor: 'no_asistio',
    etiqueta: 'No vino',
    clase: 'bg-orange-400/10 text-orange-200 border-orange-400/30',
  },
  {
    valor: 'descartada',
    etiqueta: 'Descartada',
    clase: 'bg-white/[0.03] text-white/40 border-white/10',
  },
];

import { numeroWhatsapp } from '../../lib/seguimiento';

const ultimos8 = (t) =>
  String(t || '')
    .replace(/\D/g, '')
    .slice(-8);

// Alumno que se inscribió a partir de esta solicitud (por el link de registro, o por teléfono/correo).
function inscritoDe(s, usuarios) {
  return (
    usuarios.find(
      (u) => u.rol === 'usuario' && String(u.origen_prueba_id) === String(s.id)
    ) ||
    usuarios.find(
      (u) =>
        u.rol === 'usuario' &&
        ((s.correo &&
          (u.correo || '').toLowerCase() === s.correo.toLowerCase()) ||
          (ultimos8(s.telefono).length === 8 &&
            ultimos8(u.telefono) === ultimos8(s.telefono)))
    ) ||
    null
  );
}

const SERVICIO = {
  small_group: 'Clase de prueba',
  hiit: 'Prueba HIIT',
  bioimpedancia: 'Bioimpedancia',
};
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}
function diaCita(s) {
  const d = new Date(s.fecha + 'T12:00:00');
  return `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
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
  const [filtro, setFiltro] = useState('proximas'); // proximas | activas | todas | estado
  const [editor, setEditor] = useState(false);
  const [borrando, setBorrando] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const hoy = hoyISO();
  const esProxima = (s) =>
    s.fecha && s.fecha >= hoy && ['pendiente', 'contactado', 'agendada'].includes(s.estado);
  const lista = (solicitudesPrueba || [])
    .filter((s) =>
      filtro === 'proximas'
        ? esProxima(s)
        : filtro === 'activas'
        ? (s.estado === 'pendiente' || s.estado === 'contactado') && !esProxima(s)
        : filtro === 'todas'
        ? true
        : s.estado === filtro
    )
    .sort((a, b) =>
      filtro === 'proximas'
        ? `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)
        : 0
    );
  const proximas = (solicitudesPrueba || []).filter(esProxima).length;
  const cuenta = (estado) =>
    (solicitudesPrueba || []).filter((s) => s.estado === estado).length;
  const total = (solicitudesPrueba || []).length;
  const inscritas = (solicitudesPrueba || []).filter((s) =>
    inscritoDe(s, usuarios)
  ).length;

  function linkRegistro(s) {
    const q = new URLSearchParams({
      p: s.id,
      n: s.nombre || '',
      t: s.telefono || '',
    });
    if (s.correo) q.set('c', s.correo);
    const texto = `Hola ${
      (s.nombre || '').split(' ')[0]
    }! Gracias por venir a tu sesión de prueba en ${
      infoGimnasio?.nombre || 'CED&S'
    } 💪 Si quieres seguir entrenando con nosotros, crea tu cuenta aquí (ya van tus datos): ${
      window.location.origin
    }/registro?${q.toString()}`;
    return `https://wa.me/${numeroWhatsapp(
      s.telefono
    )}?text=${encodeURIComponent(texto)}`;
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
    const texto = s.fecha
      ? `Hola ${nombre}! Te escribimos de ${
          infoGimnasio?.nombre || 'CED&S'
        } 💪 Te confirmamos tu ${(
          SERVICIO[s.servicio] || 'sesión de prueba'
        ).toLowerCase()} el ${diaCita(s)} a las ${s.hora} hrs${
          infoGimnasio?.direccion ? ` en ${infoGimnasio.direccion}` : ''
        }. Llega 5 minutos antes con ropa cómoda y agua. ¡Te esperamos!`
      : `Hola ${nombre}! Te escribimos de ${
          infoGimnasio?.nombre || 'CED&S'
        } 💪 Recibimos tu solicitud de sesión de prueba. ¿Qué día y horario te acomoda para agendarla?`;
    return `https://wa.me/${numeroWhatsapp(
      s.telefono
    )}?text=${encodeURIComponent(texto)}`;
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/conoce`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      // el navegador no permitió copiar
    }
  }

  const conversion = total > 0 ? Math.round((inscritas / total) * 100) : 0;
  const PASOS = [
    { valor: 'pendiente', t: 'Nueva' },
    { valor: 'contactado', t: 'Contactada' },
    { valor: 'agendada', t: 'Agendada' },
  ];

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-3xl mx-auto">
      <p className="font-display text-3xl text-white leading-tight">
        Sesiones de prueba
      </p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        Personas que quieren conocer el gimnasio
      </p>

      {/* Resumen + link */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-4">
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          {(() => {
            const r = 30;
            const c = 2 * Math.PI * r;
            return (
              <div className="relative w-[76px] h-[76px] shrink-0">
                <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
                  <circle
                    cx="38"
                    cy="38"
                    r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="38"
                    cy="38"
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - conversion / 100)}
                    className="text-cyan-brand"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-display text-xl text-white">
                  {conversion}%
                </span>
              </div>
            );
          })()}
          <div className="min-w-0">
            <p className="text-white font-semibold">
              {inscritas} de {total} se inscribieron
            </p>
            <p className="text-white/45 text-xs mt-0.5">
              Conversión de prueba a alumno. Te llega un aviso cada vez que
              alguien la pide.
            </p>
          </div>
        </div>
        <p className="relative mt-4 text-white/50 text-[11px]">
          Link para historias y bio de Instagram (se ve sin crear cuenta):
        </p>
        <p className="relative text-white font-semibold text-sm break-all">
          {window.location.host}/conoce
        </p>
        <div className="relative mt-2 flex gap-2">
          <button
            onClick={copiarLink}
            className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-brand text-ink rounded-xl py-2.5 text-xs font-semibold"
          >
            {copiado ? <Check size={14} /> : <Copy size={14} />}
            {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
          <a
            href="/conoce"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.07] border border-white/10 rounded-xl py-2.5 text-white text-xs font-semibold"
          >
            <ExternalLink size={14} /> Ver página
          </a>
        </div>
      </div>

      <button
        onClick={() => setEditor(!editor)}
        className="w-full flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 mb-4"
      >
        <span className="flex items-center gap-2 text-white text-sm font-medium">
          <Settings2 size={16} className="text-cyan-brand" /> Editar página de venta
        </span>
        <ChevronDown
          size={16}
          className={`text-white/40 transition-transform ${editor ? 'rotate-180' : ''}`}
        />
      </button>
      {editor && <EditorVitrina />}
      {mensajeRegalo && (
        <p className="text-cyan-brand text-sm mb-3">{mensajeRegalo}</p>
      )}

      {/* Filtros como recuadros */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          {
            v: 'proximas',
            t: 'Próximas',
            n: proximas,
            c: 'text-cyan-brand',
            on: 'border-cyan-brand/50 bg-cyan-brand/10',
          },
          {
            v: 'activas',
            t: 'Por contactar',
            n: (solicitudesPrueba || []).filter(
              (s) =>
                (s.estado === 'pendiente' || s.estado === 'contactado') &&
                !esProxima(s)
            ).length,
            c: 'text-yellow-200',
            on: 'border-yellow-400/50 bg-yellow-400/10',
          },
          {
            v: 'asistio',
            t: 'Vinieron',
            n: cuenta('asistio'),
            c: 'text-white/80',
            on: 'border-white/30 bg-white/10',
          },
          {
            v: 'todas',
            t: 'Todas',
            n: total,
            c: 'text-white',
            on: 'border-white/30 bg-white/10',
          },
        ].map((f) => {
          const activo = filtro === f.v;
          return (
            <button
              key={f.v}
              onClick={() => setFiltro(f.v)}
              className={`rounded-2xl border py-2.5 text-center transition-all active:scale-95 ${
                activo ? f.on : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <p className={`font-display text-2xl leading-none ${f.c}`}>
                {f.n}
              </p>
              <p
                className={`text-[10px] mt-1 ${
                  activo ? 'text-white/80' : 'text-white/45'
                }`}
              >
                {f.t}
              </p>
            </button>
          );
        })}
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
          const referente = s.referido_por
            ? usuarios.find((u) => String(u.id) === String(s.referido_por))
            : null;
          const descartada = s.estado === 'descartada';
          const idxPaso = PASOS.findIndex((p) => p.valor === s.estado);
          return (
            <div
              key={s.id}
              className={`border rounded-3xl p-4 ${
                inscrito
                  ? 'bg-cyan-brand/[0.05] border-cyan-brand/30'
                  : descartada
                  ? 'bg-white/[0.02] border-white/[0.06] opacity-70'
                  : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-cyan-brand/15 border border-cyan-brand/40 flex items-center justify-center shrink-0 font-display text-sm text-cyan-brand">
                  {(s.nombre || '?')
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white font-semibold truncate">
                      {s.nombre}
                    </p>
                    {inscrito ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0 bg-cyan-brand text-ink font-semibold flex items-center gap-1">
                        <UserCheck size={11} /> Se inscribió
                      </span>
                    ) : descartada ? (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${est.clase}`}
                      >
                        {est.etiqueta}
                      </span>
                    ) : null}
                  </div>
                  {s.fecha && (
                    <p
                      className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2 py-1 ${
                        s.fecha >= hoy
                          ? 'bg-cyan-brand/15 text-cyan-brand'
                          : 'bg-white/[0.06] text-white/60'
                      }`}
                    >
                      <CalendarDays size={12} />
                      {SERVICIO[s.servicio] || 'Prueba'} · {diaCita(s)} ·{' '}
                      {s.hora}
                    </p>
                  )}
                  <p className="text-white/40 text-[11px] flex items-center gap-1 mt-0.5">
                    <Clock size={11} /> Pedida el {fechaHora(s.creado_en)}
                  </p>
                  <div className="flex flex-col gap-0.5 mt-2 text-xs">
                    <p className="text-white/70 flex items-center gap-1.5">
                      <Phone size={12} className="text-white/35" /> {s.telefono}
                    </p>
                    {s.correo && (
                      <p className="text-white/70 flex items-center gap-1.5 break-all">
                        <Mail size={12} className="text-white/35 shrink-0" />{' '}
                        {s.correo}
                      </p>
                    )}
                    {s.preferencia && !s.fecha && (
                      <p className="text-white/70 flex items-center gap-1.5">
                        <CalendarCheck
                          size={12}
                          className="text-white/35 shrink-0"
                        />{' '}
                        Prefiere: {s.preferencia}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {s.comentario && (
                <div className="mt-3 flex gap-2 bg-black/20 rounded-xl px-3 py-2">
                  <MessageSquareText
                    size={14}
                    className="text-white/35 shrink-0 mt-0.5"
                  />
                  <p className="text-white/75 text-xs whitespace-pre-line">
                    {s.comentario}
                  </p>
                </div>
              )}

              {referente && (
                <div className="mt-2 flex items-center justify-between gap-2 bg-pink-400/[0.06] border border-pink-400/20 rounded-xl px-3 py-2">
                  <p className="text-white/70 text-xs">
                    <Gift
                      size={12}
                      className="inline text-pink-300 mr-1 -mt-0.5"
                    />
                    Recomendado por{' '}
                    <span className="text-white">{referente.nombre}</span>
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
                  {s.regalo_entregado && (
                    <span className="text-cyan-brand text-[11px] shrink-0">
                      Regalo entregado ✓
                    </span>
                  )}
                </div>
              )}

              {s.fecha &&
                s.fecha <= hoy &&
                !inscrito &&
                !['descartada', 'asistio', 'no_asistio'].includes(s.estado) && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        actualizarSolicitudPrueba(s.id, { estado: 'asistio' })
                      }
                      className="flex-1 bg-cyan-brand/15 border border-cyan-brand/40 text-cyan-brand rounded-xl py-2 text-xs font-semibold"
                    >
                      ✓ Vino
                    </button>
                    <button
                      onClick={() =>
                        actualizarSolicitudPrueba(s.id, { estado: 'no_asistio' })
                      }
                      className="flex-1 bg-white/[0.05] border border-white/10 text-white/70 rounded-xl py-2 text-xs font-semibold"
                    >
                      No vino
                    </button>
                  </div>
                )}
              {['asistio', 'no_asistio'].includes(s.estado) && !inscrito && (
                <p
                  className={`mt-3 inline-block text-[11px] px-2 py-0.5 rounded-full border ${est.clase}`}
                >
                  {est.etiqueta}
                </p>
              )}

              {/* Avance: toca un paso para marcarlo */}
              {!inscrito && !descartada && !s.fecha && (
                <div className="mt-3 flex items-center gap-1">
                  {PASOS.map((p, i) => {
                    const hecho = i <= idxPaso;
                    return (
                      <button
                        key={p.valor}
                        onClick={() =>
                          actualizarSolicitudPrueba(s.id, { estado: p.valor })
                        }
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <span
                          className={`h-1.5 w-full rounded-full ${
                            hecho ? 'bg-cyan-brand' : 'bg-white/10'
                          }`}
                        />
                        <span
                          className={`text-[10px] ${
                            i === idxPaso
                              ? 'text-cyan-brand font-semibold'
                              : hecho
                              ? 'text-white/60'
                              : 'text-white/35'
                          }`}
                        >
                          {p.t}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <a
                  href={mensajeWhatsapp(s)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    s.estado === 'pendiente' &&
                    actualizarSolicitudPrueba(s.id, { estado: 'contactado' })
                  }
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] rounded-xl py-2.5 text-white text-sm font-semibold transition-transform active:scale-[0.98]"
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
                <a
                  href={`tel:${String(s.telefono || '').replace(
                    /[^\d+]/g,
                    ''
                  )}`}
                  className="w-11 flex items-center justify-center bg-white/[0.06] border border-white/10 rounded-xl text-white/80"
                  aria-label="Llamar"
                >
                  <Phone size={16} />
                </a>
              </div>
              {!inscrito && !descartada && (
                <a
                  href={linkRegistro(s)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full flex items-center justify-center gap-1.5 bg-cyan-brand/10 border border-cyan-brand/40 rounded-xl py-2.5 text-cyan-brand text-xs font-semibold"
                >
                  <UserPlus size={14} /> Enviar link para inscribirse (con sus
                  datos)
                </a>
              )}
              {inscrito && (
                <p className="mt-2 text-white/50 text-xs">
                  Cuenta creada:{' '}
                  <span className="text-white">{inscrito.nombre}</span>
                  {inscrito.estado === 'pendiente'
                    ? ' · pendiente de tu aprobación en Usuarios'
                    : ''}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                {descartada ? (
                  <button
                    onClick={() =>
                      actualizarSolicitudPrueba(s.id, { estado: 'pendiente' })
                    }
                    className="text-cyan-brand text-xs font-medium"
                  >
                    Volver a gestionar
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      actualizarSolicitudPrueba(s.id, { estado: 'descartada' })
                    }
                    className="flex items-center gap-1 text-white/40 text-xs"
                  >
                    <X size={12} /> Descartar
                  </button>
                )}
                {borrando === s.id ? (
                  <span className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => eliminarSolicitudPrueba(s.id)}
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
                  <button
                    onClick={() => setBorrando(s.id)}
                    aria-label="Eliminar"
                    className="text-white/30 p-1"
                  >
                    <Trash2 size={14} />
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

// Editor de la página pública (cedys.cl/conoce): textos, servicios y planes visibles
function EditorVitrina() {
  const { planes } = useAuth();
  const [vitrina, setVitrina] = useState(null);
  const [ocultos, setOcultos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    supabase
      .from('configuracion_app')
      .select('vitrina')
      .eq('id', 'global')
      .single()
      .then(({ data }) => setVitrina(data?.vitrina || { servicios: [] }));
    setOcultos(
      Object.fromEntries(
        Object.values(planes || {}).map((p) => [p.id, !!p.ocultar_vitrina])
      )
    );
  }, [planes]);

  if (!vitrina)
    return <p className="text-white/40 text-sm mb-4">Cargando…</p>;

  const cambiarServicio = (i, cambios) =>
    setVitrina({
      ...vitrina,
      servicios: vitrina.servicios.map((s, j) => (j === i ? { ...s, ...cambios } : s)),
    });

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase
      .from('configuracion_app')
      .update({ vitrina })
      .eq('id', 'global');
    let errorPlanes = null;
    for (const p of Object.values(planes || {})) {
      if (!!p.ocultar_vitrina !== !!ocultos[p.id]) {
        const r = await supabase
          .from('planes')
          .update({ ocultar_vitrina: !!ocultos[p.id] })
          .eq('id', p.id);
        if (r.error) errorPlanes = r.error;
        else p.ocultar_vitrina = !!ocultos[p.id];
      }
    }
    setGuardando(false);
    setMensaje(
      error || errorPlanes
        ? { ok: false, t: 'No se pudo guardar: ' + (error || errorPlanes).message }
        : { ok: true, t: 'Guardado. La página ya muestra los cambios.' }
    );
  }

  const input =
    'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand';
  const listaPlanes = Object.values(planes || {})
    .filter((p) => (p.valor_con_iva || 0) > 0 && !p.solo_socios)
    .sort(
      (a, b) =>
        (a.tipo || '').localeCompare(b.tipo || '') ||
        (a.valor_con_iva || 0) - (b.valor_con_iva || 0)
    );

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">Portada</p>
        <input
          className={input}
          value={vitrina.titulo || ''}
          placeholder="Título"
          onChange={(e) => setVitrina({ ...vitrina, titulo: e.target.value })}
        />
        <textarea
          className={input + ' min-h-[64px]'}
          value={vitrina.subtitulo || ''}
          placeholder="Texto bajo el título"
          onChange={(e) => setVitrina({ ...vitrina, subtitulo: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">
          Servicios que se pueden agendar
        </p>
        {vitrina.servicios.map((s, i) => (
          <div key={s.id} className="bg-black/20 rounded-xl p-3 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={s.activo !== false}
                onChange={(e) => cambiarServicio(i, { activo: e.target.checked })}
              />
              Mostrar en la página
            </label>
            <input
              className={input}
              value={s.nombre || ''}
              onChange={(e) => cambiarServicio(i, { nombre: e.target.value })}
            />
            <textarea
              className={input + ' min-h-[56px]'}
              value={s.descripcion || ''}
              onChange={(e) => cambiarServicio(i, { descripcion: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-xs shrink-0">Precio $</span>
              <input
                className={input}
                type="number"
                min="0"
                value={s.precio ?? ''}
                placeholder="Vacío = Consultar · 0 = Gratis"
                onChange={(e) =>
                  cambiarServicio(i, {
                    precio: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">
          Planes que se muestran
        </p>
        {listaPlanes.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm text-white/85">
            <input
              type="checkbox"
              checked={!ocultos[p.id]}
              onChange={(e) => setOcultos({ ...ocultos, [p.id]: !e.target.checked })}
            />
            <span className="flex-1">{p.nombre}</span>
            <span className="text-white/40 text-xs">
              ${(p.valor_con_iva || 0).toLocaleString('es-CL')}
            </span>
          </label>
        ))}
        <p className="text-white/35 text-[11px]">
          Los planes "solo socios" y los de $0 nunca se muestran.
        </p>
      </div>

      {mensaje && (
        <p className={`text-xs ${mensaje.ok ? 'text-cyan-brand' : 'text-red-400'}`}>{mensaje.t}</p>
      )}
      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50"
      >
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );
}
