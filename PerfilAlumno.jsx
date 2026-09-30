import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatearRut, formatearTelefono } from '../../lib/formato';
import { horaAFecha } from '../../lib/horarioUtils';
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Dumbbell,
  Upload,
  ChevronRight,
  Scale,
  Plus,
  CalendarClock,
  CalendarCheck,
} from 'lucide-react';

function formatearFecha(fecha) {
  if (!fecha) return '';
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const OPCIONES_LIMITE = [12, 24, 36, 48, 'todas'];

export default function PerfilAlumno() {
  const { usuarioId } = useParams();
  const navigate = useNavigate();
  const {
    usuarios,
    reservas,
    horarios,
    actualizarPerfil,
    crearRutina,
    importarContenidoRutina,
    asignarRutina,
    rutinaActivaDe,
    historialRutinasDe,
    obtenerProgreso,
    agregarProgresoAdmin,
  } = useAuth();

  const usuario = usuarios.find((u) => u.id === usuarioId);

  const [tabHistorial, setTabHistorial] = useState('reservadas');
  const [limiteRealizadas, setLimiteRealizadas] = useState(12);

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeDatos, setMensajeDatos] = useState(null);

  const [progreso, setProgreso] = useState(null);
  const [pesoNuevo, setPesoNuevo] = useState('');
  const [guardandoPeso, setGuardandoPeso] = useState(false);

  const [importForm, setImportForm] = useState({
    nombre: '',
    link: '',
    archivo: null,
  });
  const [importando, setImportando] = useState(false);
  const [importMensaje, setImportMensaje] = useState(null);

  useEffect(() => {
    if (usuario) {
      setForm({
        nombre: usuario.nombre || '',
        rut: formatearRut(usuario.rut || ''),
        nacionalidad: usuario.nacionalidad || '',
        fecha_nacimiento: usuario.fecha_nacimiento || '',
        telefono: usuario.telefono || '',
        correo: usuario.correo || '',
      });
    }
  }, [usuario?.id]);

  useEffect(() => {
    if (usuarioId) {
      obtenerProgreso(usuarioId).then(setProgreso);
    }
  }, [usuarioId]);

  if (!usuario) {
    return (
      <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
        <p className="text-white/40 text-sm">No encontré a este alumno.</p>
        <button
          onClick={() => navigate('/usuarios')}
          className="text-cyan-brand text-sm mt-3"
        >
          Volver a Usuarios
        </button>
      </div>
    );
  }

  const rutinaActiva = rutinaActivaDe(usuario.id);
  const historial = historialRutinasDe(usuario.id).filter((h) => !h.activa);

  const ahora = Date.now();
  const misReservas = reservas
    .filter((r) => r.usuario_id === usuario.id && r.estado === 'confirmada')
    .map((r) => ({
      ...r,
      horario: horarios.find((h) => h.id === r.horario_id),
    }))
    .filter((r) => r.horario);

  const reservadas = misReservas
    .filter((r) => horaAFecha(r.fecha, r.horario.hora).getTime() >= ahora)
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        a.horario.hora.localeCompare(b.horario.hora)
    );

  const realizadasTodas = misReservas
    .filter((r) => horaAFecha(r.fecha, r.horario.hora).getTime() < ahora)
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        b.horario.hora.localeCompare(a.horario.hora)
    );

  const realizadas =
    limiteRealizadas === 'todas'
      ? realizadasTodas
      : realizadasTodas.slice(0, limiteRealizadas);

  async function handleGuardarDatos() {
    setGuardando(true);
    const resultado = await actualizarPerfil(usuario.id, form);
    setMensajeDatos(resultado);
    setGuardando(false);
    if (resultado.ok) {
      setTimeout(() => {
        setEditando(false);
        setMensajeDatos(null);
      }, 900);
    }
  }

  async function handleAgregarPeso() {
    if (!pesoNuevo || Number(pesoNuevo) <= 0) return;
    setGuardandoPeso(true);
    const resultado = await agregarProgresoAdmin(usuario.id, {
      peso_kg: Number(pesoNuevo),
      fecha: new Date().toISOString().slice(0, 10),
    });
    if (resultado.ok) {
      setProgreso((prev) => [resultado.data, ...(prev || [])]);
      setPesoNuevo('');
    }
    setGuardandoPeso(false);
  }

  async function handleImportarYAsignar() {
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
      await asignarRutina(usuario.id, nueva.id);
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

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate('/usuarios')}
        className="flex items-center gap-1.5 text-white/50 text-sm mb-4"
      >
        <ArrowLeft size={16} /> Usuarios
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-full bg-cyan-brand/15 border border-cyan-brand/40 flex items-center justify-center shrink-0">
          <span className="font-display text-cyan-brand text-xl">
            {usuario.nombre.charAt(0)}
          </span>
        </div>
        <div>
          <p className="text-white font-display text-xl leading-tight">
            {usuario.nombre}
          </p>
          <p className="text-white/40 text-xs">{usuario.correo}</p>
        </div>
      </div>

      {/* --- Datos personales --- */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs uppercase tracking-wide">
            Datos personales
          </p>
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="text-cyan-brand/80 flex items-center gap-1 text-xs"
            >
              <Pencil size={13} /> Editar
            </button>
          )}
        </div>

        {editando ? (
          <div className="flex flex-col gap-2">
            <Campo
              label="Nombre"
              value={form.nombre}
              onChange={(v) => setForm({ ...form, nombre: v })}
            />
            <Campo
              label="RUT"
              value={form.rut}
              onChange={(v) => setForm({ ...form, rut: formatearRut(v) })}
            />
            <Campo
              label="Nacionalidad"
              value={form.nacionalidad}
              onChange={(v) => setForm({ ...form, nacionalidad: v })}
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
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
              />
            </div>
            <Campo
              label="Teléfono"
              value={form.telefono}
              onChange={(v) =>
                setForm({ ...form, telefono: formatearTelefono(v) })
              }
            />
            <Campo
              label="Correo"
              value={form.correo}
              onChange={(v) => setForm({ ...form, correo: v })}
            />

            {mensajeDatos && (
              <p
                className={`text-xs ${
                  mensajeDatos.ok ? 'text-cyan-brand' : 'text-red-400'
                }`}
              >
                {mensajeDatos.mensaje}
              </p>
            )}

            <div className="flex gap-2 mt-1">
              <button
                onClick={handleGuardarDatos}
                disabled={guardando}
                className="flex-1 flex items-center justify-center gap-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
              >
                <Check size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setEditando(false);
                  setMensajeDatos(null);
                }}
                className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white rounded-lg py-2 text-sm"
              >
                <X size={15} /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 text-sm">
            <Dato label="RUT" valor={formatearRut(usuario.rut)} />
            <Dato label="Nacionalidad" valor={usuario.nacionalidad} />
            <Dato
              label="Fecha de nacimiento"
              valor={
                usuario.fecha_nacimiento
                  ? formatearFecha(usuario.fecha_nacimiento)
                  : null
              }
            />
            <Dato label="Teléfono" valor={usuario.telefono} />
          </div>
        )}
      </div>

      {/* --- Peso / progreso --- */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
        <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
          Peso
        </p>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wide mb-1">
              <Scale size={12} /> Peso actual
            </div>
            <p className="text-white font-display text-lg leading-none">
              {progreso?.[0]?.peso_kg ? `${progreso[0].peso_kg} kg` : '—'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-2">
          <input
            type="number"
            step="0.1"
            value={pesoNuevo}
            onChange={(e) => setPesoNuevo(e.target.value)}
            placeholder="Nuevo peso (kg)"
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
          />
          <button
            onClick={handleAgregarPeso}
            disabled={guardandoPeso}
            className="flex items-center gap-1 bg-cyan-brand text-ink font-semibold rounded-lg px-3 text-sm disabled:opacity-50"
          >
            <Plus size={15} /> Registrar
          </button>
        </div>

        {progreso && progreso.length > 1 && (
          <div className="flex flex-col gap-1 mt-2">
            {progreso.slice(1, 6).map((p) => (
              <p key={p.id} className="text-white/40 text-xs">
                {p.peso_kg} kg · {formatearFecha(p.fecha)}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* --- Rutina --- */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
        <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
          Rutina actual
        </p>
        {rutinaActiva ? (
          <button
            onClick={() => navigate(`/rutinas/${rutinaActiva.id}`)}
            className="w-full flex items-center gap-2 bg-cyan-brand/10 border border-cyan-brand/30 rounded-xl px-3 py-2.5 mb-4 transition-transform active:scale-[0.98]"
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
          <p className="text-white/30 text-sm mb-4">
            Sin rutina asignada todavía.
          </p>
        )}

        <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
          {rutinaActiva
            ? 'Reemplazar rutina desde Excel'
            : 'Cargar rutina inicial desde Excel'}
        </p>
        <div className="flex flex-col gap-2 bg-black/20 border border-white/10 rounded-xl p-3">
          <input
            value={importForm.nombre}
            onChange={(e) =>
              setImportForm({ ...importForm, nombre: e.target.value })
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
          {importMensaje && (
            <p
              className={`text-xs ${
                importMensaje.ok ? 'text-cyan-brand' : 'text-red-400'
              }`}
            >
              {importMensaje.mensaje}
            </p>
          )}
          <button
            onClick={handleImportarYAsignar}
            disabled={importando}
            className="bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            {importando
              ? 'Importando...'
              : rutinaActiva
              ? 'Importar y reemplazar'
              : 'Importar y asignar'}
          </button>
        </div>

        {historial.length > 0 && (
          <div className="mt-4">
            <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
              Historial de rutinas
            </p>
            <div className="flex flex-col gap-1">
              {historial.map((h) => (
                <p key={h.id} className="text-white/50 text-xs">
                  {h.rutina.nombre} · {formatearFecha(h.fecha_asignacion)} a{' '}
                  {formatearFecha(h.fecha_fin)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- Historial de clases --- */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mt-4">
        <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
          Historial de clases
        </p>

        <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-3">
          <button
            onClick={() => setTabHistorial('reservadas')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tabHistorial === 'reservadas'
                ? 'bg-cyan-brand text-ink'
                : 'text-white/50'
            }`}
          >
            Reservadas
          </button>
          <button
            onClick={() => setTabHistorial('realizadas')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tabHistorial === 'realizadas'
                ? 'bg-cyan-brand text-ink'
                : 'text-white/50'
            }`}
          >
            Realizadas
          </button>
        </div>

        {tabHistorial === 'reservadas' &&
          (reservadas.length === 0 ? (
            <div className="text-center py-10">
              <CalendarClock size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Sin reservas próximas.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {reservadas.map((r) => (
                <div
                  key={r.id}
                  className="bg-black/20 border border-white/10 rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white text-sm">
                      {formatearFecha(r.fecha)}
                    </p>
                    <p className="text-white/40 text-xs">
                      {r.horario.hora} · {r.horario.coach_nombre || 'Sin coach'}
                    </p>
                  </div>
                  <CalendarClock
                    size={16}
                    className="text-cyan-brand/50 shrink-0"
                  />
                </div>
              ))}
            </div>
          ))}

        {tabHistorial === 'realizadas' && (
          <>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {OPCIONES_LIMITE.map((op) => (
                <button
                  key={op}
                  onClick={() => setLimiteRealizadas(op)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    limiteRealizadas === op
                      ? 'bg-cyan-brand text-ink border-cyan-brand'
                      : 'bg-white/[0.03] text-white/50 border-white/10'
                  }`}
                >
                  {op === 'todas' ? 'Todas' : `Últimas ${op}`}
                </button>
              ))}
            </div>

            {realizadas.length === 0 ? (
              <div className="text-center py-10">
                <CalendarCheck
                  size={32}
                  className="text-white/15 mx-auto mb-3"
                />
                <p className="text-white/30 text-sm">
                  Aún no tiene clases realizadas.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {realizadas.map((r) => (
                  <div
                    key={r.id}
                    className="bg-black/20 border border-white/10 rounded-xl p-3 flex items-center justify-between opacity-80"
                  >
                    <div>
                      <p className="text-white/80 text-sm">
                        {formatearFecha(r.fecha)}
                      </p>
                      <p className="text-white/40 text-xs">
                        {r.horario.hora} ·{' '}
                        {r.horario.coach_nombre || 'Sin coach'}
                      </p>
                    </div>
                    <CalendarCheck
                      size={16}
                      className="text-white/20 shrink-0"
                    />
                  </div>
                ))}
                {limiteRealizadas !== 'todas' &&
                  realizadasTodas.length > limiteRealizadas && (
                    <p className="text-white/20 text-xs text-center mt-1">
                      Mostrando {realizadas.length} de {realizadasTodas.length}
                    </p>
                  )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Campo({ label, value, onChange }) {
  return (
    <div>
      <label className="text-white/40 text-xs mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
      />
    </div>
  );
}

function Dato({ label, valor }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
      <span className="text-white">{valor || '—'}</span>
    </div>
  );
}
