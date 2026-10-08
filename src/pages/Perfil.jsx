import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subirImagen } from '../lib/storage';
import { formatearTelefono, formatearRut } from '../lib/formato';
import { fechaVenceDe, formatearPesos, etiquetaMedio } from '../lib/ingresos';
import { Link } from 'react-router-dom';
import PagoEnLinea from '../components/PagoEnLinea';
import TraeUnAmigo from '../components/TraeUnAmigo';
import {
  activarNotificacionesPush,
  yaEstaSuscrito,
  pushDisponible,
} from '../lib/push';
import {
  LogOut,
  Mail,
  Phone,
  Fingerprint,
  Cake,
  Flag,
  Pencil,
  Camera,
  Users,
  Calendar,
  ClipboardList,
  Snowflake,
  Flame,
  Award,
  BellRing,
  KeyRound,
  Info,
  X,
  Receipt,
  MapPin,
  ChevronRight,
  HeartPulse,
} from 'lucide-react';

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

// "YYYY-MM-DD" con el calendario LOCAL (toISOString usa UTC y de noche salta de día).
function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lunesDeLaSemana(fecha) {
  const dia = fecha.getDay() === 0 ? 7 : fecha.getDay();
  const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  lunes.setDate(lunes.getDate() - (dia - 1));
  return isoLocal(lunes);
}

// Semanas seguidas con al menos una clase asistida. La semana actual no corta
// la racha si todavía no has entrenado (se cuenta desde la semana pasada).
// Una semana cuenta para la racha si el alumno asistió al menos 2 veces (lunes a domingo).
const MINIMO_SEMANA = 2;

// Semanas seguidas cumpliendo el mínimo. La semana actual no corta la racha mientras
// todavía no llegas al mínimo (se cuenta desde la semana pasada).
function calcularRacha(fechasAsistidas) {
  const porSemana = {};
  for (const f of fechasAsistidas) {
    const lunes = lunesDeLaSemana(new Date(f + 'T00:00:00'));
    porSemana[lunes] = (porSemana[lunes] || 0) + 1;
  }
  const cumple = (clave) => (porSemana[clave] || 0) >= MINIMO_SEMANA;
  const lunesActual = lunesDeLaSemana(new Date());
  const estaSemana = porSemana[lunesActual] || 0;
  let cursor = new Date(lunesActual + 'T00:00:00');
  if (!cumple(isoLocal(cursor))) cursor.setDate(cursor.getDate() - 7);
  let racha = 0;
  while (cumple(isoLocal(cursor))) {
    racha++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return { racha, estaSemana };
}

function fechaLarga(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function CambiarContrasena() {
  const { cambiarContrasena } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repite, setRepite] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function guardar(e) {
    e.preventDefault();
    if (nueva !== repite) return setMensaje({ ok: false, mensaje: 'Las contraseñas nuevas no coinciden.' });
    setGuardando(true);
    const r = await cambiarContrasena(actual, nueva);
    setGuardando(false);
    setMensaje(r);
    if (r.ok) {
      setActual('');
      setNueva('');
      setRepite('');
      setTimeout(() => {
        setAbierto(false);
        setMensaje(null);
      }, 2000);
    }
  }

  const campo =
    'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand';

  if (!abierto)
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 mt-3"
      >
        <span className="flex items-center gap-3 text-white text-sm">
          <KeyRound size={18} className="text-cyan-brand/70" /> Cambiar contraseña
        </span>
        <ChevronRight size={16} className="text-white/30" />
      </button>
    );

  return (
    <form onSubmit={guardar} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mt-3 flex flex-col gap-2.5">
      <p className="text-white text-sm font-semibold flex items-center gap-2">
        <KeyRound size={16} className="text-cyan-brand" /> Cambiar contraseña
      </p>
      <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="Contraseña actual" autoComplete="current-password" className={campo} />
      <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva contraseña (mínimo 6)" autoComplete="new-password" className={campo} />
      <input type="password" value={repite} onChange={(e) => setRepite(e.target.value)} placeholder="Repite la nueva contraseña" autoComplete="new-password" className={campo} />
      {mensaje && <p className={`text-sm ${mensaje.ok ? 'text-cyan-brand' : 'text-red-400'}`}>{mensaje.mensaje}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={guardando} className="flex-1 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="flex-1 bg-white/10 text-white rounded-xl py-2.5 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function MisPagos({ pagos }) {
  const [verTodos, setVerTodos] = useState(false);
  if (pagos.length === 0) return null;
  const visibles = verTodos ? pagos : pagos.slice(0, 3);
  return (
    <div className="mb-6">
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Receipt size={13} /> Mis pagos
      </p>
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/10">
        {visibles.map((p) => (
          <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-white text-sm font-semibold tabular-nums">{formatearPesos(p.monto)}</p>
              <p className="text-white/40 text-xs">
                {fechaLarga(p.fecha)} · {etiquetaMedio(p.medio)}
              </p>
            </div>
            {p.vence && <p className="text-white/45 text-xs text-right">Cubre hasta<br />{fechaLarga(p.vence)}</p>}
          </div>
        ))}
      </div>
      {pagos.length > 3 && (
        <button onClick={() => setVerTodos(!verTodos)} className="text-cyan-brand text-xs mt-2">
          {verTodos ? 'Ver menos' : `Ver todos (${pagos.length})`}
        </button>
      )}
    </div>
  );
}

// Logros según el total de clases asistidas (las que el coach marca como presente)
const HITOS = [
  { minimo: 10, nombre: 'Bronce', color: 'text-orange-300' },
  { minimo: 25, nombre: 'Plata', color: 'text-slate-200' },
  { minimo: 50, nombre: 'Oro', color: 'text-yellow-300' },
  { minimo: 100, nombre: 'Platino', color: 'text-cyan-200' },
  { minimo: 200, nombre: 'Diamante', color: 'text-cyan-brand' },
];

function calcularLogro(total) {
  const alcanzado = [...HITOS].reverse().find((h) => total >= h.minimo) || null;
  const siguiente = HITOS.find((h) => total < h.minimo) || null;
  return { alcanzado, siguiente };
}

export default function Perfil() {
  const {
    usuarioActual,
    logout,
    planes,
    sesionesRestantes,
    actualizarPerfil,
    horarios,
    reservas,
    congelacionActivaDe,
    solicitarCongelacion,
    congelaciones,
    rolEfectivo,
    cambiarVista,
    pagos,
    diasRenovacion,
  } = useAuth();
  const misPagos = (pagos || [])
    .filter((p) => p.usuario_id === usuarioActual.id)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const venceISO = usuarioActual.plan_id ? fechaVenceDe(usuarioActual, planes, diasRenovacion) : null;
  const diasParaVencer = venceISO
    ? Math.round((new Date(venceISO + 'T00:00:00') - new Date(isoLocal(new Date()) + 'T00:00:00')) / 86400000)
    : null;
  const plan = usuarioActual.plan_id ? planes[usuarioActual.plan_id] : null;
  const restantes = sesionesRestantes(usuarioActual);
  const edad = calcularEdad(usuarioActual.fecha_nacimiento);
  const esAdmin = usuarioActual.rol === 'head_coach';
  const esCoach = rolEfectivo === 'coach';
  const esUsuario = rolEfectivo === 'usuario';

  const congelacionActiva = esUsuario
    ? congelacionActivaDe(usuarioActual.id)
    : null;
  const tienePendiente =
    esUsuario &&
    congelaciones.some(
      (c) => c.usuario_id === usuarioActual.id && c.estado === 'pendiente'
    );
  const duracionPlanDias =
    usuarioActual.plan_dias_personalizado || plan?.duracion_dias || 30;
  const puedeCongelar = duracionPlanDias >= 90;

  const misAsistencias = esUsuario
    ? reservas.filter(
        (r) => r.usuario_id === usuarioActual.id && r.asistio === true
      )
    : [];
  const { racha, estaSemana } = calcularRacha(misAsistencias.map((r) => r.fecha));
  const [info, setInfo] = useState(null); // 'racha' | 'logros' | null
  const { alcanzado, siguiente } = calcularLogro(misAsistencias.length);

  const [mostrarCongelar, setMostrarCongelar] = useState(false);
  const [motivoCongelar, setMotivoCongelar] = useState('');
  const [enviandoCongelar, setEnviandoCongelar] = useState(false);
  const [mensajeCongelar, setMensajeCongelar] = useState(null);

  const [editando, setEditando] = useState(false);
  const [pushActivo, setPushActivo] = useState(false);
  const [activandoPush, setActivandoPush] = useState(false);
  const [mensajePush, setMensajePush] = useState(null);

  useEffect(() => {
    if (pushDisponible()) {
      yaEstaSuscrito().then(setPushActivo);
    }
  }, []);

  async function handleActivarPush() {
    setActivandoPush(true);
    const resultado = await activarNotificacionesPush(usuarioActual.id);
    setActivandoPush(false);
    setMensajePush(resultado);
    if (resultado.ok) setPushActivo(true);
    setTimeout(() => setMensajePush(null), 10000);
  }
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [form, setForm] = useState({
    telefono: usuarioActual.telefono || '',
    fecha_nacimiento: usuarioActual.fecha_nacimiento || '',
    nacionalidad: usuarioActual.nacionalidad || '',
    obs_salud: usuarioActual.obs_salud || '',
  });

  // --- Resumen para coach ---
  const misHorarios = esCoach
    ? horarios.filter((h) => h.coach_id === usuarioActual.id)
    : [];
  const misHorarioIds = misHorarios.map((h) => h.id);
  const alumnosUnicos = esCoach
    ? new Set(
        reservas
          .filter((r) => misHorarioIds.includes(r.horario_id))
          .map((r) => r.usuario_id)
      ).size
    : 0;
  const hoyISO = isoLocal(new Date());
  const reservasProximas = esCoach
    ? reservas.filter(
        (r) => misHorarioIds.includes(r.horario_id) && r.fecha >= hoyISO
      ).length
    : 0;

  function abrirEdicion() {
    setForm({
      telefono: usuarioActual.telefono || '',
      fecha_nacimiento: usuarioActual.fecha_nacimiento || '',
      nacionalidad: usuarioActual.nacionalidad || '',
      obs_salud: usuarioActual.obs_salud || '',
    });
    setEditando(true);
    setMensaje(null);
  }

  async function guardar() {
    setGuardando(true);
    const resultado = await actualizarPerfil(usuarioActual.id, {
      ...form,
      obs_salud: (form.obs_salud || '').trim() || null,
    });
    setGuardando(false);
    setMensaje(resultado);
    if (resultado.ok) {
      setTimeout(() => {
        setEditando(false);
        setMensaje(null);
      }, 800);
    }
  }

  async function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy pesada. Usa una de menos de 5MB.');
      return;
    }
    try {
      const url = await subirImagen(file, 'perfil');
      actualizarPerfil(usuarioActual.id, { foto_url: url });
    } catch (err) {
      alert('Error al subir la foto: ' + err.message);
    }
  }

  async function handleSolicitarCongelar(e) {
    e.preventDefault();
    setEnviandoCongelar(true);
    const resultado = await solicitarCongelacion(motivoCongelar);
    setEnviandoCongelar(false);
    setMensajeCongelar(resultado);
    if (resultado.ok) {
      setMotivoCongelar('');
      setTimeout(() => {
        setMostrarCongelar(false);
        setMensajeCongelar(null);
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <div className="w-[72px] h-[72px] rounded-full bg-white border-2 border-cyan-brand shadow-lg shadow-black/40 flex items-center justify-center overflow-hidden">
            {usuarioActual.foto_url ? (
              <img
                src={usuarioActual.foto_url}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display text-2xl text-ink">
                {usuarioActual.nombre.charAt(0)}
              </span>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-cyan-brand rounded-full flex items-center justify-center cursor-pointer border-2 border-ink transition-transform active:scale-90">
            <Camera size={13} className="text-ink" />
            <input
              type="file"
              accept="image/*"
              onChange={handleFoto}
              className="hidden"
            />
          </label>
        </div>
        <div>
          <p className="text-white font-display text-2xl leading-tight">
            {usuarioActual.nombre}
          </p>
          <p className="text-cyan-brand/80 text-xs font-semibold tracking-wide uppercase mt-1 capitalize">
            {usuarioActual.rol.replace('_', ' ')}
          </p>
        </div>
      </div>

      {esAdmin && (
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
            Verme como
          </p>
          <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1">
            {[
              { valor: 'head_coach', label: 'Admin' },
              { valor: 'coach', label: 'Coach' },
              { valor: 'usuario', label: 'Usuario' },
            ].map((opcion) => (
              <button
                key={opcion.valor}
                onClick={() => cambiarVista(opcion.valor)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  rolEfectivo === opcion.valor
                    ? 'bg-cyan-brand text-ink'
                    : 'text-white/50'
                }`}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {esCoach && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <ResumenStat icon={Users} valor={alumnosUnicos} label="Alumnos" />
          <ResumenStat
            icon={Calendar}
            valor={misHorarios.length}
            label="Horarios"
          />
          <ResumenStat
            icon={ClipboardList}
            valor={reservasProximas}
            label="Reservas"
          />
        </div>
      )}

      {(plan || restantes !== null) && (
        <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-6 mb-4 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
          <p className="text-white/50 text-sm mb-1">
            {plan ? plan.nombre : 'Tu plan'}
          </p>
          {restantes !== null ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl text-cyan-brand">
                  {restantes}
                </span>
                <span className="text-white/50 text-sm">
                  sesiones disponibles
                </span>
              </div>
              <p className="text-white/30 text-xs mt-1">
                {usuarioActual.sesiones_usadas}{' '}
                {usuarioActual.sesiones_usadas === 1 ? 'sesión usada' : 'sesiones usadas'} desde tu último pago
              </p>
            </>
          ) : (
            <p className="font-display text-3xl text-cyan-brand">Ilimitado</p>
          )}
          <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-cyan-brand rounded-full transition-all"
              style={{
                width:
                  restantes !== null
                    ? `${Math.max(
                        0,
                        Math.min(
                          100,
                          (restantes / Math.max(1, restantes + (usuarioActual.sesiones_usadas || 0))) * 100
                        )
                      )}%`
                    : '100%',
              }}
            />
          </div>
          {venceISO && (
            <p
              className={`text-sm mt-3 ${
                diasParaVencer <= 0 ? 'text-red-300' : diasParaVencer <= 5 ? 'text-yellow-200' : 'text-white/60'
              }`}
            >
              {diasParaVencer <= 0
                ? `Tu plan venció el ${fechaLarga(venceISO)}. Renuévalo para seguir reservando.`
                : `Vence el ${fechaLarga(venceISO)} (en ${diasParaVencer} día${diasParaVencer !== 1 ? 's' : ''})`}
            </p>
          )}
        </div>
      )}

      {esUsuario && <PagoEnLinea diasParaVencer={diasParaVencer} />}

      {esUsuario && !plan && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 mb-4 text-yellow-100 text-sm">
          Todavía no tienes un plan asignado. Habla con el gimnasio para activarlo.
        </div>
      )}

      {esUsuario && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <button
              onClick={() => setInfo('racha')}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-cyan-brand/15 border border-cyan-brand/40 text-cyan-brand flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Cómo se cuentan las semanas seguidas"
            >
              <Info size={15} />
            </button>
            <Flame size={20} className={racha > 0 ? 'text-orange-400' : 'text-white/20'} />
            <p className="font-display text-3xl text-white leading-none mt-2">{racha}</p>
            <p className="text-white/40 text-xs mt-1">
              semana{racha !== 1 ? 's' : ''} seguida{racha !== 1 ? 's' : ''}
            </p>
            <p className={`text-[11px] mt-1.5 ${estaSemana >= MINIMO_SEMANA ? 'text-orange-300' : 'text-white/35'}`}>
              Esta semana: {Math.min(estaSemana, MINIMO_SEMANA)}/{MINIMO_SEMANA}
              {estaSemana >= MINIMO_SEMANA ? ' ✓' : ''}
            </p>
          </div>
          <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <button
              onClick={() => setInfo('logros')}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-cyan-brand/15 border border-cyan-brand/40 text-cyan-brand flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Cómo funcionan los logros"
            >
              <Info size={15} />
            </button>
            <Award size={20} className={alcanzado ? alcanzado.color : 'text-white/20'} />
            <p className={`font-display text-lg leading-tight mt-2 ${alcanzado ? alcanzado.color : 'text-white'}`}>
              {alcanzado ? alcanzado.nombre : 'Sin logros aún'}
            </p>
            <p className="text-white/40 text-xs mt-1">
              {siguiente
                ? `${misAsistencias.length}/${siguiente.minimo} clases para ${siguiente.nombre}`
                : `${misAsistencias.length} clases asistidas`}
            </p>
            {siguiente && (
              <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-cyan-brand rounded-full"
                  style={{ width: `${Math.min(100, (misAsistencias.length / siguiente.minimo) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {info && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setInfo(null)} />
          <div className="relative w-full sm:max-w-sm bg-ink border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between mb-3">
              <p className="text-white font-display text-lg">
                {info === 'racha' ? 'Semanas seguidas' : 'Logros'}
              </p>
              <button onClick={() => setInfo(null)} className="text-white/40 p-1" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            {info === 'racha' ? (
              <div className="flex flex-col gap-2 text-sm text-white/70">
                <p>
                  Una semana suma a tu racha si vas <span className="text-white font-semibold">al menos {MINIMO_SEMANA} veces</span>{' '}
                  entre lunes y domingo.
                </p>
                <p>Si una semana no llegas a {MINIMO_SEMANA} clases, la racha vuelve a empezar desde cero.</p>
                <p>La semana en curso no te corta la racha: tienes hasta el domingo para completarla.</p>
                <p className="text-white/45 text-xs">Solo cuentan las clases en que el coach te marcó como presente.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-sm text-white/70">
                <p>Los logros se ganan según el total de clases a las que has asistido desde que entraste:</p>
                <div className="flex flex-col gap-1.5 my-1">
                  {HITOS.map((h) => {
                    const logrado = misAsistencias.length >= h.minimo;
                    return (
                      <div
                        key={h.nombre}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                          logrado ? 'bg-white/[0.06]' : 'bg-white/[0.02]'
                        }`}
                      >
                        <span className={`flex items-center gap-2 ${logrado ? h.color : 'text-white/40'}`}>
                          <Award size={15} /> {h.nombre}
                        </span>
                        <span className={`text-xs ${logrado ? 'text-white/70' : 'text-white/35'}`}>
                          {h.minimo} clases {logrado ? '✓' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-white/45 text-xs">
                  Llevas {misAsistencias.length} clase{misAsistencias.length !== 1 ? 's' : ''} asistida
                  {misAsistencias.length !== 1 ? 's' : ''}. Solo cuentan las clases en que el coach te marcó como presente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {esUsuario && congelacionActiva && (
        <div className="bg-blue-400/10 border border-blue-400/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Snowflake size={20} className="text-blue-300 shrink-0" />
          <div>
            <p className="text-blue-200 text-sm font-medium">
              Membresía congelada
            </p>
            <p className="text-white/40 text-xs">
              Hasta el {congelacionActiva.fecha_fin}
            </p>
          </div>
        </div>
      )}

      {esUsuario && !congelacionActiva && !puedeCongelar && (
        <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/10 rounded-2xl py-3 px-4 mb-6">
          <Snowflake size={15} className="text-white/30 shrink-0" />
          <p className="text-white/40 text-xs">
            El congelamiento está disponible solo para planes de 3 meses o más.
          </p>
        </div>
      )}

      {esUsuario && !congelacionActiva && puedeCongelar && (
        <div className="mb-6">
          {!mostrarCongelar ? (
            <button
              onClick={() => setMostrarCongelar(true)}
              disabled={tienePendiente}
              className="flex items-center justify-center gap-2 w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 text-white/70 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
            >
              <Snowflake size={15} />
              {tienePendiente
                ? 'Solicitud de congelamiento pendiente'
                : 'Congelar membresía'}
            </button>
          ) : (
            <form
              onSubmit={handleSolicitarCongelar}
              className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex flex-col gap-2"
            >
              <label className="text-white/40 text-xs block">
                Motivo (opcional)
              </label>
              <textarea
                value={motivoCongelar}
                onChange={(e) => setMotivoCongelar(e.target.value)}
                placeholder="Ej: viaje, lesión..."
                rows={2}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
              />
              {mensajeCongelar && (
                <p
                  className={`text-xs ${
                    mensajeCongelar.ok ? 'text-cyan-brand' : 'text-red-400'
                  }`}
                >
                  {mensajeCongelar.mensaje}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={enviandoCongelar}
                  className="flex-1 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
                >
                  {enviandoCongelar ? 'Enviando...' : 'Enviar solicitud'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarCongelar(false)}
                  className="flex-1 bg-white/10 text-white rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {usuarioActual.rol !== 'usuario' && (
        <label className="flex items-center justify-between gap-3 bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 mb-4 cursor-pointer">
          <span>
            <span className="block text-white text-sm">Avisarme de reservas en mis clases</span>
            <span className="block text-white/40 text-xs">Cuando un alumno reserve o cancele en una clase tuya</span>
          </span>
          <input
            type="checkbox"
            checked={!!usuarioActual.avisos_reservas}
            onChange={(e) => actualizarPerfil(usuarioActual.id, { avisos_reservas: e.target.checked })}
            className="w-5 h-5 accent-cyan-500 shrink-0"
          />
        </label>
      )}

      {!pushActivo && (
        <button
          onClick={handleActivarPush}
          disabled={activandoPush}
          className="flex items-center justify-center gap-2 w-full bg-white/[0.04] border border-cyan-brand/25 rounded-2xl py-3 text-white/80 text-sm mb-6 transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <BellRing size={15} className="text-cyan-brand" />
          {activandoPush ? 'Activando...' : 'Activar notificaciones'}
        </button>
      )}
      {mensajePush && (
        <p
          className={`text-xs mb-4 -mt-4 ${
            mensajePush.ok ? 'text-cyan-brand' : 'text-red-400'
          }`}
        >
          {mensajePush.mensaje}
        </p>
      )}

      {esUsuario && usuarioActual.rol === 'usuario' && <TraeUnAmigo />}

      {esUsuario && <MisPagos pagos={misPagos} />}

      <Link
        to="/gimnasio"
        className="w-full flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 mb-6"
      >
        <span className="flex items-center gap-3 text-white text-sm">
          <MapPin size={18} className="text-cyan-brand/70" /> El gimnasio: contacto, horario y reglamento
        </span>
        <ChevronRight size={16} className="text-white/30" />
      </Link>

      <div className="flex items-center justify-between mb-2">
        <p className="text-white/40 text-xs uppercase tracking-wide">
          Datos personales
        </p>
        {!editando && (
          <button
            onClick={abrirEdicion}
            className="flex items-center gap-1 text-cyan-brand text-xs font-medium transition-transform active:scale-95"
          >
            <Pencil size={13} /> Editar
          </button>
        )}
      </div>

      {editando ? (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <div>
            <label className="text-white/40 text-xs mb-1 block">Teléfono</label>
            <input
              value={form.telefono}
              onChange={(e) =>
                setForm({
                  ...form,
                  telefono: formatearTelefono(e.target.value),
                })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) =>
                setForm({ ...form, fecha_nacimiento: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Nacionalidad
            </label>
            <input
              value={form.nacionalidad}
              onChange={(e) =>
                setForm({ ...form, nacionalidad: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
            />
          </div>
          {usuarioActual.rol === 'usuario' && <div>
            <label className="text-white/40 text-xs mb-1 block">
              OBS para tu coach
            </label>
            <textarea
              value={form.obs_salud}
              onChange={(e) => setForm({ ...form, obs_salud: e.target.value })}
              placeholder="Ej: enfermedad, lesión u otro dato importante"
              rows={3}
              maxLength={500}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand resize-none placeholder-white/30"
            />
          </div>}

          {mensaje && (
            <p
              className={`text-sm ${
                mensaje.ok ? 'text-cyan-brand' : 'text-red-400'
              }`}
            >
              {mensaje.mensaje}
            </p>
          )}

          <div className="flex gap-2 mt-1">
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex-1 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setEditando(false)}
              className="flex-1 bg-white/10 text-white rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/10">
          <InfoRow
            icon={Fingerprint}
            label="RUT"
            value={formatearRut(usuarioActual.rut)}
          />
          <InfoRow icon={Mail} label="Correo" value={usuarioActual.correo} />
          <InfoRow
            icon={Phone}
            label="Teléfono"
            value={usuarioActual.telefono}
          />
          {edad !== null && (
            <InfoRow icon={Cake} label="Edad" value={`${edad} años`} />
          )}
          {usuarioActual.nacionalidad && (
            <InfoRow
              icon={Flag}
              label="Nacionalidad"
              value={usuarioActual.nacionalidad}
            />
          )}
          {usuarioActual.rol === 'usuario' && (
            <InfoRow
              icon={HeartPulse}
              label="OBS para tu coach"
              value={usuarioActual.obs_salud || 'Sin observaciones (puedes agregar una lesión, enfermedad u otro dato importante)'}
            />
          )}
        </div>
      )}

      <CambiarContrasena />

      <button
        onClick={logout}
        className="w-full mt-8 flex items-center justify-center gap-2 text-white/50 py-3 rounded-2xl border border-white/10 hover:text-white hover:border-white/30 transition-all active:scale-[0.98]"
      >
        <LogOut size={18} />
        <span className="text-sm">Cerrar sesión</span>
      </button>
    </div>
  );
}

function ResumenStat({ icon: Icon, valor, label }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 text-center">
      <Icon size={16} className="text-cyan-brand/70 mx-auto mb-1" />
      <p className="font-display text-xl text-white leading-none">{valor}</p>
      <p className="text-white/40 text-[10px] mt-1">{label}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Icon size={18} className="text-cyan-brand/70" />
      <div>
        <p className="text-white/40 text-xs">{label}</p>
        <p className="text-white text-sm">{value}</p>
      </div>
    </div>
  );
}
