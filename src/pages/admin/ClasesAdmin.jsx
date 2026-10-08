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
  Users,
  X,
  UserMinus,
  UserCog,
  AlertTriangle,
} from 'lucide-react';

// Vista de la semana: todas las clases de lunes a sábado de un vistazo
function VistaSemana({ onElegirDia }) {
  const { horarios, reservas, horarioEstaCancelado, coachDeClase, ausenciaDe } = useAuth();
  const [offset, setOffset] = useState(0);
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + offset * 7);
  const dow = base.getDay() === 0 ? 7 : base.getDay();
  const lunes = new Date(base);
  lunes.setDate(base.getDate() - (dow - 1));
  const NOMBRES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dias = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return { fecha: soloFechaLocal(d), nombre: NOMBRES[d.getDay()], num: d.getDate() };
  });
  const hoy = soloFechaLocal(new Date());

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setOffset(offset - 1)} className="text-white/50 text-sm px-2">
          ‹ Anterior
        </button>
        <p className="text-white/60 text-xs">
          {offset === 0 ? 'Esta semana' : `Semana del ${dias[0].num} al ${dias[5].num}`}
        </p>
        <button onClick={() => setOffset(offset + 1)} className="text-white/50 text-sm px-2">
          Siguiente ›
        </button>
      </div>
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="grid grid-cols-6 gap-2 min-w-[660px]">
          {dias.map((d) => {
            const clases = horarios
              .filter((h) => (h.fecha_unica ? h.fecha_unica === d.fecha : h.dia === d.nombre))
              .sort((a, b) => a.hora.localeCompare(b.hora));
            return (
              <div key={d.fecha} className={`rounded-xl border p-2 ${d.fecha === hoy ? 'border-cyan-brand/40 bg-cyan-brand/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
                <p className={`text-xs font-semibold mb-2 ${d.fecha === hoy ? 'text-cyan-brand' : 'text-white/60'}`}>
                  {d.nombre.slice(0, 3)} {d.num}
                </p>
                <div className="flex flex-col gap-1.5">
                  {clases.length === 0 && <p className="text-white/20 text-[11px]">—</p>}
                  {clases.map((h) => {
                    const cancelada = horarioEstaCancelado(h.id, d.fecha);
                    const n = reservas.filter((r) => r.horario_id === h.id && r.fecha === d.fecha).length;
                    const coach = coachDeClase(h, d.fecha);
                    const ausencia = ausenciaDe(h.id, d.fecha);
                    return (
                      <button
                        key={h.id}
                        onClick={() => onElegirDia(d.fecha)}
                        className={`text-left rounded-lg px-2 py-1.5 border ${
                          cancelada
                            ? 'border-red-500/20 bg-red-500/5'
                            : ausencia
                            ? 'border-yellow-400/40 bg-yellow-400/10'
                            : 'border-white/10 bg-white/[0.04]'
                        }`}
                      >
                        <p className={`text-sm font-semibold leading-tight ${cancelada ? 'text-white/30 line-through' : 'text-white'}`}>
                          {h.hora}
                        </p>
                        <p className="text-white/45 text-[10px] truncate">
                          {coach.nombre ? coach.nombre.split(' ')[0] : 'Sin coach'}
                          {coach.esReemplazo ? ' (reemp.)' : ''}
                        </p>
                        <p className={`text-[10px] ${n >= h.cupo_max ? 'text-yellow-200' : 'text-cyan-brand/80'}`}>
                          {cancelada ? 'Cancelada' : `${n}/${h.cupo_max}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Reemplazo de coach para un día puntual + aviso de ausencia del coach
function PanelReemplazo({ h, fecha, coaches, onCancelarClase }) {
  const { coachDeClase, reemplazoDe, asignarReemplazo, ausenciaDe, resolverAusencia } = useAuth();
  const ausencia = ausenciaDe(h.id, fecha);
  const reemplazo = reemplazoDe(h.id, fecha);
  const [abierto, setAbierto] = useState(false);
  const [coachId, setCoachId] = useState(reemplazo?.coach_id || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar(id) {
    setGuardando(true);
    setError('');
    const r = await asignarReemplazo(h.id, fecha, id || null);
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    setAbierto(false);
  }

  const mostrarPanel = abierto || ausencia;

  return (
    <div className="mt-2">
      {reemplazo && (
        <p className="text-[11px] text-white/60">
          Este día la hace <span className="text-white">{reemplazo.coach_nombre}</span> (reemplazo de{' '}
          {h.coach_nombre || 'sin coach'})
        </p>
      )}
      {ausencia && (
        <div className="mt-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-3 py-2">
          <p className="flex items-start gap-1.5 text-yellow-100 text-xs">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              {ausencia.coach_nombre} avisó que no puede hacer esta clase{ausencia.motivo ? `: ${ausencia.motivo}` : '.'}
            </span>
          </p>
        </div>
      )}
      {mostrarPanel ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-cyan-brand"
            >
              <option value="">Elegir coach de reemplazo</option>
              {coaches
                .filter((c) => c.id !== coachDeClase(h, fecha).id || reemplazo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
            <button
              onClick={() => guardar(coachId)}
              disabled={!coachId || guardando}
              className="bg-cyan-brand text-ink font-semibold rounded-lg px-3 text-xs disabled:opacity-40"
            >
              {guardando ? '...' : 'Asignar'}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {reemplazo && (
              <button onClick={() => guardar(null)} className="text-white/50 text-[11px]">
                Quitar reemplazo
              </button>
            )}
            {ausencia && (
              <>
                <button onClick={onCancelarClase} className="text-yellow-300/90 text-[11px]">
                  Cancelar la clase
                </button>
                <button onClick={() => resolverAusencia(ausencia.id)} className="text-white/40 text-[11px]">
                  Ignorar aviso
                </button>
              </>
            )}
            {!ausencia && (
              <button onClick={() => setAbierto(false)} className="text-white/40 text-[11px]">
                Cerrar
              </button>
            )}
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      ) : (
        <button onClick={() => setAbierto(true)} className="mt-1 flex items-center gap-1 text-white/40 text-[11px] hover:text-white/70">
          <UserCog size={12} /> {reemplazo ? 'Cambiar reemplazo' : 'Reemplazo este día'}
        </button>
      )}
    </div>
  );
}

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

// Convierte un Date a "YYYY-MM-DD" usando el calendario LOCAL (no UTC).
// fecha.toISOString() convierte a UTC y puede saltar al día siguiente en horario
// de tarde/noche en Chile (UTC-3), dejando mal guardada la fecha de la clase.
function soloFechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function proximaFechaParaDia(nombreDia) {
  const objetivo = DIAS_INDICE[nombreDia];
  const hoy = new Date();
  for (let i = 0; i < 8; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);
    if (fecha.getDay() === objetivo)
      return formatFechaLarga(soloFechaLocal(fecha));
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
      const key = soloFechaLocal(fecha);
      dias.push({
        key,
        nombreDia,
        fechaLarga: formatFechaLarga(key),
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
    usuarioActual,
    horarios,
    usuarios,
    reservas,
    crearClase,
    eliminarClase,
    editarClase,
    horarioEstaCancelado,
    mensajeCancelacionDe,
    cancelarHorarioFecha,
    reactivarHorarioFecha,
    cancelarReservaAdmin,
  } = useAuth();

  const [mostrarFormFija, setMostrarFormFija] = useState(false);
  const [mostrarFormPuntual, setMostrarFormPuntual] = useState(false);
  const coachPorDefecto =
    usuarioActual && (usuarioActual.rol === 'coach' || usuarioActual.rol === 'head_coach')
      ? usuarioActual.id
      : '';
  const [form, setForm] = useState({
    dia: 'Lunes',
    hora: '',
    coach_id: coachPorDefecto,
    cupo_max: 6,
  });
  const [formPuntual, setFormPuntual] = useState({
    fecha_unica: '',
    hora: '',
    coach_id: coachPorDefecto,
    cupo_max: 6,
  });
  const [mensajeCrear, setMensajeCrear] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [diaAbierto, setDiaAbierto] = useState(0);
  const [vista, setVista] = useState('lista'); // lista | semana
  const [editandoId, setEditandoId] = useState(null);
  const [formEdicion, setFormEdicion] = useState({});
  const [cancelandoClave, setCancelandoClave] = useState(null);
  const [mensajeCancel, setMensajeCancel] = useState('');
  const [eliminandoId, setEliminandoId] = useState(null);
  const [verInscritosClave, setVerInscritosClave] = useState(null);
  const [quitandoReservaId, setQuitandoReservaId] = useState(null);

  const coaches = usuarios.filter(
    (u) => u.rol === 'coach' || u.rol === 'head_coach'
  );
  const dias = proximosDiasHabiles(14);

  function inscritosDe(horarioId, fecha) {
    return reservas
      .filter(
        (r) =>
          r.horario_id === horarioId &&
          r.fecha === fecha &&
          r.estado === 'confirmada'
      )
      .map((r) => ({
        reservaId: r.id,
        usuario: usuarios.find((u) => u.id === r.usuario_id),
      }))
      .filter((x) => x.usuario);
  }

  function abrirInscritos(horarioId, fecha) {
    const clave = `${horarioId}_${fecha}`;
    setVerInscritosClave(verInscritosClave === clave ? null : clave);
    setEditandoId(null);
    setCancelandoClave(null);
    setEliminandoId(null);
    setQuitandoReservaId(null);
  }

  async function confirmarQuitarAlumno(reservaId) {
    await cancelarReservaAdmin(reservaId);
    setQuitandoReservaId(null);
  }

  // Revisa los datos antes de guardar y explica qué falta (antes el botón no hacía nada).
  function revisarDatos({ hora, coach_id, fecha_unica }, esPuntual) {
    if (esPuntual && !fecha_unica) return 'Elige la fecha de la clase.';
    if (!hora) return 'Elige la hora de la clase.';
    if (!coach_id) return 'Elige el coach de la clase.';
    return null;
  }

  async function guardarClase(nueva) {
    setGuardando(true);
    setMensajeCrear(null);
    try {
      return await crearClase(nueva);
    } catch (err) {
      return { ok: false, mensaje: 'No se pudo crear la clase: ' + (err?.message || 'error desconocido') };
    } finally {
      setGuardando(false);
    }
  }

  async function handleCrearFija(e) {
    e.preventDefault();
    if (guardando) return;
    const falta = revisarDatos(form, false);
    if (falta) return setMensajeCrear({ ok: false, mensaje: falta });

    const repetida = horarios.some(
      (h) => !h.fecha_unica && h.dia === form.dia && h.hora === form.hora
    );
    if (repetida)
      return setMensajeCrear({
        ok: false,
        mensaje: `Ya existe una clase fija los ${form.dia.toLowerCase()} a las ${form.hora}.`,
      });

    const coach = coaches.find((c) => c.id === form.coach_id);
    const resultado = await guardarClase({
      dia: form.dia,
      hora: form.hora,
      coach_id: form.coach_id,
      coach_nombre: coach?.nombre,
      cupo_max: Number(form.cupo_max) || 6,
      fecha_unica: null,
    });
    if (resultado.ok) {
      resultado.mensaje = `Clase creada. Se repite todos los ${form.dia.toLowerCase()} · próxima: ${proximaFechaParaDia(form.dia)}.`;
    }
    setMensajeCrear(resultado);
    if (resultado.ok) {
      setForm({ dia: form.dia, hora: '', coach_id: form.coach_id, cupo_max: 6 });
      setTimeout(() => {
        setMostrarFormFija(false);
        setMensajeCrear(null);
      }, 2500);
    }
  }

  async function handleCrearPuntual(e) {
    e.preventDefault();
    if (guardando) return;
    const falta = revisarDatos(formPuntual, true);
    if (falta) return setMensajeCrear({ ok: false, mensaje: falta });

    const coach = coaches.find((c) => c.id === formPuntual.coach_id);
    const resultado = await guardarClase({
      dia: nombreDiaDeFecha(formPuntual.fecha_unica),
      hora: formPuntual.hora,
      coach_id: formPuntual.coach_id,
      coach_nombre: coach?.nombre,
      cupo_max: Number(formPuntual.cupo_max) || 6,
      fecha_unica: formPuntual.fecha_unica,
    });
    setMensajeCrear(resultado);
    if (resultado.ok) {
      setFormPuntual({ fecha_unica: '', hora: '', coach_id: formPuntual.coach_id, cupo_max: 6 });
      setTimeout(() => {
        setMostrarFormPuntual(false);
        setMensajeCrear(null);
      }, 2500);
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
    setVerInscritosClave(null);
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
    setVerInscritosClave(null);
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
      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-4">
        {[
          { valor: 'lista', label: 'Próximos días' },
          { valor: 'semana', label: 'Vista semanal' },
        ].map((op) => (
          <button
            key={op.valor}
            onClick={() => setVista(op.valor)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              vista === op.valor ? 'bg-cyan-brand text-ink' : 'text-white/50'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {vista === 'semana' && (
        <VistaSemana
          onElegirDia={(fecha) => {
            const i = dias.findIndex((d) => d.key === fecha);
            setVista('lista');
            if (i >= 0) setDiaAbierto(i);
          }}
        />
      )}

      <div className={`flex justify-end gap-2 mb-6 ${vista === 'semana' ? 'hidden' : ''}`}>
        <button
          onClick={() => {
            setMostrarFormFija(!mostrarFormFija);
            setMensajeCrear(null);
            setMostrarFormPuntual(false);
          }}
          className="flex items-center gap-1 bg-cyan-brand text-ink text-sm font-semibold px-3 py-2 rounded-lg transition-transform active:scale-95"
        >
          <Plus size={16} /> Clase fija Nueva
        </button>
        <button
          onClick={() => {
            setMostrarFormPuntual(!mostrarFormPuntual);
            setMensajeCrear(null);
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
            disabled={guardando}
            className="bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {guardando ? 'Creando...' : 'Crear clase fija'}
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
            disabled={guardando}
            className="bg-white text-ink font-semibold rounded-lg py-2 text-sm transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {guardando ? 'Creando...' : 'Crear clase puntual'}
          </button>
        </form>
      )}

      <div className={`flex flex-col gap-2 ${vista === 'semana' ? 'hidden' : ''}`}>
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
                                    onClick={() =>
                                      abrirInscritos(h.id, dia.key)
                                    }
                                    className="relative text-white/60 p-2 hover:text-white"
                                  >
                                    <Users size={16} />
                                    {inscritosDe(h.id, dia.key).length > 0 && (
                                      <span className="absolute -top-0.5 -right-0.5 bg-cyan-brand text-ink text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {inscritosDe(h.id, dia.key).length}
                                      </span>
                                    )}
                                  </button>
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

                            {!cancelada && (
                              <PanelReemplazo
                                h={h}
                                fecha={dia.key}
                                coaches={coaches}
                                onCancelarClase={() => abrirCancelacion(h.id, dia.key)}
                              />
                            )}

                            {verInscritosClave === claveCancel && (
                              <div className="mt-2 pt-2 border-t border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-white/50 text-xs font-medium">
                                    Inscritos (
                                    {inscritosDe(h.id, dia.key).length}/
                                    {h.cupo_max})
                                  </p>
                                  <button
                                    onClick={() => setVerInscritosClave(null)}
                                    className="text-white/30 hover:text-white/60"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                {inscritosDe(h.id, dia.key).length === 0 ? (
                                  <p className="text-white/30 text-xs">
                                    Nadie se ha inscrito todavía.
                                  </p>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    {inscritosDe(h.id, dia.key).map(
                                      ({ reservaId, usuario }) => (
                                        <div
                                          key={reservaId}
                                          className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2"
                                        >
                                          <div>
                                            <p className="text-white text-sm">
                                              {usuario.nombre}
                                            </p>
                                            {usuario.telefono && (
                                              <p className="text-white/30 text-[11px]">
                                                {usuario.telefono}
                                              </p>
                                            )}
                                          </div>

                                          {quitandoReservaId === reservaId ? (
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-red-300 text-[11px]">
                                                ¿Sacar?
                                              </span>
                                              <button
                                                onClick={() =>
                                                  confirmarQuitarAlumno(
                                                    reservaId
                                                  )
                                                }
                                                className="bg-red-500/80 text-white text-[11px] font-semibold px-2 py-1 rounded-md"
                                              >
                                                Sí
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setQuitandoReservaId(null)
                                                }
                                                className="bg-white/10 text-white text-[11px] px-2 py-1 rounded-md"
                                              >
                                                No
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() =>
                                                setQuitandoReservaId(reservaId)
                                              }
                                              className="text-red-400/70 p-1.5 hover:text-red-400"
                                              title="Sacar de la clase"
                                            >
                                              <UserMinus size={15} />
                                            </button>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

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
