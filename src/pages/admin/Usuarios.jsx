import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Check, X, Plus, Snowflake } from 'lucide-react';

export default function Usuarios() {
  const {
    usuarios,
    planes,
    asignarPlan,
    confirmarRenovacion,
    aprobarUsuario,
    rechazarUsuario,
    cambiarRol,
    crearUsuarioConPassword,
    congelaciones,
    aprobarCongelacion,
    rechazarCongelacion,
    diasRenovacion,
  } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [diasCongelar, setDiasCongelar] = useState({});

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
              setFormNuevo({ ...formNuevo, rut: e.target.value })
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
              setFormNuevo({ ...formNuevo, telefono: e.target.value })
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
          const restantes = plan?.cantidad_sesiones
            ? plan.cantidad_sesiones - u.sesiones_usadas
            : null;
          const diasDesdeRenovacion = u.fecha_ultima_renovacion
            ? Math.floor(
                (Date.now() - new Date(u.fecha_ultima_renovacion).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;
          const necesitaRenovar =
            diasDesdeRenovacion === null ||
            diasDesdeRenovacion >= diasRenovacion;

          return (
            <div
              key={u.id}
              className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-white text-sm font-medium">{u.nombre}</p>
                  <p className="text-white/40 text-xs">
                    {u.rut} · {u.correo}
                  </p>
                </div>
                {restantes !== null && (
                  <span className="text-cyan-brand text-xs font-medium">
                    {restantes}/{plan.cantidad_sesiones}
                  </span>
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

              <select
                value={u.plan_id || ''}
                onChange={(e) => asignarPlan(u.id, e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors mb-2"
              >
                <option value="">Sin plan asignado</option>
                {Object.values(planes).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>

              <select
                value={u.rol}
                onChange={(e) => cambiarRol(u.id, e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
              >
                <option value="usuario">Usuario</option>
                <option value="coach">Coach</option>
                <option value="head_coach">Head Coach / Admin</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
