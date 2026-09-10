import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function Coaches() {
  const {
    usuarios,
    horarios,
    crearCoachConPassword,
    actualizarPerfil,
    rechazarUsuario,
  } = useAuth();
  const coaches = usuarios.filter((u) => u.rol === 'coach');

  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [formNuevo, setFormNuevo] = useState({
    nombre: '',
    correo: '',
    telefono: '',
  });
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [creando, setCreando] = useState(false);
  const [mensajeCrear, setMensajeCrear] = useState(null);

  const [editandoId, setEditandoId] = useState(null);
  const [formEdicion, setFormEdicion] = useState({ nombre: '', telefono: '' });
  const [eliminandoId, setEliminandoId] = useState(null);

  async function handleCrear(e) {
    e.preventDefault();
    if (!formNuevo.nombre.trim() || !formNuevo.correo.trim()) {
      setMensajeCrear({
        ok: false,
        mensaje: 'Completa al menos nombre y correo.',
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
    const resultado = await crearCoachConPassword(formNuevo, passwordNuevo);
    setCreando(false);
    setMensajeCrear(resultado);
    if (resultado.ok) {
      setFormNuevo({ nombre: '', correo: '', telefono: '' });
      setPasswordNuevo('');
      setTimeout(() => {
        setMostrarNuevo(false);
        setMensajeCrear(null);
      }, 1500);
    }
  }

  function abrirEdicion(c) {
    setEditandoId(c.id);
    setFormEdicion({ nombre: c.nombre, telefono: c.telefono || '' });
    setEliminandoId(null);
  }

  async function guardarEdicion(coachId) {
    await actualizarPerfil(coachId, {
      nombre: formEdicion.nombre,
      telefono: formEdicion.telefono,
    });
    setEditandoId(null);
  }

  async function confirmarEliminar(coachId) {
    await rechazarUsuario(coachId);
    setEliminandoId(null);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => {
            setMostrarNuevo(!mostrarNuevo);
            setEditandoId(null);
          }}
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
          <input
            value={formNuevo.nombre}
            onChange={(e) =>
              setFormNuevo({ ...formNuevo, nombre: e.target.value })
            }
            placeholder="Nombre completo"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="email"
            value={formNuevo.correo}
            onChange={(e) =>
              setFormNuevo({ ...formNuevo, correo: e.target.value })
            }
            placeholder="Correo"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            value={formNuevo.telefono}
            onChange={(e) =>
              setFormNuevo({ ...formNuevo, telefono: e.target.value })
            }
            placeholder="Teléfono"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="password"
            value={passwordNuevo}
            onChange={(e) => setPasswordNuevo(e.target.value)}
            placeholder="Contraseña (mínimo 6 caracteres)"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
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
            {creando ? 'Creando...' : 'Crear coach'}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {coaches.map((c) => {
          const horariosDelCoach = horarios.filter((h) => h.coach_id === c.id);
          const editandoEste = editandoId === c.id;
          const eliminandoEste = eliminandoId === c.id;

          return (
            <div
              key={c.id}
              className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
            >
              {editandoEste ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={formEdicion.nombre}
                    onChange={(e) =>
                      setFormEdicion({ ...formEdicion, nombre: e.target.value })
                    }
                    placeholder="Nombre completo"
                    className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <input
                    value={formEdicion.telefono}
                    onChange={(e) =>
                      setFormEdicion({
                        ...formEdicion,
                        telefono: e.target.value,
                      })
                    }
                    placeholder="Teléfono"
                    className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => guardarEdicion(c.id)}
                      className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm transition-transform active:scale-[0.98]"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="flex-1 bg-white/10 text-white rounded-lg py-2 text-sm transition-transform active:scale-[0.98]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-display text-xl">
                        {c.nombre}
                      </p>
                      <p className="text-white/40 text-sm mb-2">
                        {c.correo} · {c.telefono}
                      </p>
                      <p className="text-white/30 text-xs">
                        {horariosDelCoach.length} horario(s) asignado(s)
                      </p>
                    </div>

                    {eliminandoEste ? (
                      <div className="flex flex-col gap-1 items-end">
                        <span className="text-red-300 text-xs">¿Eliminar?</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => confirmarEliminar(c.id)}
                            className="bg-red-500/80 text-white text-xs font-semibold px-2 py-1.5 rounded-md transition-transform active:scale-95"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setEliminandoId(null)}
                            className="bg-white/10 text-white text-xs px-2 py-1.5 rounded-md transition-transform active:scale-95"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => abrirEdicion(c)}
                          className="text-cyan-brand/80 p-2 hover:text-cyan-brand transition-transform active:scale-90"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setEliminandoId(c.id)}
                          className="text-red-400/70 p-2 hover:text-red-400 transition-transform active:scale-90"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
