import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Trash2,
  Plus,
  Pencil,
  CalendarX,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_INDICE = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
};

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFechaLarga(fechaISO) {
  if (!fechaISO) return '';
  const fecha = new Date(fechaISO + 'T00:00:00');
  return capitalizar(
    fecha.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );
}

function proximaFechaParaDia(nombreDia) {
  const objetivo = DIAS_INDICE[nombreDia];
  const hoy = new Date();
  for (let i = 0; i < 8; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);
    if (fecha.getDay() === objetivo)
      return formatFechaLarga(fecha.toISOString().slice(0, 10));
  }
  return '';
}

function nombreDiaDeFecha(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  const nombres = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];
  return nombres[fecha.getDay()];
}

function proximosDiasHabiles(cantidad = 14) {
  const dias = [];
  const hoy = new Date();
  let offset = 0;
  while (dias.length < cantidad) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + offset);
    if (fecha.getDay() !== 0) {
      const nombreDia = capitalizar(
        fecha.toLocaleDateString('es-CL', { weekday: 'long' })
      );
      dias.push({
        key: fecha.toISOString().slice(0, 10),
        nombreDia,
        fechaLarga: formatFechaLarga(fecha.toISOString().slice(0, 10)),
        esHoy: offset === 0,
      });
    }
    offset++;
  }
  return dias;
}

// Un horario aplica a esa fecha si: es único y coincide exacto, o es recurrente y coincide el día de semana
function horarioAplicaEnFecha(h, diaClave, diaNombre) {
  if (h.fecha_unica) return h.fecha_unica === diaClave;
  return h.dia === diaNombre;
}

export default function ClasesAdmin() {
  const {
    horarios,
    usuarios,
    crearClase,
    eliminarClase,
    editarClase,
    horarioEstaCancelado,
    mensajeCancelacionDe,
    cancelarHorarioFecha,
    reactivarHorarioFecha,
  } = useAuth();

  const [mostrarFormFija, setMostrarFormFija] = useState(false);
  const [mostrarFormPuntual, setMostrarFormPuntual] = useState(false);
  const [form, setForm] = useState({
    dia: 'Lunes',
    hora: '',
    coach_id: '',
    cupo_max: 6,
  });
  const [formPuntual, setFormPuntual] = useState({
    fecha_unica: '',
    hora: '',
    coach_id: '',
    cupo_max: 6,
  });
  const [mensajeCrear, setMensajeCrear] = useState(null);

  const [diaAbierto, setDiaAbierto] = useState(0);
  const [editandoId, setEditandoId] = useState(null);
  const [formEdicion, setFormEdicion] = useState({});
  const [cancelandoClave, setCancelandoClave] = useState(null);
  const [mensajeCancel, setMensajeCancel] = useState('');
  const [eliminandoId, setEliminandoId] = useState(null);

  const coaches = usuarios.filter((u) => u.rol === 'coach');
  const dias = proximosDiasHabiles(14);

  async function handleCrearFija(e) {
    e.preventDefault();
    if (!form.hora || !form.coach_id) return;
    const coach = coaches.find((c) => c.id === form.coach_id);
    const resultado = await crearClase({
      dia: form.dia,
      hora: form.hora,
      coach_id: form.coach_id,
      coach_nombre: coach?.nombre,
      cupo_max: Number(form.cupo_max),
      fecha_unica: null,
    });
    setMensajeCrear(resultado);
    if (resultado.ok) {
      setForm({ dia: 'Lunes', hora: '', coach_id: '', cupo_max: 6 });
      setTimeout(() => {
        setMostrarFormFija(false);
        setMensajeCrear(null);
      }, 1200);
    }
  }

  async function handleCrearPuntual(e) {
    e.preventDefault();
    if (!formPuntual.hora || !formPuntual.coach_id || !formPuntual.fecha_unica)
      return;
    const coach = coaches.find((c) => c.id === formPuntual.coach_id);
    const resultado = await crearClase({
      dia: nombreDiaDeFecha(formPuntual.fecha_unica),
      hora: formPuntual.hora,
      coach_id: formPuntual.coach_id,
      coach_nombre: coach?.nombre,
      cupo_max: Number(formPuntual.cupo_max),
      fecha_unica: formPuntual.fecha_unica,
    });
    setMensajeCrear(resultado);
    if (resultado.ok) {
      setFormPuntual({ fecha_unica: '', hora: '', coach_id: '', cupo_max: 6 });
      setTimeout(() => {
        setMostrarFormPuntual(false);
        setMensajeCrear(null);
      }, 1200);
    }
  }

  function abrirEdicion(h) {
    setEditandoId(h.id);
    setFormEdicion({
      dia: h.dia,
      hora: h.hora,
      coach_id: h.coach_id || '',
      cupo_max: h.cupo_max,
    });
    setCancelandoClave(null);
    setEliminandoId(null);
  }

  async function guardarEdicion(horarioId) {
    const coach = coaches.find((c) => c.id === formEdicion.coach_id);
    await editarClase(horarioId, {
      dia: formEdicion.dia,
      hora: formEdicion.hora,
      coach_id: formEdicion.coach_id || null,
      coach_nombre: coach?.nombre || null,
      cupo_max: Number(formEdicion.cupo_max),
    });
    setEditandoId(null);
  }

  function abrirCancelacion(horarioId, fecha) {
    setCancelandoClave(`${horarioId}_${fecha}`);
    setMensajeCancel('');
    setEditandoId(null);
    setEliminandoId(null);
  }

  async function confirmarCancelacion(horarioId, fecha) {
    await cancelarHorarioFecha(horarioId, fecha, mensajeCancel.trim() || null);
    setCancelandoClave(null);
  }

  async function confirmarEliminar(horarioId) {
    await eliminarClase(horarioId);
    setEliminandoId(null);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex justify-end gap-2 mb-6">
        <button
          onClick={() => {
            setMostrarFormFija(!mostrarFormFija);
            setMostrarFormPuntual(false);
          }}
          className="flex items-center gap-1 bg-cyan-brand text-ink text-sm font-semibold px-3 py-2 rounded-lg transition-transform active:scale-95"
        >
          <Plus size={16} /> Clase fija Nueva
        </button>
        <button
          onClick={() => {
            setMostrarFormPuntual(!mostrarFormPuntual);
            setMostrarFormFija(false);
          }}
          className="flex items-center gap-1 bg-white text-ink text-sm font-semibold px-3 py-2 rounded-lg transition-transform active:scale-95"
        >
          <Plus size={16} /> Clase puntual
        </button>
      </div>

      {mostrarFormFija && (
        <form
          onSubmit={handleCrearFija}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4 flex flex-col gap-3"
        >
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Día (se repite todas las semanas)
            </label>
            <select
              value={form.dia}
              onChange={(e) => setForm({ ...form, dia: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            >
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <p className="text-cyan-brand text-xs mt-1">
              Próxima clase: {proximaFechaParaDia(form.dia)}
            </p>
          </div>

          <div>
            <label className="text-white/40 text-xs mb-1 block">Hora</label>
            <input
              type="time"
              value={form.hora}
              onChange={(e) => setForm({ ...form, hora: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Coach</label>
            <select
              value={form.coach_id}
              onChange={(e) => setForm({ ...form, coach_id: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            >
              <option value="">Selecciona coach</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Cupo máximo
            </label>
            <input
              type="number"
              value={form.cupo_max}
              onChange={(e) => setForm({ ...form, cupo_max: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            />
          </div>
          {mensajeCrear && (
            <p
              className={`text-sm ${
                mensajeCrear.ok ? 'text-cyan-brand' : 'text-red-400'
              }`}
            >
              {mensajeCrear.mensaje}
            </p>
          )}
          <button
            type="submit"
            className="bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm transition-transform active:scale-[0.98]"
          >
            Crear clase fija
          </button>
        </form>
      )}

      {mostrarFormPuntual && (
        <form
          onSubmit={handleCrearPuntual}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4 flex flex-col gap-3"
        >
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Fecha (ocurre una sola vez)
            </label>
            <input
              type="date"
              value={formPuntual.fecha_unica}
              onChange={(e) =>
                setFormPuntual({ ...formPuntual, fecha_unica: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            />
            {formPuntual.fecha_unica && (
              <p className="text-cyan-brand text-xs mt-1">
                {formatFechaLarga(formPuntual.fecha_unica)}
              </p>
            )}
          </div>

          <div>
            <label className="text-white/40 text-xs mb-1 block">Hora</label>
            <input
              type="time"
              value={formPuntual.hora}
              onChange={(e) =>
                setFormPuntual({ ...formPuntual, hora: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Coach</label>
            <select
              value={formPuntual.coach_id}
              onChange={(e) =>
                setFormPuntual({ ...formPuntual, coach_id: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            >
              <option value="">Selecciona coach</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Cupo máximo
            </label>
            <input
              type="number"
              value={formPuntual.cupo_max}
              onChange={(e) =>
                setFormPuntual({ ...formPuntual, cupo_max: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            />
          </div>
          {mensajeCrear && (
            <p
              className={`text-sm ${
                mensajeCrear.ok ? 'text-cyan-brand' : 'text-red-400'
              }`}
            >
              {mensajeCrear.mensaje}
            </p>
          )}
          <button
            type="submit"
            className="bg-white text-ink font-semibold rounded-lg py-2 text-sm transition-transform active:scale-[0.98]"
          >
            Crear clase puntual
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {dias.map((dia, index) => {
          const horariosDelDia = horarios
            .filter((h) => horarioAplicaEnFecha(h, dia.key, dia.nombreDia))
            .sort((a, b) => a.hora.localeCompare(b.hora));
          if (horariosDelDia.length === 0) return null;

          const abiertoAqui = diaAbierto === index;

          return (
            <div
              key={dia.key}
              className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setDiaAbierto(abiertoAqui ? -1 : index)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="text-left">
                  <p className="text-white font-display text-lg">
                    {dia.esHoy ? 'Hoy' : dia.nombreDia}
                  </p>
                  <p className="text-white/40 text-xs">{dia.fechaLarga}</p>
                </div>
                {abiertoAqui ? (
                  <ChevronUp size={18} className="text-white/40" />
                ) : (
                  <ChevronDown size={18} className="text-white/40" />
                )}
              </button>

              {abiertoAqui && (
                <div className="border-t border-white/10 flex flex-col gap-2 p-3">
                  {horariosDelDia.map((h) => {
                    const editandoEste = editandoId === h.id;
                    const claveCancel = `${h.id}_${dia.key}`;
                    const cancelandoEste = cancelandoClave === claveCancel;
                    const cancelada = horarioEstaCancelado(h.id, dia.key);
                    const mensajeYaCancelado = mensajeCancelacionDe(
                      h.id,
                      dia.key
                    );

                    return (
                      <div
                        key={h.id}
                        className="bg-black/20 border border-white/10 rounded-xl overflow-hidden"
                      >
                        {editandoEste ? (
                          <div className="p-3 flex flex-col gap-2">
                            <p className="text-white/40 text-xs">
                              {h.fecha_unica
                                ? 'Editando clase puntual'
                                : `Editando horario (afecta todos los ${h.dia.toLowerCase()}s)`}
                            </p>
                            {!h.fecha_unica && (
                              <select
                                value={formEdicion.dia}
                                onChange={(e) =>
                                  setFormEdicion({
                                    ...formEdicion,
                                    dia: e.target.value,
                                  })
                                }
                                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                              >
                                {DIAS.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            )}
                            <input
                              type="time"
                              value={formEdicion.hora}
                              onChange={(e) =>
                                setFormEdicion({
                                  ...formEdicion,
                                  hora: e.target.value,
                                })
                              }
                              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                            />
                            <select
                              value={formEdicion.coach_id}
                              onChange={(e) =>
                                setFormEdicion({
                                  ...formEdicion,
                                  coach_id: e.target.value,
                                })
                              }
                              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                            >
                              <option value="">Sin coach</option>
                              {coaches.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={formEdicion.cupo_max}
                              onChange={(e) =>
                                setFormEdicion({
                                  ...formEdicion,
                                  cupo_max: e.target.value,
                                })
                              }
                              placeholder="Cupo maximo"
                              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => guardarEdicion(h.id)}
                                className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditandoId(null)}
                                className="flex-1 bg-white/10 text-white rounded-lg py-2 text-sm"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : cancelandoEste ? (
                          <div className="p-3 flex flex-col gap-2">
                            <p className="text-white/60 text-sm">
                              Cancelar {h.hora} el {dia.fechaLarga}
                            </p>
                            <textarea
                              value={mensajeCancel}
                              onChange={(e) => setMensajeCancel(e.target.value)}
                              placeholder="Mensaje para los inscritos (ej: coach con licencia medica)"
                              rows={2}
                              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
                            />
                            <p className="text-white/30 text-xs">
                              Las reservas de ese dia se cancelaran
                              automaticamente, sin descontar la sesion al
                              usuario.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  confirmarCancelacion(h.id, dia.key)
                                }
                                className="flex-1 bg-red-500/80 text-white font-semibold rounded-lg py-2 text-sm"
                              >
                                Confirmar cancelacion
                              </button>
                              <button
                                onClick={() => setCancelandoClave(null)}
                                className="flex-1 bg-white/10 text-white rounded-lg py-2 text-sm"
                              >
                                Volver
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-display text-lg">
                                    {h.hora}
                                  </p>
                                  {h.fecha_unica && (
                                    <span className="text-[10px] bg-cyan-brand/20 text-cyan-brand px-1.5 py-0.5 rounded">
                                      única
                                    </span>
                                  )}
                                </div>
                                <p className="text-white/40 text-xs">
                                  {h.coach_nombre || 'Sin coach'} · cupo máximo{' '}
                                  {h.cupo_max}
                                </p>
                              </div>

                              {eliminandoId === h.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-red-300 text-xs">
                                    ¿Eliminar?
                                  </span>
                                  <button
                                    onClick={() => confirmarEliminar(h.id)}
                                    className="bg-red-500/80 text-white text-xs font-semibold px-2 py-1.5 rounded-md"
                                  >
                                    Sí
                                  </button>
                                  <button
                                    onClick={() => setEliminandoId(null)}
                                    className="bg-white/10 text-white text-xs px-2 py-1.5 rounded-md"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : !cancelada ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => abrirEdicion(h)}
                                    className="text-cyan-brand/80 p-2 hover:text-cyan-brand"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  {!h.fecha_unica && (
                                    <button
                                      onClick={() =>
                                        abrirCancelacion(h.id, dia.key)
                                      }
                                      className="text-yellow-400/80 p-2 hover:text-yellow-400"
                                    >
                                      <CalendarX size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEliminandoId(h.id)}
                                    className="text-red-400/70 p-2 hover:text-red-400"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            {cancelada && (
                              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                                <div>
                                  <p className="text-yellow-300 text-xs font-medium">
                                    Cancelada este día
                                  </p>
                                  {mensajeYaCancelado && (
                                    <p className="text-white/40 text-xs">
                                      {mensajeYaCancelado}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    reactivarHorarioFecha(h.id, dia.key)
                                  }
                                  className="flex items-center gap-1 text-white/50 hover:text-white text-xs"
                                >
                                  <RotateCcw size={12} /> Reactivar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
