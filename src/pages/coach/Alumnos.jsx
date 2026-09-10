import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Dumbbell,
  Upload,
  Cake,
  Scale,
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

export default function Alumnos() {
  const navigate = useNavigate();
  const {
    usuarioActual,
    horarios,
    usuarios,
    reservas,
    crearRutina,
    importarContenidoRutina,
    asignarRutina,
    rutinaActivaDe,
    historialRutinasDe,
    obtenerProgreso,
  } = useAuth();

  const [abierto, setAbierto] = useState(null);
  const [pesoPorAlumno, setPesoPorAlumno] = useState({});
  const [importForm, setImportForm] = useState({
    nombre: '',
    link: '',
    archivo: null,
  });
  const [importando, setImportando] = useState(false);
  const [importMensaje, setImportMensaje] = useState(null);

  const misHorariosIds = horarios
    .filter((h) => h.coach_id === usuarioActual.id)
    .map((h) => h.id);

  const alumnosIds = [
    ...new Set(
      reservas
        .filter((r) => misHorariosIds.includes(r.horario_id))
        .map((r) => r.usuario_id)
    ),
  ];

  const alumnos = alumnosIds
    .map((id) => usuarios.find((u) => u.id === id))
    .filter(Boolean);

  async function handleImportarYAsignar(usuarioId) {
    if (!importForm.nombre.trim() || !importForm.archivo) {
      setImportMensaje({
        ok: false,
        mensaje: 'Ponle un nombre a la rutina y elige el archivo Excel.',
      });
      return;
    }
    setImportando(true);
    setImportMensaje(null);
    try {
      const { leerArchivoExcel } = await import('../../lib/excelRutinaParser');
      const datosSemanas = await leerArchivoExcel(importForm.archivo);
      if (Object.keys(datosSemanas).length === 0) {
        setImportMensaje({
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
      await asignarRutina(usuarioId, nueva.id);
      setImportMensaje({
        ok: true,
        mensaje: `Rutina importada con ${
          Object.keys(datosSemanas).length
        } semana(s).`,
      });
      setImportForm({ nombre: '', link: '', archivo: null });
      setTimeout(() => setImportMensaje(null), 1500);
    } catch (err) {
      setImportMensaje({
        ok: false,
        mensaje: 'No pude leer ese archivo. Revisa que sea un .xlsx válido.',
      });
    }
    setImportando(false);
  }

  async function toggleAbierto(alumnoId) {
    const yaAbierto = abierto === alumnoId;
    setAbierto(yaAbierto ? null : alumnoId);
    if (!yaAbierto && pesoPorAlumno[alumnoId] === undefined) {
      const datos = await obtenerProgreso(alumnoId);
      setPesoPorAlumno((prev) => ({
        ...prev,
        [alumnoId]: datos?.[0]?.peso_kg ?? null,
      }));
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return '';
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white leading-tight">Alumnos</p>
      <p className="text-white/40 text-xs mt-1 mb-6">
        Gestiona rutinas de tus alumnos
      </p>

      {alumnos.length === 0 && (
        <p className="text-white/40 text-sm">
          Todavía no tienes alumnos inscritos.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {alumnos.map((a) => {
          const abiertoAqui = abierto === a.id;
          const rutinaActiva = rutinaActivaDe(a.id);
          const historial = historialRutinasDe(a.id).filter((h) => !h.activa);

          return (
            <div
              key={a.id}
              className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggleAbierto(a.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-brand/15 border border-cyan-brand/40 flex items-center justify-center">
                    <span className="font-display text-cyan-brand text-sm">
                      {a.nombre.charAt(0)}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">{a.nombre}</p>
                    <p className="text-white/40 text-xs">
                      {rutinaActiva
                        ? rutinaActiva.nombre
                        : 'Sin rutina asignada'}
                    </p>
                  </div>
                </div>
                {abiertoAqui ? (
                  <ChevronUp size={18} className="text-white/40" />
                ) : (
                  <ChevronDown size={18} className="text-white/40" />
                )}
              </button>

              {abiertoAqui && (
                <div className="border-t border-white/10 p-4 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wide mb-1">
                        <Cake size={12} /> Edad
                      </div>
                      <p className="text-white font-display text-lg leading-none">
                        {calcularEdad(a.fecha_nacimiento) !== null
                          ? `${calcularEdad(a.fecha_nacimiento)} años`
                          : '—'}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wide mb-1">
                        <Scale size={12} /> Peso actual
                      </div>
                      <p className="text-white font-display text-lg leading-none">
                        {pesoPorAlumno[a.id]
                          ? `${pesoPorAlumno[a.id]} kg`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                      Rutina actual
                    </p>
                    {rutinaActiva ? (
                      <button
                        onClick={() => navigate(`/rutinas/${rutinaActiva.id}`)}
                        className="w-full flex items-center gap-2 bg-cyan-brand/10 border border-cyan-brand/30 rounded-xl px-3 py-2.5 transition-transform active:scale-[0.98]"
                      >
                        <Dumbbell size={16} className="text-cyan-brand" />
                        <div className="text-left flex-1">
                          <p className="text-white text-sm">
                            {rutinaActiva.nombre}
                          </p>
                          <p className="text-white/40 text-xs">
                            desde{' '}
                            {formatearFecha(rutinaActiva.fecha_asignacion)}
                          </p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-cyan-brand/60"
                        />
                      </button>
                    ) : (
                      <p className="text-white/30 text-sm">
                        Sin rutina asignada.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                      Importar rutina desde Excel
                    </p>

                    <div className="flex flex-col gap-2 bg-black/20 border border-white/10 rounded-xl p-3">
                      <input
                        value={importForm.nombre}
                        onChange={(e) =>
                          setImportForm({
                            ...importForm,
                            nombre: e.target.value,
                          })
                        }
                        placeholder="Nombre de la rutina"
                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                      />
                      <input
                        value={importForm.link}
                        onChange={(e) =>
                          setImportForm({ ...importForm, link: e.target.value })
                        }
                        placeholder="Link de Google Sheets (opcional, solo referencia)"
                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                      />
                      <p className="text-white/40 text-xs -mt-1">
                        El link es solo una referencia visual. El contenido de
                        la rutina siempre se carga desde el archivo Excel de
                        abajo.
                      </p>
                      <label className="flex items-center justify-center gap-2 bg-white/5 border border-dashed border-white/20 rounded-lg py-3 text-sm text-white/60 cursor-pointer">
                        <Upload size={15} />
                        {importForm.archivo
                          ? importForm.archivo.name
                          : 'Elegir archivo Excel (.xlsx)'}
                        <input
                          type="file"
                          accept=".xlsx"
                          onChange={(e) =>
                            setImportForm({
                              ...importForm,
                              archivo: e.target.files[0],
                            })
                          }
                          className="hidden"
                        />
                      </label>
                      {importMensaje && (
                        <p
                          className={`text-xs ${
                            importMensaje.ok
                              ? 'text-cyan-brand'
                              : 'text-red-400'
                          }`}
                        >
                          {importMensaje.mensaje}
                        </p>
                      )}
                      <button
                        onClick={() => handleImportarYAsignar(a.id)}
                        disabled={importando}
                        className="bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
                      >
                        {importando ? 'Importando...' : 'Importar y asignar'}
                      </button>
                    </div>
                  </div>

                  {historial.length > 0 && (
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                        Historial
                      </p>
                      <div className="flex flex-col gap-1">
                        {historial.map((h) => (
                          <p key={h.id} className="text-white/50 text-xs">
                            {h.rutina.nombre} ·{' '}
                            {formatearFecha(h.fecha_asignacion)} a{' '}
                            {formatearFecha(h.fecha_fin)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
