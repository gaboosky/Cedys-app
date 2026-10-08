import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CargasRutina from '../../components/CargasRutina';
import { fechaVenceDe } from '../../lib/ingresos';
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

export default function Alumnos() {
  const { usuarioActual, horarios, usuarios, reservas, rutinaActivaDe, coachDeClase } = useAuth();
  const [abierto, setAbierto] = useState(null);
  const [alcance, setAlcance] = useState('mios'); // mios | todos
  const [busqueda, setBusqueda] = useState('');

  // "Mis alumnos": los que han reservado alguna clase que yo hice o haré
  const misAlumnosIds = new Set(
    reservas
      .filter((r) => {
        const h = horarios.find((x) => x.id === r.horario_id);
        return h && coachDeClase(h, r.fecha).id === usuarioActual.id;
      })
      .map((r) => r.usuario_id)
  );

  const texto = busqueda.trim().toLowerCase();
  const alumnos = usuarios
    .filter((u) => u.rol === 'usuario' && u.estado !== 'pendiente')
    .filter((u) => (alcance === 'mios' ? misAlumnosIds.has(u.id) : true))
    .filter((u) => !texto || (u.nombre || '').toLowerCase().includes(texto))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white mb-4">Alumnos</p>

      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar alumno por nombre"
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
        />
      </div>
      <div className="flex gap-2 mb-5">
        {[
          { valor: 'mios', label: `Mis alumnos (${misAlumnosIds.size})` },
          { valor: 'todos', label: 'Todos los alumnos' },
        ].map((op) => (
          <button
            key={op.valor}
            onClick={() => setAlcance(op.valor)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              alcance === op.valor ? 'bg-cyan-brand text-ink' : 'bg-white/[0.06] text-white/50'
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
            : alcance === 'mios'
            ? 'Todavía no tienes alumnos en tus clases. Revisa "Todos los alumnos".'
            : 'No hay alumnos registrados.'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {alumnos.map((a) => {
          const abiertoAqui = abierto === a.id;
          const rutinaActiva = rutinaActivaDe(a.id);
          return (
            <div key={a.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setAbierto(abiertoAqui ? null : a.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-cyan-brand/15 border border-cyan-brand/40 flex items-center justify-center shrink-0 overflow-hidden">
                    {a.foto_url ? (
                      <img src={a.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-cyan-brand text-sm">{a.nombre.charAt(0)}</span>
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-white text-sm font-medium truncate">{a.nombre}</p>
                    <p className="text-white/40 text-xs truncate">
                      {rutinaActiva ? rutinaActiva.nombre : 'Sin rutina asignada'}
                    </p>
                  </div>
                </div>
                {abiertoAqui ? (
                  <ChevronUp size={18} className="text-white/40 shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-white/40 shrink-0" />
                )}
              </button>
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
  } = useAuth();

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
  const pasadas = reservas.filter((r) => r.usuario_id === alumno.id && r.fecha >= hace30 && r.fecha <= hoy);
  const asistio = pasadas.filter((r) => r.asistio === true).length;
  const falto = pasadas.filter((r) => r.asistio === false).length;

  const [obs, setObs] = useState(observacionDe(alumno.id));
  const [editandoObs, setEditandoObs] = useState(false);
  const [msgObs, setMsgObs] = useState(null);

  const [modo, setModo] = useState('seleccionar'); // seleccionar | importar
  const [seleccion, setSeleccion] = useState('');
  const [msgRutina, setMsgRutina] = useState(null);
  const [importForm, setImportForm] = useState({ nombre: '', link: '', archivo: null });
  const [importando, setImportando] = useState(false);

  // Rutinas para asignar: sin repetir nombres confusos (se indica de quién es cada una)
  const duenoDe = (rutinaId) => {
    const asign = (usuarioRutinas || []).find((ur) => ur.rutina_id === rutinaId && ur.activa);
    return asign ? usuarios.find((u) => u.id === asign.usuario_id)?.nombre : null;
  };
  const opcionesRutina = [...rutinas]
    .sort((x, y) => (x.nombre || '').localeCompare(y.nombre || ''))
    .map((r) => {
      const dueno = duenoDe(r.id);
      return { id: r.id, etiqueta: dueno ? `${r.nombre} (de ${dueno.split(' ')[0]})` : r.nombre };
    });

  async function guardarObs() {
    const r = await guardarObservacion(alumno.id, obs);
    setMsgObs(r);
    if (r.ok) setEditandoObs(false);
  }

  async function handleAsignar() {
    if (!seleccion) return setMsgRutina({ ok: false, mensaje: 'Elige una rutina.' });
    await asignarRutina(alumno.id, seleccion);
    const nombre = rutinas.find((r) => r.id === seleccion)?.nombre;
    setMsgRutina({ ok: true, mensaje: `Rutina "${nombre}" asignada.` });
    setSeleccion('');
  }

  async function handleImportar() {
    if (!importForm.nombre.trim() || !importForm.archivo) {
      return setMsgRutina({ ok: false, mensaje: 'Ponle un nombre a la rutina y elige el archivo Excel.' });
    }
    setImportando(true);
    setMsgRutina(null);
    try {
      const { leerArchivoExcel } = await import('../../lib/excelRutinaParser');
      const datosSemanas = await leerArchivoExcel(importForm.archivo);
      if (Object.keys(datosSemanas).length === 0) {
        setMsgRutina({ ok: false, mensaje: 'No encontré hojas con formato "Semana X" en ese archivo.' });
        setImportando(false);
        return;
      }
      const nueva = await crearRutina(importForm.nombre.trim(), importForm.link.trim());
      await importarContenidoRutina(nueva.id, datosSemanas);
      await asignarRutina(alumno.id, nueva.id);
      setMsgRutina({ ok: true, mensaje: `Rutina importada con ${Object.keys(datosSemanas).length} semana(s) y asignada.` });
      setImportForm({ nombre: '', link: '', archivo: null });
      setModo('seleccionar');
    } catch {
      setMsgRutina({ ok: false, mensaje: 'No pude leer ese archivo. Revisa que sea un .xlsx válido.' });
    }
    setImportando(false);
  }

  const campo = 'bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand';

  return (
    <div className="border-t border-white/10 p-4 flex flex-col gap-5">
      {/* Contacto y plan */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/20 rounded-xl px-3 py-2">
          <p className="text-white/35 text-[10px] uppercase tracking-wide">Plan</p>
          <p className="text-white text-sm">{plan?.nombre || 'Sin plan'}</p>
          <p className="text-white/45 text-[11px]">
            {restantes !== null ? `${restantes} sesiones disponibles` : plan ? 'Ilimitado' : ''}
          </p>
          {vence && <p className="text-white/45 text-[11px]">Vence {formatearFecha(vence)}</p>}
        </div>
        <div className="bg-black/20 rounded-xl px-3 py-2">
          <p className="text-white/35 text-[10px] uppercase tracking-wide">Últimos 30 días</p>
          <p className="text-white text-sm">
            {asistio} clase{asistio !== 1 ? 's' : ''} asistida{asistio !== 1 ? 's' : ''}
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

      {/* OBS que escribió el propio alumno (enfermedad, lesión, etc.) */}
      {alumno.obs_salud && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-3 py-2.5">
          <p className="text-red-200/80 text-[10px] uppercase tracking-wide flex items-center gap-1.5 mb-0.5">
            <HeartPulse size={12} /> OBS del alumno
          </p>
          <p className="text-white/90 text-sm whitespace-pre-line">{alumno.obs_salud}</p>
        </div>
      )}

      {/* Observaciones (solo coaches y admin) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-white/40 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle size={12} /> Observaciones
          </p>
          {!editandoObs && (
            <button onClick={() => setEditandoObs(true)} className="text-cyan-brand text-xs">
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
              <button onClick={guardarObs} className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-xs">
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
          <p className={`text-sm ${obs ? 'text-orange-100/90' : 'text-white/30'}`}>
            {obs || 'Sin observaciones. Solo las ven los coaches y el admin.'}
          </p>
        )}
        {msgObs && !editandoObs && msgObs.ok && <p className="text-cyan-brand text-xs mt-1">{msgObs.mensaje}</p>}
        {msgObs && !msgObs.ok && <p className="text-red-400 text-xs mt-1">{msgObs.mensaje}</p>}
      </div>

      {/* Rutina */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Rutina actual</p>
        {rutinaActiva ? (
          <button
            onClick={() => navigate(`/rutinas/${rutinaActiva.id}`)}
            className="w-full flex items-center gap-2 bg-cyan-brand/10 border border-cyan-brand/30 rounded-lg px-3 py-2"
          >
            <Dumbbell size={16} className="text-cyan-brand" />
            <div className="text-left flex-1">
              <p className="text-white text-sm">{rutinaActiva.nombre}</p>
              <p className="text-white/40 text-xs">desde {formatearFecha(rutinaActiva.fecha_asignacion)}</p>
            </div>
            <ChevronRight size={16} className="text-cyan-brand/60" />
          </button>
        ) : (
          <p className="text-white/30 text-sm">Sin rutina asignada.</p>
        )}
      </div>

      <div>
        <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Asignar rutina</p>
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
            <button onClick={handleAsignar} className="bg-cyan-brand text-ink font-semibold rounded-lg px-4 text-sm">
              Asignar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 bg-black/20 border border-white/10 rounded-lg p-3">
            <input
              value={importForm.nombre}
              onChange={(e) => setImportForm({ ...importForm, nombre: e.target.value })}
              placeholder="Nombre de la rutina"
              className={campo}
            />
            <input
              value={importForm.link}
              onChange={(e) => setImportForm({ ...importForm, link: e.target.value })}
              placeholder="Link de Google Sheets (opcional, solo referencia)"
              className={campo}
            />
            <label className="flex items-center justify-center gap-2 bg-white/5 border border-dashed border-white/20 rounded-lg py-3 text-sm text-white/60 cursor-pointer">
              <Upload size={15} />
              {importForm.archivo ? importForm.archivo.name : 'Elegir archivo Excel (.xlsx)'}
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setImportForm({ ...importForm, archivo: e.target.files[0] })}
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
          <p className={`text-xs mt-2 flex items-center gap-1 ${msgRutina.ok ? 'text-cyan-brand' : 'text-red-400'}`}>
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
          <Upload size={13} /> {modo === 'importar' ? 'Elegir una existente' : 'Importar rutina desde Excel'}
        </button>
      </div>

      {historial.length > 0 && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Rutinas anteriores</p>
          <div className="flex flex-col gap-1">
            {historial.map((h) => (
              <p key={h.id} className="text-white/40 text-xs">
                {h.rutina?.nombre} · {formatearFecha(h.fecha_asignacion)} a {formatearFecha(h.fecha_fin)}
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
