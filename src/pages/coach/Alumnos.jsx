import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Dumbbell,
  Plus,
  Upload,
} from 'lucide-react';

export default function Alumnos() {
  const navigate = useNavigate();
  const {
    usuarioActual,
    horarios,
    usuarios,
    reservas,
    rutinas,
    crearRutina,
    importarContenidoRutina,
    asignarRutina,
    rutinaActivaDe,
    historialRutinasDe,
  } = useAuth();

  const [abierto, setAbierto] = useState(null);
  const [seleccion, setSeleccion] = useState({});
  const [modo, setModo] = useState('seleccionar');
  const [nuevaRutinaNombre, setNuevaRutinaNombre] = useState('');
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

  async function handleAsignar(usuarioId) {
    const rutinaId = seleccion[usuarioId];
    if (!rutinaId) return;
    await asignarRutina(usuarioId, rutinaId);
  }

  async function handleCrearYAsignar(usuarioId) {
    if (!nuevaRutinaNombre.trim()) return;
    const nueva = await crearRutina(nuevaRutinaNombre.trim());
    if (nueva) {
      await asignarRutina(usuarioId, nueva.id);
    }
    setNuevaRutinaNombre('');
    setModo('seleccionar');
  }

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
      setTimeout(() => {
        setModo('seleccionar');
        setImportMensaje(null);
      }, 1500);
    } catch (err) {
      setImportMensaje({
        ok: false,
        mensaje: 'No pude leer ese archivo. Revisa que sea un .xlsx válido.',
      });
    }
    setImportando(false);
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
      <p className="font-display text-3xl text-white mb-6">Alumnos</p>

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
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setAbierto(abiertoAqui ? null : a.id)}
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
                      Asignar rutina
                    </p>

                    {modo === 'seleccionar' && (
                      <div className="flex gap-2">
                        <select
                          value={seleccion[a.id] || ''}
                          onChange={(e) =>
                            setSeleccion({
                              ...seleccion,
                              [a.id]: e.target.value,
                            })
                          }
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
                        >
                          <option value="">Selecciona una rutina</option>
                          {rutinas.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAsignar(a.id)}
                          className="bg-cyan-brand text-ink font-semibold rounded-lg px-4 text-sm"
                        >
                          Asignar
                        </button>
                      </div>
                    )}

                    {modo === 'nueva' && (
                      <div className="flex gap-2">
                        <input
                          value={nuevaRutinaNombre}
                          onChange={(e) => setNuevaRutinaNombre(e.target.value)}
                          placeholder="Nombre de la nueva rutina"
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
                        />
                        <button
                          onClick={() => handleCrearYAsignar(a.id)}
                          className="bg-cyan-brand text-ink font-semibold rounded-lg px-4 text-sm"
                        >
                          Crear
                        </button>
                      </div>
                    )}

                    {modo === 'importar' && (
                      <div className="flex flex-col gap-2 bg-black/20 border border-white/10 rounded-lg p-3">
                        <input
                          value={importForm.nombre}
                          onChange={(e) =>
                            setImportForm({
                              ...importForm,
                              nombre: e.target.value,
                            })
                          }
                          placeholder="Nombre de la rutina"
                          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
                        />
                        <input
                          value={importForm.link}
                          onChange={(e) =>
                            setImportForm({
                              ...importForm,
                              link: e.target.value,
                            })
                          }
                          placeholder="Link de Google Sheets (opcional)"
                          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
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
                          className="bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
                        >
                          {importando ? 'Importando...' : 'Importar y asignar'}
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() =>
                          setModo(modo === 'nueva' ? 'seleccionar' : 'nueva')
                        }
                        className="flex items-center gap-1 text-cyan-brand text-xs font-medium"
                      >
                        <Plus size={13} />{' '}
                        {modo === 'nueva'
                          ? 'Elegir una existente'
                          : 'Crear rutina nueva'}
                      </button>
                      <button
                        onClick={() =>
                          setModo(
                            modo === 'importar' ? 'seleccionar' : 'importar'
                          )
                        }
                        className="flex items-center gap-1 text-cyan-brand text-xs font-medium"
                      >
                        <Upload size={13} />{' '}
                        {modo === 'importar'
                          ? 'Cancelar'
                          : 'Importar desde Excel'}
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
                          <p key={h.id} className="text-white/40 text-xs">
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
