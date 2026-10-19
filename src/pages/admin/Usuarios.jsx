import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FormularioPago from '../../components/FormularioPago';
import {
  Check,
  X,
  Plus,
  Snowflake,
  Search,
  RefreshCw,
  ChevronDown,
  MoreVertical,
  UserCog,
  CreditCard,
  Layers,
  Zap,
  UserX,
  UserCheck,
  Trash2,
  Download,
  FileBarChart,
  Pencil,
  MessageCircle,
  List,
  LayoutList,
  KeyRound,
  Shield,
} from 'lucide-react';
import { numeroWhatsapp } from '../../lib/seguimiento';
import { formatearRut, formatearTelefono } from '../../lib/formato';
import { fechaVenceDe } from '../../lib/ingresos';

// ---------- Estado de cada alumno ----------

const DIA_MS = 1000 * 60 * 60 * 24;

function hoyMedianoche() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function infoAlumno(u, planes, diasRenovacion) {
  const plan = u.plan_id ? planes[u.plan_id] : null;
  const base = u.plan_sesiones_personalizado || plan?.cantidad_sesiones || null;
  const extra = u.sesiones_extra || 0;
  const total = base !== null ? base + extra : null;
  const usadas = u.sesiones_usadas || 0;
  const restantes = total !== null ? total - usadas : null;

  // Fecha de vencimiento guardada al registrar el pago (o calculada con la duración del plan).
  const venceISO = plan ? fechaVenceDe(u, planes, diasRenovacion) : null;
  let vence = null;
  let diasRestantes = null;
  if (venceISO) {
    vence = new Date(venceISO + 'T00:00:00');
    diasRestantes = Math.round((vence - hoyMedianoche()) / DIA_MS);
  }

  let clave;
  if (u.estado === 'inactivo') clave = 'inactivo';
  else if (!plan) clave = 'sin_plan';
  else if (!vence || diasRestantes <= 0) clave = 'vencido';
  else if (total !== null && restantes <= 0) clave = 'agotado';
  else if (diasRestantes <= 5 || (total !== null && restantes <= 1))
    clave = 'por_vencer';
  else clave = 'activo';

  return { plan, total, usadas, restantes, extra, vence, diasRestantes, clave };
}

const ESTADOS = {
  activo: {
    label: 'Activo',
    clase: 'bg-cyan-brand/10 text-cyan-brand border-cyan-brand/25',
  },
  por_vencer: {
    label: 'Por vencer',
    clase: 'bg-yellow-400/10 text-yellow-200 border-yellow-400/30',
  },
  agotado: {
    label: 'Agotado',
    clase: 'bg-orange-400/10 text-orange-300 border-orange-400/30',
  },
  vencido: {
    label: 'Vencido',
    clase: 'bg-red-500/10 text-red-300 border-red-500/30',
  },
  sin_plan: {
    label: 'Sin plan',
    clase: 'bg-white/5 text-white/50 border-white/15',
  },
  inactivo: {
    label: 'Inactivo',
    clase: 'bg-white/5 text-white/35 border-white/10',
  },
};

const FILTROS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'activo', label: 'Activos' },
  { valor: 'por_vencer', label: 'Por vencer' },
  { valor: 'agotado', label: 'Agotados' },
  { valor: 'vencido', label: 'Vencidos' },
  { valor: 'sin_plan', label: 'Sin plan' },
  { valor: 'inactivo', label: 'Inactivos' },
];

const PARA_RENOVAR = ['vencido', 'agotado', 'por_vencer'];

function iniciales(nombre) {
  const partes = (nombre || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '?';
}

function fechaCorta(d) {
  return d
    .toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
    .replace('.', '');
}

function soloDigitos(s) {
  return (s || '').replace(/\D/g, '');
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
}

// "Hoy", "Ayer", "Hace 5 días"… desde la última clase a la que vino
function textoVisita(fechaISO) {
  if (!fechaISO) return 'Sin visitas';
  const dias = Math.round(
    (Date.parse(hoyISO() + 'T12:00:00') - Date.parse(fechaISO + 'T12:00:00')) /
      DIA_MS
  );
  if (dias <= 0) return 'Vino hoy';
  if (dias === 1) return 'Vino ayer';
  return `Vino hace ${dias} días`;
}

function colorVisita(fechaISO) {
  if (!fechaISO) return 'text-white/35';
  const dias = Math.round(
    (Date.parse(hoyISO() + 'T12:00:00') - Date.parse(fechaISO + 'T12:00:00')) /
      DIA_MS
  );
  return dias >= 14 ? 'text-orange-300' : 'text-white/45';
}

const PUNTO = {
  activo: 'bg-cyan-brand',
  por_vencer: 'bg-yellow-300',
  agotado: 'bg-orange-400',
  vencido: 'bg-red-400',
  sin_plan: 'bg-white/30',
  inactivo: 'bg-white/15',
};

const ORDENES = [
  { valor: 'nombre', label: 'Nombre (A-Z)' },
  { valor: 'vence', label: 'Vence primero' },
  { valor: 'clases', label: 'Menos clases disponibles' },
  { valor: 'visita', label: 'Más tiempo sin venir' },
];

function leerCompacta() {
  try {
    return localStorage.getItem('cedys_lista_compacta') === '1';
  } catch (e) {
    return false;
  }
}

function BotonWhatsapp({ telefono, chico = false }) {
  const numero = numeroWhatsapp(telefono);
  if (!numero) return null;
  return (
    <a
      href={`https://wa.me/${numero}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label="Escribir por WhatsApp"
      className={`${
        chico ? 'w-7 h-7' : 'w-8 h-8'
      } rounded-full bg-[#25D366]/15 border border-[#25D366]/35 text-[#7ee2a5] flex items-center justify-center shrink-0`}
    >
      <MessageCircle size={chico ? 13 : 15} />
    </a>
  );
}

// ---------- Piezas visuales ----------

function Avatar({ nombre }) {
  return (
    <div className="w-9 h-9 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
      <span className="text-cyan-brand text-xs font-semibold">
        {iniciales(nombre)}
      </span>
    </div>
  );
}

function BadgeEstado({ clave, sinPago }) {
  const e = ESTADOS[clave];
  return (
    <span
      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${e.clase}`}
    >
      {clave === 'vencido' && sinPago ? 'Sin pago' : e.label}
    </span>
  );
}

function Clases({ info }) {
  if (!info.plan) return <span className="text-white/25 text-sm">—</span>;
  if (info.total === null) {
    return (
      <div>
        <p className="text-white text-sm">Ilimitado</p>
        <p className="text-white/35 text-[11px]">{info.usadas} usadas</p>
      </div>
    );
  }
  const pct =
    info.total > 0 ? Math.min(100, (info.usadas / info.total) * 100) : 0;
  return (
    <div className="min-w-[90px]">
      <p className="text-white text-sm tabular-nums">
        {info.usadas} <span className="text-white/40">de</span> {info.total}
      </p>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-1.5 max-w-[110px]">
        <div
          className="h-full bg-cyan-brand rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Vigencia({ info }) {
  if (!info.plan) return <span className="text-white/25 text-sm">—</span>;
  if (!info.vence) {
    return <p className="text-white/40 text-xs">Sin pago registrado</p>;
  }
  if (info.diasRestantes <= 0) {
    const hace = Math.abs(info.diasRestantes);
    return (
      <div>
        <p className="text-red-300 text-sm">Vencido</p>
        <p className="text-white/35 text-[11px]">
          {hace === 0 ? 'hoy' : `hace ${hace} día${hace !== 1 ? 's' : ''}`} ·{' '}
          {fechaCorta(info.vence)}
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-white text-sm tabular-nums">
        {info.diasRestantes} día{info.diasRestantes !== 1 ? 's' : ''}
      </p>
      <p className="text-white/35 text-[11px]">
        Vence {fechaCorta(info.vence)}
      </p>
    </div>
  );
}

function Modal({ titulo, subtitulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCerrar} />
      <div className="relative w-full md:max-w-md bg-ink border border-white/10 rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-white font-display text-lg leading-tight">
              {titulo}
            </p>
            {subtitulo && (
              <p className="text-white/40 text-xs mt-0.5">{subtitulo}</p>
            )}
          </div>
          <button
            onClick={onCerrar}
            className="text-white/40 p-1 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClase =
  'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors';

// ---------- Pantalla ----------

export default function Usuarios() {
  const navigate = useNavigate();
  const {
    usuarios,
    planes,
    asignarPlan,
    aprobarUsuario,
    rechazarUsuario,
    crearUsuarioConPassword,
    congelaciones,
    aprobarCongelacion,
    rechazarCongelacion,
    diasRenovacion,
    actualizarPerfil,
    agregarSesionesExtra,
    desactivarUsuario,
    reactivarUsuario,
    usuarioActual,
    horarios,
    reservas,
    solicitudesFueraPlazo,
    aprobarSolicitudFueraPlazo,
    rechazarSolicitudFueraPlazo,
  } = useAuth();

  const [busqueda, setBusqueda] = useState('');
  const [planFiltro, setPlanFiltro] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [grupo, setGrupo] = useState('alumnos'); // alumnos | equipo
  const [orden, setOrden] = useState('nombre');
  const [compacta, setCompacta] = useState(leerCompacta);

  function cambiarCompacta(valor) {
    setCompacta(valor);
    try {
      localStorage.setItem('cedys_lista_compacta', valor ? '1' : '0');
    } catch (e) {
      // sin almacenamiento disponible
    }
  }
  const [menuId, setMenuId] = useState(null);
  const [masAbierto, setMasAbierto] = useState(false);
  // Diálogo abierto: { tipo: 'cobrar'|'plan'|'sesiones'|'estado'|'eliminar'|'nuevo', usuario }
  const [dialogo, setDialogo] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);

  async function eliminarCuenta(id) {
    setEliminando(true);
    setErrorEliminar(null);
    const r = await rechazarUsuario(id);
    setEliminando(false);
    if (r?.ok === false) setErrorEliminar(r.mensaje);
    else setDialogo(null);
  }

  const [diasCongelar, setDiasCongelar] = useState({});
  const [procesandoSolicitudId, setProcesandoSolicitudId] = useState(null);

  // --- Solicitudes (se muestran arriba de la lista) ---
  const congelacionesPendientes = congelaciones.filter(
    (c) => c.estado === 'pendiente'
  );
  const pendientes = usuarios.filter((u) => u.estado === 'pendiente');
  const fueraPlazoPendientes = solicitudesFueraPlazo.filter(
    (s) => s.estado === 'pendiente'
  );

  const refSolicitudes = useRef(null);
  const refFueraPlazo = useRef(null);
  useEffect(() => {
    if (
      window.location.hash === '#solicitudes-pendientes' &&
      refSolicitudes.current
    ) {
      refSolicitudes.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
    if (window.location.hash === '#fuera-de-plazo' && refFueraPlazo.current) {
      refFueraPlazo.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, []);

  async function resolverSolicitud(solicitudId, aprobar) {
    setProcesandoSolicitudId(solicitudId);
    const resultado = aprobar
      ? await aprobarSolicitudFueraPlazo(solicitudId)
      : await rechazarSolicitudFueraPlazo(solicitudId);
    setProcesandoSolicitudId(null);
    if (!resultado?.ok)
      alert(resultado?.mensaje || 'No se pudo procesar la solicitud.');
  }

  // --- Alumnos con su estado calculado ---
  // Última clase a la que vino cada alumno (no cuenta las faltas)
  const ultimaVisita = useMemo(() => {
    const hoy = hoyISO();
    const mapa = {};
    for (const r of reservas || []) {
      if (
        r.fecha <= hoy &&
        r.asistio !== false &&
        (!mapa[r.usuario_id] || r.fecha > mapa[r.usuario_id])
      ) {
        mapa[r.usuario_id] = r.fecha;
      }
    }
    return mapa;
  }, [reservas]);

  const todasLasFichas = useMemo(
    () =>
      usuarios
        .filter((u) => u.estado !== 'pendiente')
        .map((u) => ({
          u,
          info: infoAlumno(u, planes, diasRenovacion),
          visita: ultimaVisita[u.id] || null,
        }))
        .sort((a, b) => (a.u.nombre || '').localeCompare(b.u.nombre || '')),
    [usuarios, planes, diasRenovacion, ultimaVisita]
  );
  const esEquipo = (u) => u.rol === 'coach' || u.rol === 'head_coach';
  const totalEquipo = todasLasFichas.filter(({ u }) => esEquipo(u)).length;
  const alumnos = todasLasFichas.filter(({ u }) =>
    grupo === 'equipo' ? esEquipo(u) : !esEquipo(u)
  );

  const conteo = alumnos.reduce(
    (acc, { info }) => {
      acc[info.clave] = (acc[info.clave] || 0) + 1;
      return acc;
    },
    { todos: alumnos.length }
  );
  const totalRenovaciones = PARA_RENOVAR.reduce(
    (acc, k) => acc + (conteo[k] || 0),
    0
  );

  const texto = busqueda.trim().toLowerCase();
  const textoDigitos = soloDigitos(texto);
  const filtrados = alumnos.filter(({ u, info }) => {
    if (
      filtro === 'renovaciones'
        ? !PARA_RENOVAR.includes(info.clave)
        : filtro !== 'todos' && info.clave !== filtro
    ) {
      return false;
    }
    if (planFiltro === 'sin' && u.plan_id) return false;
    if (planFiltro && planFiltro !== 'sin' && u.plan_id !== planFiltro)
      return false;
    if (!texto) return true;
    return (
      (u.nombre || '').toLowerCase().includes(texto) ||
      (u.correo || '').toLowerCase().includes(texto) ||
      (textoDigitos.length >= 3 &&
        (soloDigitos(u.rut).includes(textoDigitos) ||
          soloDigitos(u.telefono).includes(textoDigitos)))
    );
  });
  const lejos = (v) => (v === null || v === undefined ? Infinity : v);
  const visibles = [...filtrados].sort((a, b) => {
    if (orden === 'vence')
      return lejos(a.info.vence?.getTime()) - lejos(b.info.vence?.getTime());
    if (orden === 'clases')
      return lejos(a.info.restantes) - lejos(b.info.restantes);
    if (orden === 'visita')
      return (a.visita || '').localeCompare(b.visita || '');
    return 0; // ya vienen por nombre
  });

  async function exportarListado() {
    setMasAbierto(false);
    const XLSX = await import('xlsx');
    const filas = visibles.map(({ u, info }) => ({
      Nombre: u.nombre,
      RUT: formatearRut(u.rut),
      Teléfono: u.telefono || '',
      Correo: u.correo || '',
      Plan: info.plan?.nombre || 'Sin plan',
      'Clases usadas': info.plan ? info.usadas : '',
      'Clases del plan': info.plan ? info.total ?? 'Ilimitado' : '',
      Vence: info.vence ? info.vence.toLocaleDateString('es-CL') : '',
      Estado:
        info.clave === 'vencido' && !info.vence
          ? 'Sin pago'
          : ESTADOS[info.clave].label,
      'Última clase': ultimaVisita[u.id] || '',
    }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(filas),
      'Alumnos'
    );
    const d = new Date();
    XLSX.writeFile(
      libro,
      `alumnos-ceds-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(d.getDate()).padStart(2, '0')}.xlsx`
    );
  }

  function abrir(tipo, usuario) {
    setMenuId(null);
    setErrorEliminar(null);
    setDialogo({ tipo, usuario });
  }

  const planesOrdenados = Object.values(planes).sort((a, b) =>
    (a.nombre || '').localeCompare(b.nombre || '')
  );

  return (
    <div className="min-h-screen bg-ink pb-24 px-4 md:px-8 pt-6">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
          <div>
            <p className="text-white font-display text-3xl leading-tight">
              Usuarios
            </p>
            <p className="text-white/40 text-xs mt-1">
              {grupo === 'equipo'
                ? `${conteo.todos} persona${
                    conteo.todos !== 1 ? 's' : ''
                  } en el equipo (coaches y admin)`
                : `${conteo.todos} alumno${
                    conteo.todos !== 1 ? 's' : ''
                  } en total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/renovaciones')}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
                filtro === 'renovaciones'
                  ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-100'
                  : 'bg-white/[0.04] border-white/10 text-white'
              }`}
            >
              <RefreshCw size={15} /> Por contactar
              <span className="text-[11px] font-semibold bg-yellow-400/20 text-yellow-200 rounded-full px-1.5 min-w-[20px] text-center">
                {totalRenovaciones}
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setMasAbierto(!masAbierto)}
                className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-xl border bg-white/[0.04] border-white/10 text-white"
              >
                Más <ChevronDown size={15} />
              </button>
              {masAbierto && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMasAbierto(false)}
                  />
                  <div className="absolute right-0 mt-1 z-40 w-56 bg-ink border border-white/15 rounded-xl p-1 shadow-xl">
                    <button
                      onClick={exportarListado}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/5"
                    >
                      <Download size={15} /> Descargar esta lista (Excel)
                    </button>
                    <button
                      onClick={() => navigate('/reportes')}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/5"
                    >
                      <FileBarChart size={15} /> Ir a Reportes
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => abrir('nuevo', null)}
              className="flex items-center gap-1 bg-cyan-brand text-ink text-sm font-semibold px-3 py-2 rounded-xl transition-transform active:scale-95"
            >
              <Plus size={16} />{' '}
              <span className="hidden sm:inline">Agregar alumno</span>
              <span className="sm:hidden">Agregar</span>
            </button>
          </div>
        </div>

        {/* Solicitudes pendientes de revisar */}
        {fueraPlazoPendientes.length > 0 && (
          <div className="mb-5" ref={refFueraPlazo}>
            <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
              Solicitudes de hora fuera de plazo ({fueraPlazoPendientes.length})
            </p>
            <div className="grid md:grid-cols-2 gap-2">
              {fueraPlazoPendientes.map((sol) => {
                const alumno = usuarios.find((u) => u.id === sol.usuario_id);
                const horario = horarios.find((h) => h.id === sol.horario_id);
                const inscritos = reservas.filter(
                  (r) =>
                    r.horario_id === sol.horario_id &&
                    r.fecha === sol.fecha &&
                    r.estado === 'confirmada'
                ).length;
                const lleno = horario ? inscritos >= horario.cupo_max : false;
                const fechaTexto = new Date(
                  sol.fecha + 'T00:00:00'
                ).toLocaleDateString('es-CL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                });
                const procesando = procesandoSolicitudId === sol.id;
                return (
                  <div
                    key={sol.id}
                    className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4"
                  >
                    <p className="text-white text-sm font-medium">
                      {alumno?.nombre || 'Usuario'}
                    </p>
                    <p className="text-white/50 text-xs capitalize">
                      Clase de las {horario?.hora || '—'} · {fechaTexto}
                    </p>
                    <p
                      className={`text-xs mt-1 mb-3 ${
                        lleno ? 'text-red-300' : 'text-white/40'
                      }`}
                    >
                      {horario
                        ? `${inscritos}/${horario.cupo_max} inscritos${
                            lleno ? ' · clase llena, quedaría sobrecupo' : ''
                          }`
                        : 'Este horario ya no existe'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolverSolicitud(sol.id, true)}
                        disabled={procesando || !horario}
                        className="flex-1 flex items-center justify-center gap-1 bg-cyan-brand text-ink text-sm font-semibold rounded-lg py-2 disabled:opacity-50"
                      >
                        <Check size={16} /> Aprobar
                      </button>
                      <button
                        onClick={() => resolverSolicitud(sol.id, false)}
                        disabled={procesando}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white/70 text-sm font-semibold rounded-lg py-2 disabled:opacity-50"
                      >
                        <X size={16} /> Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {congelacionesPendientes.length > 0 && (
          <div className="mb-5">
            <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
              Solicitudes de congelamiento ({congelacionesPendientes.length})
            </p>
            <div className="grid md:grid-cols-2 gap-2">
              {congelacionesPendientes.map((c) => {
                const solicitante = usuarios.find((u) => u.id === c.usuario_id);
                return (
                  <div
                    key={c.id}
                    className="bg-blue-400/10 border border-blue-400/30 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Snowflake size={14} className="text-blue-300" />
                      <p className="text-white text-sm font-medium">
                        {solicitante?.nombre || 'Usuario'}
                      </p>
                    </div>
                    {c.motivo && (
                      <p className="text-white/40 text-xs mb-3">{c.motivo}</p>
                    )}
                    <div className="flex gap-2 items-center mb-2">
                      <label className="text-white/40 text-xs">Días:</label>
                      <input
                        type="number"
                        value={diasCongelar[c.id] ?? 7}
                        onChange={(e) =>
                          setDiasCongelar({
                            ...diasCongelar,
                            [c.id]: e.target.value,
                          })
                        }
                        className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          aprobarCongelacion(c.id, diasCongelar[c.id] || 7)
                        }
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-400 text-ink text-sm font-semibold rounded-lg py-2"
                      >
                        <Check size={16} /> Aprobar
                      </button>
                      <button
                        onClick={() => rechazarCongelacion(c.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white/70 text-sm font-semibold rounded-lg py-2"
                      >
                        <X size={16} /> Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendientes.length > 0 && (
          <div className="mb-5" ref={refSolicitudes}>
            <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
              Solicitudes de registro ({pendientes.length})
            </p>
            <div className="grid md:grid-cols-2 gap-2">
              {pendientes.map((u) => (
                <div
                  key={u.id}
                  className="bg-cyan-brand/10 border border-cyan-brand/30 rounded-2xl p-4"
                >
                  <p className="text-white text-sm font-medium">{u.nombre}</p>
                  <p className="text-white/40 text-xs mb-3">
                    {formatearRut(u.rut)} · {u.correo} · {u.telefono}
                  </p>
                  {u.obs_salud && (
                    <p className="text-red-200/90 text-xs -mt-2 mb-3 whitespace-pre-line">
                      <span className="font-semibold">OBS:</span> {u.obs_salud}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrir('aprobar', u)}
                      className="flex-1 flex items-center justify-center gap-1 bg-cyan-brand text-ink text-sm font-semibold rounded-lg py-2"
                    >
                      <Check size={16} /> Aprobar
                    </button>
                    <button
                      onClick={() => abrir('rechazar', u)}
                      className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white/70 text-sm font-semibold rounded-lg py-2"
                    >
                      <X size={16} /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alumnos / Equipo */}
        <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-3 md:max-w-sm">
          {[
            {
              v: 'alumnos',
              t: `Alumnos (${todasLasFichas.length - totalEquipo})`,
            },
            { v: 'equipo', t: `Equipo (${totalEquipo})` },
          ].map((x) => (
            <button
              key={x.v}
              onClick={() => {
                setGrupo(x.v);
                setFiltro('todos');
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                grupo === x.v ? 'bg-cyan-brand text-ink' : 'text-white/50'
              }`}
            >
              {x.t}
            </button>
          ))}
        </div>

        {/* Resumen por estado (toca para filtrar) */}
        {grupo !== 'equipo' && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              {
                v: 'activo',
                t: 'Activos',
                c: 'text-cyan-brand',
                b: 'border-cyan-brand/40 bg-cyan-brand/10',
              },
              {
                v: 'por_vencer',
                t: 'Por vencer',
                c: 'text-yellow-200',
                b: 'border-yellow-400/40 bg-yellow-400/10',
              },
              {
                v: 'agotado',
                t: 'Agotados',
                c: 'text-orange-300',
                b: 'border-orange-400/40 bg-orange-400/10',
              },
              {
                v: 'vencido',
                t: 'Vencidos',
                c: 'text-red-300',
                b: 'border-red-500/40 bg-red-500/10',
              },
            ].map((x) => {
              const activo = filtro === x.v;
              return (
                <button
                  key={x.v}
                  onClick={() => setFiltro(activo ? 'todos' : x.v)}
                  className={`rounded-2xl border py-2.5 text-center transition-all active:scale-95 ${
                    activo ? x.b : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <p className={`font-display text-2xl leading-none ${x.c}`}>
                    {conteo[x.v] || 0}
                  </p>
                  <p className="text-white/50 text-[10px] mt-1">{x.t}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Búsqueda y filtros */}
        <div className="relative mb-2">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, RUT, email o teléfono"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <select
            value={planFiltro}
            onChange={(e) => setPlanFiltro(e.target.value)}
            aria-label="Filtrar por plan"
            className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-2 text-white text-xs outline-none focus:border-cyan-brand"
          >
            <option value="" className="bg-ink">
              Todos los planes
            </option>
            {planesOrdenados.map((p) => (
              <option key={p.id} value={p.id} className="bg-ink">
                {p.nombre}
              </option>
            ))}
            <option value="sin" className="bg-ink">
              Sin plan
            </option>
          </select>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            aria-label="Ordenar"
            className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-2 text-white text-xs outline-none focus:border-cyan-brand"
          >
            {ORDENES.map((o) => (
              <option key={o.valor} value={o.valor} className="bg-ink">
                Orden: {o.label}
              </option>
            ))}
          </select>
          <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-0.5 shrink-0">
            <button
              onClick={() => cambiarCompacta(true)}
              aria-label="Vista compacta"
              className={`px-2 py-1.5 rounded-lg ${
                compacta ? 'bg-cyan-brand text-ink' : 'text-white/50'
              }`}
            >
              <List size={15} />
            </button>
            <button
              onClick={() => cambiarCompacta(false)}
              aria-label="Vista detallada"
              className={`px-2 py-1.5 rounded-lg ${
                !compacta ? 'bg-cyan-brand text-ink' : 'text-white/50'
              }`}
            >
              <LayoutList size={15} />
            </button>
          </div>
        </div>

        <div
          className={`${
            grupo === 'equipo' ? 'hidden' : 'flex'
          } gap-1.5 overflow-x-auto pb-1 mb-4 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap`}
        >
          {FILTROS.filter((f) =>
            ['todos', 'sin_plan', 'inactivo'].includes(f.valor)
          )
            .filter((f) => f.valor !== 'inactivo' || conteo.inactivo)
            .map((f) => (
              <button
                key={f.valor}
                onClick={() => setFiltro(f.valor)}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  filtro === f.valor
                    ? 'bg-cyan-brand text-ink border-cyan-brand'
                    : 'bg-white/[0.04] text-white/60 border-white/10'
                }`}
              >
                {f.label}{' '}
                <span
                  className={
                    filtro === f.valor ? 'text-ink/70' : 'text-white/35'
                  }
                >
                  {conteo[f.valor] || 0}
                </span>
              </button>
            ))}
          {filtro !== 'todos' && !['sin_plan', 'inactivo'].includes(filtro) && (
            <span className="shrink-0 text-xs text-white/40 px-2 py-1.5">
              Filtrando:{' '}
              {(FILTROS.find((f) => f.valor === filtro) || {}).label ||
                'Por contactar'}
            </span>
          )}
        </div>

        {filtro === 'renovaciones' && (
          <p className="text-yellow-200/70 text-xs mb-3">
            Mostrando a quienes les toca pagar o renovar: vencidos, sin clases
            disponibles o por vencer.
          </p>
        )}

        {/* Lista */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl">
          <div
            className={`${
              compacta ? 'hidden' : 'hidden md:grid'
            } grid-cols-[2.2fr_1.6fr_1.1fr_1.1fr_1.1fr_72px] gap-3 px-4 py-3 border-b border-white/10 text-white/35 text-[11px] font-semibold uppercase tracking-wide`}
          >
            <span>Alumno</span>
            <span>Plan</span>
            <span>Clases</span>
            <span>Vigencia</span>
            <span>Estado</span>
            <span />
          </div>

          {visibles.length === 0 && (
            <p className="text-white/30 text-sm text-center py-10">
              No hay alumnos con estos filtros.
            </p>
          )}

          {visibles.map(({ u, info, visita }, i) => {
            const esYo = u.id === usuarioActual?.id;
            const mostrarRenovar =
              info.plan && PARA_RENOVAR.includes(info.clave);
            const ultimo = i === visibles.length - 1;
            return (
              <div
                key={u.id}
                onClick={() => navigate(`/usuarios/${u.id}`)}
                className={`relative px-4 ${
                  compacta ? 'py-2.5' : 'py-3'
                } cursor-pointer hover:bg-white/[0.03] transition-colors ${
                  ultimo ? '' : 'border-b border-white/[0.06]'
                } ${u.estado === 'inactivo' ? 'opacity-60' : ''}`}
              >
                {/* Vista compacta: una línea por alumno */}
                {compacta && (
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        PUNTO[info.clave]
                      }`}
                      title={ESTADOS[info.clave].label}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">
                        {u.nombre}
                        {u.rol === 'head_coach' && (
                          <span className="ml-1.5 text-cyan-brand/80 text-[10px] font-semibold uppercase">
                            Admin
                          </span>
                        )}
                        {u.rol === 'coach' && (
                          <span className="ml-1.5 text-cyan-brand/80 text-[10px] font-semibold uppercase">
                            Coach
                          </span>
                        )}
                      </p>
                      <p className="text-white/45 text-[11px] truncate">
                        {info.plan
                          ? `${
                              info.total === null
                                ? 'Ilimitado'
                                : `${Math.max(0, info.restantes)} clases`
                            } · ${
                              info.vence
                                ? info.diasRestantes <= 0
                                  ? 'vencido'
                                  : `vence ${fechaCorta(info.vence)}`
                                : 'sin pago'
                            } · `
                          : grupo === 'equipo'
                          ? ''
                          : 'Sin plan · '}
                        {grupo !== 'equipo' && (
                          <span className={colorVisita(visita)}>
                            {textoVisita(visita).toLowerCase()}
                          </span>
                        )}
                        {grupo === 'equipo' && (u.telefono || u.correo)}
                      </p>
                    </div>
                    <BotonWhatsapp telefono={u.telefono} chico />
                    <BotonMenu
                      u={u}
                      abierto={menuId === u.id}
                      setMenuId={setMenuId}
                    />
                  </div>
                )}

                {/* Escritorio: fila de tabla */}
                <div
                  className={`${
                    compacta ? 'hidden' : 'hidden md:grid'
                  } grid-cols-[2.2fr_1.6fr_1.1fr_1.1fr_1.1fr_72px] gap-3 items-center`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nombre={u.nombre} />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {u.nombre}
                        {u.rol === 'head_coach' && (
                          <span className="ml-1.5 text-cyan-brand/80 text-[10px] font-semibold uppercase">
                            Admin
                          </span>
                        )}
                        {u.rol === 'coach' && (
                          <span className="ml-1.5 text-cyan-brand/80 text-[10px] font-semibold uppercase">
                            Coach
                          </span>
                        )}
                      </p>
                      <p className="text-white/40 text-xs truncate">
                        {u.telefono || u.correo}
                        {grupo !== 'equipo' && (
                          <span className={colorVisita(visita)}>
                            {' '}
                            · {textoVisita(visita)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm truncate">
                    {info.plan?.nombre || (
                      <span className="text-white/30">Sin plan</span>
                    )}
                  </p>
                  <Clases info={info} />
                  <Vigencia info={info} />
                  <div>
                    <BadgeEstado clave={info.clave} sinPago={!info.vence} />
                    {mostrarRenovar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrir('cobrar', u);
                        }}
                        className="block text-cyan-brand text-xs font-semibold mt-1 hover:underline"
                      >
                        {info.vence ? 'Renovar' : 'Cobrar'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <BotonWhatsapp telefono={u.telefono} chico />
                    <BotonMenu
                      u={u}
                      abierto={menuId === u.id}
                      setMenuId={setMenuId}
                    />
                  </div>
                </div>

                {/* Celular: tarjeta */}
                <div className={compacta ? 'hidden' : 'md:hidden'}>
                  <div className="flex items-start gap-3">
                    <Avatar nombre={u.nombre} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {u.nombre}
                            {u.rol === 'head_coach' && (
                              <span className="ml-1.5 text-cyan-brand/80 text-[10px] font-semibold uppercase">
                                Admin
                              </span>
                            )}
                            {u.rol === 'coach' && (
                              <span className="ml-1.5 text-cyan-brand/80 text-[10px] font-semibold uppercase">
                                Coach
                              </span>
                            )}
                          </p>
                          <p className="text-white/40 text-xs truncate">
                            {info.plan?.nombre || 'Sin plan'}
                          </p>
                          {grupo !== 'equipo' && (
                            <p className={`text-[11px] ${colorVisita(visita)}`}>
                              {textoVisita(visita)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <BadgeEstado
                            clave={info.clave}
                            sinPago={!info.vence}
                          />
                          <BotonWhatsapp telefono={u.telefono} chico />
                          <BotonMenu
                            u={u}
                            abierto={menuId === u.id}
                            setMenuId={setMenuId}
                          />
                        </div>
                      </div>
                      {info.plan && (
                        <div className="flex items-end justify-between gap-3 mt-2">
                          <Clases info={info} />
                          <div className="text-right">
                            <Vigencia info={info} />
                          </div>
                        </div>
                      )}
                      {mostrarRenovar && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrir('cobrar', u);
                          }}
                          className="mt-2 w-full bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs font-semibold rounded-lg py-1.5"
                        >
                          {info.vence ? 'Renovar plan' : 'Cobrar primer pago'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menú de acciones */}
                {menuId === u.id && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(null);
                      }}
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-3 top-12 z-40 w-60 bg-ink border border-white/15 rounded-xl p-1 shadow-xl"
                    >
                      <ItemMenu
                        icono={UserCog}
                        onClick={() => navigate(`/usuarios/${u.id}`)}
                      >
                        Ver ficha del alumno
                      </ItemMenu>
                      <ItemMenu
                        icono={Pencil}
                        onClick={() => abrir('datos', u)}
                      >
                        Editar datos personales
                      </ItemMenu>
                      <ItemMenu
                        icono={KeyRound}
                        onClick={() => abrir('acceso', u)}
                      >
                        Acceso: correo y contraseña
                      </ItemMenu>
                      {info.plan && (
                        <ItemMenu
                          icono={CreditCard}
                          onClick={() => abrir('cobrar', u)}
                        >
                          {info.vence
                            ? 'Registrar pago / renovar'
                            : 'Cobrar primer pago'}
                        </ItemMenu>
                      )}
                      <ItemMenu icono={Layers} onClick={() => abrir('plan', u)}>
                        Cambiar o ajustar plan
                      </ItemMenu>
                      <ItemMenu
                        icono={Zap}
                        onClick={() => abrir('sesiones', u)}
                      >
                        Agregar o restar clases
                      </ItemMenu>
                      {!esYo && (
                        <>
                          <ItemMenu
                            icono={Shield}
                            onClick={() => abrir('rol', u)}
                          >
                            Cambiar rol (alumno, coach, admin)
                          </ItemMenu>
                          <div className="h-px bg-white/10 my-1" />
                          <ItemMenu
                            icono={u.estado === 'inactivo' ? UserCheck : UserX}
                            onClick={() => abrir('estado', u)}
                          >
                            {u.estado === 'inactivo'
                              ? 'Reactivar cuenta'
                              : 'Desactivar cuenta'}
                          </ItemMenu>
                          <ItemMenu
                            icono={Trash2}
                            peligro
                            onClick={() => abrir('eliminar', u)}
                          >
                            Eliminar
                          </ItemMenu>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Diálogos */}
      {dialogo?.tipo === 'cobrar' && (
        <Modal
          titulo={
            dialogo.usuario.fecha_ultima_renovacion
              ? 'Renovar plan'
              : 'Cobrar primer pago'
          }
          subtitulo={dialogo.usuario.nombre}
          onCerrar={() => setDialogo(null)}
        >
          <FormularioPago
            usuarioFijo={dialogo.usuario}
            soloRenovacion
            onCancelar={() => setDialogo(null)}
            onListo={() => setDialogo(null)}
          />
        </Modal>
      )}

      {dialogo?.tipo === 'plan' && (
        <DialogoPlan
          usuario={dialogo.usuario}
          planes={planesOrdenados}
          diasRenovacion={diasRenovacion}
          asignarPlan={asignarPlan}
          actualizarPerfil={actualizarPerfil}
          onCerrar={() => setDialogo(null)}
        />
      )}

      {dialogo?.tipo === 'sesiones' && (
        <DialogoSesiones
          usuario={dialogo.usuario}
          agregarSesionesExtra={agregarSesionesExtra}
          onCerrar={() => setDialogo(null)}
        />
      )}

      {dialogo?.tipo === 'estado' && (
        <Modal
          titulo={
            dialogo.usuario.estado === 'inactivo'
              ? 'Reactivar cuenta'
              : 'Desactivar cuenta'
          }
          subtitulo={dialogo.usuario.nombre}
          onCerrar={() => setDialogo(null)}
        >
          <p className="text-white/60 text-sm mb-4">
            {dialogo.usuario.estado === 'inactivo'
              ? 'Podrá volver a iniciar sesión y reservar clases.'
              : 'No podrá iniciar sesión ni reservar clases, pero su historial se conserva.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (dialogo.usuario.estado === 'inactivo')
                  reactivarUsuario(dialogo.usuario.id);
                else desactivarUsuario(dialogo.usuario.id);
                setDialogo(null);
              }}
              className={`flex-1 font-semibold rounded-lg py-2.5 text-sm ${
                dialogo.usuario.estado === 'inactivo'
                  ? 'bg-cyan-brand text-ink'
                  : 'bg-yellow-500/80 text-ink'
              }`}
            >
              Sí,{' '}
              {dialogo.usuario.estado === 'inactivo'
                ? 'reactivar'
                : 'desactivar'}
            </button>
            <button
              onClick={() => setDialogo(null)}
              className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {dialogo?.tipo === 'eliminar' && (
        <Modal
          titulo="Eliminar alumno"
          subtitulo={dialogo.usuario.nombre}
          onCerrar={() => setDialogo(null)}
        >
          <p className="text-white/60 text-sm mb-4">
            Se borra todo: su cuenta, reservas, pagos e historial, y su correo
            queda libre para registrarse de nuevo. Úsalo para registros hechos
            por error. Si fue alumno real y solo quieres que no pueda reservar,
            mejor usa “Desactivar cuenta”.
          </p>
          {errorEliminar && (
            <p className="text-red-400 text-sm mb-3">{errorEliminar}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => eliminarCuenta(dialogo.usuario.id)}
              disabled={eliminando}
              className="flex-1 bg-red-500/80 text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
            >
              {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
            <button
              onClick={() => setDialogo(null)}
              className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {dialogo?.tipo === 'aprobar' && (
        <DialogoAprobar
          usuario={dialogo.usuario}
          planes={planesOrdenados}
          asignarPlan={asignarPlan}
          aprobarUsuario={aprobarUsuario}
          onCerrar={() => setDialogo(null)}
        />
      )}

      {dialogo?.tipo === 'rechazar' && (
        <Modal
          titulo="Rechazar registro"
          subtitulo={dialogo.usuario.nombre}
          onCerrar={() => setDialogo(null)}
        >
          <p className="text-white/70 text-sm mb-4">
            Se borrará la solicitud y su cuenta. Si fue un error, la persona
            tendrá que registrarse de nuevo.
          </p>
          {errorEliminar && (
            <p className="text-red-400 text-sm mb-3">{errorEliminar}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => eliminarCuenta(dialogo.usuario.id)}
              disabled={eliminando}
              className="flex-1 bg-red-500/80 text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
            >
              {eliminando ? 'Rechazando...' : 'Sí, rechazar'}
            </button>
            <button
              onClick={() => setDialogo(null)}
              className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {dialogo?.tipo === 'rol' && (
        <Modal
          titulo="Cambiar rol"
          subtitulo={dialogo.usuario.nombre}
          onCerrar={() => setDialogo(null)}
        >
          <DialogoRol
            usuario={dialogo.usuario}
            onListo={() => setDialogo(null)}
          />
        </Modal>
      )}

      {dialogo?.tipo === 'acceso' && (
        <Modal
          titulo="Acceso a la app"
          subtitulo={dialogo.usuario.nombre}
          onCerrar={() => setDialogo(null)}
        >
          <DialogoAcceso usuario={dialogo.usuario} />
        </Modal>
      )}

      {dialogo?.tipo === 'datos' && (
        <DialogoDatos
          usuario={dialogo.usuario}
          actualizarPerfil={actualizarPerfil}
          onCerrar={() => setDialogo(null)}
        />
      )}

      {dialogo?.tipo === 'nuevo' && (
        <DialogoNuevo
          crearUsuarioConPassword={crearUsuarioConPassword}
          onCerrar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}

// ---------- Componentes auxiliares ----------

function BotonMenu({ u, abierto, setMenuId }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setMenuId(abierto ? null : u.id);
      }}
      className="text-white/40 p-1.5 rounded-lg hover:text-white hover:bg-white/5 justify-self-end"
      aria-label={`Acciones para ${u.nombre}`}
    >
      <MoreVertical size={18} />
    </button>
  );
}

function ItemMenu({ icono: Icono, onClick, peligro, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left hover:bg-white/5 ${
        peligro ? 'text-red-300' : 'text-white/80'
      }`}
    >
      <Icono size={15} className="shrink-0" /> {children}
    </button>
  );
}

// Aprobar un registro en un solo paso: plan + (opcional) primer pago
function DialogoAprobar({
  usuario,
  planes,
  asignarPlan,
  aprobarUsuario,
  onCerrar,
}) {
  const { usuarios } = useAuth();
  const [planId, setPlanId] = useState('');
  const [paso, setPaso] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const actualizado = usuarios.find((u) => u.id === usuario.id) || usuario;

  async function aprobar() {
    setGuardando(true);
    if (planId) await asignarPlan(usuario.id, planId);
    await aprobarUsuario(usuario.id);
    setGuardando(false);
    if (planId) setPaso(2);
    else onCerrar();
  }

  if (paso === 2) {
    return (
      <Modal
        titulo="Primer pago"
        subtitulo={`${usuario.nombre} · cuenta aprobada`}
        onCerrar={onCerrar}
      >
        <p className="text-white/50 text-xs mb-3">
          Registra su primer pago ahora, o hazlo después desde Renovaciones.
        </p>
        <FormularioPago
          usuarioFijo={{ ...actualizado, plan_id: planId }}
          soloRenovacion
          onCancelar={onCerrar}
          onListo={onCerrar}
        />
        <button
          onClick={onCerrar}
          className="w-full text-white/50 text-xs mt-3"
        >
          Lo registro después
        </button>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Aprobar registro"
      subtitulo={usuario.nombre}
      onCerrar={onCerrar}
    >
      <p className="text-white/40 text-xs mb-3">
        {formatearRut(usuario.rut)} · {usuario.correo} · {usuario.telefono}
      </p>
      {usuario.obs_salud && (
        <p className="bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2 text-red-100 text-xs mb-3 whitespace-pre-line">
          <span className="font-semibold">OBS:</span> {usuario.obs_salud}
        </p>
      )}
      <label className="text-white/40 text-xs mb-1 block">
        Plan que contrató
      </label>
      <select
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        className={`${inputClase} mb-1`}
      >
        <option value="" className="bg-ink">
          Asignar plan después
        </option>
        {planes.map((p) => (
          <option key={p.id} value={p.id} className="bg-ink">
            {p.nombre}
          </option>
        ))}
      </select>
      <p className="text-white/35 text-[11px] mb-4">
        Sin plan, el alumno podrá entrar a la app pero no reservar clases.
      </p>
      <div className="flex gap-2">
        <button
          onClick={aprobar}
          disabled={guardando}
          className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
        >
          {guardando ? 'Aprobando...' : planId ? 'Aprobar y cobrar' : 'Aprobar'}
        </button>
        <button
          onClick={onCerrar}
          className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

// Editar datos personales del alumno (el correo de acceso no se cambia desde aquí)
function DialogoDatos({ usuario, actualizarPerfil, onCerrar }) {
  const [form, setForm] = useState({
    nombre: usuario.nombre || '',
    rut: usuario.rut || '',
    telefono: usuario.telefono || '',
    fecha_nacimiento: usuario.fecha_nacimiento || '',
    nacionalidad: usuario.nacionalidad || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    if (!form.nombre.trim())
      return setError('El nombre no puede quedar vacío.');
    setGuardando(true);
    const r = await actualizarPerfil(usuario.id, {
      nombre: form.nombre.trim(),
      rut: form.rut.trim() || null,
      telefono: form.telefono.trim() || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      nacionalidad: form.nacionalidad.trim() || null,
    });
    setGuardando(false);
    if (r && r.ok === false) return setError(r.mensaje);
    onCerrar();
  }

  return (
    <Modal
      titulo="Datos personales"
      subtitulo={usuario.nombre}
      onCerrar={onCerrar}
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-white/40 text-xs mb-1 block">
            Nombre completo
          </label>
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className={inputClase}
          />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">RUT</label>
          <input
            value={form.rut}
            onChange={(e) => setForm({ ...form, rut: e.target.value })}
            className={inputClase}
          />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">Teléfono</label>
          <input
            value={form.telefono}
            onChange={(e) =>
              setForm({ ...form, telefono: formatearTelefono(e.target.value) })
            }
            className={inputClase}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-white/40 text-xs mb-1 block">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) =>
                setForm({ ...form, fecha_nacimiento: e.target.value })
              }
              className={inputClase}
            />
          </div>
          <div className="flex-1">
            <label className="text-white/40 text-xs mb-1 block">
              Nacionalidad
            </label>
            <input
              value={form.nacionalidad}
              onChange={(e) =>
                setForm({ ...form, nacionalidad: e.target.value })
              }
              className={inputClase}
            />
          </div>
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">
            Correo de acceso
          </label>
          <p className="text-white/70 text-sm">{usuario.correo}</p>
          <p className="text-white/30 text-[11px]">
            El correo con que inicia sesión no se puede cambiar desde aquí. Si
            está mal, se cambia en Supabase → Authentication → Users.
          </p>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={onCerrar}
            className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DialogoPlan({
  usuario,
  planes,
  diasRenovacion,
  asignarPlan,
  actualizarPerfil,
  onCerrar,
}) {
  const [planId, setPlanId] = useState(usuario.plan_id || '');
  const [dias, setDias] = useState(usuario.plan_dias_personalizado ?? '');
  const [monto, setMonto] = useState(usuario.plan_monto_personalizado ?? '');
  const [sesiones, setSesiones] = useState(
    usuario.plan_sesiones_personalizado ?? ''
  );
  const [guardando, setGuardando] = useState(false);
  const plan = planes.find((p) => p.id === planId);

  async function guardar() {
    setGuardando(true);
    if ((planId || '') !== (usuario.plan_id || ''))
      await asignarPlan(usuario.id, planId);
    await actualizarPerfil(usuario.id, {
      plan_dias_personalizado: dias === '' ? null : Number(dias),
      plan_monto_personalizado: monto === '' ? null : Number(monto),
      plan_sesiones_personalizado: sesiones === '' ? null : Number(sesiones),
    });
    setGuardando(false);
    onCerrar();
  }

  return (
    <Modal
      titulo="Plan del alumno"
      subtitulo={usuario.nombre}
      onCerrar={onCerrar}
    >
      <label className="text-white/40 text-xs mb-1 block">Plan</label>
      <select
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        className={`${inputClase} mb-1`}
      >
        <option value="" className="bg-ink">
          Sin plan asignado
        </option>
        {planes.map((p) => (
          <option key={p.id} value={p.id} className="bg-ink">
            {p.nombre}
          </option>
        ))}
      </select>
      {(planId || '') !== (usuario.plan_id || '') && (
        <p className="text-yellow-200/70 text-[11px] mb-2">
          Al cambiar de plan se reinician sus clases usadas.
        </p>
      )}

      <p className="text-white/40 text-xs mt-3 mb-2">
        Ajustes solo para este alumno (deja vacío para usar los del plan)
      </p>
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <label className="text-white/40 text-[11px] mb-1 block">
            Duración (días)
          </label>
          <input
            type="number"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            placeholder={String(plan?.duracion_dias || diasRenovacion)}
            className={inputClase}
          />
        </div>
        <div className="flex-1">
          <label className="text-white/40 text-[11px] mb-1 block">
            Monto ($)
          </label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder={plan ? String(plan.valor_con_iva) : '—'}
            className={inputClase}
          />
        </div>
        <div className="flex-1">
          <label className="text-white/40 text-[11px] mb-1 block">Clases</label>
          <input
            type="number"
            value={sesiones}
            onChange={(e) => setSesiones(e.target.value)}
            placeholder={
              !plan || plan.cantidad_sesiones === null
                ? 'Ilimitado'
                : String(plan.cantidad_sesiones)
            }
            className={inputClase}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={onCerrar}
          className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

function DialogoSesiones({ usuario, agregarSesionesExtra, onCerrar }) {
  const [cantidad, setCantidad] = useState('');
  const [mensaje, setMensaje] = useState(null);

  async function guardar() {
    if (cantidad === '' || Number(cantidad) === 0) return;
    const resultado = await agregarSesionesExtra(usuario.id, Number(cantidad));
    setMensaje(resultado);
    if (resultado.ok) setTimeout(onCerrar, 1200);
  }

  return (
    <Modal
      titulo="Agregar o restar clases"
      subtitulo={usuario.nombre}
      onCerrar={onCerrar}
    >
      <label className="text-white/40 text-xs mb-1 block">
        Cantidad (usa negativo para restar, ej: -2)
      </label>
      <input
        type="number"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        placeholder="Ej: 2"
        className={`${inputClase} mb-2`}
      />
      {usuario.sesiones_extra > 0 && (
        <p className="text-white/35 text-xs mb-2">
          Ya tiene {usuario.sesiones_extra} clase(s) extra acumulada(s).
        </p>
      )}
      {mensaje && (
        <p
          className={`text-xs mb-2 ${
            mensaje.ok ? 'text-cyan-brand' : 'text-red-400'
          }`}
        >
          {mensaje.mensaje}
        </p>
      )}
      <div className="flex gap-2 mt-2">
        <button
          onClick={guardar}
          className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm"
        >
          {Number(cantidad) < 0 ? 'Restar' : 'Agregar'}
        </button>
        <button
          onClick={onCerrar}
          className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

function DialogoNuevo({ crearUsuarioConPassword, onCerrar }) {
  const [form, setForm] = useState({
    nombre: '',
    rut: '',
    nacionalidad: '',
    fecha_nacimiento: '',
    telefono: '',
    correo: '',
  });
  const [password, setPassword] = useState('');
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function crear(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.rut.trim() || !form.correo.trim()) {
      return setMensaje({
        ok: false,
        mensaje: 'Completa al menos nombre, RUT y correo.',
      });
    }
    if (password.length < 6) {
      return setMensaje({
        ok: false,
        mensaje: 'La contraseña debe tener al menos 6 caracteres.',
      });
    }
    setCreando(true);
    const resultado = await crearUsuarioConPassword(form, password);
    setCreando(false);
    setMensaje(resultado);
    if (resultado.ok) setTimeout(onCerrar, 1300);
  }

  return (
    <Modal
      titulo="Agregar alumno"
      subtitulo="Para quienes no puedan registrarse solos desde la app"
      onCerrar={onCerrar}
    >
      <form onSubmit={crear} className="flex flex-col gap-2">
        <input
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Nombre completo"
          className={inputClase}
        />
        <input
          value={form.rut}
          onChange={(e) =>
            setForm({ ...form, rut: formatearRut(e.target.value) })
          }
          placeholder="RUT"
          className={inputClase}
        />
        <input
          value={form.nacionalidad}
          onChange={(e) => setForm({ ...form, nacionalidad: e.target.value })}
          placeholder="Nacionalidad"
          className={inputClase}
        />
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
            className={inputClase}
          />
        </div>
        <input
          value={form.telefono}
          onChange={(e) =>
            setForm({ ...form, telefono: formatearTelefono(e.target.value) })
          }
          placeholder="Teléfono"
          className={inputClase}
        />
        <input
          type="email"
          value={form.correo}
          onChange={(e) => setForm({ ...form, correo: e.target.value })}
          placeholder="Correo"
          className={inputClase}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña (mínimo 6 caracteres)"
          className={inputClase}
        />
        {mensaje && (
          <p
            className={`text-sm ${
              mensaje.ok ? 'text-cyan-brand' : 'text-red-400'
            }`}
          >
            {mensaje.mensaje}
          </p>
        )}
        <button
          type="submit"
          disabled={creando}
          className="bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50 mt-1"
        >
          {creando ? 'Creando...' : 'Crear alumno'}
        </button>
      </form>
    </Modal>
  );
}

// Revisa y arregla el acceso de un alumno: correo confirmado, correo de acceso y contraseña temporal.
function DialogoAcceso({ usuario }) {
  const { adminAcceso } = useAuth();
  const [info, setInfo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [clave, setClave] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [claveLista, setClaveLista] = useState(null);

  async function revisar() {
    setCargando(true);
    const r = await adminAcceso('estado', usuario.id);
    setCargando(false);
    if (r.ok) setInfo(r);
    else setMensaje({ ok: false, mensaje: r.mensaje });
  }

  useEffect(() => {
    revisar();
  }, []);

  async function ejecutar(accion, extra) {
    setTrabajando(true);
    setMensaje(null);
    const r = await adminAcceso(accion, usuario.id, extra);
    setTrabajando(false);
    setMensaje({ ok: r.ok, mensaje: r.ok ? r.mensaje : r.mensaje });
    if (r.ok && accion === 'clave') setClaveLista(extra.password);
    if (r.ok) revisar();
  }

  function sugerirClave() {
    const n = String(Math.floor(1000 + Math.random() * 9000));
    setClave(`Cedys${n}`);
  }

  const fecha = (iso) =>
    iso
      ? new Date(iso).toLocaleString('es-CL', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Nunca';

  if (cargando && !info)
    return <p className="text-white/50 text-sm py-4">Revisando su cuenta...</p>;

  return (
    <div className="flex flex-col gap-3">
      {info && (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl divide-y divide-white/5 text-sm">
          <div className="flex justify-between gap-3 px-3 py-2">
            <span className="text-white/45">Correo para entrar</span>
            <span className="text-white text-right break-all">
              {info.correo_acceso}
            </span>
          </div>
          <div className="flex justify-between gap-3 px-3 py-2">
            <span className="text-white/45">Correo confirmado</span>
            <span
              className={info.confirmado ? 'text-cyan-brand' : 'text-red-300'}
            >
              {info.confirmado ? 'Sí' : 'No'}
            </span>
          </div>
          <div className="flex justify-between gap-3 px-3 py-2">
            <span className="text-white/45">Último ingreso</span>
            <span className="text-white/80">{fecha(info.ultimo_ingreso)}</span>
          </div>
        </div>
      )}

      {info && !info.confirmado && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-3">
          <p className="text-red-100 text-sm">
            Su correo no está confirmado: por eso no puede entrar. Confírmalo tú
            y ya podrá ingresar con su contraseña.
          </p>
          <button
            onClick={() => ejecutar('confirmar')}
            disabled={trabajando}
            className="mt-2 w-full bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
          >
            Confirmar su correo
          </button>
        </div>
      )}

      {info?.correos_distintos && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3">
          <p className="text-yellow-100 text-sm">
            En su ficha dice <b>{info.correo_ficha}</b>, pero entra con{' '}
            <b>{info.correo_acceso}</b>. Si está usando el de la ficha, no podrá
            entrar.
          </p>
          <button
            onClick={() => ejecutar('corregir_correo')}
            disabled={trabajando}
            className="mt-2 w-full bg-yellow-300 text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
          >
            Que entre con {info.correo_ficha}
          </button>
        </div>
      )}

      {info && (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3">
          <p className="text-white text-sm font-semibold mb-1">
            Darle una contraseña temporal
          </p>
          <p className="text-white/45 text-xs mb-2">
            Para cuando no le llega el correo de recuperación. Después la puede
            cambiar en su Perfil.
          </p>
          <div className="flex gap-2">
            <input
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
            />
            <button
              onClick={sugerirClave}
              className="px-3 bg-white/10 text-white/80 rounded-lg text-xs shrink-0"
            >
              Sugerir
            </button>
          </div>
          <button
            onClick={() => ejecutar('clave', { password: clave })}
            disabled={trabajando || clave.length < 6}
            className="mt-2 w-full bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
          >
            {trabajando ? 'Guardando...' : 'Guardar contraseña temporal'}
          </button>
          {claveLista && usuario.telefono && (
            <a
              href={`https://wa.me/${numeroWhatsapp(
                usuario.telefono
              )}?text=${encodeURIComponent(
                `Hola ${
                  (usuario.nombre || '').split(' ')[0]
                }! Ya puedes entrar a la app de CED&S (cedys.cl) con tu correo ${
                  info.correo_acceso
                } y la contraseña temporal: ${claveLista} . Después cámbiala en Perfil → Mis datos y contraseña.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full flex items-center justify-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/40 text-[#7ee2a5] rounded-lg py-2 text-sm font-semibold"
            >
              <MessageCircle size={14} /> Enviarle los datos por WhatsApp
            </a>
          )}
        </div>
      )}

      {mensaje && (
        <p
          className={`text-sm ${
            mensaje.ok ? 'text-cyan-brand' : 'text-red-400'
          }`}
        >
          {mensaje.mensaje}
        </p>
      )}
    </div>
  );
}

// Cambia el rol de una persona: alumno, coach o admin.
function DialogoRol({ usuario, onListo }) {
  const { cambiarRol } = useAuth();
  const [rol, setRol] = useState(usuario.rol || 'usuario');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const OPCIONES = [
    {
      valor: 'usuario',
      titulo: 'Alumno',
      detalle: 'Reserva clases y ve su progreso.',
    },
    {
      valor: 'coach',
      titulo: 'Coach',
      detalle:
        'Ve sus clases, pasa asistencia y sigue a sus alumnos. También puede reservar como alumno.',
    },
    {
      valor: 'head_coach',
      titulo: 'Admin',
      detalle: 'Acceso total: pagos, finanzas, usuarios y configuración.',
    },
  ];

  async function guardar() {
    setGuardando(true);
    const r = await cambiarRol(usuario.id, rol);
    setGuardando(false);
    setMensaje(r);
    if (r.ok) setTimeout(onListo, 900);
  }

  return (
    <div className="flex flex-col gap-2">
      {OPCIONES.map((o) => (
        <button
          key={o.valor}
          onClick={() => setRol(o.valor)}
          className={`text-left rounded-xl border px-4 py-3 transition-colors ${
            rol === o.valor
              ? 'border-cyan-brand bg-cyan-brand/10'
              : 'border-white/10 bg-white/[0.03]'
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              rol === o.valor ? 'text-cyan-brand' : 'text-white'
            }`}
          >
            {o.titulo}{' '}
            {usuario.rol === o.valor && (
              <span className="text-white/40 font-normal">(actual)</span>
            )}
          </p>
          <p className="text-white/50 text-xs">{o.detalle}</p>
        </button>
      ))}
      {rol === 'head_coach' && usuario.rol !== 'head_coach' && (
        <p className="text-yellow-200/90 text-xs">
          Ojo: un admin puede ver y cambiar todo (pagos, alumnos,
          configuración). Dale este rol solo a personas de confianza.
        </p>
      )}
      {mensaje && (
        <p
          className={`text-sm ${
            mensaje.ok ? 'text-cyan-brand' : 'text-red-400'
          }`}
        >
          {mensaje.mensaje}
        </p>
      )}
      <button
        onClick={guardar}
        disabled={guardando || rol === usuario.rol}
        className="mt-1 w-full bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-40"
      >
        {guardando ? 'Guardando...' : 'Guardar rol'}
      </button>
    </div>
  );
}
