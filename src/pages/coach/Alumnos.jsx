import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CargasRutina from '../../components/CargasRutina';
import { fechaVenceDe } from '../../lib/ingresos';
import { numeroWhatsapp } from '../../lib/seguimiento';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Dumbbell,
  Upload,
  Search,
  Phone,
  AlertTriangle,
  Check,
  HeartPulse,
  Ruler,
  MessageCircle,
  CalendarClock,
  TrendingUp,
  BellRing,
  UserX,
  ClipboardX,
  Hourglass,
} from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');
function isoLocal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function soloDigitos(s) {
  return String(s || '').replace(/\D/g, '');
}

function diasEntre(desdeISO, hastaISO) {
  return Math.round(
    (Date.parse(hastaISO + 'T12:00:00') - Date.parse(desdeISO + 'T12:00:00')) /
      86400000
  );
}

function Avatar({ u, tam = 'w-10 h-10', texto = 'text-sm' }) {
  return (
    <div
      className={`${tam} rounded-full bg-cyan-brand/15 border border-cyan-brand/40 flex items-center justify-center shrink-0 overflow-hidden`}
    >
      {u.foto_url ? (
        <img src={u.foto_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className={`font-display text-cyan-brand ${texto}`}>
          {(u.nombre || '?').charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function Alumnos() {
  const {
    usuarioActual,
    horarios,
    usuarios,
    reservas,
    rutinaActivaDe,
    coachDeClase,
    registrosPeso,
    planesSeguimiento,
    mediciones,
  } = useAuth();
  const [abierto, setAbierto] = useState(null);
  const [alcance, setAlcance] = useState('mios'); // mios | todos
  const [filtro, setFiltro] = useState('todos'); // todos | obs | sin_rutina | seguimiento
  const [busqueda, setBusqueda] = useState('');
  const [verTodasAlertas, setVerTodasAlertas] = useState(false);
  // Persona abierta desde "Vienen a mis clases" aunque no esté en la lista (ej: un coach que reservó, o pendiente)
  const [forzado, setForzado] = useState(null);
  const location = useLocation();

  // Desde el buscador de arriba: /alumnos?ver=ID abre la ficha de ese alumno
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('ver');
    if (!id) return;
    const u = usuarios.find((x) => String(x.id) === id);
    if (u) {
      setAlcance('todos');
      setBusqueda(u.nombre || '');
      setAbierto(u.id);
    }
  }, [location.search]);

  const hoy = isoLocal(new Date());
  const manana = isoLocal(new Date(Date.now() + 86400000));
  const horarioDe = {};
  for (const h of horarios) horarioDe[h.id] = h;
  const usuarioDe = {};
  for (const u of usuarios) usuarioDe[u.id] = u;

  // "Mis alumnos": los que han reservado alguna clase que yo hice o haré
  const misAlumnosIds = new Set(
    reservas
      .filter((r) => {
        const h = horarioDe[r.horario_id];
        return h && coachDeClase(h, r.fecha).id === usuarioActual.id;
      })
      .map((r) => r.usuario_id)
      .filter((id) => id !== usuarioActual.id)
  );

  // Alumnos = usuarios normales + coaches/admin que también entrenan (tienen alguna reserva). No me incluye a mí.
  const conReservas = new Set(reservas.map((r) => r.usuario_id));
  const esStaff = (u) => u.rol === 'coach' || u.rol === 'head_coach';
  const todosLosAlumnos = usuarios.filter(
    (u) =>
      u.id !== usuarioActual.id &&
      u.estado !== 'pendiente' &&
      (u.rol === 'usuario' || (esStaff(u) && conReservas.has(u.id)))
  );
  const enAlcance = todosLosAlumnos.filter((u) =>
    alcance === 'mios' ? misAlumnosIds.has(u.id) : true
  );

  function abrirFicha(id) {
    setBusqueda('');
    setFiltro('todos');
    if (!misAlumnosIds.has(id)) setAlcance('todos');
    setForzado(id);
    setAbierto(id);
    setTimeout(
      () =>
        document
          .getElementById(`alumno-${id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      60
    );
  }

  // 1) Vienen a mis clases (hoy y mañana)
  const vienen = [hoy, manana].map((fecha) => {
    const clases = {};
    for (const r of reservas) {
      if (r.fecha !== fecha || r.estado !== 'confirmada') continue;
      const h = horarioDe[r.horario_id];
      if (!h || coachDeClase(h, fecha).id !== usuarioActual.id) continue;
      const u = usuarioDe[r.usuario_id];
      if (!u) continue;
      (clases[h.hora] = clases[h.hora] || []).push(u);
    }
    return {
      fecha,
      etiqueta: fecha === hoy ? 'Hoy' : 'Mañana',
      clases: Object.entries(clases).sort((a, b) => a[0].localeCompare(b[0])),
    };
  });

  // 2) Necesitan atención
  const ultimaVisita = {};
  for (const r of reservas) {
    // Cuenta como visita: clase pasada a la que no faltó, o clase de hoy ya marcada como presente
    const fue = r.asistio === true || (r.fecha < hoy && r.asistio !== false);
    if (fue && r.fecha <= hoy && r.estado === 'confirmada') {
      if (!ultimaVisita[r.usuario_id] || r.fecha > ultimaVisita[r.usuario_id])
        ultimaVisita[r.usuario_id] = r.fecha;
    }
  }
  const tieneProxima = new Set(
    reservas
      .filter((r) => r.fecha >= hoy && r.estado === 'confirmada')
      .map((r) => r.usuario_id)
  );
  const conSeguimiento = new Set(
    (planesSeguimiento || []).map((p) => String(p.usuario_id))
  );
  const ultimaMedicion = {};
  for (const m of mediciones || []) {
    const k = String(m.usuario_id);
    if (!ultimaMedicion[k] || m.fecha > ultimaMedicion[k])
      ultimaMedicion[k] = m.fecha;
  }

  const alertas = [];
  for (const u of enAlcance) {
    if (u.estado !== 'activo') continue;
    if (esStaff(u) && !u.plan_id) continue; // a un coach sin plan no le marcamos alertas
    const rutina = rutinaActivaDe(u.id);
    if (!rutina) {
      alertas.push({
        u,
        tipo: 'sin_rutina',
        icono: ClipboardX,
        texto: 'No tiene rutina asignada',
        color: 'text-violet-300 bg-violet-400/15',
      });
    } else if (
      rutina.fecha_asignacion &&
      diasEntre(rutina.fecha_asignacion, hoy) >= 42
    ) {
      alertas.push({
        u,
        tipo: 'rutina_larga',
        icono: Hourglass,
        texto: `Misma rutina hace ${Math.floor(
          diasEntre(rutina.fecha_asignacion, hoy) / 7
        )} semanas`,
        color: 'text-amber-300 bg-amber-400/15',
      });
    }
    const ultima = ultimaVisita[u.id];
    const diasSin = ultima ? diasEntre(ultima, hoy) : null;
    if (diasSin !== null && diasSin >= 10 && !tieneProxima.has(u.id)) {
      alertas.push({
        u,
        tipo: 'sin_venir',
        icono: UserX,
        texto: `No viene hace ${diasSin} días`,
        color: 'text-red-300 bg-red-500/15',
      });
    }
    if (conSeguimiento.has(String(u.id))) {
      const um = ultimaMedicion[String(u.id)];
      const dm = um ? diasEntre(um, hoy) : null;
      if (dm === null || dm >= 30) {
        alertas.push({
          u,
          tipo: 'medicion',
          icono: Ruler,
          texto:
            dm === null
              ? 'Falta su primera medición'
              : `Última medición hace ${dm} días`,
          color: 'text-cyan-brand bg-cyan-brand/15',
        });
      }
    }
  }
  const alertasVisibles = verTodasAlertas ? alertas : alertas.slice(0, 4);

  // 3) Avances recientes (últimos 7 días, subió peso)
  const hace7 = isoLocal(new Date(Date.now() - 7 * 86400000));
  const idsAlcance = new Set(enAlcance.map((u) => u.id));
  const avances = (registrosPeso || [])
    .filter(
      (r) =>
        idsAlcance.has(r.usuario_id) &&
        (r.creado_en || '').slice(0, 10) >= hace7 &&
        r.peso_anterior !== null &&
        r.peso_anterior !== undefined &&
        Number(r.peso) > Number(r.peso_anterior)
    )
    .sort((a, b) => (b.creado_en || '').localeCompare(a.creado_en || ''))
    .slice(0, 6);

  // 4) Lista con filtros
  const texto = busqueda.trim().toLowerCase();
  const baseLista =
    forzado && !enAlcance.some((u) => u.id === forzado) && usuarioDe[forzado]
      ? [...enAlcance, usuarioDe[forzado]]
      : enAlcance;
  const alumnos = baseLista
    .filter((u) => !texto || (u.nombre || '').toLowerCase().includes(texto))
    .filter((u) => {
      if (filtro === 'obs') return !!(u.obs_salud || '').trim();
      if (filtro === 'sin_rutina') return !rutinaActivaDe(u.id);
      if (filtro === 'seguimiento') return conSeguimiento.has(String(u.id));
      return true;
    })
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  const kg = (n) => String(Math.round(Number(n) * 100) / 100).replace('.', ',');

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white leading-tight">Alumnos</p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        Quién viene, quién necesita algo y cómo van
      </p>

      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-5">
        {[
          { valor: 'mios', label: `Mis alumnos (${misAlumnosIds.size})` },
          { valor: 'todos', label: 'Todos' },
        ].map((op) => (
          <button
            key={op.valor}
            onClick={() => setAlcance(op.valor)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              alcance === op.valor ? 'bg-cyan-brand text-ink' : 'text-white/50'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* 1) Vienen a mis clases */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-4 mb-5">
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl pointer-events-none" />
        <p className="relative flex items-center gap-1.5 text-cyan-brand text-[11px] font-semibold tracking-[0.15em] uppercase mb-3">
          <CalendarClock size={13} /> Vienen a mis clases
        </p>
        <div className="relative flex flex-col gap-3">
          {vienen.map((d) => (
            <div key={d.fecha}>
              <p className="text-white/50 text-xs mb-1.5">{d.etiqueta}</p>
              {d.clases.length === 0 ? (
                <p className="text-white/30 text-sm">
                  Nadie reservado todavía.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {d.clases.map(([hora, lista]) => (
                    <div key={hora} className="flex items-start gap-3">
                      <span className="font-display text-lg text-white w-14 shrink-0 leading-7">
                        {hora.slice(0, 5)}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {lista.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => abrirFicha(u.id)}
                            className={`flex items-center gap-1 rounded-full pl-1 pr-2.5 py-1 text-xs border transition-transform active:scale-95 ${
                              (u.obs_salud || '').trim()
                                ? 'bg-red-500/10 border-red-400/30 text-red-100'
                                : 'bg-white/[0.06] border-white/10 text-white/80'
                            }`}
                          >
                            <Avatar u={u} tam="w-5 h-5" texto="text-[10px]" />
                            {(u.nombre || '').split(' ')[0]}
                            {(u.obs_salud || '').trim() && (
                              <HeartPulse size={11} className="text-red-300" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="relative text-white/30 text-[11px] mt-3 flex items-center gap-1">
          <HeartPulse size={11} className="text-red-300" /> = tiene OBS de
          salud. Toca un nombre para ver su ficha.
        </p>
      </div>

      {/* 2) Necesitan atención */}
      {alertas.length > 0 && (
        <div className="mb-5">
          <p className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-wide mb-2">
            <BellRing size={13} /> Necesitan atención ({alertas.length})
          </p>
          <div className="flex flex-col gap-2">
            {alertasVisibles.map((al, i) => {
              const Icono = al.icono;
              return (
                <button
                  key={`${al.u.id}_${al.tipo}_${i}`}
                  onClick={() => abrirFicha(al.u.id)}
                  className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-3 text-left transition-transform active:scale-[0.98]"
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${al.color}`}
                  >
                    <Icono size={17} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-white text-sm truncate">
                      {al.u.nombre}
                    </span>
                    <span className="block text-white/45 text-xs truncate">
                      {al.texto}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-white/30 shrink-0" />
                </button>
              );
            })}
          </div>
          {alertas.length > 4 && (
            <button
              onClick={() => setVerTodasAlertas(!verTodasAlertas)}
              className="w-full text-cyan-brand text-sm font-medium py-2.5"
            >
              {verTodasAlertas ? 'Ver menos' : `Ver las ${alertas.length}`}
            </button>
          )}
        </div>
      )}

      {/* 3) Avances recientes */}
      {avances.length > 0 && (
        <div className="mb-5">
          <p className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-wide mb-2">
            <TrendingUp size={13} /> Avances de la semana 🎉
          </p>
          <div
            className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {avances.map((r) => {
              const u = usuarioDe[r.usuario_id];
              if (!u) return null;
              const pct = Math.round(
                ((Number(r.peso) - Number(r.peso_anterior)) /
                  Number(r.peso_anterior)) *
                  100
              );
              return (
                <button
                  key={r.id}
                  onClick={() => abrirFicha(u.id)}
                  className="shrink-0 w-[150px] bg-green-400/[0.06] border border-green-400/20 rounded-2xl p-3 text-left transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <Avatar u={u} tam="w-7 h-7" texto="text-xs" />
                    <span className="text-white text-sm truncate">
                      {(u.nombre || '').split(' ')[0]}
                    </span>
                  </div>
                  <p className="text-white/55 text-xs mt-2 truncate">
                    {r.ejercicio}
                  </p>
                  <p className="text-green-300 text-sm font-semibold mt-0.5">
                    +{kg(Number(r.peso) - Number(r.peso_anterior))} kg{' '}
                    <span className="text-green-300/60 text-xs font-normal">
                      ({pct > 0 ? '+' : ''}
                      {pct}%)
                    </span>
                  </p>
                  <p className="text-white/35 text-[11px]">
                    {kg(r.peso_anterior)} → {kg(r.peso)} kg
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4) Lista con filtros */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
        Lista de alumnos
      </p>
      <div className="relative mb-3">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
        />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar alumno por nombre"
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
        />
      </div>
      <div
        className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1 mb-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {[
          { valor: 'todos', label: 'Todos' },
          { valor: 'obs', label: 'Con OBS de salud' },
          { valor: 'sin_rutina', label: 'Sin rutina' },
          { valor: 'seguimiento', label: 'Con seguimiento' },
        ].map((op) => (
          <button
            key={op.valor}
            onClick={() => setFiltro(op.valor)}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filtro === op.valor
                ? 'bg-cyan-brand border-cyan-brand text-ink'
                : 'bg-white/[0.04] border-white/10 text-white/60'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {alumnos.length === 0 && (
        <p className="text-white/40 text-sm">
          {texto
            ? 'No hay alumnos con ese nombre.'
            : filtro !== 'todos'
            ? 'Ningún alumno en este filtro.'
            : alcance === 'mios'
            ? 'Todavía no tienes alumnos en tus clases. Revisa "Todos".'
            : 'No hay alumnos registrados.'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {alumnos.map((a) => {
          const abiertoAqui = abierto === a.id;
          const rutinaActiva = rutinaActivaDe(a.id);
          const ultima = ultimaVisita[a.id];
          const diasSin = ultima ? diasEntre(ultima, hoy) : null;
          const wsp = numeroWhatsapp(a.telefono);
          return (
            <div
              key={a.id}
              id={`alumno-${a.id}`}
              className={`bg-white/[0.04] border rounded-2xl overflow-hidden scroll-mt-4 ${
                abiertoAqui ? 'border-cyan-brand/30' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-2 pr-2">
                <button
                  onClick={() => setAbierto(abiertoAqui ? null : a.id)}
                  className="flex-1 min-w-0 flex items-center gap-3 p-3 text-left"
                >
                  <Avatar u={a} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate flex items-center gap-1.5">
                      {a.nombre}
                      {esStaff(a) && (
                        <span className="text-[10px] font-semibold bg-white/10 text-white/60 rounded px-1.5 py-0.5 shrink-0">
                          {a.rol === 'head_coach' ? 'Admin' : 'Coach'}
                        </span>
                      )}
                      {(a.obs_salud || '').trim() && (
                        <HeartPulse
                          size={13}
                          className="text-red-300 shrink-0"
                        />
                      )}
                    </p>
                    <p className="text-white/40 text-xs truncate">
                      {rutinaActiva ? rutinaActiva.nombre : 'Sin rutina'}
                      {' · '}
                      {diasSin === null
                        ? 'sin clases aún'
                        : diasSin === 0
                        ? 'vino hoy'
                        : `vino hace ${diasSin} d`}
                    </p>
                  </div>
                </button>
                {wsp && (
                  <a
                    href={`https://wa.me/${wsp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0 transition-transform active:scale-90"
                    aria-label={`WhatsApp a ${a.nombre}`}
                  >
                    <MessageCircle size={16} />
                  </a>
                )}
                <button
                  onClick={() => setAbierto(abiertoAqui ? null : a.id)}
                  className="p-1.5 text-white/40"
                  aria-label="Ver ficha"
                >
                  {abiertoAqui ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>
              </div>
              {abiertoAqui && <FichaAlumno alumno={a} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Ficha del alumno para el coach: contacto, plan, asistencia, observaciones, rutina y cargas.
// Cada alumno tiene su propio estado (no se mezclan formularios entre alumnos).
function FichaAlumno({ alumno }) {
  const navigate = useNavigate();
  const {
    planes,
    diasRenovacion,
    reservas,
    sesionesRestantes,
    registrosPeso,
    rutinas,
    usuarioRutinas,
    usuarios,
    crearRutina,
    importarContenidoRutina,
    asignarRutina,
    rutinaActivaDe,
    historialRutinasDe,
    observacionDe,
    guardarObservacion,
    diasRutinaHechos = [],
    horarios,
  } = useAuth();

  // Últimos días de rutina que completó (con la clase de ese día)
  const rutinaReciente = diasRutinaHechos
    .filter((d) => String(d.usuario_id) === String(alumno.id))
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        String(b.creado_en).localeCompare(String(a.creado_en))
    )
    .slice(0, 5)
    .map((d) => {
      const reserva = d.reserva_id
        ? reservas.find((r) => String(r.id) === String(d.reserva_id))
        : null;
      const h = reserva
        ? (horarios || []).find((x) => x.id === reserva.horario_id)
        : null;
      return { ...d, hora: h?.hora?.slice(0, 5) || null };
    });

  const plan = alumno.plan_id ? planes[alumno.plan_id] : null;
  const vence = plan ? fechaVenceDe(alumno, planes, diasRenovacion) : null;
  const restantes = sesionesRestantes(alumno);
  const rutinaActiva = rutinaActivaDe(alumno.id);
  const historial = historialRutinasDe(alumno.id).filter((h) => !h.activa);

  // Asistencia de los últimos 30 días
  const hoy = isoLocal(new Date());
  const hace30 = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoLocal(d);
  })();
  const pasadas = reservas.filter(
    (r) => r.usuario_id === alumno.id && r.fecha >= hace30 && r.fecha <= hoy
  );
  const asistio = pasadas.filter((r) => r.asistio === true).length;
  const falto = pasadas.filter((r) => r.asistio === false).length;

  const [obs, setObs] = useState(observacionDe(alumno.id));
  const [editandoObs, setEditandoObs] = useState(false);
  const [msgObs, setMsgObs] = useState(null);

  const [modo, setModo] = useState('seleccionar'); // seleccionar | importar
  const [seleccion, setSeleccion] = useState('');
  const [msgRutina, setMsgRutina] = useState(null);
  const [importForm, setImportForm] = useState({
    nombre: '',
    link: '',
    archivo: null,
  });
  const [importando, setImportando] = useState(false);

  // Rutinas para asignar: sin repetir nombres confusos (se indica de quién es cada una)
  const duenoDe = (rutinaId) => {
    const asign = (usuarioRutinas || []).find(
      (ur) => ur.rutina_id === rutinaId && ur.activa
    );
    return asign
      ? usuarios.find((u) => u.id === asign.usuario_id)?.nombre
      : null;
  };
  const opcionesRutina = [...rutinas]
    .sort((x, y) => (x.nombre || '').localeCompare(y.nombre || ''))
    .map((r) => {
      const dueno = duenoDe(r.id);
      return {
        id: r.id,
        etiqueta: dueno ? `${r.nombre} (de ${dueno.split(' ')[0]})` : r.nombre,
      };
    });

  async function guardarObs() {
    const r = await guardarObservacion(alumno.id, obs);
    setMsgObs(r);
    if (r.ok) setEditandoObs(false);
  }

  async function handleAsignar() {
    if (!seleccion)
      return setMsgRutina({ ok: false, mensaje: 'Elige una rutina.' });
    await asignarRutina(alumno.id, seleccion);
    const nombre = rutinas.find((r) => r.id === seleccion)?.nombre;
    setMsgRutina({ ok: true, mensaje: `Rutina "${nombre}" asignada.` });
    setSeleccion('');
  }

  async function handleImportar() {
    if (!importForm.nombre.trim() || !importForm.archivo) {
      return setMsgRutina({
        ok: false,
        mensaje: 'Ponle un nombre a la rutina y elige el archivo Excel.',
      });
    }
    setImportando(true);
    setMsgRutina(null);
    try {
      const { leerArchivoExcel } = await import('../../lib/excelRutinaParser');
      const datosSemanas = await leerArchivoExcel(importForm.archivo);
      if (Object.keys(datosSemanas).length === 0) {
        setMsgRutina({
          ok: false,
          mensaje: 'No encontré hojas con formato "Semana X" en ese archivo.',
        });
        setImportando(false);
        return;
      }
      const nueva = await crearRutina(
        importForm.nombre.trim(),
        importForm.link.trim()
      );
      await importarContenidoRutina(nueva.id, datosSemanas);
      await asignarRutina(alumno.id, nueva.id);
      setMsgRutina({
        ok: true,
        mensaje: `Rutina importada con ${
          Object.keys(datosSemanas).length
        } semana(s) y asignada.`,
      });
      setImportForm({ nombre: '', link: '', archivo: null });
      setModo('seleccionar');
    } catch {
      setMsgRutina({
        ok: false,
        mensaje: 'No pude leer ese archivo. Revisa que sea un .xlsx válido.',
      });
    }
    setImportando(false);
  }

  const campo =
    'bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand';

  return (
    <div className="border-t border-white/10 p-4 flex flex-col gap-5">
      {/* Seguimiento personal (objetivo, mediciones y avance) */}
      <button
        onClick={() => navigate(`/seguimiento-personal/${alumno.id}`)}
        className="w-full flex items-center justify-between bg-cyan-brand/10 border border-cyan-brand/40 rounded-xl px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-white text-sm font-medium">
          <Ruler size={16} className="text-cyan-brand" /> Seguimiento personal
        </span>
        <span className="text-cyan-brand text-xs shrink-0">Ver →</span>
      </button>

      {/* Contacto y plan */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/20 rounded-xl px-3 py-2">
          <p className="text-white/35 text-[10px] uppercase tracking-wide">
            Plan
          </p>
          <p className="text-white text-sm">{plan?.nombre || 'Sin plan'}</p>
          <p className="text-white/45 text-[11px]">
            {restantes !== null
              ? `${restantes} sesiones disponibles`
              : plan
              ? 'Ilimitado'
              : ''}
          </p>
          {vence && (
            <p className="text-white/45 text-[11px]">
              Vence {formatearFecha(vence)}
            </p>
          )}
        </div>
        <div className="bg-black/20 rounded-xl px-3 py-2">
          <p className="text-white/35 text-[10px] uppercase tracking-wide">
            Últimos 30 días
          </p>
          <p className="text-white text-sm">
            {asistio} clase{asistio !== 1 ? 's' : ''} asistida
            {asistio !== 1 ? 's' : ''}
          </p>
          <p className="text-white/45 text-[11px]">
            {falto} falta{falto !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      {alumno.telefono && (
        <div className="flex gap-2 -mt-3">
          <a
            href={`tel:${soloDigitos(alumno.telefono)}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-lg py-2 text-white/80 text-xs"
          >
            <Phone size={13} /> Llamar
          </a>
          <a
            href={`https://wa.me/${soloDigitos(alumno.telefono)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/40 rounded-lg py-2 text-[#7ee2a5] text-xs"
          >
            WhatsApp
          </a>
        </div>
      )}

      {/* Días de rutina que completó */}
      <div className="bg-black/20 rounded-xl px-3 py-2.5">
        <p className="text-white/35 text-[10px] uppercase tracking-wide mb-1">
          Rutina hecha (últimos días)
        </p>
        {rutinaReciente.length === 0 ? (
          <p className="text-white/45 text-xs">
            Aún no marca días de rutina como completados en la app.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {rutinaReciente.map((d) => (
              <p
                key={d.id}
                className="text-xs flex items-center justify-between gap-2"
              >
                <span className="text-white/85 truncate">
                  {d.semana_numero ? `Sem ${d.semana_numero} · ` : ''}
                  {d.dia_nombre || 'Día'}
                </span>
                <span className="text-white/45 shrink-0">
                  {formatearFecha(d.fecha)}
                  {d.hora ? ` · ${d.hora}` : ''}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* OBS que escribió el propio alumno (enfermedad, lesión, etc.) */}
      {alumno.obs_salud && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-3 py-2.5">
          <p className="text-red-200/80 text-[10px] uppercase tracking-wide flex items-center gap-1.5 mb-0.5">
            <HeartPulse size={12} /> OBS del alumno
          </p>
          <p className="text-white/90 text-sm whitespace-pre-line">
            {alumno.obs_salud}
          </p>
        </div>
      )}

      {/* Observaciones (solo coaches y admin) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-white/40 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle size={12} /> Observaciones
          </p>
          {!editandoObs && (
            <button
              onClick={() => setEditandoObs(true)}
              className="text-cyan-brand text-xs"
            >
              {obs ? 'Editar' : 'Agregar'}
            </button>
          )}
        </div>
        {editandoObs ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              placeholder="Ej: dolor de rodilla, evitar sentadilla profunda."
              className={campo + ' resize-none'}
            />
            <div className="flex gap-2">
              <button
                onClick={guardarObs}
                className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-xs"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setObs(observacionDe(alumno.id));
                  setEditandoObs(false);
                }}
                className="flex-1 bg-white/10 text-white rounded-lg py-2 text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`text-sm ${
              obs ? 'text-orange-100/90' : 'text-white/30'
            }`}
          >
            {obs || 'Sin observaciones. Solo las ven los coaches y el admin.'}
          </p>
        )}
        {msgObs && !editandoObs && msgObs.ok && (
          <p className="text-cyan-brand text-xs mt-1">{msgObs.mensaje}</p>
        )}
        {msgObs && !msgObs.ok && (
          <p className="text-red-400 text-xs mt-1">{msgObs.mensaje}</p>
        )}
      </div>

      {/* Rutina */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
          Rutina actual
        </p>
        {rutinaActiva ? (
          <button
            onClick={() => navigate(`/rutinas/${rutinaActiva.id}`)}
            className="w-full flex items-center gap-2 bg-cyan-brand/10 border border-cyan-brand/30 rounded-lg px-3 py-2"
          >
            <Dumbbell size={16} className="text-cyan-brand" />
            <div className="text-left flex-1">
              <p className="text-white text-sm">{rutinaActiva.nombre}</p>
              <p className="text-white/40 text-xs">
                desde {formatearFecha(rutinaActiva.fecha_asignacion)}
              </p>
            </div>
            <ChevronRight size={16} className="text-cyan-brand/60" />
          </button>
        ) : (
          <p className="text-white/30 text-sm">Sin rutina asignada.</p>
        )}
      </div>

      <div>
        <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
          Asignar rutina
        </p>
        {modo === 'seleccionar' ? (
          <div className="flex gap-2">
            <select
              value={seleccion}
              onChange={(e) => {
                setSeleccion(e.target.value);
                setMsgRutina(null);
              }}
              className={campo + ' flex-1 min-w-0'}
            >
              <option value="">Selecciona una rutina</option>
              {opcionesRutina.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.etiqueta}
                </option>
              ))}
            </select>
            <button
              onClick={handleAsignar}
              className="bg-cyan-brand text-ink font-semibold rounded-lg px-4 text-sm"
            >
              Asignar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 bg-black/20 border border-white/10 rounded-lg p-3">
            <input
              value={importForm.nombre}
              onChange={(e) =>
                setImportForm({ ...importForm, nombre: e.target.value })
              }
              placeholder="Nombre de la rutina"
              className={campo}
            />
            <input
              value={importForm.link}
              onChange={(e) =>
                setImportForm({ ...importForm, link: e.target.value })
              }
              placeholder="Link de Google Sheets (opcional, solo referencia)"
              className={campo}
            />
            <label className="flex items-center justify-center gap-2 bg-white/5 border border-dashed border-white/20 rounded-lg py-3 text-sm text-white/60 cursor-pointer">
              <Upload size={15} />
              {importForm.archivo
                ? importForm.archivo.name
                : 'Elegir archivo Excel (.xlsx)'}
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) =>
                  setImportForm({ ...importForm, archivo: e.target.files[0] })
                }
                className="hidden"
              />
            </label>
            <button
              onClick={handleImportar}
              disabled={importando}
              className="bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
            >
              {importando ? 'Importando...' : 'Importar y asignar'}
            </button>
          </div>
        )}
        {msgRutina && (
          <p
            className={`text-xs mt-2 flex items-center gap-1 ${
              msgRutina.ok ? 'text-cyan-brand' : 'text-red-400'
            }`}
          >
            {msgRutina.ok && <Check size={12} />} {msgRutina.mensaje}
          </p>
        )}
        <button
          onClick={() => {
            setModo(modo === 'importar' ? 'seleccionar' : 'importar');
            setMsgRutina(null);
          }}
          className="flex items-center gap-1 text-cyan-brand text-xs font-medium mt-2"
        >
          <Upload size={13} />{' '}
          {modo === 'importar'
            ? 'Elegir una existente'
            : 'Importar rutina desde Excel'}
        </button>
      </div>

      {historial.length > 0 && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
            Rutinas anteriores
          </p>
          <div className="flex flex-col gap-1">
            {historial.map((h) => (
              <p key={h.id} className="text-white/40 text-xs">
                {h.rutina?.nombre} · {formatearFecha(h.fecha_asignacion)} a{' '}
                {formatearFecha(h.fecha_fin)}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Progreso de cargas (los cambios de peso que hace en su rutina) */}
      <div className="-mb-6">
        <CargasRutina
          registros={registrosPeso}
          usuarioId={alumno.id}
          titulo="Progreso de cargas"
          textoVacio="Todavía no hay cambios de peso en su rutina."
        />
      </div>
    </div>
  );
}
