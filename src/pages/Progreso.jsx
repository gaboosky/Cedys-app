import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subirImagen } from '../lib/storage';
import CargasRutina from '../components/CargasRutina';
import SeguimientoDashboard from '../components/SeguimientoDashboard';
import HistorialMediciones from '../components/HistorialMediciones';
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Camera,
  Trash2,
  Activity,
  Target,
  Dumbbell,
  NotebookPen,
  ChevronDown,
} from 'lucide-react';

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const EJERCICIOS_COMUNES = [
  'Sentadilla',
  'Press banca',
  'Press militar (hombro)',
  'Peso muerto',
  'Hip thrust',
  'Remo',
  'Bíceps',
  'Tríceps',
  'Búlgara',
];
const ELEMENTOS = ['Barra', 'Mancuerna', 'Kettlebell', 'Rack'];
const OTRO = '__otro__';

function FechaCuadro({ fechaISO }) {
  const d = new Date(fechaISO + 'T12:00:00');
  return (
    <div className="w-[50px] shrink-0 rounded-xl border border-white/10 bg-white/[0.06] py-1.5 text-center text-white">
      <p className="font-display text-xl leading-none">{d.getDate()}</p>
      <p className="text-[10px] uppercase text-white/50 leading-none mt-1">
        {MESES_CORTOS[d.getMonth()]}
      </p>
      <p className="text-[9px] text-white/30 leading-none mt-0.5">
        {d.getFullYear()}
      </p>
    </div>
  );
}

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFecha(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  return capitalizar(
    fecha.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );
}

export default function Progreso() {
  const {
    usuarioActual,
    obtenerProgreso,
    agregarProgreso,
    eliminarProgreso,
    registrosPeso,
    planesSeguimiento,
    mediciones,
  } = useAuth();
  const tieneSeguimiento =
    (planesSeguimiento || []).some(
      (p) => String(p.usuario_id) === String(usuarioActual.id)
    ) ||
    (mediciones || []).some(
      (m) => String(m.usuario_id) === String(usuarioActual.id)
    );
  const misMediciones = (mediciones || [])
    .filter((m) => String(m.usuario_id) === String(usuarioActual.id))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const [entradas, setEntradas] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [tab, setTab] = useState(tieneSeguimiento ? 'coach' : 'cargas');
  const [verTodasMediciones, setVerTodasMediciones] = useState(false);

  const [form, setForm] = useState({
    fecha: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    peso_kg: '',
    notas: '',
    foto_url: '',
  });
  const filaVacia = () => ({
    opcion: '',
    nombre: '',
    elemento: '',
    peso_kg: '',
  });
  const [ejercicios, setEjercicios] = useState([filaVacia()]);

  async function cargar() {
    const data = await obtenerProgreso(usuarioActual.id);
    setEntradas(data);
  }

  useEffect(() => {
    cargar();
  }, []);

  function agregarFilaEjercicio() {
    setEjercicios([...ejercicios, filaVacia()]);
  }

  function actualizarEjercicio(index, campo, valor) {
    setEjercicios((prev) =>
      prev.map((ej, i) => {
        if (i !== index) return ej;
        if (campo === 'opcion') {
          return { ...ej, opcion: valor, nombre: valor === OTRO ? '' : valor };
        }
        return { ...ej, [campo]: valor };
      })
    );
  }

  function quitarEjercicio(index) {
    setEjercicios(ejercicios.filter((_, i) => i !== index));
  }

  async function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy pesada. Usa una de menos de 5MB.');
      return;
    }
    try {
      const url = await subirImagen(file, 'progreso');
      setForm({ ...form, foto_url: url });
    } catch (err) {
      alert('Error al subir la foto: ' + err.message);
    }
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    const ejerciciosValidos = ejercicios
      .filter((ej) => ej.nombre.trim())
      .map((ej) => ({
        nombre: ej.nombre.trim(),
        ...(ej.elemento ? { elemento: ej.elemento } : {}),
        peso_kg: ej.peso_kg
          ? Number(String(ej.peso_kg).replace(',', '.'))
          : null,
      }));

    const resultado = await agregarProgreso({
      fecha: form.fecha,
      peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
      notas: form.notas.trim() || null,
      foto_url: form.foto_url || null,
      ejercicios: ejerciciosValidos,
    });
    setGuardando(false);
    setMensaje(resultado);
    if (resultado.ok) {
      setForm({
        fecha: (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            '0'
          )}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        peso_kg: '',
        notas: '',
        foto_url: '',
      });
      setEjercicios([filaVacia()]);
      await cargar();
      setTimeout(() => {
        setMostrarForm(false);
        setMensaje(null);
      }, 1000);
    }
  }

  async function handleEliminar(id) {
    await eliminarProgreso(id);
    setEliminandoId(null);
    await cargar();
  }

  const ultimoPeso = entradas?.[0]?.peso_kg ?? null;
  const pesoAnterior = entradas?.[1]?.peso_kg ?? null;
  const diferencia =
    ultimoPeso !== null && pesoAnterior !== null
      ? ultimoPeso - pesoAnterior
      : null;

  const TABS = [
    ...(tieneSeguimiento
      ? [{ key: 'coach', label: 'Con mi coach', icono: Target }]
      : []),
    { key: 'cargas', label: 'Mis cargas', icono: Dumbbell },
    { key: 'registro', label: 'Mi registro', icono: NotebookPen },
  ];
  const tabActiva = TABS.some((t) => t.key === tab) ? tab : TABS[0].key;

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white leading-tight">
        Mi Progreso
      </p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        Cada paso cuenta. Mira todo lo que has avanzado 📈
      </p>

      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-6">
        {TABS.map((t) => {
          const Icono = t.icono;
          const activa = tabActiva === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                activa ? 'bg-cyan-brand text-ink' : 'text-white/50'
              }`}
            >
              <Icono size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tabActiva === 'coach' && (
        <>
          <SeguimientoDashboard usuarioId={usuarioActual.id} />
          {misMediciones.length > 0 && (
            <div className="mt-6">
              <HistorialMediciones
                lista={
                  verTodasMediciones ? misMediciones : misMediciones.slice(0, 1)
                }
              />
              {misMediciones.length > 1 && (
                <button
                  onClick={() => setVerTodasMediciones(!verTodasMediciones)}
                  className="w-full flex items-center justify-center gap-1 text-cyan-brand text-sm font-medium py-3"
                >
                  <ChevronDown
                    size={16}
                    className={verTodasMediciones ? 'rotate-180' : ''}
                  />
                  {verTodasMediciones
                    ? 'Ver menos'
                    : `Ver las ${misMediciones.length} mediciones`}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {tabActiva === 'cargas' && (
        <>
          <CargasRutina
            registros={registrosPeso}
            usuarioId={usuarioActual.id}
          />
          {!(registrosPeso || []).some(
            (r) => String(r.usuario_id) === String(usuarioActual.id)
          ) && (
            <div className="text-center py-12">
              <Dumbbell size={34} className="text-white/15 mx-auto mb-3" />
              <p className="text-white font-display text-xl mb-1">
                Aún no hay cargas
              </p>
              <p className="text-white/40 text-sm">
                Anota tus pesos en Rutina y aquí verás cómo vas subiendo.
              </p>
            </div>
          )}
        </>
      )}

      {tabActiva === 'registro' && (
        <>
          <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-5">
            <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl" />
            <div className="relative flex items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">
                  <Activity size={13} /> Mi peso corporal
                </p>
                {ultimoPeso !== null ? (
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="font-display text-5xl text-white leading-none">
                      {String(ultimoPeso).replace('.', ',')}
                    </span>
                    <span className="text-white/50 text-sm">kg</span>
                  </div>
                ) : (
                  <p className="text-white/60 text-sm mt-2">
                    Registra tu peso para ver tu avance.
                  </p>
                )}
                {diferencia !== null && diferencia !== 0 && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold mt-2 rounded-full px-2 py-0.5 ${
                      diferencia < 0
                        ? 'bg-green-400/15 text-green-300'
                        : 'bg-yellow-400/15 text-yellow-200'
                    }`}
                  >
                    {diferencia < 0 ? (
                      <TrendingDown size={13} />
                    ) : (
                      <TrendingUp size={13} />
                    )}
                    {String(Math.round(Math.abs(diferencia) * 10) / 10).replace(
                      '.',
                      ','
                    )}{' '}
                    kg vs. el anterior
                  </span>
                )}
              </div>
              <button
                onClick={() => setMostrarForm(!mostrarForm)}
                className="flex items-center gap-1 bg-cyan-brand text-ink text-sm font-semibold px-3 py-2 rounded-xl shrink-0 transition-transform active:scale-95"
              >
                {mostrarForm ? <X size={16} /> : <Plus size={16} />}{' '}
                {mostrarForm ? 'Cerrar' : 'Registrar'}
              </button>
            </div>
          </div>

          {mostrarForm && (
            <form
              onSubmit={handleGuardar}
              className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 mb-6 flex flex-col gap-3"
            >
              <div>
                <label className="text-white/40 text-xs mb-1 block">
                  Fecha
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-semibold mb-0.5 block">
                  Peso corporal (kg)
                </label>
                <p className="text-white/35 text-[11px] mb-1.5">
                  Lo que marca la balanza. No es el peso de un ejercicio.
                </p>
                <input
                  type="number"
                  step="0.1"
                  value={form.peso_kg}
                  onChange={(e) =>
                    setForm({ ...form, peso_kg: e.target.value })
                  }
                  placeholder="Ej: 72,5"
                  inputMode="decimal"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                />
              </div>

              <div>
                <label className="text-white/70 text-xs font-semibold mb-0.5 block">
                  Ejercicios y peso controlado (opcional)
                </label>
                <p className="text-white/35 text-[11px] mb-2">
                  El peso que levantas bien, con buena técnica, en cada
                  ejercicio.
                </p>
                <div className="flex flex-col gap-2">
                  {ejercicios.map((ej, i) => (
                    <div
                      key={i}
                      className="bg-black/20 border border-white/[0.07] rounded-2xl p-2.5 flex flex-col gap-2"
                    >
                      <div className="flex gap-2">
                        <select
                          value={ej.opcion}
                          onChange={(e) =>
                            actualizarEjercicio(i, 'opcion', e.target.value)
                          }
                          className={`flex-1 min-w-0 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-brand ${
                            ej.opcion ? 'text-white' : 'text-white/40'
                          }`}
                        >
                          <option value="" className="bg-ink">
                            Ejercicio…
                          </option>
                          {EJERCICIOS_COMUNES.map((n) => (
                            <option
                              key={n}
                              value={n}
                              className="bg-ink text-white"
                            >
                              {n}
                            </option>
                          ))}
                          <option value={OTRO} className="bg-ink text-white">
                            Otro (escribir)
                          </option>
                        </select>
                        {ejercicios.length > 1 && (
                          <button
                            type="button"
                            onClick={() => quitarEjercicio(i)}
                            className="text-red-400/70 px-1 transition-transform active:scale-90"
                            aria-label="Quitar ejercicio"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      {ej.opcion === OTRO && (
                        <input
                          value={ej.nombre}
                          onChange={(e) =>
                            actualizarEjercicio(i, 'nombre', e.target.value)
                          }
                          placeholder="Escribe el ejercicio"
                          autoFocus
                          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
                        />
                      )}

                      <div className="flex gap-2">
                        <select
                          value={ej.elemento}
                          onChange={(e) =>
                            actualizarEjercicio(i, 'elemento', e.target.value)
                          }
                          className={`flex-1 min-w-0 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-brand ${
                            ej.elemento ? 'text-white' : 'text-white/40'
                          }`}
                        >
                          <option value="" className="bg-ink">
                            Elemento…
                          </option>
                          {ELEMENTOS.map((n) => (
                            <option
                              key={n}
                              value={n}
                              className="bg-ink text-white"
                            >
                              {n}
                            </option>
                          ))}
                        </select>
                        <div className="relative w-28 shrink-0">
                          <input
                            type="number"
                            step="0.5"
                            inputMode="decimal"
                            value={ej.peso_kg}
                            onChange={(e) =>
                              actualizarEjercicio(i, 'peso_kg', e.target.value)
                            }
                            placeholder="Peso"
                            className="w-full bg-black/30 border border-white/10 rounded-xl pl-3 pr-9 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs pointer-events-none">
                            kg
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={agregarFilaEjercicio}
                  className="flex items-center gap-1 text-cyan-brand text-xs font-medium mt-2 transition-transform active:scale-95"
                >
                  <Plus size={13} /> Agregar otro ejercicio
                </button>
              </div>

              <label className="flex items-center justify-center gap-2 bg-white/[0.02] border border-dashed border-white/20 rounded-xl py-3 text-sm text-white/60 cursor-pointer">
                <Camera size={15} />
                {form.foto_url ? 'Foto lista ✓' : 'Agregar foto (opcional)'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFoto}
                  className="hidden"
                />
              </label>

              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Notas (opcional)"
                rows={2}
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand transition-colors resize-none"
              />

              {mensaje && (
                <p
                  className={`text-sm ${
                    mensaje.ok ? 'text-cyan-brand' : 'text-red-400'
                  }`}
                >
                  {mensaje.ok ? 'Registro guardado.' : mensaje.mensaje}
                </p>
              )}

              <button
                type="submit"
                disabled={guardando}
                className="bg-cyan-brand text-ink font-bold rounded-xl py-3 text-sm tracking-wide disabled:opacity-50 transition-transform active:scale-[0.98]"
              >
                {guardando ? 'Guardando...' : 'Guardar registro'}
              </button>
            </form>
          )}

          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
            Historial
          </p>

          {entradas === null && (
            <p className="text-white/30 text-sm">Cargando...</p>
          )}
          {entradas && entradas.length === 0 && (
            <p className="text-white/30 text-sm">
              Aún no tienes registros. Toca "Registrar" para empezar.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {entradas?.map((e, i) => {
              const anterior = entradas[i + 1]?.peso_kg ?? null;
              const dif =
                e.peso_kg != null && anterior != null
                  ? Math.round((e.peso_kg - anterior) * 10) / 10
                  : null;
              return (
                <div
                  key={e.id}
                  className="bg-white/[0.04] border border-white/10 rounded-2xl p-3"
                >
                  <div className="flex items-start gap-3">
                    <FechaCuadro fechaISO={e.fecha} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          {e.peso_kg != null ? (
                            <p className="text-white font-display text-2xl leading-none">
                              {String(e.peso_kg).replace('.', ',')}{' '}
                              <span className="text-white/40 text-sm">kg</span>
                            </p>
                          ) : (
                            <p className="text-white/60 text-sm">Registro</p>
                          )}
                          {dif !== null && dif !== 0 && (
                            <span
                              className={`text-xs font-medium ${
                                dif < 0 ? 'text-green-300' : 'text-yellow-200'
                              }`}
                            >
                              {dif > 0 ? '+' : ''}
                              {String(dif).replace('.', ',')}
                            </span>
                          )}
                        </div>
                        {eliminandoId === e.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEliminar(e.id)}
                              className="text-red-400 text-xs font-semibold px-2 py-1 bg-red-500/20 rounded transition-transform active:scale-95"
                            >
                              Borrar
                            </button>
                            <button
                              onClick={() => setEliminandoId(null)}
                              className="text-white/50 text-xs px-2 py-1 bg-white/10 rounded transition-transform active:scale-95"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEliminandoId(e.id)}
                            className="text-white/20 hover:text-red-400 transition-colors p-1"
                            aria-label="Eliminar registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      {e.ejercicios?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {e.ejercicios.map((ej, k) => (
                            <span
                              key={k}
                              className="bg-white/[0.06] text-white/60 text-[11px] rounded-full px-2 py-0.5"
                            >
                              {ej.nombre}
                              {ej.elemento ? ` · ${ej.elemento}` : ''}
                              {ej.peso_kg
                                ? ` · ${String(ej.peso_kg).replace(
                                    '.',
                                    ','
                                  )} kg`
                                : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {e.notas && (
                        <p className="text-white/40 text-xs mt-1.5 italic">
                          {e.notas}
                        </p>
                      )}
                    </div>
                    {e.foto_url && (
                      <img
                        src={e.foto_url}
                        alt="Progreso"
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
