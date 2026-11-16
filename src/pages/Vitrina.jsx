import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Flame,
  MapPin,
  MessageCircle,
  AtSign,
  Users,
  Activity,
  Dumbbell,
  X,
  LogIn,
  CalendarPlus,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LOGO_CEDS_WORDMARK } from '../assets/logoWordmark';

// Página pública (cedys.cl/conoce): se puede ver y agendar una prueba sin tener cuenta.
// Los datos vienen de la función vitrina_publica() y la reserva se guarda con agendar_prueba().

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_AGENDA = 14;
const HORAS_MINIMAS = 3; // no se ofrecen horarios que empiezan en menos de 3 horas

const ICONO_SERVICIO = { clase: Users, hiit: Flame, evaluacion: Activity };

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deISO = (s) => new Date(s + 'T12:00:00');
const fechaLinda = (s) => {
  const d = deISO(s);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};
const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-CL');
const precioTexto = (p) =>
  p === 0 || p === '0' ? 'Gratis' : p == null || p === '' ? 'Consultar' : pesos(p);
const digitos = (s) => String(s || '').replace(/\D/g, '');

function leerRef() {
  try {
    return new URLSearchParams(window.location.search).get('ref') || '';
  } catch (e) {
    return '';
  }
}

// Fechas y horarios disponibles para un servicio
function opcionesDe(servicio, datos) {
  if (!servicio || !datos) return [];
  const ahora = Date.now();
  const ocup = {};
  for (const o of datos.ocupados || []) ocup[`${o.horario_id}_${o.fecha}`] = o.n;
  const cancel = new Set((datos.cancelados || []).map((c) => `${c.horario_id}_${c.fecha}`));
  const esHiit = servicio.tipo === 'hiit';
  const dias = [];
  const hoy = new Date();
  for (let i = 0; i < (esHiit ? 22 : DIAS_AGENDA); i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i, 12);
    const f = iso(d);
    const slots = (datos.horarios || [])
      .filter((h) =>
        esHiit
          ? h.tipo === 'hiit' && h.fecha_unica === f
          : h.tipo !== 'hiit' && (h.fecha_unica ? h.fecha_unica === f : h.dia === DIAS[d.getDay()])
      )
      .filter((h) => !cancel.has(`${h.id}_${f}`))
      .filter((h) => {
        const inicio = new Date(`${f}T${h.hora}:00`).getTime();
        return inicio - ahora > HORAS_MINIMAS * 3600 * 1000;
      })
      .map((h) => {
        const libres =
          servicio.tipo === 'evaluacion'
            ? null
            : Math.max(0, (h.cupo_max || 0) - (ocup[`${h.id}_${f}`] || 0));
        return { ...h, fecha: f, libres };
      })
      .sort((a, b) => a.hora.localeCompare(b.hora));
    if (slots.length) dias.push({ fecha: f, slots });
  }
  return dias;
}

// Agrupa los días que tienen los mismos horarios (como el afiche: "Lunes, Miércoles y Viernes")
function horarioAgrupado(horarios) {
  const orden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const porDia = {};
  for (const h of horarios || [])
    if (h.tipo !== 'hiit' && !h.fecha_unica) (porDia[h.dia] = porDia[h.dia] || []).push(h.hora);
  const grupos = [];
  for (const dia of orden) {
    if (!porDia[dia]) continue;
    const horas = [...new Set(porDia[dia])].sort().join(' · ');
    const g = grupos.find((x) => x.horas === horas);
    if (g) g.dias.push(dia);
    else grupos.push({ dias: [dia], horas });
  }
  return grupos.map((g) => ({
    ...g,
    titulo:
      g.dias.length === 1
        ? g.dias[0]
        : g.dias.slice(0, -1).join(', ') + ' y ' + g.dias[g.dias.length - 1],
  }));
}

export default function Vitrina({ conSesion = false }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(false);
  const [agendando, setAgendando] = useState(null); // servicio elegido (abre la ventana)
  const [tabPlanes, setTabPlanes] = useState('normal');
  const [ref] = useState(leerRef);

  useEffect(() => {
    let vivo = true;
    supabase.rpc('vitrina_publica').then(({ data, error: e }) => {
      if (!vivo) return;
      if (e || !data) setError(true);
      else setDatos(data);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const gim = datos?.gimnasio || {};
  const vitrina = datos?.vitrina || {};
  const servicios = (vitrina.servicios || []).filter((s) => s.activo !== false);
  const numero = digitos(gim.whatsapp);
  const wa = (texto) =>
    numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null;
  const grupos = useMemo(() => horarioAgrupado(datos?.horarios), [datos]);
  const planes = (datos?.planes || []).filter((p) => p.tipo === tabPlanes);
  const hayHiit = (datos?.planes || []).some((p) => p.tipo === 'hiit');
  const proximasHiit = (datos?.horarios || [])
    .filter((h) => h.tipo === 'hiit' && h.fecha_unica)
    .sort((a, b) => (a.fecha_unica + a.hora).localeCompare(b.fecha_unica + b.hora))
    .slice(0, 4);
  const usuarioIg = String(gim.instagram || '').replace(/^@/, '').trim();
  const mapa = gim.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gim.direccion)}`
    : null;
  const principal = servicios.find((s) => s.tipo === 'clase') || servicios[0];

  function irA(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (error)
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-8 text-center gap-4">
        <p className="text-white/70">No pudimos cargar la información. Revisa tu conexión.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-cyan-brand text-ink font-semibold rounded-xl px-5 py-2.5"
        >
          Reintentar
        </button>
      </div>
    );

  if (!datos)
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-brand/30 border-t-cyan-brand rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-ink text-white pb-28">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 bg-ink/85 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <img src={LOGO_CEDS_WORDMARK} alt={gim.nombre || 'CED&S'} className="h-7 w-auto" />
          <a
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 border border-white/15 rounded-full px-3 py-1.5"
          >
            <LogIn size={13} /> {conSesion ? 'Ir a la app' : 'Soy alumno'}
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4">
        {/* Portada */}
        <section className="relative pt-10 pb-8">
          <div className="absolute -top-10 -right-24 w-72 h-72 rounded-full bg-cyan-brand/15 blur-3xl pointer-events-none" />
          <p className="relative text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase mb-3">
            {gim.nombre || 'CED&S'} · {String(gim.direccion || '').split(',').pop()?.trim() || 'Centro de entrenamiento'}
          </p>
          <h1 className="relative font-display uppercase text-[44px] sm:text-6xl leading-[0.95] tracking-tight">
            {vitrina.titulo || 'Entrena en grupos pequeños'}
          </h1>
          {vitrina.subtitulo && (
            <p className="relative text-white/65 text-[15px] leading-relaxed mt-4 max-w-md">
              {vitrina.subtitulo}
            </p>
          )}
          <div className="relative flex flex-col sm:flex-row gap-2.5 mt-7">
            {principal && (
              <button
                onClick={() => setAgendando(principal)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-2xl px-6 py-3.5 active:scale-[0.98] transition-transform"
              >
                <CalendarCheck size={18} />
                {principal.precio === 0 ? 'Agenda tu clase de prueba gratis' : 'Agenda tu clase de prueba'}
              </button>
            )}
            <button
              onClick={() => irA('planes')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/[0.06] border border-white/10 rounded-2xl px-6 py-3.5 text-white/90 font-medium"
            >
              Ver planes y precios
            </button>
          </div>
        </section>

        {/* Servicios */}
        <section className="py-6">
          <TituloSeccion eyebrow="Pruébalo" titulo="Agenda tu sesión" />
          <div className="grid gap-3 sm:grid-cols-2">
            {servicios.map((s) => {
              const Icono = ICONO_SERVICIO[s.tipo] || Dumbbell;
              return (
                <div
                  key={s.id}
                  className="flex flex-col bg-white/[0.04] border border-white/10 rounded-3xl p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-cyan-brand/15 text-cyan-brand flex items-center justify-center">
                      <Icono size={20} />
                    </span>
                    <span
                      className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
                        s.precio === 0
                          ? 'bg-cyan-brand text-ink'
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {precioTexto(s.precio)}
                    </span>
                  </div>
                  <p className="text-white font-semibold text-lg mt-4 leading-tight">{s.nombre}</p>
                  {s.descripcion && (
                    <p className="text-white/55 text-sm mt-1.5 leading-relaxed flex-1">{s.descripcion}</p>
                  )}
                  <button
                    onClick={() => setAgendando(s)}
                    className="mt-4 w-full flex items-center justify-center gap-1.5 bg-white text-ink font-semibold rounded-xl py-2.5 text-sm active:scale-[0.98] transition-transform"
                  >
                    Elegir día y hora <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Horarios */}
        <section className="py-6">
          <TituloSeccion eyebrow="Horarios" titulo="Small Group" />
          <div className="flex flex-col gap-2">
            {grupos.map((g) => (
              <div
                key={g.titulo}
                className="bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5"
              >
                <p className="text-cyan-brand text-[11px] font-semibold uppercase tracking-wider">
                  {g.titulo}
                </p>
                <p className="text-white text-[15px] mt-1 font-medium tabular-nums">{g.horas}</p>
              </div>
            ))}
          </div>
          {proximasHiit.length > 0 && (
            <div className="mt-4">
              <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame size={13} className="text-orange-300" /> Próximas clases HIIT
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                {proximasHiit.map((h) => (
                  <div
                    key={h.id}
                    className="shrink-0 bg-orange-400/[0.07] border border-orange-300/20 rounded-2xl px-4 py-3"
                  >
                    <p className="text-white text-sm font-medium">{fechaLinda(h.fecha_unica)}</p>
                    <p className="text-orange-200/80 text-xs mt-0.5">{h.hora} hrs</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Planes */}
        <section id="planes" className="py-6 scroll-mt-16">
          <TituloSeccion eyebrow="Planes" titulo="Elige cómo entrenar" />
          {hayHiit && (
            <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-3 max-w-xs">
              {[
                { v: 'normal', t: 'Small Group' },
                { v: 'hiit', t: 'HIIT' },
              ].map((x) => (
                <button
                  key={x.v}
                  onClick={() => setTabPlanes(x.v)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tabPlanes === x.v ? 'bg-cyan-brand text-ink' : 'text-white/55'
                  }`}
                >
                  {x.t}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {planes.map((p) => {
              const meses = Math.max(1, Math.round((p.duracion_dias || 30) / 30));
              const porSesion = p.sesiones ? Math.round(p.precio / p.sesiones) : null;
              const link = wa(
                `Hola! Vi la página de ${gim.nombre || 'CED&S'} y me interesa el ${p.nombre} (${pesos(
                  p.precio
                )}). ¿Cómo lo contrato?`
              );
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium leading-tight">{p.nombre}</p>
                    <p className="text-white/45 text-xs mt-1">
                      {p.sesiones ? `${p.sesiones} clases` : 'Clases ilimitadas'}
                      {' · '}
                      {meses === 1 ? 'mensual' : meses === 12 ? '1 año' : `${meses} meses`}
                      {porSesion ? ` · ${pesos(porSesion)} c/u` : ''}
                    </p>
                    {p.descripcion && (
                      <p className="text-orange-200/70 text-[11px] mt-1">{p.descripcion}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-xl text-white leading-none">{pesos(p.precio)}</p>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-[11px] font-semibold text-cyan-brand"
                      >
                        Lo quiero →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-white/35 text-xs mt-3">
            Para contratar escríbenos por WhatsApp o pídelo en tu clase de prueba.
          </p>
        </section>

        {/* Dónde estamos */}
        <section className="py-6">
          <TituloSeccion eyebrow="Contacto" titulo="Dónde estamos" />
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 flex flex-col gap-3">
            {gim.direccion && (
              <a href={mapa} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3">
                <MapPin size={18} className="text-cyan-brand shrink-0 mt-0.5" />
                <span className="text-white/85 text-sm">
                  {gim.direccion}
                  <span className="block text-cyan-brand text-xs mt-0.5">Cómo llegar →</span>
                </span>
              </a>
            )}
            {gim.horario_atencion && (
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-cyan-brand shrink-0 mt-0.5" />
                <span className="text-white/70 text-sm whitespace-pre-line">{gim.horario_atencion}</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {numero && (
                <a
                  href={wa(`Hola! Vi la página de ${gim.nombre || 'CED&S'} y quiero más información.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] text-white font-semibold rounded-xl py-2.5 text-sm"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              {usuarioIg && (
                <a
                  href={`https://instagram.com/${usuarioIg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 text-white font-semibold rounded-xl py-2.5 text-sm"
                >
                  <AtSign size={16} /> Instagram
                </a>
              )}
            </div>
          </div>
        </section>

        <p className="text-center text-white/35 text-xs py-6">
          ¿Ya entrenas con nosotros?{' '}
          <a href="/" className="text-cyan-brand font-medium">
            Entra a la app
          </a>
        </p>
      </main>

      {/* Botón fijo abajo */}
      {principal && !agendando && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-ink via-ink/95 to-transparent pt-6 pb-4 px-4">
          <button
            onClick={() => setAgendando(principal)}
            className="max-w-3xl mx-auto w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-2xl py-3.5 shadow-lg shadow-cyan-brand/20 active:scale-[0.98] transition-transform"
          >
            <CalendarCheck size={18} /> Agendar mi prueba
          </button>
        </div>
      )}

      {agendando && (
        <Agendar
          servicioInicial={agendando}
          servicios={servicios}
          datos={datos}
          gim={gim}
          referido={ref}
          onCerrar={() => setAgendando(null)}
        />
      )}
    </div>
  );
}

function TituloSeccion({ eyebrow, titulo }) {
  return (
    <div className="mb-4">
      <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">{eyebrow}</p>
      <h2 className="font-display uppercase text-3xl leading-tight mt-0.5">{titulo}</h2>
    </div>
  );
}

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors';

// Ventana para agendar: servicio → día y hora → datos → listo
function Agendar({ servicioInicial, servicios, datos, gim, referido, onCerrar }) {
  const [servicio, setServicio] = useState(servicioInicial);
  const [paso, setPaso] = useState('horario'); // horario | datos | listo
  const [fecha, setFecha] = useState(null);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', correo: '', comentario: '' });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [resultado, setResultado] = useState(null);

  const dias = useMemo(() => opcionesDe(servicio, datos), [servicio, datos]);
  const diaElegido = dias.find((d) => d.fecha === fecha) || dias[0];

  useEffect(() => {
    setFecha(null);
    setSlot(null);
  }, [servicio]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function enviar(e) {
    e.preventDefault();
    if (!slot) return;
    setEnviando(true);
    setMensaje(null);
    const { data, error } = await supabase.rpc('agendar_prueba', {
      p_nombre: form.nombre,
      p_telefono: form.telefono,
      p_correo: form.correo,
      p_servicio: servicio.id,
      p_horario: slot.id,
      p_fecha: slot.fecha,
      p_comentario: form.comentario,
      p_referido: referido || null,
    });
    setEnviando(false);
    if (error || !data?.ok) {
      setMensaje(data?.mensaje || 'No se pudo agendar. Intenta de nuevo o escríbenos por WhatsApp.');
      return;
    }
    setResultado(data);
    setPaso('listo');
  }

  const numero = digitos(gim.whatsapp);
  const inicio = slot ? new Date(`${slot.fecha}T${slot.hora}:00`) : null;
  const calendario = inicio
    ? (() => {
        const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
        const f = (d) =>
          `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(
            d.getHours()
          ).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
        const q = new URLSearchParams({
          action: 'TEMPLATE',
          text: `${servicio.nombre} · ${gim.nombre || 'CED&S'}`,
          dates: `${f(inicio)}/${f(fin)}`,
          location: gim.direccion || '',
          ctz: 'America/Santiago',
        });
        return `https://calendar.google.com/calendar/render?${q.toString()}`;
      })()
    : null;
  const linkCuenta = resultado
    ? `/registro?${new URLSearchParams({
        p: resultado.id,
        n: form.nombre,
        t: form.telefono,
        ...(form.correo ? { c: form.correo } : {}),
      }).toString()}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-[#111] w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10">
        <div className="sticky top-0 bg-[#111] z-10 flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/[0.06]">
          {paso === 'datos' && (
            <button onClick={() => setPaso('horario')} className="p-1 text-white/60" aria-label="Volver">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">
              {paso === 'listo' ? '¡Te esperamos!' : servicio.nombre}
            </p>
            {paso !== 'listo' && (
              <p className="text-white/40 text-xs">
                {paso === 'horario' ? 'Paso 1 de 2 · Elige día y hora' : 'Paso 2 de 2 · Tus datos'}
              </p>
            )}
          </div>
          <button onClick={onCerrar} className="p-1 text-white/50" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {paso === 'horario' && (
            <>
              {servicios.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4">
                  {servicios.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setServicio(s)}
                      className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 border ${
                        servicio.id === s.id
                          ? 'bg-cyan-brand text-ink border-cyan-brand'
                          : 'bg-white/[0.04] text-white/70 border-white/10'
                      }`}
                    >
                      {s.nombre.replace(/^Clase de prueba /, '')}
                    </button>
                  ))}
                </div>
              )}

              {dias.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-white/60 text-sm">No hay horarios disponibles en los próximos días.</p>
                  {numero && (
                    <a
                      href={`https://wa.me/${numero}?text=${encodeURIComponent(
                        `Hola! Quiero agendar: ${servicio.nombre}. ¿Qué horarios tienen?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-4 bg-[#25D366] text-white font-semibold rounded-xl px-4 py-2.5 text-sm"
                    >
                      <MessageCircle size={16} /> Consultar por WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                    {dias.map((d) => {
                      const dd = deISO(d.fecha);
                      const activo = diaElegido?.fecha === d.fecha;
                      return (
                        <button
                          key={d.fecha}
                          onClick={() => {
                            setFecha(d.fecha);
                            setSlot(null);
                          }}
                          className={`shrink-0 w-14 rounded-2xl py-2 text-center border transition-colors ${
                            activo
                              ? 'bg-cyan-brand text-ink border-cyan-brand'
                              : 'bg-white/[0.04] text-white border-white/10'
                          }`}
                        >
                          <span className={`block text-[10px] uppercase ${activo ? 'text-ink/70' : 'text-white/45'}`}>
                            {DIAS_CORTOS[dd.getDay()]}
                          </span>
                          <span className="block font-display text-xl leading-tight">{dd.getDate()}</span>
                          <span className={`block text-[10px] ${activo ? 'text-ink/70' : 'text-white/40'}`}>
                            {MESES[dd.getMonth()]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-white/50 text-xs mt-3 mb-2">{fechaLinda(diaElegido.fecha)}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {diaElegido.slots.map((s) => {
                      const lleno = s.libres === 0;
                      const elegido = slot?.id === s.id && slot?.fecha === s.fecha;
                      return (
                        <button
                          key={s.id}
                          disabled={lleno}
                          onClick={() => setSlot(s)}
                          className={`rounded-xl py-2.5 border text-center transition-colors disabled:opacity-35 ${
                            elegido
                              ? 'bg-cyan-brand text-ink border-cyan-brand'
                              : 'bg-white/[0.04] text-white border-white/10'
                          }`}
                        >
                          <span className="block font-semibold tabular-nums">{s.hora}</span>
                          {s.libres !== null && (
                            <span
                              className={`block text-[10px] ${
                                elegido ? 'text-ink/70' : lleno ? 'text-white/40' : s.libres <= 2 ? 'text-orange-300' : 'text-white/40'
                              }`}
                            >
                              {lleno ? 'Lleno' : s.libres === 1 ? 'Último cupo' : `${s.libres} cupos`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={!slot}
                    onClick={() => setPaso('datos')}
                    className="mt-5 w-full bg-cyan-brand text-ink font-semibold rounded-xl py-3 disabled:opacity-35"
                  >
                    {slot ? `Continuar · ${fechaLinda(slot.fecha)}, ${slot.hora}` : 'Elige un horario'}
                  </button>
                </>
              )}
            </>
          )}

          {paso === 'datos' && slot && (
            <form onSubmit={enviar} className="flex flex-col gap-3">
              <div className="bg-cyan-brand/10 border border-cyan-brand/30 rounded-2xl px-4 py-3">
                <p className="text-white text-sm font-semibold">{servicio.nombre}</p>
                <p className="text-cyan-brand text-sm mt-0.5">
                  {fechaLinda(slot.fecha)} · {slot.hora} hrs
                </p>
                <p className="text-white/45 text-xs mt-0.5">{precioTexto(servicio.precio)}</p>
              </div>
              <p className="text-white/50 text-xs">
                No necesitas crear una cuenta. Solo déjanos tus datos para confirmarte.
              </p>
              <input
                required
                className={INPUT}
                placeholder="Nombre y apellido"
                autoComplete="name"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <input
                required
                className={INPUT}
                placeholder="WhatsApp (ej: +56 9 1234 5678)"
                type="tel"
                autoComplete="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Correo (opcional)"
                type="email"
                autoComplete="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
              />
              <textarea
                className={INPUT + ' min-h-[72px]'}
                placeholder="¿Algo que debamos saber? Lesiones, objetivos… (opcional)"
                value={form.comentario}
                onChange={(e) => setForm({ ...form, comentario: e.target.value })}
              />
              {mensaje && <p className="text-red-400 text-sm">{mensaje}</p>}
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-cyan-brand text-ink font-semibold rounded-xl py-3 disabled:opacity-50"
              >
                {enviando ? 'Agendando…' : 'Confirmar mi hora'}
              </button>
            </form>
          )}

          {paso === 'listo' && resultado && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-cyan-brand text-ink flex items-center justify-center mx-auto">
                <Check size={32} strokeWidth={3} />
              </div>
              <p className="font-display uppercase text-2xl mt-4">Quedaste agendado/a</p>
              <p className="text-white/70 text-sm mt-2">{servicio.nombre}</p>
              <p className="text-cyan-brand font-semibold mt-0.5">
                {fechaLinda(slot.fecha)} · {slot.hora} hrs
              </p>
              {gim.direccion && <p className="text-white/45 text-xs mt-1">{gim.direccion}</p>}
              <p className="text-white/50 text-xs mt-3">
                Te escribiremos por WhatsApp para confirmar. Llega 5 minutos antes con ropa cómoda y
                agua.
              </p>

              <div className="flex flex-col gap-2 mt-5 text-left">
                {calendario && (
                  <a
                    href={calendario}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm"
                  >
                    <CalendarPlus size={18} className="text-cyan-brand" /> Agregar a mi calendario
                  </a>
                )}
                {linkCuenta && (
                  <a
                    href={linkCuenta}
                    className="flex items-center gap-3 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm"
                  >
                    <UserPlus size={18} className="text-cyan-brand" />
                    <span>
                      Crear mi cuenta (opcional)
                      <span className="block text-white/40 text-xs">
                        Para reservar tus próximas clases desde la app
                      </span>
                    </span>
                  </a>
                )}
                {servicios
                  .filter((s) => s.id !== servicio.id)
                  .slice(0, 1)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setServicio(s);
                        setResultado(null);
                        setPaso('horario');
                      }}
                      className="flex items-center gap-3 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-left"
                    >
                      <CalendarCheck size={18} className="text-cyan-brand" />
                      <span>
                        Agendar también: {s.nombre}
                        <span className="block text-white/40 text-xs">{precioTexto(s.precio)}</span>
                      </span>
                    </button>
                  ))}
              </div>
              <button onClick={onCerrar} className="mt-5 text-white/50 text-sm">
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
