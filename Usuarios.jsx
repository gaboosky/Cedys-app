import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Check,
  X,
  Plus,
  Snowflake,
  Pencil,
  Zap,
  UserX,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { formatearRut, formatearTelefono } from '../../lib/formato';

export default function Usuarios() {
  const {
    usuarios,
    planes,
    asignarPlan,
    confirmarRenovacion,
    aprobarUsuario,
    rechazarUsuario,
    crearUsuarioConPassword,
    congelaciones,
    aprobarCongelacion,
    rechazarCongelacion,
    diasRenovacion,
    actualizarPerfil,
    agregarSesionesExtra,
    desactivarUsuario,
    reactivarUsuario,
  } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [diasCongelar, setDiasCongelar] = useState({});
  const [editandoPlanId, setEditandoPlanId] = useState(null);
  const [formPlan, setFormPlan] = useState({
    dias: '',
    monto: '',
    sesiones: '',
  });
  const [agregandoSesionesId, setAgregandoSesionesId] = useState(null);
  const [confirmandoAccionId, setConfirmandoAccionId] = useState(null);
  const [cantidadExtra, setCantidadExtra] = useState('');
  const [mensajeExtra, setMensajeExtra] = useState(null);

  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [formNuevo, setFormNuevo] = useState({
    nombre: '',
    rut: '',
    nacionalidad: '',
    fecha_nacimiento: '',
    telefono: '',
    correo: '',
  });
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [creando, setCreando] = useState(false);
  const [mensajeCrear, setMensajeCrear] = useState(null);

  const congelacionesPendientes = congelaciones.filter(
    (c) => c.estado === 'pendiente'
  );

  const pendientes = usuarios.filter(
    (u) => u.rol === 'usuario' && u.estado === 'pendiente'
  );

  const clientes = usuarios
    .filter((u) => u.rol === 'usuario' && u.estado !== 'pendiente')
    .filter((u) => u.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  async function handleCrear(e) {
    e.preventDefault();
    if (
      !formNuevo.nombre.trim() ||
      !formNuevo.rut.trim() ||
      !formNuevo.correo.trim()
    ) {
      setMensajeCrear({
        ok: false,
        mensaje: 'Completa al menos nombre, RUT y correo.',
      });
      return;
    }
    if (passwordNuevo.length < 6) {
      setMensajeCrear({
        ok: false,
        mensaje: 'La contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }
    setCreando(true);
    const resultado = await crearUsuarioConPassword(formNuevo, passwordNuevo);
    setCreando(false);
    setMensajeCrear(resultado);
    if (resultado.ok) {
      setFormNuevo({
        nombre: '',
        rut: '',
        nacionalidad: '',
        fecha_nacimiento: '',
        telefono: '',
        correo: '',
      });
      setPasswordNuevo('');
      setTimeout(() => {
        setMostrarNuevo(false);
        setMensajeCrear(null);
      }, 1500);
    }
  }

  function abrirEdicionPlan(u) {
    setEditandoPlanId(u.id);
    setFormPlan({
      dias: u.plan_dias_personalizado ?? '',
      monto: u.plan_monto_personalizado ?? '',
      sesiones: u.plan_sesiones_personalizado ?? '',
    });
  }

  async function guardarEdicionPlan(usuarioId) {
    await actualizarPerfil(usuarioId, {
      plan_dias_personalizado:
        formPlan.dias === '' ? null : Number(formPlan.dias),
      plan_monto_personalizado:
        formPlan.monto === '' ? null : Number(formPlan.monto),
      plan_sesiones_personalizado:
        formPlan.sesiones === '' ? null : Number(formPlan.sesiones),
    });
    setEditandoPlanId(null);
  }

  async function handleAgregarSesiones(usuarioId) {
    if (cantidadExtra === '' || Number(cantidadExtra) === 0) return;
    const resultado = await agregarSesionesExtra(
      usuarioId,
      Number(cantidadExtra)
    );
    setMensajeExtra(resultado);
    if (resultado.ok) {
      setCantidadExtra('');
      setTimeout(() => {
        setAgregandoSesionesId(null);
        setMensajeExtra(null);
      }, 1500);
    }
  }

  async function handleAprobarCongelacion(congelacionId) {
    const dias = diasCongelar[congelacionId] || 7;
    await aprobarCongelacion(congelacionId, dias);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex justify-end mb-5">
        <button
          onClick={() => setMostrarNuevo(!mostrarNuevo)}
          className="flex items-center gap-1 bg-cyan-brand text-ink text-sm font-semibold px-3 py-2 rounded-lg transition-transform active:scale-95"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      {mostrarNuevo && (
        <form
          onSubmit={handleCrear}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6 flex flex-col gap-2"
        >
          <p className="text-white/40 text-xs mb-1">
            Úsalo para personas que no puedan registrarse solas desde la app
            (ej. adultos mayores).
          </p>
          <input
            value={formNuevo.nombre}
            onChange={(e) =>
              setFormNuevo({ ...formNuevo, nombre: e.target.value })
            }
            placeholder="Nombre completo"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
          />
          <input
            value={formNuevo.rut}
            onChange={(e) =>
              setFormNuevo({ ...formNuevo, rut: formatearRut(e.target.value) })
            }
            placeholder="RUT"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
          />
          <input
            value={formNuevo.nacionalidad}
            onChange={(e) =>
              setFormNuevo({ ...formNuevo, nacionalidad: e.target.value })
            }
            placeholder="Nacionalidad"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
          />
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={formNuevo.fecha_nacimiento}
              onChange={(e) =>
                setFormNuevo({ ...formNuevo, fecha_nacimiento: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            />
          </div>
          <input
            value={formNuevo.telefono}
            onChange={(e) =>
              setFormNuevo({
                ...formNuevo,
                telefono: formatearTelefono(e.target.value),
              })
            }
            placeholder="Teléfono"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
          />
          <input
            type="email"
            value={formNuevo.correo}
            onChange={(e) =>
              setFormNuevo({ ...formNuevo, correo: e.target.value })
            }
            placeholder="Correo"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
          />
          <input
            type="password"
            value={passwordNuevo}
            onChange={(e) => setPasswordNuevo(e.target.value)}
            placeholder="Contraseña (mínimo 6 caracteres)"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
          />

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
            disabled={creando}
            className="bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            {creando ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      )}

      {congelacionesPendientes.length > 0 && (
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
            Solicitudes de congelamiento ({congelacionesPendientes.length})
          </p>
          <div className="flex flex-col gap-2">
            {congelacionesPendientes.map((c) => {
              const solicitante = usuarios.find((u) => u.id === c.usuario_id);
              return (
                <div
                  key={c.id}
                  className="bg-blue-400/10 border border-blue-400/30 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Snowflake size={14} className="text-blue-300" />
                    <p className="text-white text-sm font-medium">
                      {solicitante?.nombre || 'Usuario'}
                    </p>
                  </div>
                  {c.motivo && (
                    <p className="text-white/40 text-xs mb-3">{c.motivo}</p>
                  )}
                  <div className="flex gap-2 items-center mb-2">
                    <label className="text-white/40 text-xs">Días:</label>
                    <input
                      type="number"
                      value={diasCongelar[c.id] ?? 7}
                      onChange={(e) =>
                        setDiasCongelar({
                          ...diasCongelar,
                          [c.id]: e.target.value,
                        })
                      }
                      className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAprobarCongelacion(c.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-400 text-ink text-sm font-semibold rounded-lg py-2 transition-transform active:scale-[0.98]"
                    >
                      <Check size={16} /> Aprobar
                    </button>
                    <button
                      onClick={() => rechazarCongelacion(c.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white/70 text-sm font-semibold rounded-lg py-2 transition-transform active:scale-[0.98]"
                    >
                      <X size={16} /> Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
            Solicitudes pendientes ({pendientes.length})
          </p>
          <div className="flex flex-col gap-2">
            {pendientes.map((u) => (
              <div
                key={u.id}
                className="bg-cyan-brand/10 border border-cyan-brand/30 rounded-2xl p-4"
              >
                <p className="text-white text-sm font-medium">{u.nombre}</p>
                <p className="text-white/40 text-xs mb-3">
                  {u.rut} · {u.correo} · {u.telefono}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => aprobarUsuario(u.id)}
                    className="flex-1 flex items-center justify-center gap-1 bg-cyan-brand text-ink text-sm font-semibold rounded-lg py-2 transition-transform active:scale-[0.98]"
                  >
                    <Check size={16} /> Aprobar
                  </button>
                  <button
                    onClick={() => rechazarUsuario(u.id)}
                    className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white/70 text-sm font-semibold rounded-lg py-2 transition-transform active:scale-[0.98]"
                  >
                    <X size={16} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre..."
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors mb-4 text-sm"
      />

      <div className="flex flex-col gap-2">
        {clientes.map((u) => {
          const plan = u.plan_id ? planes[u.plan_id] : null;
          const totalSesiones =
            u.plan_sesiones_personalizado || plan?.cantidad_sesiones || null;
          const extra = u.sesiones_extra || 0;
          const restantes =
            totalSesiones !== null
              ? totalSesiones + extra - u.sesiones_usadas
              : null;
          const diasVigencia = u.plan_dias_personalizado || diasRenovacion;
          const diasDesdeRenovacion = u.fecha_ultima_renovacion
            ? Math.floor(
                (Date.now() - new Date(u.fecha_ultima_renovacion).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;
          const necesitaRenovar =
            diasDesdeRenovacion === null || diasDesdeRenovacion >= diasVigencia;
          const editandoEste = editandoPlanId === u.id;

          return (
            <div
              key={u.id}
              className={`bg-white/[0.04] border rounded-2xl p-4 ${
                u.estado === 'inactivo'
                  ? 'border-yellow-500/30 opacity-60'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">{u.nombre}</p>
                    {u.estado === 'inactivo' && (
                      <span className="text-yellow-400 text-[10px] font-semibold uppercase tracking-wide bg-yellow-500/10 px-1.5 py-0.5 rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs">
                    {u.rut} · {u.correo}
                  </p>
                </div>
                {restantes !== null && (
                  <div className="text-right">
                    <span className="text-cyan-brand text-xs font-medium block">
                      {restantes} disponibles
                    </span>
                    {extra > 0 && (
                      <span className="text-white/30 text-[10px]">
                        (incluye {extra} extra)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {plan && (
                <div
                  className={`flex items-center justify-between rounded-xl px-3 py-2 mb-2 ${
                    necesitaRenovar
                      ? 'bg-yellow-400/10 border border-yellow-400/30'
                      : 'bg-white/[0.03]'
                  }`}
                >
                  <p
                    className={`text-xs ${
                      necesitaRenovar ? 'text-yellow-300' : 'text-white/40'
                    }`}
                  >
                    {u.fecha_ultima_renovacion
                      ? `Última renovación: ${u.fecha_ultima_renovacion}${
                          necesitaRenovar ? ' (vencida)' : ''
                        }`
                      : 'Sin renovación registrada'}
                  </p>
                  <button
                    onClick={() => confirmarRenovacion(u.id)}
                    className="bg-cyan-brand text-ink text-xs font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap transition-transform active:scale-95"
                  >
                    Confirmar pago
                  </button>
                </div>
              )}

              {editandoEste ? (
                <div className="bg-black/20 border border-white/10 rounded-xl p-3 mb-2 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-white/40 text-xs mb-1 block">
                        Duración (días)
                      </label>
                      <input
                        type="number"
                        value={formPlan.dias}
                        onChange={(e) =>
                          setFormPlan({ ...formPlan, dias: e.target.value })
                        }
                        placeholder={String(diasRenovacion)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-white/40 text-xs mb-1 block">
                        Monto ($)
                      </label>
                      <input
                        type="number"
                        value={formPlan.monto}
                        onChange={(e) =>
                          setFormPlan({ ...formPlan, monto: e.target.value })
                        }
                        placeholder={
                          plan ? String(plan.valor_con_iva) : 'Sin plan base'
                        }
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-white/40 text-xs mb-1 block">
                        Sesiones
                      </label>
                      <input
                        type="number"
                        value={formPlan.sesiones}
                        onChange={(e) =>
                          setFormPlan({ ...formPlan, sesiones: e.target.value })
                        }
                        placeholder={
                          !plan || plan.cantidad_sesiones === null
                            ? 'Ilimitado'
                            : String(plan.cantidad_sesiones)
                        }
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                      />
                    </div>
                  </div>
                  <p className="text-white/30 text-xs">
                    {plan
                      ? 'Deja vacío para usar los valores normales del plan.'
                      : 'Este usuario no tiene un plan base — completa al menos las sesiones para que le aparezcan disponibles.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => guardarEdicionPlan(u.id)}
                      className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-xs transition-transform active:scale-[0.98]"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoPlanId(null)}
                      className="flex-1 bg-white/10 text-white rounded-lg py-2 text-xs transition-transform active:scale-[0.98]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => abrirEdicionPlan(u)}
                  className="flex items-center gap-1 text-cyan-brand text-xs font-medium mb-2"
                >
                  <Pencil size={12} />
                  {u.plan_dias_personalizado ||
                  u.plan_monto_personalizado ||
                  u.plan_sesiones_personalizado
                    ? `Personalizado: ${
                        u.plan_dias_personalizado || diasRenovacion
                      } días · $${(
                        u.plan_monto_personalizado ||
                        plan?.valor_con_iva ||
                        0
                      ).toLocaleString('es-CL')} · ${
                        u.plan_sesiones_personalizado ||
                        plan?.cantidad_sesiones ||
                        'Ilimitado'
                      } sesiones`
                    : 'Editar duración / monto / sesiones'}
                </button>
              )}

              {agregandoSesionesId === u.id ? (
                <div className="bg-black/20 border border-white/10 rounded-xl p-3 mb-2 flex flex-col gap-2">
                  <label className="text-white/40 text-xs block">
                    ¿Cuántas sesiones agregar? (usa negativo para restar, ej:
                    -2)
                  </label>
                  <input
                    type="number"
                    value={cantidadExtra}
                    onChange={(e) => setCantidadExtra(e.target.value)}
                    placeholder="Ej: 2"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                  />
                  {u.sesiones_extra > 0 && (
                    <p className="text-white/30 text-xs">
                      Ya tiene {u.sesiones_extra} sesión(es) extra acumulada(s).
                    </p>
                  )}
                  {mensajeExtra && (
                    <p
                      className={`text-xs ${
                        mensajeExtra.ok ? 'text-cyan-brand' : 'text-red-400'
                      }`}
                    >
                      {mensajeExtra.mensaje}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAgregarSesiones(u.id)}
                      className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-xs transition-transform active:scale-[0.98]"
                    >
                      {Number(cantidadExtra) < 0 ? 'Restar' : 'Agregar'}
                    </button>
                    <button
                      onClick={() => {
                        setAgregandoSesionesId(null);
                        setCantidadExtra('');
                        setMensajeExtra(null);
                      }}
                      className="flex-1 bg-white/10 text-white rounded-lg py-2 text-xs transition-transform active:scale-[0.98]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAgregandoSesionesId(u.id)}
                  className="flex items-center gap-1 text-cyan-brand text-xs font-medium mb-2"
                >
                  <Zap size={12} />
                  Agregar sesiones
                  {u.sesiones_extra > 0
                    ? ` (+${u.sesiones_extra} ya agregadas)`
                    : ''}
                </button>
              )}

              <select
                value={u.plan_id || ''}
                onChange={(e) => asignarPlan(u.id, e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors mb-3"
              >
                <option value="">Sin plan asignado</option>
                {Object.values(planes).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>

              {confirmandoAccionId === u.id ? (
                <div className="bg-black/20 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-white/70 text-xs">
                    {u.estado === 'inactivo'
                      ? '¿Reactivar esta cuenta?'
                      : '¿Desactivar esta cuenta? No podrá iniciar sesión ni reservar clases, pero su historial se conserva.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (u.estado === 'inactivo') reactivarUsuario(u.id);
                        else desactivarUsuario(u.id);
                        setConfirmandoAccionId(null);
                      }}
                      className={`flex-1 font-semibold rounded-lg py-2 text-xs transition-transform active:scale-[0.98] ${
                        u.estado === 'inactivo'
                          ? 'bg-cyan-brand text-ink'
                          : 'bg-yellow-500/80 text-ink'
                      }`}
                    >
                      Sí, {u.estado === 'inactivo' ? 'reactivar' : 'desactivar'}
                    </button>
                    <button
                      onClick={() => setConfirmandoAccionId(null)}
                      className="flex-1 bg-white/10 text-white rounded-lg py-2 text-xs transition-transform active:scale-[0.98]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setConfirmandoAccionId(u.id)}
                    className={`flex items-center gap-1 text-xs font-medium ${
                      u.estado === 'inactivo'
                        ? 'text-cyan-brand'
                        : 'text-yellow-400/80'
                    }`}
                  >
                    {u.estado === 'inactivo' ? (
                      <UserCheck size={13} />
                    ) : (
                      <UserX size={13} />
                    )}
                    {u.estado === 'inactivo'
                      ? 'Reactivar cuenta'
                      : 'Desactivar cuenta'}
                  </button>
                  <button
                    onClick={() => rechazarUsuario(u.id)}
                    className="flex items-center gap-1 text-red-400/60 text-xs hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
