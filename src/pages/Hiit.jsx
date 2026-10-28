import { useMemo, useState } from 'react';
import {
  Flame,
  Gift,
  Check,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Settings,
  BarChart3,
  CreditCard,
  CalendarDays,
  ShoppingBag,
  Download,
  Trash2,
  Pencil,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reservaBloqueada, esCancelacionTardia } from '../lib/horarioUtils';
import { formatearPesos, hoyLocalISO } from '../lib/ingresos';

// ---------- utilidades ----------
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function fechaTexto(iso, opciones = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const t = new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', opciones);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function sumarDias(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function soloDigitos(t) {
  return String(t || '').replace(/\D/g, '');
}
const iniciales = (n) =>
  (n || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

// Clases HIIT con su estado (inscritos, cancelada, etc.)
function useClasesHiit() {
  const { horariosHiit = [], reservas, horarioEstaCancelado, usuarios } = useAuth();
  return useMemo(() => {
    const nombreDe = Object.fromEntries((usuarios || []).map((u) => [u.id, u]));
    return horariosHiit
      .filter((h) => h.fecha_unica)
      .map((h) => {
        const fecha = h.fecha_unica;
        const inscritos = reservas.filter(
          (r) => r.horario_id === h.id && r.fecha === fecha && r.estado === 'confirmada'
        );
        return {
          h,
          fecha,
          cancelada: horarioEstaCancelado(h.id, fecha),
          inscritos,
          alumnos: inscritos.map((r) => ({ r, u: nombreDe[r.usuario_id] })),
        };
      })
      .sort((a, b) => (a.fecha + a.h.hora).localeCompare(b.fecha + b.h.hora));
  }, [horariosHiit, reservas, horarioEstaCancelado, usuarios]);
}

function Cupos({ ocupados, cupo, chico }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: cupo }).map((_, i) => (
        <span
          key={i}
          className={`${chico ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full ${
            i < ocupados ? 'bg-orange-400' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

function Hero({ titulo, subtitulo, children }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-orange-400/30 bg-gradient-to-br from-[#3a1a06] via-[#1c1009] to-ink p-5 mb-4">
      <Flame size={130} className="absolute -right-6 -top-6 text-orange-400/[0.08]" />
      <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="relative">
        <p className="flex items-center gap-1.5 text-orange-300 text-[11px] font-semibold tracking-[0.2em] uppercase">
          <Flame size={13} /> HIIT
        </p>
        <p className="font-display text-white text-2xl leading-tight mt-1">{titulo}</p>
        {subtitulo && <p className="text-white/60 text-sm mt-1">{subtitulo}</p>}
        {children}
      </div>
    </div>
  );
}

function Aviso({ msg, onCerrar }) {
  if (!msg) return null;
  return (
    <div
      className={`fixed left-4 right-4 bottom-24 z-50 max-w-md mx-auto rounded-2xl px-4 py-3 text-sm shadow-xl border flex items-start gap-2 ${
        msg.ok ? 'bg-[#0f2a22] border-green-400/40 text-green-200' : 'bg-[#2a1215] border-red-400/40 text-red-200'
      }`}
    >
      <span className="flex-1">{msg.mensaje}</span>
      <button onClick={onCerrar} aria-label="Cerrar">
        <X size={16} />
      </button>
    </div>
  );
}

function useAviso() {
  const [msg, setMsg] = useState(null);
  function mostrar(m) {
    setMsg(m);
    setTimeout(() => setMsg((actual) => (actual === m ? null : actual)), 4000);
  }
  return [msg, mostrar, () => setMsg(null)];
}

// =====================================================================
export default function Hiit() {
  const { rolEfectivo } = useAuth();
  if (rolEfectivo === 'head_coach') return <HiitAdmin />;
  if (rolEfectivo === 'coach') return <HiitCoach />;
  return <HiitAlumno />;
}

// ============================ ALUMNO ================================
function HiitAlumno() {
  const { usuarioActual, saldoHiitDe, reservarHiit, cancelarHiit, hiitConfig, planesHiit = [], infoGimnasio, horasAnticipacion } =
    useAuth();
  const clases = useClasesHiit();
  const [aviso, mostrar, cerrar] = useAviso();
  const [ocupado, setOcupado] = useState(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState(null);

  const hoy = hoyLocalISO();
  // Coach o admin en "Ver como alumno": ve la pantalla igual que un alumno
  // sin plan HIIT (vista previa). Al reservar no se le descuenta nada.
  const vistaPrevia = usuarioActual?.rol !== 'usuario';
  const esStaff = false;
  const saldo = vistaPrevia
    ? { saldo: 0, vence: null, vigente: false, prueba: hiitConfig.pruebaActiva }
    : saldoHiitDe(usuarioActual);
  const proximas = clases.filter((c) => c.fecha >= hoy && !c.cancelada);
  const mias = proximas.filter((c) => c.inscritos.some((r) => r.usuario_id === usuarioActual?.id));

  // Agrupar por fecha
  const porFecha = [];
  for (const c of proximas) {
    const ultimo = porFecha[porFecha.length - 1];
    if (ultimo && ultimo.fecha === c.fecha) ultimo.clases.push(c);
    else porFecha.push({ fecha: c.fecha, clases: [c] });
  }

  const wsp = soloDigitos(infoGimnasio?.whatsapp);
  const linkWsp = (texto) => (wsp ? `https://wa.me/${wsp}?text=${encodeURIComponent(texto)}` : null);

  async function reservar(c) {
    setOcupado(c.h.id + c.fecha);
    const r = await reservarHiit(c.h.id, c.fecha);
    setOcupado(null);
    mostrar(r);
  }
  async function cancelar(c) {
    const mia = c.inscritos.find((r) => r.usuario_id === usuarioActual?.id);
    if (!mia) return;
    setOcupado(c.h.id + c.fecha);
    const r = await cancelarHiit(mia.id);
    setOcupado(null);
    setConfirmarCancelar(null);
    mostrar(r);
  }

  const puedeReservar = vistaPrevia || saldo.vigente || saldo.prueba;
  const planesVisibles = planesHiit.filter((p) => vistaPrevia || !p.solo_socios || usuarioActual?.plan_id);
  const irAPlanes = () => document.getElementById('planes-hiit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-ink pb-28 px-6 pt-6">
      <Hero
        titulo="Entrena a otro nivel"
        subtitulo={hiitConfig.descripcion || `Alta intensidad en grupos de máximo ${hiitConfig.cupo} personas.`}
      >
        <div className="mt-4 bg-black/25 border border-white/10 rounded-2xl p-3.5">
          {esStaff ? (
            <p className="text-white/80 text-sm">Como parte del equipo puedes reservar sin descontar clases.</p>
          ) : saldo.vigente ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-400 text-ink flex items-center justify-center font-display text-2xl">
                {saldo.saldo}
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  {saldo.saldo === 1 ? 'Te queda 1 clase HIIT' : `Te quedan ${saldo.saldo} clases HIIT`}
                </p>
                {saldo.vence && <p className="text-white/50 text-xs">Úsalas antes del {fechaTexto(saldo.vence, { day: 'numeric', month: 'long' })}</p>}
              </div>
            </div>
          ) : saldo.prueba ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-400/20 border border-orange-400/40 flex items-center justify-center">
                <Gift size={22} className="text-orange-300" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Tu primera clase HIIT es gratis 🎁</p>
                <p className="text-white/50 text-xs">Elige un horario abajo y resérvala.</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-white text-sm font-medium">No tienes clases HIIT disponibles</p>
              <p className="text-white/50 text-xs mt-0.5">Elige un plan y escríbenos para activarlo.</p>
            </div>
          )}
        </div>
        {!saldo.vigente && planesVisibles.length > 0 && (
          <button
            onClick={irAPlanes}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-orange-400 text-ink font-semibold rounded-xl py-3 text-sm"
          >
            <ShoppingBag size={16} /> Contratar plan HIIT
          </button>
        )}
        {saldo.vigente && saldo.saldo <= 2 && planesVisibles.length > 0 && (
          <button onClick={irAPlanes} className="mt-3 w-full text-orange-300 text-xs underline">
            Te quedan pocas clases: ver planes para renovar
          </button>
        )}
      </Hero>
      {vistaPrevia && (
        <p className="-mt-2 mb-4 text-[11px] text-white/45 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2">
          👀 Vista de alumno: así lo ve alguien sin plan HIIT. Como eres del equipo, si reservas no se te descuenta nada.
        </p>
      )}

      {mias.length > 0 && (
        <>
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Mis clases HIIT</p>
          <div className="flex flex-col gap-2 mb-5">
            {mias.map((c) => {
              const mia = c.inscritos.find((r) => r.usuario_id === usuarioActual?.id);
              const tardia = esCancelacionTardia(c.fecha, c.h.hora, horasAnticipacion);
              const clave = c.h.id + c.fecha;
              return (
                <div key={clave} className="bg-orange-400/[0.08] border border-orange-400/30 rounded-2xl p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-display text-xl leading-none">{c.h.hora}</p>
                      <p className="text-white/55 text-xs mt-1">
                        {fechaTexto(c.fecha)}
                        {mia?.es_prueba ? ' · Clase de prueba' : ''}
                      </p>
                    </div>
                    {confirmarCancelar === clave ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => cancelar(c)}
                          disabled={ocupado === clave}
                          className="bg-red-500 text-white text-xs font-semibold rounded-lg px-3 py-2 disabled:opacity-50"
                        >
                          Sí, cancelar
                        </button>
                        <button onClick={() => setConfirmarCancelar(null)} className="bg-white/10 text-white text-xs rounded-lg px-3 py-2">
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmarCancelar(clave)}
                        className="text-red-300 text-xs border border-red-400/30 rounded-lg px-3 py-2"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                  {confirmarCancelar === clave && tardia && !esStaff && (
                    <p className="text-orange-200 text-[11px] mt-2">
                      Falta menos de {horasAnticipacion} horas: si cancelas ahora, la clase se descuenta igual.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Próximas clases</p>
      {porFecha.length === 0 && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 text-center mb-5">
          <CalendarDays size={28} className="text-white/20 mx-auto mb-2" />
          <p className="text-white/50 text-sm">Pronto publicaremos los horarios HIIT.</p>
        </div>
      )}
      <div className="flex flex-col gap-4 mb-6">
        {porFecha.map((g) => (
          <div key={g.fecha}>
            <p className="text-white/70 text-sm font-medium mb-1.5">{fechaTexto(g.fecha)}</p>
            <div className="flex flex-col gap-2">
              {g.clases.map((c) => {
                const clave = c.h.id + c.fecha;
                const ocupados = c.inscritos.length;
                const llena = ocupados >= c.h.cupo_max;
                const mia = c.inscritos.some((r) => r.usuario_id === usuarioActual?.id);
                const cerrada = reservaBloqueada(c.fecha, c.h.hora, horasAnticipacion);
                return (
                  <div key={clave} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-display text-2xl leading-none">{c.h.hora}</p>
                      {c.h.coach_nombre && <p className="text-white/40 text-xs mt-1 truncate">con {c.h.coach_nombre}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Cupos ocupados={ocupados} cupo={c.h.cupo_max} chico />
                        <span className={`text-[11px] ${llena ? 'text-red-300' : 'text-white/45'}`}>
                          {llena ? 'Llena' : `${c.h.cupo_max - ocupados} libre${c.h.cupo_max - ocupados !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                    {mia ? (
                      <span className="flex items-center gap-1 text-orange-300 text-xs font-semibold">
                        <Check size={14} /> Reservada
                      </span>
                    ) : llena ? (
                      <span className="text-white/35 text-xs">Sin cupos</span>
                    ) : cerrada ? (
                      <span className="text-white/35 text-xs text-right">Reserva
                        <br />
                        cerrada</span>
                    ) : (
                      <button
                        onClick={() => reservar(c)}
                        disabled={!puedeReservar || ocupado === clave}
                        className="bg-orange-400 text-ink text-sm font-semibold rounded-xl px-4 py-2.5 disabled:opacity-40"
                      >
                        {ocupado === clave ? '...' : !esStaff && !saldo.vigente && saldo.prueba ? 'Probar gratis' : 'Reservar'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {planesVisibles.length > 0 && (
        <div id="planes-hiit" className="scroll-mt-4">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Contrata tu plan HIIT</p>
          <p className="text-white/50 text-xs mb-2">
            Elige tu plan, toca "Lo quiero" y te respondemos por WhatsApp para pagar y activarlo.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {planesVisibles.map((p) => {
              const link = linkWsp(`Hola! Quiero el ${p.nombre} (${formatearPesos(p.valor_con_iva)}).`);
              return (
                <div key={p.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex flex-col">
                  <p className="text-white text-sm font-medium leading-tight">{p.nombre}</p>
                  <p className="text-orange-300 font-display text-2xl mt-1">{formatearPesos(p.valor_con_iva)}</p>
                  {p.cantidad_sesiones > 1 && (
                    <p className="text-white/40 text-[11px]">
                      {formatearPesos(Math.round(p.valor_con_iva / p.cantidad_sesiones))} por clase
                    </p>
                  )}
                  {p.descripcion && <p className="text-white/45 text-[11px] mt-1 leading-snug">{p.descripcion}</p>}
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto pt-2"
                    >
                      <span className="flex items-center justify-center gap-1 bg-[#25D366]/15 border border-[#25D366]/40 text-[#7ee2a5] text-xs font-semibold rounded-lg py-2">
                        <MessageCircle size={13} /> Lo quiero
                      </span>
                    </a>
                  ) : (
                    <p className="mt-auto pt-2 text-white/45 text-[11px] text-center">Pídelo en recepción</p>
                  )}
                  {p.solo_socios && <p className="text-white/35 text-[10px] text-center mt-1">Solo socios con plan</p>}
                </div>
              );
            })}
          </div>
          <p className="text-white/35 text-[11px] mb-4">
            Los planes HIIT son aparte de tu plan normal y sirven solo para clases HIIT.
          </p>
        </div>
      )}

      <Aviso msg={aviso} onCerrar={cerrar} />
    </div>
  );
}

// ============================ COACH =================================
function HiitCoach() {
  const { usuarioActual } = useAuth();
  const clases = useClasesHiit();
  const hoy = hoyLocalISO();
  const [verPasadas, setVerPasadas] = useState(false);
  const proximas = clases.filter((c) => c.fecha >= hoy && !c.cancelada);
  const pasadas = clases.filter((c) => c.fecha < hoy && !c.cancelada).reverse();
  const mias = proximas.filter((c) => c.h.coach_id === usuarioActual?.id);
  const resumen = resumenAsistencia(pasadas);

  return (
    <div className="min-h-screen bg-ink pb-28 px-6 pt-6">
      <Hero
        titulo="Clases HIIT"
        subtitulo={
          mias.length
            ? `Tienes ${mias.length} clase${mias.length !== 1 ? 's' : ''} HIIT por delante.`
            : 'Aquí ves quién viene a cada clase HIIT.'
        }
      >
        {resumen.clases > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-black/25 rounded-xl p-3">
              <p className="text-white/45 text-[10px] uppercase tracking-wide">Promedio por clase</p>
              <p className="text-white font-display text-2xl">{resumen.promedio.toFixed(1).replace('.', ',')}</p>
            </div>
            <div className="bg-black/25 rounded-xl p-3">
              <p className="text-white/45 text-[10px] uppercase tracking-wide">Clases hechas</p>
              <p className="text-white font-display text-2xl">{resumen.clases}</p>
            </div>
          </div>
        )}
      </Hero>
      <p className="text-white/35 text-[11px] mb-3">La asistencia se marca igual que siempre, desde Mis clases.</p>

      <ListaClases clases={proximas} vacio="No hay clases HIIT próximas." />

      {pasadas.length > 0 && (
        <button onClick={() => setVerPasadas(!verPasadas)} className="flex items-center gap-1 text-white/50 text-sm mt-5 mb-2">
          {verPasadas ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Clases pasadas ({pasadas.length})
        </button>
      )}
      {verPasadas && <ListaClases clases={pasadas} pasadas />}
    </div>
  );
}

function ListaClases({ clases, pasadas, vacio, acciones }) {
  const [abierta, setAbierta] = useState(null);
  if (clases.length === 0) return vacio ? <p className="text-white/40 text-sm">{vacio}</p> : null;
  return (
    <div className="flex flex-col gap-2">
      {clases.map((c) => {
        const clave = c.h.id + c.fecha;
        const ab = abierta === clave;
        const ocupados = c.inscritos.length;
        const pruebas = c.inscritos.filter((r) => r.es_prueba).length;
        const asistieron = c.inscritos.filter((r) => r.asistio === true).length;
        return (
          <div
            key={clave}
            className={`rounded-2xl border ${c.cancelada ? 'border-red-400/20 bg-red-500/[0.04]' : 'border-white/10 bg-white/[0.04]'}`}
          >
            <button onClick={() => setAbierta(ab ? null : clave)} className="w-full flex items-center gap-3 p-3.5 text-left">
              <div className="w-12 shrink-0 text-center">
                <p className="text-white/45 text-[10px] uppercase font-semibold">{DIAS_CORTOS[new Date(c.fecha + 'T12:00:00').getDay()]}</p>
                <p className="text-white font-display text-xl leading-none">{Number(c.fecha.slice(8, 10))}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">
                  {c.h.hora} {c.h.coach_nombre ? <span className="text-white/40 font-normal">· {c.h.coach_nombre}</span> : null}
                </p>
                {c.cancelada ? (
                  <p className="text-red-300 text-xs mt-1">Cancelada</p>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Cupos ocupados={ocupados} cupo={c.h.cupo_max} chico />
                    <span className="text-white/50 text-[11px]">
                      {ocupados}/{c.h.cupo_max}
                      {pruebas ? ` · ${pruebas} prueba${pruebas !== 1 ? 's' : ''}` : ''}
                      {pasadas && asistieron ? ` · ${asistieron} asistieron` : ''}
                    </span>
                  </div>
                )}
              </div>
              {ab ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
            </button>
            {ab && (
              <div className="px-3.5 pb-3.5 border-t border-white/[0.06] pt-3">
                {c.alumnos.length === 0 ? (
                  <p className="text-white/40 text-xs">Aún no hay inscritos.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {c.alumnos.map(({ r, u }) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-white/10 text-white/80 text-[10px] font-semibold flex items-center justify-center">
                          {iniciales(u?.nombre)}
                        </span>
                        <span className="text-white/85 text-sm flex-1 truncate">{u?.nombre || 'Alumno'}</span>
                        {r.es_prueba && (
                          <span className="text-[10px] font-semibold text-orange-300 bg-orange-400/10 border border-orange-400/30 rounded-full px-2 py-0.5">
                            Prueba
                          </span>
                        )}
                        {r.asistio === true && <Check size={14} className="text-green-300" />}
                        {r.asistio === false && <X size={14} className="text-red-300" />}
                        {acciones?.alumno && acciones.alumno(r, c)}
                      </div>
                    ))}
                  </div>
                )}
                {acciones?.clase && acciones.clase(c)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Asistentes de una clase pasada: los marcados como asistió; si nadie fue
// marcado, se cuentan los que reservaron.
function asistentesDe(c) {
  const marcados = c.inscritos.filter((r) => r.asistio === true || r.asistio === false);
  return marcados.length ? c.inscritos.filter((r) => r.asistio === true).length : c.inscritos.length;
}
function resumenAsistencia(clasesPasadas) {
  const n = clasesPasadas.length;
  const total = clasesPasadas.reduce((a, c) => a + asistentesDe(c), 0);
  return { clases: n, total, promedio: n ? total / n : 0 };
}

// ============================ ADMIN =================================
const SECCIONES = [
  { k: 'clases', label: 'Clases', icono: CalendarDays },
  { k: 'ventas', label: 'Vender', icono: ShoppingBag },
  { k: 'planes', label: 'Planes', icono: CreditCard },
  { k: 'reportes', label: 'Reportes', icono: BarChart3 },
  { k: 'ajustes', label: 'Ajustes', icono: Settings },
];

function HiitAdmin() {
  const [seccion, setSeccion] = useState('clases');
  const clases = useClasesHiit();
  const hoy = hoyLocalISO();
  const proximas = clases.filter((c) => c.fecha >= hoy && !c.cancelada);
  const res = resumenAsistencia(clases.filter((c) => c.fecha < hoy && !c.cancelada));
  const reservasProx = proximas.reduce((a, c) => a + c.inscritos.length, 0);

  return (
    <div className="min-h-screen bg-ink pb-28 px-6 pt-6">
      <Hero titulo="Piloto HIIT" subtitulo="Clases, ventas, planes y resultados en un solo lugar.">
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-black/25 rounded-xl p-2.5">
            <p className="text-white/45 text-[10px] uppercase tracking-wide">Próximas</p>
            <p className="text-white font-display text-2xl leading-tight">{proximas.length}</p>
          </div>
          <div className="bg-black/25 rounded-xl p-2.5">
            <p className="text-white/45 text-[10px] uppercase tracking-wide">Reservas</p>
            <p className="text-white font-display text-2xl leading-tight">{reservasProx}</p>
          </div>
          <div className="bg-black/25 rounded-xl p-2.5">
            <p className="text-white/45 text-[10px] uppercase tracking-wide">Promedio</p>
            <p className="text-white font-display text-2xl leading-tight">
              {res.clases ? res.promedio.toFixed(1).replace('.', ',') : '—'}
            </p>
          </div>
        </div>
      </Hero>

      <div className="flex gap-1.5 overflow-x-auto -mx-6 px-6 pb-3" style={{ scrollbarWidth: 'none' }}>
        {SECCIONES.map(({ k, label, icono: Icono }) => (
          <button
            key={k}
            onClick={() => setSeccion(k)}
            className={`shrink-0 flex items-center gap-1.5 text-sm rounded-full px-3.5 py-2 border ${
              seccion === k ? 'bg-orange-400 border-orange-400 text-ink font-semibold' : 'bg-white/[0.04] border-white/10 text-white/70'
            }`}
          >
            <Icono size={14} /> {label}
          </button>
        ))}
      </div>

      {seccion === 'clases' && <AdminClases clases={clases} />}
      {seccion === 'ventas' && <AdminVentas />}
      {seccion === 'planes' && <AdminPlanes />}
      {seccion === 'reportes' && <AdminReportes clases={clases} />}
      {seccion === 'ajustes' && <AdminAjustes />}
    </div>
  );
}

const CAMPO =
  'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-400 placeholder-white/25';
const ETIQUETA = 'text-white/45 text-xs mb-1 block';

function fechasEntre(desde, hasta, dias) {
  const out = [];
  if (!desde || !hasta || desde > hasta) return out;
  let f = desde;
  let guard = 0;
  while (f <= hasta && guard < 400) {
    if (dias.includes(new Date(f + 'T12:00:00').getDay())) out.push(f);
    f = sumarDias(f, 1);
    guard++;
  }
  return out;
}

function AdminClases({ clases }) {
  const { usuarios, crearClasesHiit, editarClase, eliminarClase, cancelarClaseHiit, cancelarReservaAdmin, hiitConfig } = useAuth();
  const [aviso, mostrar, cerrar] = useAviso();
  const coaches = usuarios.filter((u) => u.rol === 'coach' || u.rol === 'head_coach');
  const javier = coaches.find((u) => /javier/i.test(u.nombre || '')) || coaches[0];
  const hoy = hoyLocalISO();
  const [form, setForm] = useState(null);
  const [verPasadas, setVerPasadas] = useState(false);
  const [editando, setEditando] = useState(null);
  const [cancelando, setCancelando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const proximas = clases.filter((c) => c.fecha >= hoy);
  const pasadas = clases.filter((c) => c.fecha < hoy).reverse();
  const fechas = form ? fechasEntre(form.desde, form.hasta, form.dias) : [];

  function nuevoForm() {
    setForm({ desde: hoy, hasta: sumarDias(hoy, 27), dias: [], hora: '', coach_id: javier?.id || '', cupo: hiitConfig.cupo });
  }

  async function crear() {
    if (!form.hora) return mostrar({ ok: false, mensaje: 'Indica la hora.' });
    if (fechas.length === 0) return mostrar({ ok: false, mensaje: 'Elige días que caigan dentro de las fechas.' });
    setGuardando(true);
    const r = await crearClasesHiit(fechas, { hora: form.hora, coach_id: form.coach_id, cupo_max: form.cupo });
    setGuardando(false);
    mostrar(r);
    if (r.ok) setForm(null);
  }

  // Atajo: las 12 clases del piloto (vie 10:00, mar y jue 20:00, 30 oct – 26 nov)
  const hayClases = clases.length > 0;
  async function crearPiloto() {
    setGuardando(true);
    const base = { coach_id: javier?.id, cupo_max: hiitConfig.cupo };
    const a = await crearClasesHiit(fechasEntre('2026-10-30', '2026-11-26', [5]), { ...base, hora: '10:00' });
    const b = await crearClasesHiit(fechasEntre('2026-10-30', '2026-11-26', [2, 4]), { ...base, hora: '20:00' });
    setGuardando(false);
    mostrar({ ok: a.ok || b.ok, mensaje: [a.mensaje, b.mensaje].join(' ') });
  }

  const acciones = {
    alumno: (r, c) =>
      c.fecha >= hoy && !c.cancelada ? (
        <button
          onClick={async () => mostrar(await cancelarReservaAdmin(r.id))}
          className="text-red-300/80 p-1"
          aria-label="Sacar de la clase"
          title="Sacar de la clase (se le devuelve la clase)"
        >
          <X size={14} />
        </button>
      ) : null,
    clase: (c) => {
      const clave = c.h.id + c.fecha;
      if (c.cancelada) return null;
      if (editando?.clave === clave) {
        return (
          <div className="mt-3 bg-black/20 rounded-xl p-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={ETIQUETA}>Hora</label>
                <input type="time" value={editando.hora} onChange={(e) => setEditando({ ...editando, hora: e.target.value })} className={CAMPO} />
              </div>
              <div>
                <label className={ETIQUETA}>Cupo</label>
                <input type="number" min={c.inscritos.length || 1} value={editando.cupo} onChange={(e) => setEditando({ ...editando, cupo: e.target.value })} className={CAMPO} />
              </div>
            </div>
            <div>
              <label className={ETIQUETA}>Coach</label>
              <select value={editando.coach_id} onChange={(e) => setEditando({ ...editando, coach_id: e.target.value })} className={CAMPO}>
                {coaches.map((u) => (
                  <option key={u.id} value={u.id} className="bg-ink">
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const cupo = Math.max(c.inscritos.length, parseInt(editando.cupo, 10) || 1);
                  const coach = coaches.find((u) => u.id === editando.coach_id);
                  await editarClase(c.h.id, { hora: editando.hora, cupo_max: cupo, coach_id: editando.coach_id || null, coach_nombre: coach?.nombre || null });
                  setEditando(null);
                  mostrar({ ok: true, mensaje: 'Clase actualizada.' });
                }}
                className="flex-1 bg-orange-400 text-ink font-semibold rounded-lg py-2 text-sm"
              >
                Guardar
              </button>
              <button onClick={() => setEditando(null)} className="px-3 bg-white/10 text-white rounded-lg text-sm">
                Cerrar
              </button>
            </div>
          </div>
        );
      }
      if (cancelando?.clave === clave) {
        return (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-red-200 text-xs mb-2">
              {c.inscritos.length
                ? `Se cancela la clase y se le devuelve la clase a ${c.inscritos.length} alumno(s), con aviso.`
                : 'No hay inscritos: la clase se elimina.'}
            </p>
            {c.inscritos.length > 0 && (
              <input
                value={cancelando.mensaje}
                onChange={(e) => setCancelando({ ...cancelando, mensaje: e.target.value })}
                placeholder="Mensaje para los alumnos (opcional)"
                className={CAMPO + ' mb-2'}
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const r = c.inscritos.length
                    ? await cancelarClaseHiit(c.h.id, c.fecha, cancelando.mensaje)
                    : (await eliminarClase(c.h.id), { ok: true, mensaje: 'Clase eliminada.' });
                  setCancelando(null);
                  mostrar(r);
                }}
                className="flex-1 bg-red-500 text-white font-semibold rounded-lg py-2 text-sm"
              >
                {c.inscritos.length ? 'Sí, cancelar clase' : 'Sí, eliminar'}
              </button>
              <button onClick={() => setCancelando(null)} className="px-3 bg-white/10 text-white rounded-lg text-sm">
                No
              </button>
            </div>
          </div>
        );
      }
      if (c.fecha < hoy) return null;
      return (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setEditando({ clave, hora: c.h.hora, cupo: c.h.cupo_max, coach_id: c.h.coach_id || '' })}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 text-white/80 rounded-lg py-2 text-xs"
          >
            <Pencil size={13} /> Editar
          </button>
          <button
            onClick={() => setCancelando({ clave, mensaje: '' })}
            className="flex-1 flex items-center justify-center gap-1.5 border border-red-400/30 text-red-300 rounded-lg py-2 text-xs"
          >
            <Trash2 size={13} /> {c.inscritos.length ? 'Cancelar clase' : 'Eliminar'}
          </button>
        </div>
      );
    },
  };

  return (
    <div>
      {!hayClases && !form && (
        <div className="bg-orange-400/[0.08] border border-orange-400/30 rounded-2xl p-4 mb-3">
          <p className="text-white text-sm font-medium">Crear las 12 clases del piloto</p>
          <p className="text-white/55 text-xs mt-1">
            Viernes 10:00, martes 20:00 y jueves 20:00, del 30 de octubre al 26 de noviembre. Cupo {hiitConfig.cupo}
            {javier ? `, coach ${javier.nombre}` : ''}.
          </p>
          <button
            onClick={crearPiloto}
            disabled={guardando}
            className="mt-3 w-full bg-orange-400 text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50"
          >
            {guardando ? 'Creando...' : 'Crear las 12 clases'}
          </button>
        </div>
      )}

      {form ? (
        <div className="bg-white/[0.04] border border-orange-400/30 rounded-2xl p-4 mb-4 flex flex-col gap-3">
          <p className="text-white font-semibold">Crear clases HIIT</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={ETIQUETA}>Desde</label>
              <input type="date" value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} className={CAMPO} />
            </div>
            <div>
              <label className={ETIQUETA}>Hasta</label>
              <input type="date" value={form.hasta} onChange={(e) => setForm({ ...form, hasta: e.target.value })} className={CAMPO} />
            </div>
          </div>
          <div>
            <label className={ETIQUETA}>Días de la semana</label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = form.dias.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => setForm({ ...form, dias: on ? form.dias.filter((x) => x !== d) : [...form.dias, d] })}
                    className={`text-xs rounded-full px-3 py-1.5 border ${
                      on ? 'bg-orange-400 border-orange-400 text-ink font-semibold' : 'border-white/15 text-white/60'
                    }`}
                  >
                    {DIAS_CORTOS[d]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={ETIQUETA}>Hora</label>
              <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className={CAMPO} />
            </div>
            <div>
              <label className={ETIQUETA}>Cupo máximo</label>
              <input type="number" min="1" value={form.cupo} onChange={(e) => setForm({ ...form, cupo: e.target.value })} className={CAMPO} />
            </div>
          </div>
          <div>
            <label className={ETIQUETA}>Coach</label>
            <select value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })} className={CAMPO}>
              {coaches.map((u) => (
                <option key={u.id} value={u.id} className="bg-ink">
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <p className="text-white/55 text-xs">
            {fechas.length
              ? `Se crearán ${fechas.length} clase(s): ${fechas
                  .slice(0, 6)
                  .map((f) => fechaTexto(f, { weekday: 'short', day: 'numeric', month: 'short' }))
                  .join(', ')}${fechas.length > 6 ? '…' : ''}`
              : 'Elige los días para ver qué clases se crearán.'}
          </p>
          <div className="flex gap-2">
            <button onClick={crear} disabled={guardando} className="flex-1 bg-orange-400 text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50">
              {guardando ? 'Creando...' : `Crear ${fechas.length || ''} clase${fechas.length === 1 ? '' : 's'}`}
            </button>
            <button onClick={() => setForm(null)} className="px-4 bg-white/10 text-white rounded-xl text-sm">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={nuevoForm}
          className="w-full flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 text-white rounded-xl py-2.5 text-sm mb-4"
        >
          <Plus size={16} /> Crear clases HIIT
        </button>
      )}

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Próximas ({proximas.length})</p>
      <ListaClases clases={proximas} vacio="No hay clases HIIT próximas." acciones={acciones} />

      {pasadas.length > 0 && (
        <button onClick={() => setVerPasadas(!verPasadas)} className="flex items-center gap-1 text-white/50 text-sm mt-5 mb-2">
          {verPasadas ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Clases pasadas ({pasadas.length})
        </button>
      )}
      {verPasadas && <ListaClases clases={pasadas} pasadas acciones={acciones} />}
      <Aviso msg={aviso} onCerrar={cerrar} />
    </div>
  );
}

function AdminVentas() {
  const { usuarios, planesHiit = [], venderPlanHiit, saldoHiitDe, ajustarSaldoHiit } = useAuth();
  const [aviso, mostrar, cerrar] = useAviso();
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({ usuarioId: '', planId: '', monto: '', medio: 'transferencia', fecha: hoyLocalISO() });
  const [guardando, setGuardando] = useState(false);
  const [ajuste, setAjuste] = useState(null);

  const activos = usuarios
    .filter((u) => u.estado === 'activo' && u.rol === 'usuario')
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  const filtrados = busqueda.trim()
    ? activos.filter((u) => (u.nombre || '').toLowerCase().includes(busqueda.trim().toLowerCase()))
    : [];
  const alumno = usuarios.find((u) => u.id === form.usuarioId);
  const plan = planesHiit.find((p) => p.id === form.planId);
  const conHiit = activos
    .map((u) => ({ u, s: saldoHiitDe(u) }))
    .filter(({ u }) => (u.hiit_saldo || 0) > 0 || u.hiit_prueba_usada || u.hiit_plan_id)
    .sort((a, b) => b.s.saldo - a.s.saldo);

  async function vender() {
    if (!alumno) return mostrar({ ok: false, mensaje: 'Elige el alumno.' });
    if (!plan) return mostrar({ ok: false, mensaje: 'Elige el plan HIIT.' });
    setGuardando(true);
    const r = await venderPlanHiit(alumno.id, plan.id, {
      monto: form.monto === '' ? plan.valor_con_iva : Number(soloDigitos(form.monto)),
      medio: form.medio,
      fecha: form.fecha,
    });
    setGuardando(false);
    mostrar(r);
    if (r.ok) {
      setForm({ usuarioId: '', planId: '', monto: '', medio: form.medio, fecha: hoyLocalISO() });
      setBusqueda('');
    }
  }

  return (
    <div>
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-5 flex flex-col gap-3">
        <p className="text-white font-semibold">Registrar venta de plan HIIT</p>
        <div>
          <label className={ETIQUETA}>Alumno</label>
          {alumno ? (
            <div className="flex items-center justify-between bg-black/30 border border-orange-400/40 rounded-lg px-3 py-2">
              <span className="text-white text-sm">{alumno.nombre}</span>
              <button onClick={() => setForm({ ...form, usuarioId: '' })} className="text-white/50">
                <X size={15} />
              </button>
            </div>
          ) : (
            <>
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escribe el nombre..." className={CAMPO} />
              {filtrados.length > 0 && (
                <div className="mt-1 bg-black/40 border border-white/10 rounded-lg max-h-48 overflow-y-auto">
                  {filtrados.slice(0, 8).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setForm({ ...form, usuarioId: u.id });
                        setBusqueda('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-white/85 border-b border-white/5 last:border-0"
                    >
                      {u.nombre} {u.plan_id ? <span className="text-white/35 text-xs">· socio</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div>
          <label className={ETIQUETA}>Plan HIIT</label>
          <div className="grid grid-cols-2 gap-1.5">
            {planesHiit.map((p) => {
              const bloqueado = p.solo_socios && alumno && !alumno.plan_id;
              const on = form.planId === p.id;
              return (
                <button
                  key={p.id}
                  disabled={bloqueado}
                  onClick={() => setForm({ ...form, planId: p.id, monto: '' })}
                  className={`text-left rounded-xl border px-3 py-2 disabled:opacity-35 ${
                    on ? 'bg-orange-400/15 border-orange-400' : 'border-white/10 bg-black/20'
                  }`}
                >
                  <p className="text-white text-xs font-medium leading-tight">{p.nombre}</p>
                  <p className="text-orange-300 text-sm font-semibold">{formatearPesos(p.valor_con_iva)}</p>
                  {p.solo_socios && <p className="text-white/40 text-[10px]">Solo socios</p>}
                </button>
              );
            })}
          </div>
          {plan?.solo_socios && alumno && !alumno.plan_id && (
            <p className="text-red-300 text-xs mt-1">Este plan es solo para socios con plan normal.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className={ETIQUETA}>Monto</label>
            <input
              inputMode="numeric"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              placeholder={plan ? String(plan.valor_con_iva) : '$'}
              className={CAMPO}
            />
          </div>
          <div>
            <label className={ETIQUETA}>Medio</label>
            <select value={form.medio} onChange={(e) => setForm({ ...form, medio: e.target.value })} className={CAMPO}>
              {['transferencia', 'efectivo', 'debito', 'credito'].map((m) => (
                <option key={m} value={m} className="bg-ink">
                  {m === 'debito' ? 'Débito' : m === 'credito' ? 'Crédito' : m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={ETIQUETA}>Fecha</label>
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={CAMPO} />
          </div>
        </div>
        {alumno && plan && (
          <p className="text-white/55 text-xs">
            Se suman {plan.cantidad_sesiones} clase(s) HIIT a {alumno.nombre.split(' ')[0]} (válidas {plan.duracion_dias} días) y queda
            registrado el pago en Finanzas.
          </p>
        )}
        <button onClick={vender} disabled={guardando} className="bg-orange-400 text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Registrar venta'}
        </button>
      </div>

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Alumnos con HIIT ({conHiit.length})</p>
      {conHiit.length === 0 && <p className="text-white/40 text-sm">Todavía nadie tiene clases HIIT.</p>}
      <div className="flex flex-col gap-2">
        {conHiit.map(({ u, s }) => (
          <div key={u.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-orange-400/15 text-orange-200 text-xs font-semibold flex items-center justify-center">
                {iniciales(u.nombre)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{u.nombre}</p>
                <p className="text-white/45 text-[11px]">
                  {s.vigente ? `${s.saldo} clase(s)` : 'Sin clases vigentes'}
                  {u.hiit_vence ? ` · vence ${fechaTexto(u.hiit_vence, { day: 'numeric', month: 'short' })}` : ''}
                  {u.hiit_prueba_usada ? ' · usó prueba' : ''}
                </p>
              </div>
              <button onClick={() => setAjuste(ajuste?.id === u.id ? null : { id: u.id, saldo: u.hiit_saldo || 0, vence: u.hiit_vence || '' })} className="text-white/50 p-1.5" aria-label="Ajustar">
                <Pencil size={14} />
              </button>
            </div>
            {ajuste?.id === u.id && (
              <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <label className={ETIQUETA}>Clases</label>
                  <input type="number" min="0" value={ajuste.saldo} onChange={(e) => setAjuste({ ...ajuste, saldo: e.target.value })} className={CAMPO} />
                </div>
                <div>
                  <label className={ETIQUETA}>Vence</label>
                  <input type="date" value={ajuste.vence} onChange={(e) => setAjuste({ ...ajuste, vence: e.target.value })} className={CAMPO} />
                </div>
                <button
                  onClick={async () => {
                    const r = await ajustarSaldoHiit(u.id, { hiit_saldo: ajuste.saldo, hiit_vence: ajuste.vence });
                    mostrar(r);
                    if (r.ok) setAjuste(null);
                  }}
                  className="bg-orange-400 text-ink font-semibold rounded-lg px-3 py-2 text-sm"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Aviso msg={aviso} onCerrar={cerrar} />
    </div>
  );
}

function AdminPlanes() {
  const { planesHiit = [], guardarPlan, crearPlan, eliminarPlan } = useAuth();
  const [aviso, mostrar, cerrar] = useAviso();
  const [editando, setEditando] = useState(null);
  const vacio = { nombre: '', valor_con_iva: '', cantidad_sesiones: '', duracion_dias: 30, descripcion: '', solo_socios: false };

  async function guardar() {
    const e = editando;
    const valor = Number(soloDigitos(e.valor_con_iva));
    const ses = parseInt(e.cantidad_sesiones, 10);
    if (!e.nombre.trim() || !valor || !ses) return mostrar({ ok: false, mensaje: 'Completa nombre, precio y cantidad de clases.' });
    const datos = {
      nombre: e.nombre.trim(),
      valor_con_iva: valor,
      valor_neto: Math.round(valor / 1.19),
      cantidad_sesiones: ses,
      duracion_dias: parseInt(e.duracion_dias, 10) || 30,
      descripcion: (e.descripcion || '').trim() || null,
      solo_socios: !!e.solo_socios,
      tipo: 'hiit',
    };
    if (e.id) await guardarPlan(e.id, datos);
    else await crearPlan(datos);
    setEditando(null);
    mostrar({ ok: true, mensaje: 'Plan HIIT guardado.' });
  }

  return (
    <div>
      <p className="text-white/50 text-xs mb-3">
        Estos planes son solo para clases HIIT. Los planes normales se editan en la pestaña Planes.
      </p>
      <div className="flex flex-col gap-2 mb-3">
        {planesHiit.map((p) =>
          editando?.id === p.id ? null : (
            <div key={p.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">
                  {p.nombre} {p.solo_socios && <span className="text-[10px] text-orange-300 ml-1">Solo socios</span>}
                </p>
                <p className="text-white/45 text-xs">
                  {p.cantidad_sesiones} clase(s) · {p.duracion_dias} días
                  {p.descripcion ? ` · ${p.descripcion}` : ''}
                </p>
              </div>
              <p className="text-orange-300 font-display text-xl">{formatearPesos(p.valor_con_iva)}</p>
              <button onClick={() => setEditando({ ...p })} className="text-white/50 p-1.5" aria-label="Editar">
                <Pencil size={15} />
              </button>
            </div>
          )
        )}
      </div>

      {editando ? (
        <div className="bg-white/[0.04] border border-orange-400/30 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-white font-semibold">{editando.id ? 'Editar plan HIIT' : 'Nuevo plan HIIT'}</p>
          <div>
            <label className={ETIQUETA}>Nombre</label>
            <input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} className={CAMPO} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={ETIQUETA}>Precio</label>
              <input inputMode="numeric" value={editando.valor_con_iva} onChange={(e) => setEditando({ ...editando, valor_con_iva: e.target.value })} className={CAMPO} />
            </div>
            <div>
              <label className={ETIQUETA}>Clases</label>
              <input type="number" min="1" value={editando.cantidad_sesiones} onChange={(e) => setEditando({ ...editando, cantidad_sesiones: e.target.value })} className={CAMPO} />
            </div>
            <div>
              <label className={ETIQUETA}>Vigencia (días)</label>
              <input type="number" min="1" value={editando.duracion_dias} onChange={(e) => setEditando({ ...editando, duracion_dias: e.target.value })} className={CAMPO} />
            </div>
          </div>
          <div>
            <label className={ETIQUETA}>Descripción (la ve el alumno)</label>
            <input value={editando.descripcion || ''} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} className={CAMPO} />
          </div>
          <label className="flex items-center gap-2 text-white/80 text-sm">
            <input type="checkbox" checked={!!editando.solo_socios} onChange={(e) => setEditando({ ...editando, solo_socios: e.target.checked })} className="w-4 h-4 accent-orange-400" />
            Solo para socios con plan normal
          </label>
          <div className="flex gap-2">
            <button onClick={guardar} className="flex-1 bg-orange-400 text-ink font-semibold rounded-xl py-2.5 text-sm">
              Guardar
            </button>
            <button onClick={() => setEditando(null)} className="px-4 bg-white/10 text-white rounded-xl text-sm">
              Cancelar
            </button>
          </div>
          {editando.id && (
            <button
              onClick={async () => {
                const r = await eliminarPlan(editando.id);
                if (r?.ok) setEditando(null);
                mostrar(r?.ok ? { ok: true, mensaje: 'Plan eliminado.' } : r);
              }}
              className="flex items-center gap-1.5 text-red-300/80 text-xs"
            >
              <Trash2 size={13} /> Eliminar plan
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setEditando(vacio)}
          className="w-full flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 text-white rounded-xl py-2.5 text-sm"
        >
          <Plus size={16} /> Agregar plan HIIT
        </button>
      )}
      <Aviso msg={aviso} onCerrar={cerrar} />
    </div>
  );
}

const METAS = [3, 4, 5, 5];

function AdminReportes({ clases }) {
  const { pagos, planes, usuarios, reservas, hiitConfig } = useAuth();
  const hoy = hoyLocalISO();
  const validas = clases.filter((c) => !c.cancelada);
  const pasadas = validas.filter((c) => c.fecha < hoy);
  const res = resumenAsistencia(pasadas);
  const inicio = validas[0]?.fecha;

  // Promedio por semana del piloto vs. meta
  const semanas = [];
  if (inicio) {
    for (let i = 0; i < 4; i++) {
      const desde = sumarDias(inicio, i * 7);
      const hasta = sumarDias(inicio, i * 7 + 6);
      const deSemana = pasadas.filter((c) => c.fecha >= desde && c.fecha <= hasta);
      const r = resumenAsistencia(deSemana);
      semanas.push({ n: i + 1, desde, meta: METAS[i], clases: r.clases, promedio: r.clases ? r.promedio : null });
    }
  }

  // Ventas por plan HIIT
  const pagosHiit = pagos.filter((p) => p.tipo === 'hiit');
  const porPlan = {};
  for (const p of pagosHiit) {
    const k = p.plan_id || 'otro';
    porPlan[k] = porPlan[k] || { plan: planes[k]?.nombre || 'Otro', cantidad: 0, total: 0 };
    porPlan[k].cantidad += 1;
    porPlan[k].total += Number(p.monto) || 0;
  }
  const ventas = Object.values(porPlan).sort((a, b) => b.total - a.total);
  const totalVentas = ventas.reduce((a, v) => a + v.total, 0);

  // Clases de prueba y conversión
  const pruebas = reservas.filter((r) => r.es_prueba && r.estado === 'confirmada');
  const conPrueba = new Set(pruebas.map((r) => r.usuario_id));
  const compraron = [...conPrueba].filter((id) => pagosHiit.some((p) => p.usuario_id === id)).length;
  const conversion = conPrueba.size ? Math.round((compraron / conPrueba.size) * 100) : null;

  // Costo coach y margen
  const costoCoach = pasadas.length * (hiitConfig.tarifa || 0);
  const margen = totalVentas - costoCoach;

  // Recomendación del 27 de noviembre
  let decision = null;
  if (res.clases >= 3) {
    if (res.promedio >= 5 && (conversion ?? 0) >= 40)
      decision = { tono: 'bien', titulo: 'Subir precios', texto: 'Promedio de 5 o más y buena compra después de la prueba.' };
    else if (res.promedio >= 3)
      decision = { tono: 'atencion', titulo: 'Mantener precio y reforzar captación', texto: 'El promedio está entre 3 y 4,9.' };
    else decision = { tono: 'revisar', titulo: 'Bajar a 2 clases por semana', texto: 'El promedio es menor a 3 por clase.' };
  }

  async function descargar(tipo) {
    const XLSX = await import('xlsx');
    const nombreDe = Object.fromEntries(usuarios.map((u) => [u.id, u.nombre]));
    let filas;
    if (tipo === 'asistencia') {
      filas = validas.map((c) => ({
        Fecha: c.fecha,
        Día: DIAS[new Date(c.fecha + 'T12:00:00').getDay()],
        Hora: c.h.hora,
        Coach: c.h.coach_nombre || '',
        Cupo: c.h.cupo_max,
        Reservaron: c.inscritos.length,
        Asistieron: c.fecha < hoy ? asistentesDe(c) : '',
        'Clases de prueba': c.inscritos.filter((r) => r.es_prueba).length,
        Alumnos: c.alumnos.map(({ u }) => u?.nombre || '').join(', '),
      }));
    } else {
      filas = pagosHiit
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((p) => ({
          Fecha: p.fecha,
          Alumno: nombreDe[p.usuario_id] || '',
          Plan: planes[p.plan_id]?.nombre || '',
          Monto: Number(p.monto) || 0,
          Medio: p.medio || '',
        }));
    }
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas.length ? filas : [{ Info: 'Sin datos aún' }]), tipo === 'asistencia' ? 'Asistencia' : 'Ventas');
    XLSX.writeFile(libro, tipo === 'asistencia' ? 'HIIT_asistencia_por_clase.xlsx' : 'HIIT_ventas_por_plan.xlsx');
  }

  const TONO = {
    bien: 'border-green-400/40 bg-green-400/10 text-green-200',
    atencion: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-100',
    revisar: 'border-red-400/40 bg-red-500/10 text-red-200',
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Dato titulo="Promedio por clase" valor={res.clases ? res.promedio.toFixed(1).replace('.', ',') : '—'} detalle={`${res.clases} clase(s) hechas`} />
        <Dato titulo="Ventas HIIT" valor={formatearPesos(totalVentas)} detalle={`${pagosHiit.length} venta(s)`} />
        <Dato
          titulo="Prueba → compra"
          valor={conversion === null ? '—' : `${conversion}%`}
          detalle={`${compraron} de ${conPrueba.size} que probaron`}
        />
        <Dato
          titulo="Margen estimado"
          valor={formatearPesos(margen)}
          detalle={`Coach: ${formatearPesos(costoCoach)}`}
          tono={margen >= 0 ? 'text-green-300' : 'text-red-300'}
        />
      </div>

      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
        <p className="text-white text-sm font-medium mb-2">Asistencia por semana vs. meta</p>
        {semanas.length === 0 ? (
          <p className="text-white/40 text-xs">Aparece cuando haya clases creadas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {semanas.map((s) => {
              const ok = s.promedio !== null && s.promedio >= s.meta;
              const Icono = s.promedio === null ? Minus : ok ? TrendingUp : TrendingDown;
              return (
                <div key={s.n} className="flex items-center gap-3 text-sm">
                  <span className="text-white/60 w-20">Semana {s.n}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ok ? 'bg-green-400' : 'bg-orange-400'}`}
                      style={{ width: `${Math.min(100, ((s.promedio || 0) / hiitConfig.cupo) * 100)}%` }}
                    />
                  </div>
                  <span className="text-white tabular-nums w-10 text-right">{s.promedio === null ? '—' : s.promedio.toFixed(1).replace('.', ',')}</span>
                  <span className="text-white/40 text-xs w-14">meta {s.meta}{s.n === 4 ? '-6' : ''}</span>
                  <Icono size={14} className={s.promedio === null ? 'text-white/25' : ok ? 'text-green-300' : 'text-orange-300'} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-4 ${decision ? TONO[decision.tono] : 'border-white/10 bg-white/[0.04] text-white/60'}`}>
        <p className="text-[11px] uppercase tracking-wide opacity-70">Recomendación para el 27 de noviembre</p>
        {decision ? (
          <>
            <p className="font-display text-xl mt-1">{decision.titulo}</p>
            <p className="text-xs mt-0.5 opacity-80">{decision.texto}</p>
          </>
        ) : (
          <p className="text-sm mt-1">Se calcula cuando haya al menos 3 clases hechas.</p>
        )}
        <p className="text-[11px] mt-2 opacity-60">
          Regla: 5 o más y 40% de compra → subir · 3 a 4 → mantener · menos de 3 → 2 clases por semana.
        </p>
      </div>

      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
        <p className="text-white text-sm font-medium mb-2">Ventas por plan</p>
        {ventas.length === 0 ? (
          <p className="text-white/40 text-xs">Aún no hay ventas HIIT.</p>
        ) : (
          ventas.map((v) => (
            <div key={v.plan} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
              <span className="text-white/80">
                {v.plan} <span className="text-white/40">× {v.cantidad}</span>
              </span>
              <span className="text-white tabular-nums">{formatearPesos(v.total)}</span>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => descargar('asistencia')} className="flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 text-white rounded-xl py-2.5 text-xs">
          <Download size={14} /> Asistentes por clase
        </button>
        <button onClick={() => descargar('ventas')} className="flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 text-white rounded-xl py-2.5 text-xs">
          <Download size={14} /> Ventas por plan
        </button>
      </div>
    </div>
  );
}

function Dato({ titulo, valor, detalle, tono = 'text-white' }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
      <p className="text-white/45 text-[10px] uppercase tracking-wide">{titulo}</p>
      <p className={`font-display text-2xl leading-tight mt-0.5 ${tono}`}>{valor}</p>
      {detalle && <p className="text-white/40 text-[11px]">{detalle}</p>}
    </div>
  );
}

function AdminAjustes() {
  const { hiitConfig, guardarConfigHiit } = useAuth();
  const [aviso, mostrar, cerrar] = useAviso();
  const [form, setForm] = useState({
    tarifa: hiitConfig.tarifa,
    cupo: hiitConfig.cupo,
    descripcion: hiitConfig.descripcion,
    pruebaActiva: hiitConfig.pruebaActiva,
  });
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      <div>
        <label className={ETIQUETA}>Pago al coach por cada clase HIIT</label>
        <input inputMode="numeric" value={form.tarifa} onChange={(e) => setForm({ ...form, tarifa: e.target.value })} className={CAMPO} />
        <p className="text-white/35 text-[11px] mt-1">Se usa en Pago a coaches. No cambia la tarifa de las otras clases.</p>
      </div>
      <div>
        <label className={ETIQUETA}>Cupo por defecto de cada clase</label>
        <input type="number" min="1" value={form.cupo} onChange={(e) => setForm({ ...form, cupo: e.target.value })} className={CAMPO} />
        <p className="text-white/35 text-[11px] mt-1">Para las clases que crees desde ahora. Las ya creadas se editan una por una.</p>
      </div>
      <div>
        <label className={ETIQUETA}>Descripción (la ven los alumnos)</label>
        <textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className={CAMPO + ' resize-none'} />
      </div>
      <label className="flex items-center gap-2 text-white/80 text-sm">
        <input type="checkbox" checked={form.pruebaActiva} onChange={(e) => setForm({ ...form, pruebaActiva: e.target.checked })} className="w-4 h-4 accent-orange-400" />
        Ofrecer una clase de prueba gratis (una vez por persona)
      </label>
      <button onClick={async () => mostrar(await guardarConfigHiit(form))} className="bg-orange-400 text-ink font-semibold rounded-xl py-2.5 text-sm">
        Guardar ajustes
      </button>
      <div className="flex items-start gap-2 bg-black/20 rounded-xl p-3">
        <AlertTriangle size={14} className="text-yellow-300 shrink-0 mt-0.5" />
        <p className="text-white/55 text-[11px]">
          Recuerda: cada persona nueva debe firmar la ficha de salud y la declaración de aptitud física antes de su primera clase.
        </p>
      </div>
      <Aviso msg={aviso} onCerrar={cerrar} />
    </div>
  );
}
