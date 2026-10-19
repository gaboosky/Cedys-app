import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Dumbbell,
  ChevronRight,
  Upload,
  Play,
  Settings,
  Check,
  AlertCircle,
  X,
  RotateCcw,
  Calendar,
} from 'lucide-react';

// Último día de rutina que abrió el alumno (se guarda en este celular)
function leerUltimoDia(rutinaId) {
  try {
    const d = JSON.parse(localStorage.getItem('cedys_rutina_ultima') || 'null');
    return d && d.rutinaId === rutinaId ? d : null;
  } catch {
    return null;
  }
}

export default function MiRutina() {
  const navigate = useNavigate();
  const {
    usuarioActual,
    crearRutina,
    importarContenidoRutina,
    asignarRutina,
    rutinaActivaDe,
    historialRutinasDe,
  } = useAuth();

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', link: '', archivo: null });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const rutinaActiva = rutinaActivaDe(usuarioActual.id);
  const ultimoDia = rutinaActiva ? leerUltimoDia(rutinaActiva.id) : null;
  const primerNombre =
    (usuarioActual.nombre || '').trim().split(/\s+/)[0] || '';
  const semanasActiva = rutinaActiva?.fecha_asignacion
    ? Math.max(
        1,
        Math.floor(
          (Date.now() -
            new Date(rutinaActiva.fecha_asignacion + 'T00:00:00').getTime()) /
            (7 * 86400000)
        ) + 1
      )
    : null;
  const historial = historialRutinasDe(usuarioActual.id).filter(
    (h) => !h.activa
  );

  function formatearFecha(fecha) {
    if (!fecha) return '';
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  async function handleActualizar() {
    if (!form.nombre.trim() || !form.archivo) {
      setMensaje({
        ok: false,
        mensaje: 'Ponle un nombre a la rutina y elige el archivo Excel.',
      });
      return;
    }
    setEnviando(true);
    setMensaje(null);
    try {
      const { leerArchivoExcel } = await import('../lib/excelRutinaParser');
      const datosSemanas = await leerArchivoExcel(form.archivo);
      if (Object.keys(datosSemanas).length === 0) {
        setMensaje({
          ok: false,
          mensaje: 'No encontré hojas con formato "Semana X" en ese archivo.',
        });
        setEnviando(false);
        return;
      }
      const nueva = await crearRutina(form.nombre.trim(), form.link.trim());
      await importarContenidoRutina(nueva.id, datosSemanas);
      await asignarRutina(usuarioActual.id, nueva.id);
      setMensaje({ ok: true, mensaje: 'Tu rutina fue actualizada.' });
      setForm({ nombre: '', link: '', archivo: null });
      setTimeout(() => {
        setMostrarForm(false);
        setMensaje(null);
      }, 1500);
    } catch (err) {
      setMensaje({
        ok: false,
        mensaje: 'No pude leer ese archivo. Revisa que sea un .xlsx válido.',
      });
    }
    setEnviando(false);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white leading-tight">
        Mi Rutina
      </p>
      <p className="text-white/40 text-xs mt-1 mb-5">
        {rutinaActiva
          ? `¡Vamos${
              primerNombre ? ', ' + primerNombre : ''
            }! Hoy toca darlo todo 💪`
          : 'Tu plan de entrenamiento'}
      </p>

      {rutinaActiva ? (
        <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-3">
          <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl" />
          <Dumbbell
            size={120}
            className="absolute -right-6 -top-4 text-cyan-brand/[0.07] rotate-[-30deg]"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-cyan-brand/15 border border-cyan-brand/30 text-cyan-brand text-[11px] font-semibold rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-brand animate-pulse" />{' '}
              Rutina activa
            </span>
            <p
              className="font-display text-white leading-tight mt-3"
              style={{ fontSize: '2rem' }}
            >
              {rutinaActiva.nombre}
            </p>
            <p className="text-white/45 text-xs mt-1.5 flex items-center gap-1.5">
              <Calendar size={12} /> Desde el{' '}
              {formatearFecha(rutinaActiva.fecha_asignacion)}
              {semanasActiva ? ` · semana ${semanasActiva} con este plan` : ''}
            </p>

            {ultimoDia && (
              <button
                onClick={() =>
                  navigate(
                    `/rutinas/${rutinaActiva.id}/semanas/${ultimoDia.semanaId}/dias/${ultimoDia.diaId}`
                  )
                }
                className="w-full flex items-center gap-3 bg-white/[0.07] border border-white/10 rounded-2xl p-3 mt-5 text-left transition-transform active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <RotateCcw size={18} className="text-cyan-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/45 text-[11px] uppercase tracking-wide">
                    Continuar donde quedaste
                  </p>
                  <p className="text-white font-semibold truncate">
                    Semana {ultimoDia.semanaNumero} · {ultimoDia.diaNombre}
                  </p>
                </div>
                <ChevronRight size={18} className="text-white/40" />
              </button>
            )}

            <button
              onClick={() => navigate(`/rutinas/${rutinaActiva.id}`)}
              className={`w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-bold rounded-2xl py-4 text-sm tracking-wide transition-transform active:scale-[0.98] ${
                ultimoDia ? 'mt-2' : 'mt-5'
              }`}
            >
              <Play size={16} fill="currentColor" />{' '}
              {ultimoDia ? 'VER TODA LA RUTINA' : 'COMENZAR ENTRENAMIENTO'}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/20 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink text-center px-6 py-10 mb-3">
          <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-cyan-brand/15 flex items-center justify-center mx-auto mb-4">
              <Dumbbell size={30} className="text-cyan-brand" />
            </div>
            <p className="text-white font-display text-2xl mb-1">
              Aún no tienes una rutina
            </p>
            <p className="text-white/50 text-sm mb-6">
              Tu coach puede asignarte un plan de entrenamiento o puedes
              importar tu propia rutina.
            </p>
            {!mostrarForm && (
              <button
                onClick={() => setMostrarForm(true)}
                className="inline-flex items-center gap-2 bg-cyan-brand text-ink font-bold rounded-2xl px-6 py-3 text-sm transition-transform active:scale-[0.98]"
              >
                <Upload size={16} /> Importar mi rutina
              </button>
            )}
          </div>
        </div>
      )}

      {rutinaActiva && !mostrarForm && (
        <button
          onClick={() => setMostrarForm(true)}
          className="flex items-center justify-center gap-2 w-full text-white/50 text-xs font-medium py-2 mb-6 hover:text-white/80 transition-colors"
        >
          <Settings size={13} /> ACTUALIZAR MI RUTINA
        </button>
      )}

      {mostrarForm && (
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 mb-6">
          <p className="text-white font-display text-lg leading-tight">
            Importar nueva rutina
          </p>
          <p className="text-white/40 text-xs mt-1 mb-4">
            Completa los datos e importa tu archivo de entrenamiento.
          </p>

          <div className="flex flex-col gap-3">
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Fuerza & Rendimiento"
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            />
            <div>
              <label className="text-white/40 text-xs mb-1 block">
                Google Sheets (opcional, solo referencia)
              </label>
              <input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="Pega el enlace de tu rutina"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
              />
              <p className="text-white/30 text-xs mt-1">
                El link es solo una referencia visual. El contenido de la rutina
                siempre se carga desde el archivo Excel de abajo.
              </p>
            </div>

            <label
              className={`flex flex-col items-center justify-center gap-1 border border-dashed rounded-2xl py-6 cursor-pointer transition-colors ${
                form.archivo
                  ? 'border-cyan-brand/50 bg-cyan-brand/5'
                  : 'border-white/20 bg-white/[0.02]'
              }`}
            >
              {form.archivo ? (
                <>
                  <Check size={22} className="text-cyan-brand mb-1" />
                  <span className="text-cyan-brand text-sm font-medium">
                    {form.archivo.name}
                  </span>
                </>
              ) : (
                <>
                  <Upload size={22} className="text-white/40 mb-1" />
                  <span className="text-white/70 text-sm font-medium">
                    Importar archivo
                  </span>
                  <span className="text-white/30 text-xs">
                    Selecciona un archivo .xlsx
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) =>
                  setForm({ ...form, archivo: e.target.files[0] })
                }
                className="hidden"
              />
            </label>

            {mensaje && (
              <div
                className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border ${
                  mensaje.ok
                    ? 'bg-cyan-brand/10 border-cyan-brand/30 text-cyan-brand'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {mensaje.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                {mensaje.mensaje}
              </div>
            )}

            <div className="flex gap-2 mt-1">
              <button
                onClick={handleActualizar}
                disabled={enviando}
                className="flex-1 bg-cyan-brand text-ink font-bold rounded-xl py-3 text-sm tracking-wide disabled:opacity-50 transition-transform active:scale-[0.98]"
              >
                {enviando ? 'Importando...' : 'IMPORTAR RUTINA'}
              </button>
              <button
                onClick={() => {
                  setMostrarForm(false);
                  setMensaje(null);
                }}
                className="flex-1 bg-white/10 text-white rounded-xl py-3 text-sm font-medium transition-transform active:scale-[0.98]"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {historial.length > 0 && (
        <div className="mt-2">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
            Historial de rutinas
          </p>
          <div className="flex flex-col gap-2">
            {historial.map((h) => (
              <button
                key={h.id}
                onClick={() => navigate(`/rutinas/${h.rutina.id}`)}
                className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-left transition-transform active:scale-[0.98]"
              >
                <div>
                  <p className="text-white/60 text-sm">{h.rutina.nombre}</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    {formatearFecha(h.fecha_asignacion)} —{' '}
                    {formatearFecha(h.fecha_fin)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-[10px] font-semibold uppercase tracking-wide bg-white/5 px-2 py-1 rounded-full">
                    Finalizada
                  </span>
                  <ChevronRight size={14} className="text-white/20" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
