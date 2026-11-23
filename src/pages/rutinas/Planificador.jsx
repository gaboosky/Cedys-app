import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Copy,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  Eye,
  UserPlus,
  X,
  Flame,
  Timer,
  Dumbbell,
  ExternalLink,
  Star,
  ClipboardList,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// Planificador de rutinas: crear y editar rutinas desde la app (sin Excel).
// Estructura: Rutina → Semanas (1, 2, 3, 4…) → Días (Tren inferior, Tren superior…)
// → 3 fases: Calentamiento, Rutina (trabajo) y Término (cierre, con bloques tipo TABATA).

const FASES = [
  { key: 'calentamiento', titulo: 'Calentamiento', color: 'text-amber-200', borde: 'border-amber-300/25' },
  { key: 'trabajo', titulo: 'Rutina', color: 'text-cyan-brand', borde: 'border-cyan-brand/30' },
  { key: 'cierre', titulo: 'Término', color: 'text-orange-300', borde: 'border-orange-300/25' },
];
const DIAS_SUGERIDOS = ['Tren inferior', 'Tren superior', 'Full body', 'Empuje', 'Tracción', 'Core y movilidad'];
const uuid = () => crypto.randomUUID();
const esMetodo = (e) => /\(m[ée]todo\)\s*$/i.test(e?.ejercicio || '');
const nombreMetodo = (e) => (e.ejercicio || '').replace(/\s*\(m[ée]todo\)\s*$/i, '').trim();
const limpiarNombreDia = (n) => String(n || '').replace(/^d[ií]a\s*\d+\s*[:.-]\s*/i, '').trim();
const nombreDia = (orden, nombre) => `Día ${orden + 1}: ${nombre}`;
const vacio = (v) => v === null || v === undefined || String(v).trim() === '' || String(v).trim() === '-';

function prescripcion(e) {
  const p = [];
  if (!vacio(e.series) || !vacio(e.repeticiones))
    p.push(`${vacio(e.series) ? '' : e.series + ' × '}${vacio(e.repeticiones) ? '' : e.repeticiones}`.trim());
  if (!vacio(e.peso_referencia)) {
    const t = String(e.peso_referencia).trim();
    p.push(/^[\d.,\s-]+$/.test(t) ? `${t} kg` : t);
  }
  if (!vacio(e.rir)) p.push(`RIR ${e.rir}`);
  if (!vacio(e.descanso)) p.push(`desc. ${e.descanso}`);
  return p.join(' · ');
}

// "40" + 2.5 → "42,5"; deja igual textos como "bw" o "1-2,5 kg"
function sumarPeso(texto, inc) {
  if (!inc || vacio(texto)) return texto;
  const m = String(texto).trim().match(/^(\d+(?:[.,]\d+)?)\s*(kg)?$/i);
  if (!m) return texto;
  const n = Math.round((Number(m[1].replace(',', '.')) + inc) * 100) / 100;
  return String(n).replace('.', ',') + (m[2] ? ' kg' : '');
}

const copiaEjercicio = (e, diaId, inc = 0) => ({
  id: uuid(),
  dia_id: diaId,
  seccion: e.seccion,
  orden: e.orden,
  ejercicio: e.ejercicio,
  series: e.series,
  repeticiones: e.repeticiones,
  rir: e.rir,
  peso_referencia: esMetodo(e) ? e.peso_referencia : sumarPeso(e.peso_referencia, inc),
  descanso: e.descanso,
  referencia_url: e.referencia_url,
  notas: e.notas,
});

// Copia una rutina completa (semanas, días y ejercicios). Devuelve la rutina nueva.
async function copiarRutina(origenId, nombre, extra = {}) {
  const [{ data: sems }, { data: rut }] = await Promise.all([
    supabase.from('rutina_semanas').select('*').eq('rutina_id', origenId),
    supabase.from('rutinas').select('*').eq('id', origenId).single(),
  ]);
  const semIds = (sems || []).map((s) => s.id);
  const { data: dias } = semIds.length
    ? await supabase.from('rutina_dias').select('*').in('semana_id', semIds)
    : { data: [] };
  const diaIds = (dias || []).map((d) => d.id);
  const { data: ejs } = diaIds.length
    ? await supabase.from('rutina_ejercicios').select('*').in('dia_id', diaIds)
    : { data: [] };

  const nueva = { id: uuid(), nombre, link_googlesheet: rut?.link_googlesheet || null, es_plantilla: false, ...extra };
  const { error } = await supabase.from('rutinas').insert(nueva);
  if (error) throw error;
  const mapSem = {};
  const mapDia = {};
  const filasSem = (sems || []).map((s) => {
    mapSem[s.id] = uuid();
    return { id: mapSem[s.id], rutina_id: nueva.id, numero: s.numero, objetivo: s.objetivo };
  });
  const filasDia = (dias || []).map((d) => {
    mapDia[d.id] = uuid();
    return { id: mapDia[d.id], semana_id: mapSem[d.semana_id], nombre: d.nombre, orden: d.orden };
  });
  const filasEj = (ejs || []).map((e) => copiaEjercicio(e, mapDia[e.dia_id]));
  if (filasSem.length) await supabase.from('rutina_semanas').insert(filasSem);
  if (filasDia.length) await supabase.from('rutina_dias').insert(filasDia);
  for (let i = 0; i < filasEj.length; i += 400)
    await supabase.from('rutina_ejercicios').insert(filasEj.slice(i, i + 400));
  return nueva;
}

const INPUT =
  'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand placeholder-white/25';

export default function Planificador() {
  const { rutinaId } = useParams();
  return rutinaId ? <Editor rutinaId={rutinaId} /> : <Lista />;
}

// ───────────────────────────── Lista de rutinas ─────────────────────────────

function Lista() {
  const navigate = useNavigate();
  const { rutinas, usuarioRutinas, usuarios, recargarRutinas, asignarRutina } = useAuth();
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const dueno = (id) => {
    const a = usuarioRutinas.find((ur) => ur.rutina_id === id && ur.activa);
    return a ? usuarios.find((u) => u.id === a.usuario_id) : null;
  };
  const usada = (id) => usuarioRutinas.some((ur) => ur.rutina_id === id);
  const plantillas = rutinas.filter((r) => r.es_plantilla);
  const deAlumnos = rutinas.filter((r) => !r.es_plantilla && dueno(r.id));
  const otras = rutinas.filter((r) => !r.es_plantilla && !dueno(r.id));
  const porNombre = (a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es');

  async function duplicar(r) {
    const nombre = window.prompt('Nombre de la copia:', `${r.nombre} (copia)`);
    if (!nombre) return;
    try {
      const n = await copiarRutina(r.id, nombre.trim());
      await recargarRutinas();
      navigate(`/planificar/${n.id}`);
    } catch (e) {
      setAviso({ ok: false, mensaje: 'No se pudo duplicar: ' + e.message });
    }
  }

  async function borrar(r) {
    if (usada(r.id))
      return setAviso({ ok: false, mensaje: 'Esta rutina está (o estuvo) asignada a un alumno, así que no se puede borrar.' });
    if (!window.confirm(`¿Borrar la rutina "${r.nombre}"? No se puede deshacer.`)) return;
    const { error } = await supabase.from('rutinas').delete().eq('id', r.id);
    setAviso(error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: 'Rutina borrada.' });
    recargarRutinas();
  }

  const Fila = ({ r }) => {
    const d = dueno(r.id);
    return (
      <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5">
        <button onClick={() => navigate(`/planificar/${r.id}`)} className="flex-1 min-w-0 text-left">
          <p className="text-white text-sm font-medium truncate flex items-center gap-1.5">
            {r.es_plantilla && <Star size={12} className="text-amber-300 shrink-0" />}
            {r.nombre}
          </p>
          <p className="text-white/40 text-xs truncate">
            {d ? `Asignada a ${d.nombre}` : r.es_plantilla ? 'Plantilla' : 'Sin asignar'}
            {r.link_googlesheet ? ' · desde Excel' : ''}
          </p>
        </button>
        <button onClick={() => duplicar(r)} className="p-2 text-white/50" title="Duplicar" aria-label="Duplicar">
          <Copy size={16} />
        </button>
        {!usada(r.id) && (
          <button onClick={() => borrar(r)} className="p-2 text-red-300/60" title="Borrar" aria-label="Borrar">
            <Trash2 size={16} />
          </button>
        )}
        <button onClick={() => navigate(`/planificar/${r.id}`)} className="p-2 text-cyan-brand" aria-label="Editar">
          <Pencil size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-ink px-4 pt-4 pb-28 max-w-2xl mx-auto">
      <h1 className="font-display uppercase text-3xl text-white">Planificar rutinas</h1>
      <p className="text-white/45 text-sm mb-4">
        Arma las semanas y días desde aquí, sin Excel. Los cambios los ve el alumno al instante.
      </p>
      {aviso && <p className={`text-sm mb-3 ${aviso.ok ? 'text-cyan-brand' : 'text-red-400'}`}>{aviso.mensaje}</p>}

      {creando ? (
        <NuevaRutina
          rutinas={rutinas}
          usuarios={usuarios}
          onCancelar={() => setCreando(false)}
          onCreada={async (id, alumnoId) => {
            if (alumnoId) await asignarRutina(alumnoId, id);
            await recargarRutinas();
            navigate(`/planificar/${id}`);
          }}
        />
      ) : (
        <button
          onClick={() => setCreando(true)}
          className="w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-xl py-3 mb-5"
        >
          <Plus size={18} /> Nueva rutina
        </button>
      )}

      {[
        { t: 'Plantillas', l: plantillas, d: 'Rutinas base: al asignarlas se crea una copia para cada alumno.' },
        { t: 'Rutinas de alumnos', l: deAlumnos },
        { t: 'Sin asignar', l: otras },
      ]
        .filter((g) => g.l.length)
        .map((g) => (
          <div key={g.t} className="mb-5">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">{g.t}</p>
            {g.d && <p className="text-white/35 text-[11px] mb-2">{g.d}</p>}
            <div className="flex flex-col gap-2">
              {[...g.l].sort(porNombre).map((r) => (
                <Fila key={r.id} r={r} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function NuevaRutina({ rutinas, usuarios, onCancelar, onCreada }) {
  const [nombre, setNombre] = useState('');
  const [semanas, setSemanas] = useState(4);
  const [dias, setDias] = useState(['Tren inferior', 'Tren superior', 'Full body']);
  const [otroDia, setOtroDia] = useState('');
  const [base, setBase] = useState('');
  const [alumno, setAlumno] = useState('');
  const [plantilla, setPlantilla] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const alumnos = usuarios
    .filter((u) => u.rol === 'usuario' && u.estado === 'activo')
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));

  const alternarDia = (d) => setDias(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d]);

  async function crear() {
    if (!nombre.trim()) return setError('Ponle un nombre a la rutina.');
    if (!base && dias.length === 0) return setError('Elige al menos un día de entrenamiento.');
    setGuardando(true);
    setError(null);
    try {
      let id;
      if (base) {
        id = (await copiarRutina(base, nombre.trim(), { es_plantilla: plantilla && !alumno })).id;
      } else {
        id = uuid();
        const { error: e } = await supabase
          .from('rutinas')
          .insert({ id, nombre: nombre.trim(), es_plantilla: plantilla && !alumno });
        if (e) throw e;
        const filasSem = Array.from({ length: semanas }, (_, i) => ({ id: uuid(), rutina_id: id, numero: i + 1 }));
        await supabase.from('rutina_semanas').insert(filasSem);
        const filasDia = filasSem.flatMap((s) =>
          dias.map((d, orden) => ({ id: uuid(), semana_id: s.id, orden, nombre: nombreDia(orden, d) }))
        );
        await supabase.from('rutina_dias').insert(filasDia);
      }
      await onCreada(id, alumno || null);
    } catch (e) {
      setError('No se pudo crear: ' + e.message);
      setGuardando(false);
    }
  }

  const chip = (activo) =>
    `px-3 py-1.5 rounded-lg text-sm border ${
      activo ? 'bg-cyan-brand text-ink border-cyan-brand font-semibold' : 'bg-white/[0.04] text-white/70 border-white/10'
    }`;

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-5 flex flex-col gap-4">
      <p className="text-white font-semibold">Nueva rutina</p>
      <label>
        <span className="text-white/50 text-xs">Nombre</span>
        <input className={INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Hipertrofia bloque A" />
      </label>

      <label>
        <span className="text-white/50 text-xs">Empezar desde</span>
        <select className={INPUT} value={base} onChange={(e) => setBase(e.target.value)}>
          <option value="">Rutina vacía</option>
          {[...rutinas]
            .sort((a, b) => Number(b.es_plantilla) - Number(a.es_plantilla) || (a.nombre || '').localeCompare(b.nombre || ''))
            .map((r) => (
              <option key={r.id} value={r.id}>
                Copia de: {r.nombre}
                {r.es_plantilla ? ' (plantilla)' : ''}
              </option>
            ))}
        </select>
      </label>

      {!base && (
        <>
          <div>
            <span className="text-white/50 text-xs">Semanas</span>
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                <button key={n} onClick={() => setSemanas(n)} className={chip(semanas === n) + ' flex-1 px-0'}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-white/50 text-xs">Días de entrenamiento (en orden)</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {[...new Set([...DIAS_SUGERIDOS, ...dias])].map((d) => (
                <button key={d} onClick={() => alternarDia(d)} className={chip(dias.includes(d))}>
                  {dias.includes(d) ? `${dias.indexOf(d) + 1}. ` : ''}
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className={INPUT}
                value={otroDia}
                onChange={(e) => setOtroDia(e.target.value)}
                placeholder="Otro día (ej: Glúteo y pierna)"
              />
              <button
                onClick={() => {
                  if (otroDia.trim()) setDias([...dias, otroDia.trim()]);
                  setOtroDia('');
                }}
                className="px-3 bg-white/10 text-white rounded-lg"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      <label>
        <span className="text-white/50 text-xs">Asignar a un alumno (opcional)</span>
        <select className={INPUT} value={alumno} onChange={(e) => setAlumno(e.target.value)}>
          <option value="">Ninguno por ahora</option>
          {alumnos.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </label>
      {!alumno && (
        <label className="flex items-center gap-2 text-sm text-white/85">
          <input type="checkbox" checked={plantilla} onChange={(e) => setPlantilla(e.target.checked)} />
          Guardar como plantilla (para copiarla a varios alumnos)
        </label>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={crear}
          disabled={guardando}
          className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
        >
          {guardando ? 'Creando…' : 'Crear y empezar a planificar'}
        </button>
        <button onClick={onCancelar} className="px-4 bg-white/10 text-white rounded-lg text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── Editor ─────────────────────────────

function Editor({ rutinaId }) {
  const navigate = useNavigate();
  const { rutinas, usuarioRutinas, usuarios, recargarRutinas, asignarRutina } = useAuth();
  const [semanas, setSemanas] = useState(null);
  const [dias, setDias] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [semSel, setSemSel] = useState(null);
  const [diaSel, setDiaSel] = useState(null);
  const [editando, setEditando] = useState(null); // ejercicio en edición
  const [panel, setPanel] = useState(null); // 'copiarSemana' | 'copiarDia' | 'asignar' | 'dia' | 'renombrar'
  const [aviso, setAviso] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const rutina = rutinas.find((r) => r.id === rutinaId);
  const asignacion = usuarioRutinas.find((ur) => ur.rutina_id === rutinaId && ur.activa);
  const duenoRutina = asignacion ? usuarios.find((u) => u.id === asignacion.usuario_id) : null;

  async function cargar() {
    const { data: sems } = await supabase.from('rutina_semanas').select('*').eq('rutina_id', rutinaId).order('numero');
    const semIds = (sems || []).map((s) => s.id);
    const { data: ds } = semIds.length
      ? await supabase.from('rutina_dias').select('*').in('semana_id', semIds).order('orden')
      : { data: [] };
    const diaIds = (ds || []).map((d) => d.id);
    let ejs = [];
    for (let i = 0; i < diaIds.length; i += 100) {
      const { data } = await supabase.from('rutina_ejercicios').select('*').in('dia_id', diaIds.slice(i, i + 100));
      ejs = ejs.concat(data || []);
    }
    setSemanas(sems || []);
    setDias(ds || []);
    setEjercicios(ejs);
    setSemSel((prev) => (sems || []).find((s) => s.id === prev)?.id || sems?.[0]?.id || null);
  }

  useEffect(() => {
    cargar();
    // Catálogo: todos los ejercicios usados en las rutinas, con su video
    supabase
      .from('rutina_ejercicios')
      .select('ejercicio, referencia_url')
      .limit(5000)
      .then(({ data }) => {
        const m = new Map();
        for (const e of data || []) {
          if (!e.ejercicio || esMetodo(e)) continue;
          const k = e.ejercicio.trim().toLowerCase();
          const prev = m.get(k);
          if (!prev) m.set(k, { nombre: e.ejercicio.trim(), url: e.referencia_url || null });
          else if (!prev.url && e.referencia_url) prev.url = e.referencia_url;
        }
        setCatalogo([...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutinaId]);

  const diasDeSemana = useMemo(
    () => dias.filter((d) => d.semana_id === semSel).sort((a, b) => a.orden - b.orden),
    [dias, semSel]
  );
  useEffect(() => {
    if (!diasDeSemana.find((d) => d.id === diaSel)) setDiaSel(diasDeSemana[0]?.id || null);
  }, [diasDeSemana, diaSel]);

  const dia = diasDeSemana.find((d) => d.id === diaSel);
  const semana = semanas?.find((s) => s.id === semSel);
  const ejDe = (diaId, seccion) =>
    ejercicios.filter((e) => e.dia_id === diaId && e.seccion === seccion).sort((a, b) => a.orden - b.orden);
  const cuenta = (diaId) => ejercicios.filter((e) => e.dia_id === diaId && !esMetodo(e)).length;

  async function ejecutar(fn, ok) {
    setTrabajando(true);
    setAviso(null);
    try {
      await fn();
      if (ok) setAviso({ ok: true, mensaje: ok });
    } catch (e) {
      setAviso({ ok: false, mensaje: 'No se pudo guardar: ' + (e?.message || e) });
    }
    await cargar();
    setTrabajando(false);
  }
  const revisar = ({ error }) => {
    if (error) throw error;
  };

  // Mismo día (por orden) en otra semana
  const diaEquivalente = (diaOrigen, semanaId) =>
    dias.find((d) => d.semana_id === semanaId && d.orden === diaOrigen.orden);

  async function reemplazarContenido(diaOrigen, diaDestinoId, inc) {
    revisar(await supabase.from('rutina_ejercicios').delete().eq('dia_id', diaDestinoId));
    const filas = ejercicios.filter((e) => e.dia_id === diaOrigen.id).map((e) => copiaEjercicio(e, diaDestinoId, inc));
    if (filas.length) revisar(await supabase.from('rutina_ejercicios').insert(filas));
  }

  async function copiarDiaA(diaOrigen, semanaIds, incPorSemana) {
    const semOrigen = semanas.find((s) => s.id === diaOrigen.semana_id);
    for (const sid of semanaIds) {
      const sDest = semanas.find((s) => s.id === sid);
      let destino = diaEquivalente(diaOrigen, sid);
      if (!destino) {
        destino = { id: uuid(), semana_id: sid, orden: diaOrigen.orden, nombre: diaOrigen.nombre };
        revisar(await supabase.from('rutina_dias').insert(destino));
      } else if (destino.nombre !== diaOrigen.nombre) {
        revisar(await supabase.from('rutina_dias').update({ nombre: diaOrigen.nombre }).eq('id', destino.id));
      }
      await reemplazarContenido(diaOrigen, destino.id, incPorSemana * (sDest.numero - semOrigen.numero));
    }
  }

  async function copiarSemanaA(semanaOrigenId, semanaIds, inc) {
    for (const d of dias.filter((x) => x.semana_id === semanaOrigenId)) await copiarDiaA(d, semanaIds, inc);
  }

  async function agregarSemana() {
    const ultima = semanas[semanas.length - 1];
    const nueva = { id: uuid(), rutina_id: rutinaId, numero: (ultima?.numero || 0) + 1 };
    await ejecutar(async () => {
      revisar(await supabase.from('rutina_semanas').insert(nueva));
      if (ultima) {
        const ds = dias.filter((d) => d.semana_id === ultima.id);
        const mapa = {};
        const filas = ds.map((d) => {
          mapa[d.id] = uuid();
          return { id: mapa[d.id], semana_id: nueva.id, orden: d.orden, nombre: d.nombre };
        });
        if (filas.length) revisar(await supabase.from('rutina_dias').insert(filas));
        const fe = ejercicios.filter((e) => mapa[e.dia_id]).map((e) => copiaEjercicio(e, mapa[e.dia_id]));
        if (fe.length) revisar(await supabase.from('rutina_ejercicios').insert(fe));
      }
    }, `Semana ${nueva.numero} creada (copia de la semana ${ultima?.numero || ''}).`);
    setSemSel(nueva.id);
  }

  async function borrarSemana() {
    if (!semana || !window.confirm(`¿Borrar la semana ${semana.numero} con todo su contenido?`)) return;
    await ejecutar(async () => {
      revisar(await supabase.from('rutina_semanas').delete().eq('id', semana.id));
      // Renumera las siguientes
      for (const s of semanas.filter((x) => x.numero > semana.numero))
        revisar(await supabase.from('rutina_semanas').update({ numero: s.numero - 1 }).eq('id', s.id));
    }, 'Semana borrada.');
    setSemSel(null);
  }

  async function agregarDia(nombre, enTodas) {
    const objetivo = enTodas ? semanas.map((s) => s.id) : [semSel];
    await ejecutar(async () => {
      for (const sid of objetivo) {
        const orden = dias.filter((d) => d.semana_id === sid).length;
        revisar(
          await supabase.from('rutina_dias').insert({ id: uuid(), semana_id: sid, orden, nombre: nombreDia(orden, nombre) })
        );
      }
    }, 'Día agregado.');
    setPanel(null);
  }

  async function renombrarDia(nombre, enTodas) {
    await ejecutar(async () => {
      const objetivo = enTodas ? dias.filter((d) => d.orden === dia.orden) : [dia];
      for (const d of objetivo)
        revisar(await supabase.from('rutina_dias').update({ nombre: nombreDia(d.orden, nombre) }).eq('id', d.id));
    }, 'Nombre cambiado.');
    setPanel(null);
  }

  async function borrarDia() {
    if (!dia || !window.confirm(`¿Borrar "${dia.nombre}" de la semana ${semana.numero}?`)) return;
    await ejecutar(async () => {
      revisar(await supabase.from('rutina_dias').delete().eq('id', dia.id));
      const resto = diasDeSemana.filter((d) => d.id !== dia.id);
      for (let i = 0; i < resto.length; i++)
        if (resto[i].orden !== i)
          revisar(
            await supabase
              .from('rutina_dias')
              .update({ orden: i, nombre: nombreDia(i, limpiarNombreDia(resto[i].nombre)) })
              .eq('id', resto[i].id)
          );
    }, 'Día borrado.');
  }

  async function mover(e, dir) {
    const lista = ejDe(e.dia_id, e.seccion);
    const i = lista.findIndex((x) => x.id === e.id);
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    const nuevo = [...lista];
    [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
    await ejecutar(async () => {
      for (let k = 0; k < nuevo.length; k++)
        if (nuevo[k].orden !== k) revisar(await supabase.from('rutina_ejercicios').update({ orden: k }).eq('id', nuevo[k].id));
    });
  }

  async function guardarEjercicio(form, enTodas) {
    const datos = {
      ejercicio: form.ejercicio.trim(),
      series: form.series || null,
      repeticiones: form.repeticiones || null,
      rir: form.rir || null,
      peso_referencia: form.peso_referencia || null,
      descanso: form.descanso || null,
      referencia_url: form.referencia_url || null,
      notas: form.notas || null,
    };
    await ejecutar(async () => {
      if (form.id) {
        revisar(await supabase.from('rutina_ejercicios').update(datos).eq('id', form.id));
        if (enTodas) {
          // Mismo ejercicio (mismo nombre anterior, fase y día) en las otras semanas
          for (const d of dias.filter((x) => x.orden === dia.orden && x.id !== dia.id)) {
            const igual = ejercicios.find(
              (x) => x.dia_id === d.id && x.seccion === form.seccion && x.ejercicio === form.nombreOriginal
            );
            if (igual)
              revisar(
                await supabase
                  .from('rutina_ejercicios')
                  .update({ ...datos, peso_referencia: igual.peso_referencia ?? datos.peso_referencia })
                  .eq('id', igual.id)
              );
          }
        }
      } else {
        const destinos = enTodas ? dias.filter((x) => x.orden === dia.orden) : [dia];
        for (const d of destinos) {
          const orden = ejDe(d.id, form.seccion).length;
          revisar(
            await supabase
              .from('rutina_ejercicios')
              .insert({ id: uuid(), dia_id: d.id, seccion: form.seccion, orden, ...datos })
          );
        }
      }
    }, form.id ? 'Guardado.' : 'Ejercicio agregado.');
    setEditando(null);
  }

  async function borrarEjercicio(form, enTodas) {
    await ejecutar(async () => {
      revisar(await supabase.from('rutina_ejercicios').delete().eq('id', form.id));
      if (enTodas)
        for (const d of dias.filter((x) => x.orden === dia.orden && x.id !== dia.id)) {
          const igual = ejercicios.find(
            (x) => x.dia_id === d.id && x.seccion === form.seccion && x.ejercicio === form.nombreOriginal
          );
          if (igual) revisar(await supabase.from('rutina_ejercicios').delete().eq('id', igual.id));
        }
    }, 'Eliminado.');
    setEditando(null);
  }

  async function renombrarRutina() {
    const n = window.prompt('Nombre de la rutina:', rutina?.nombre || '');
    if (!n?.trim()) return;
    await supabase.from('rutinas').update({ nombre: n.trim() }).eq('id', rutinaId);
    recargarRutinas();
  }

  async function alternarPlantilla() {
    await supabase.from('rutinas').update({ es_plantilla: !rutina.es_plantilla }).eq('id', rutinaId);
    recargarRutinas();
  }

  if (semanas === null)
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-brand/30 border-t-cyan-brand rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-ink pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-3">
        {/* Encabezado */}
        <div className="flex items-start gap-2">
          <button onClick={() => navigate('/planificar')} className="p-1.5 -ml-1.5 text-white/60" aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={renombrarRutina} className="text-left">
              <h1 className="text-white text-xl font-semibold leading-tight flex items-center gap-1.5">
                {rutina?.nombre || 'Rutina'} <Pencil size={13} className="text-white/30" />
              </h1>
            </button>
            <p className="text-white/45 text-xs mt-0.5">
              {semanas.length} semana{semanas.length === 1 ? '' : 's'} ·{' '}
              {duenoRutina ? `Asignada a ${duenoRutina.nombre}` : rutina?.es_plantilla ? 'Plantilla' : 'Sin asignar'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto -mx-4 px-4 pb-1">
          <button
            onClick={() => setPanel('asignar')}
            className="shrink-0 flex items-center gap-1.5 bg-cyan-brand text-ink font-semibold rounded-lg px-3 py-1.5 text-xs"
          >
            <UserPlus size={14} /> Asignar a alumno
          </button>
          <button
            onClick={() => navigate(`/rutinas/${rutinaId}`)}
            className="shrink-0 flex items-center gap-1.5 bg-white/[0.06] border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs"
          >
            <Eye size={14} /> Ver como alumno
          </button>
          {!duenoRutina && (
            <button
              onClick={alternarPlantilla}
              className="shrink-0 flex items-center gap-1.5 bg-white/[0.06] border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs"
            >
              <Star size={14} className={rutina?.es_plantilla ? 'text-amber-300' : ''} />
              {rutina?.es_plantilla ? 'Es plantilla' : 'Marcar como plantilla'}
            </button>
          )}
        </div>

        {aviso && (
          <p className={`text-xs mt-3 ${aviso.ok ? 'text-cyan-brand' : 'text-red-400'}`}>{aviso.mensaje}</p>
        )}

        {/* Semanas */}
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mt-5 mb-1.5">Semana</p>
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
          {semanas.map((s) => (
            <button
              key={s.id}
              onClick={() => setSemSel(s.id)}
              className={`shrink-0 min-w-[52px] rounded-xl py-2 px-3 text-sm font-semibold border ${
                semSel === s.id ? 'bg-cyan-brand text-ink border-cyan-brand' : 'bg-white/[0.04] text-white/70 border-white/10'
              }`}
            >
              S{s.numero}
            </button>
          ))}
          <button
            onClick={agregarSemana}
            disabled={trabajando}
            className="shrink-0 rounded-xl px-3 border border-dashed border-white/20 text-white/60 text-sm flex items-center gap-1"
            title="Agregar semana (copia de la última)"
          >
            <Plus size={14} /> Semana
          </button>
        </div>
        {semana && (
          <div className="flex gap-3 mt-2 text-[11px]">
            <button onClick={() => setPanel('copiarSemana')} className="text-cyan-brand font-semibold flex items-center gap-1">
              <Copy size={12} /> Copiar semana {semana.numero} a…
            </button>
            <button onClick={borrarSemana} className="text-red-300/70 flex items-center gap-1 ml-auto">
              <Trash2 size={12} /> Borrar semana
            </button>
          </div>
        )}

        {/* Días */}
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mt-5 mb-1.5">Día</p>
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
          {diasDeSemana.map((d) => (
            <button
              key={d.id}
              onClick={() => setDiaSel(d.id)}
              className={`shrink-0 rounded-xl py-2 px-3 text-left border ${
                diaSel === d.id ? 'bg-white text-ink border-white' : 'bg-white/[0.04] text-white border-white/10'
              }`}
            >
              <span className={`block text-[10px] ${diaSel === d.id ? 'text-ink/60' : 'text-white/40'}`}>
                Día {d.orden + 1} · {cuenta(d.id)} ej.
              </span>
              <span className="block text-sm font-semibold whitespace-nowrap">{limpiarNombreDia(d.nombre) || 'Sin nombre'}</span>
            </button>
          ))}
          <button
            onClick={() => setPanel('dia')}
            className="shrink-0 rounded-xl px-3 border border-dashed border-white/20 text-white/60 text-sm flex items-center gap-1"
          >
            <Plus size={14} /> Día
          </button>
        </div>
        {dia && (
          <div className="flex gap-3 mt-2 text-[11px]">
            <button onClick={() => setPanel('renombrar')} className="text-white/60 flex items-center gap-1">
              <Pencil size={12} /> Renombrar
            </button>
            <button onClick={() => setPanel('copiarDia')} className="text-cyan-brand font-semibold flex items-center gap-1">
              <Copy size={12} /> Copiar día a otras semanas
            </button>
            <button onClick={borrarDia} className="text-red-300/70 flex items-center gap-1 ml-auto">
              <Trash2 size={12} /> Borrar día
            </button>
          </div>
        )}

        {/* Fases del día */}
        {!dia ? (
          <p className="text-white/40 text-sm text-center py-10">Agrega un día de entrenamiento para empezar.</p>
        ) : (
          <div className="flex flex-col gap-3 mt-4">
            {FASES.map((f) => {
              const lista = ejDe(dia.id, f.key);
              let enBloque = false;
              let n = 0;
              return (
                <div key={f.key} className={`bg-white/[0.03] border ${f.borde} rounded-2xl p-3`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`${f.color} text-sm font-semibold uppercase tracking-wide`}>{f.titulo}</p>
                    <span className="text-white/30 text-[11px]">{lista.filter((e) => !esMetodo(e)).length} ejercicios</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {lista.map((e, i) => {
                      const metodo = esMetodo(e);
                      if (metodo) enBloque = true;
                      if (!metodo) n += 1;
                      return (
                        <div
                          key={e.id}
                          className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                            metodo
                              ? 'bg-orange-400/10 border border-orange-300/25'
                              : enBloque
                              ? 'bg-orange-400/[0.04] ml-4'
                              : 'bg-black/20'
                          }`}
                        >
                          <button
                            onClick={() =>
                              setEditando({ ...e, nombreOriginal: e.ejercicio, esMetodo: metodo })
                            }
                            className="flex-1 min-w-0 text-left"
                          >
                            {metodo ? (
                              <>
                                <p className="text-orange-200 text-sm font-semibold flex items-center gap-1.5">
                                  <Flame size={13} /> {nombreMetodo(e)}
                                </p>
                                <p className="text-orange-200/60 text-[11px]">
                                  {[
                                    e.series && `${e.series} rondas`,
                                    e.repeticiones && `${e.repeticiones} trabajo`,
                                    !vacio(e.rir) && `${e.rir} descanso`,
                                    e.descanso && `${e.descanso} entre rondas`,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-white text-sm leading-tight">
                                  <span className="text-white/30 mr-1.5 tabular-nums">{n}</span>
                                  {e.ejercicio}
                                  {e.referencia_url && <ExternalLink size={11} className="inline ml-1.5 text-cyan-brand/60" />}
                                </p>
                                {prescripcion(e) && <p className="text-white/45 text-[11px] mt-0.5">{prescripcion(e)}</p>}
                              </>
                            )}
                          </button>
                          <div className="flex flex-col">
                            <button
                              onClick={() => mover(e, -1)}
                              disabled={i === 0 || trabajando}
                              className="text-white/40 disabled:opacity-20 p-0.5"
                              aria-label="Subir"
                            >
                              <ChevronUp size={15} />
                            </button>
                            <button
                              onClick={() => mover(e, 1)}
                              disabled={i === lista.length - 1 || trabajando}
                              className="text-white/40 disabled:opacity-20 p-0.5"
                              aria-label="Bajar"
                            >
                              <ChevronDown size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() =>
                        setEditando({
                          seccion: f.key,
                          ejercicio: '',
                          series: f.key === 'trabajo' ? '3' : '',
                          repeticiones: '',
                          rir: '',
                          peso_referencia: '',
                          descanso: f.key === 'trabajo' ? '90' : '',
                          referencia_url: '',
                          notas: '',
                        })
                      }
                      className="flex-1 flex items-center justify-center gap-1 border border-dashed border-white/15 text-white/70 rounded-lg py-2 text-xs"
                    >
                      <Plus size={13} /> {enBloque ? 'Ejercicio al bloque' : 'Ejercicio'}
                    </button>
                    {f.key === 'cierre' && (
                      <button
                        onClick={() =>
                          setEditando({
                            seccion: 'cierre',
                            esMetodo: true,
                            ejercicio: 'TABATA (método)',
                            series: '3',
                            repeticiones: "20''",
                            rir: "10''",
                            descanso: "1'",
                            notas: 'Tiempo de trabajo / descanso del método',
                          })
                        }
                        className="flex items-center justify-center gap-1 border border-dashed border-orange-300/30 text-orange-200/80 rounded-lg px-3 py-2 text-xs"
                      >
                        <Timer size={13} /> Bloque TABATA
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-white/30 text-[11px] text-center">
              En Término, los ejercicios que van debajo de un bloque (TABATA u otro) forman parte de ese bloque.
            </p>
          </div>
        )}
      </div>

      {editando && (
        <EditorEjercicio
          inicial={editando}
          catalogo={catalogo}
          variasSemanas={semanas.length > 1}
          trabajando={trabajando}
          onCerrar={() => setEditando(null)}
          onGuardar={guardarEjercicio}
          onBorrar={borrarEjercicio}
        />
      )}
      {panel === 'copiarSemana' && semana && (
        <PanelCopiar
          titulo={`Copiar semana ${semana.numero}`}
          texto="Reemplaza el contenido de las semanas que elijas por una copia de esta semana."
          semanas={semanas.filter((s) => s.id !== semana.id)}
          origen={semana}
          trabajando={trabajando}
          onCerrar={() => setPanel(null)}
          onCopiar={async (ids, inc) => {
            await ejecutar(() => copiarSemanaA(semana.id, ids, inc), 'Semana copiada.');
            setPanel(null);
          }}
        />
      )}
      {panel === 'copiarDia' && dia && (
        <PanelCopiar
          titulo={`Copiar "${limpiarNombreDia(dia.nombre)}"`}
          texto={`Reemplaza el Día ${dia.orden + 1} de las semanas que elijas por una copia de este día.`}
          semanas={semanas.filter((s) => s.id !== semana.id)}
          origen={semana}
          trabajando={trabajando}
          onCerrar={() => setPanel(null)}
          onCopiar={async (ids, inc) => {
            await ejecutar(() => copiarDiaA(dia, ids, inc), 'Día copiado.');
            setPanel(null);
          }}
        />
      )}
      {(panel === 'dia' || panel === 'renombrar') && (
        <PanelDia
          renombrar={panel === 'renombrar'}
          actual={panel === 'renombrar' ? limpiarNombreDia(dia?.nombre) : ''}
          variasSemanas={semanas.length > 1}
          onCerrar={() => setPanel(null)}
          onGuardar={panel === 'renombrar' ? renombrarDia : agregarDia}
        />
      )}
      {panel === 'asignar' && (
        <PanelAsignar
          rutina={rutina}
          duenoRutina={duenoRutina}
          usuarios={usuarios}
          onCerrar={() => setPanel(null)}
          onAsignar={async (alumno, copiar) => {
            let destino = rutinaId;
            if (copiar) {
              const n = await copiarRutina(rutinaId, `${rutina.nombre} · ${alumno.nombre.split(' ')[0]}`);
              destino = n.id;
            }
            await asignarRutina(alumno.id, destino);
            await recargarRutinas();
            setPanel(null);
            setAviso({
              ok: true,
              mensaje: copiar
                ? `Se creó una copia para ${alumno.nombre} y ya la ve en su app.`
                : `Asignada a ${alumno.nombre}. Ya la ve en su app.`,
            });
            if (copiar) navigate(`/planificar/${destino}`);
          }}
        />
      )}
    </div>
  );
}

function Hoja({ titulo, onCerrar, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-[#111] w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10">
        <div className="sticky top-0 bg-[#111] z-10 flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <p className="text-white font-semibold">{titulo}</p>
          <button onClick={onCerrar} className="p-1 text-white/50" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function EditorEjercicio({ inicial, catalogo, variasSemanas, trabajando, onCerrar, onGuardar, onBorrar }) {
  const metodo = !!inicial.esMetodo;
  const [f, setF] = useState(
    metodo ? { ...inicial, ejercicio: nombreMetodo(inicial) || 'TABATA' } : { ...inicial }
  );
  const [enTodas, setEnTodas] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function elegirNombre(v) {
    const c = catalogo.find((x) => x.nombre.toLowerCase() === v.trim().toLowerCase());
    setF((prev) => ({ ...prev, ejercicio: v, referencia_url: prev.referencia_url || c?.url || '' }));
  }

  function guardar() {
    if (!f.ejercicio?.trim()) return;
    onGuardar(metodo ? { ...f, ejercicio: `${f.ejercicio.trim()} (método)` } : f, enTodas);
  }

  const campo = (k, label, ph, extra = {}) => (
    <label className="block">
      <span className="text-white/45 text-[11px]">{label}</span>
      <input className={INPUT} value={f[k] ?? ''} onChange={set(k)} placeholder={ph} {...extra} />
    </label>
  );

  return (
    <Hoja
      titulo={metodo ? (f.id ? 'Editar bloque' : 'Nuevo bloque') : f.id ? 'Editar ejercicio' : 'Agregar ejercicio'}
      onCerrar={onCerrar}
    >
      <div className="flex flex-col gap-3">
        {metodo ? (
          <>
            {campo('ejercicio', 'Nombre del bloque', 'TABATA, EMOM, AMRAP…')}
            <div className="grid grid-cols-2 gap-2">
              {campo('series', 'Rondas', '3')}
              {campo('repeticiones', 'Trabajo', "20''")}
              {campo('rir', 'Descanso', "10''")}
              {campo('descanso', 'Pausa entre rondas', "1'")}
            </div>
            <p className="text-white/35 text-[11px]">
              Después agrega los ejercicios del bloque con "Ejercicio al bloque". El alumno lo marca como un solo
              ejercicio.
            </p>
          </>
        ) : (
          <>
            <label className="block">
              <span className="text-white/45 text-[11px]">Ejercicio</span>
              <input
                className={INPUT}
                list="catalogo-ejercicios"
                value={f.ejercicio}
                onChange={(e) => elegirNombre(e.target.value)}
                placeholder="Busca o escribe uno nuevo"
                autoFocus={!f.id}
              />
              <datalist id="catalogo-ejercicios">
                {catalogo.map((c) => (
                  <option key={c.nombre} value={c.nombre} />
                ))}
              </datalist>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {campo('series', 'Series', '3', { inputMode: 'numeric' })}
              {campo('repeticiones', 'Reps', '8–12')}
              {campo('rir', 'RIR', '2')}
              {campo('peso_referencia', 'Peso', '24 kg / bw')}
              {campo('descanso', 'Descanso', "90''")}
            </div>
            {campo('referencia_url', 'Video (link de YouTube o Instagram)', 'https://…')}
            {campo('notas', 'Indicaciones', 'Ej: controlar la bajada')}
          </>
        )}

        {variasSemanas && (
          <label className="flex items-start gap-2 text-sm text-white/80">
            <input type="checkbox" className="mt-1" checked={enTodas} onChange={(e) => setEnTodas(e.target.checked)} />
            <span>
              {f.id ? 'Aplicar el cambio en todas las semanas' : 'Agregar en todas las semanas'}
              <span className="block text-white/35 text-[11px]">
                Mismo día{f.id ? ' y mismo ejercicio' : ''}.{f.id ? ' El peso de cada semana se mantiene.' : ''}
              </span>
            </span>
          </label>
        )}

        <div className="flex gap-2">
          <button
            onClick={guardar}
            disabled={trabajando || !f.ejercicio?.trim()}
            className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-40"
          >
            {trabajando ? 'Guardando…' : f.id ? 'Guardar' : 'Agregar'}
          </button>
          <button onClick={onCerrar} className="px-4 bg-white/10 text-white rounded-lg text-sm">
            Cancelar
          </button>
        </div>
        {f.id && (
          <button
            onClick={() => window.confirm('¿Eliminar?') && onBorrar(inicial, enTodas)}
            className="text-red-300/80 text-xs self-center flex items-center gap-1"
          >
            <Trash2 size={12} /> Eliminar{enTodas ? ' en todas las semanas' : ''}
          </button>
        )}
      </div>
    </Hoja>
  );
}

function PanelCopiar({ titulo, texto, semanas, origen, trabajando, onCerrar, onCopiar }) {
  const [sel, setSel] = useState(semanas.filter((s) => s.numero > origen.numero).map((s) => s.id));
  const [inc, setInc] = useState('');
  return (
    <Hoja titulo={titulo} onCerrar={onCerrar}>
      <p className="text-white/50 text-xs mb-3">{texto}</p>
      {semanas.length === 0 ? (
        <p className="text-white/40 text-sm">No hay otras semanas. Agrega una con "+ Semana".</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {semanas.map((s) => (
              <button
                key={s.id}
                onClick={() => setSel(sel.includes(s.id) ? sel.filter((x) => x !== s.id) : [...sel, s.id])}
                className={`px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1 ${
                  sel.includes(s.id) ? 'bg-cyan-brand text-ink border-cyan-brand font-semibold' : 'bg-white/[0.04] text-white/70 border-white/10'
                }`}
              >
                {sel.includes(s.id) && <Check size={13} />} Semana {s.numero}
              </button>
            ))}
          </div>
          <label className="block mt-4">
            <span className="text-white/50 text-xs">Progresión: subir el peso por semana (opcional)</span>
            <div className="flex items-center gap-2">
              <input
                className={INPUT}
                type="number"
                step="0.5"
                value={inc}
                onChange={(e) => setInc(e.target.value)}
                placeholder="Ej: 2,5"
              />
              <span className="text-white/50 text-sm shrink-0">kg</span>
            </div>
            <span className="text-white/35 text-[11px]">
              Solo cambia pesos escritos como número (ej. "40" o "40 kg"). Semana siguiente +{inc || 0} kg, la otra +
              {(Number(inc) || 0) * 2} kg…
            </span>
          </label>
          <button
            disabled={!sel.length || trabajando}
            onClick={() => onCopiar(sel, Number(String(inc).replace(',', '.')) || 0)}
            className="mt-4 w-full bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-40"
          >
            {trabajando ? 'Copiando…' : `Copiar a ${sel.length} semana${sel.length === 1 ? '' : 's'}`}
          </button>
        </>
      )}
    </Hoja>
  );
}

function PanelDia({ renombrar, actual, variasSemanas, onCerrar, onGuardar }) {
  const [nombre, setNombre] = useState(actual || '');
  const [enTodas, setEnTodas] = useState(true);
  return (
    <Hoja titulo={renombrar ? 'Renombrar día' : 'Agregar día'} onCerrar={onCerrar}>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {DIAS_SUGERIDOS.map((d) => (
          <button
            key={d}
            onClick={() => setNombre(d)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              nombre === d ? 'bg-cyan-brand text-ink border-cyan-brand font-semibold' : 'bg-white/[0.04] text-white/70 border-white/10'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <input className={INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del día" />
      {variasSemanas && (
        <label className="flex items-center gap-2 text-sm text-white/80 mt-3">
          <input type="checkbox" checked={enTodas} onChange={(e) => setEnTodas(e.target.checked)} />
          {renombrar ? 'Cambiar en todas las semanas' : 'Agregar en todas las semanas'}
        </label>
      )}
      <button
        disabled={!nombre.trim()}
        onClick={() => onGuardar(nombre.trim(), enTodas)}
        className="mt-4 w-full bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-40"
      >
        {renombrar ? 'Guardar' : 'Agregar día'}
      </button>
    </Hoja>
  );
}

function PanelAsignar({ rutina, duenoRutina, usuarios, onCerrar, onAsignar }) {
  const [alumnoId, setAlumnoId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const alumnos = usuarios
    .filter((u) => u.rol === 'usuario' && u.estado === 'activo')
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  // Si es plantilla o ya es de otro alumno, se le hace una copia (los pesos son personales)
  const copiar = !!rutina?.es_plantilla || (!!duenoRutina && duenoRutina.id !== alumnoId);
  const alumno = alumnos.find((u) => u.id === alumnoId);
  return (
    <Hoja titulo="Asignar a alumno" onCerrar={onCerrar}>
      <select className={INPUT} value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)}>
        <option value="">Elige un alumno</option>
        {alumnos.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre}
          </option>
        ))}
      </select>
      {alumno && (
        <p className="text-white/50 text-xs mt-2">
          {copiar
            ? `Se creará una copia de esta rutina para ${alumno.nombre.split(' ')[0]} (así sus pesos no se mezclan con los de otros). Reemplaza la rutina que tenga ahora.`
            : `${alumno.nombre.split(' ')[0]} verá esta rutina en su app. Reemplaza la rutina que tenga ahora.`}
        </p>
      )}
      <button
        disabled={!alumno || enviando}
        onClick={async () => {
          setEnviando(true);
          await onAsignar(alumno, copiar);
          setEnviando(false);
        }}
        className="mt-4 w-full bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
      >
        <ClipboardList size={15} /> {enviando ? 'Asignando…' : 'Asignar'}
      </button>
    </Hoja>
  );
}
