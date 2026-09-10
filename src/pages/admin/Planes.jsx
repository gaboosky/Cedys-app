import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus } from 'lucide-react';

export default function Planes() {
  const { planes, guardarPlan, crearPlan } = useAuth();
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});

  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [formNuevo, setFormNuevo] = useState({
    nombre: '',
    cantidad_sesiones: '',
    valor_neto: '',
    valor_con_iva: '',
  });
  const [creando, setCreando] = useState(false);

  function abrirEdicion(plan) {
    setEditando(plan.id);
    setForm({
      nombre: plan.nombre,
      cantidad_sesiones: plan.cantidad_sesiones ?? '',
      valor_neto: plan.valor_neto,
      valor_con_iva: plan.valor_con_iva,
    });
    setMostrarNuevo(false);
  }

  async function guardar(planId) {
    await guardarPlan(planId, {
      nombre: form.nombre,
      cantidad_sesiones:
        form.cantidad_sesiones === '' ? null : Number(form.cantidad_sesiones),
      valor_neto: Number(form.valor_neto),
      valor_con_iva: Number(form.valor_con_iva),
    });
    setEditando(null);
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (
      !formNuevo.nombre.trim() ||
      !formNuevo.valor_neto ||
      !formNuevo.valor_con_iva
    )
      return;
    setCreando(true);
    await crearPlan({
      nombre: formNuevo.nombre.trim(),
      cantidad_sesiones:
        formNuevo.cantidad_sesiones === ''
          ? null
          : Number(formNuevo.cantidad_sesiones),
      valor_neto: Number(formNuevo.valor_neto),
      valor_con_iva: Number(formNuevo.valor_con_iva),
    });
    setCreando(false);
    setFormNuevo({
      nombre: '',
      cantidad_sesiones: '',
      valor_neto: '',
      valor_con_iva: '',
    });
    setMostrarNuevo(false);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => {
            setMostrarNuevo(!mostrarNuevo);
            setEditando(null);
          }}
          className="flex items-center gap-1 bg-cyan-brand text-ink text-sm font-semibold px-3 py-2 rounded-lg transition-transform active:scale-95"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {mostrarNuevo && (
        <form
          onSubmit={handleCrear}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4 flex flex-col gap-2"
        >
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Nombre del plan
            </label>
            <input
              value={formNuevo.nombre}
              onChange={(e) =>
                setFormNuevo({ ...formNuevo, nombre: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Sesiones (vacío = ilimitado)
            </label>
            <input
              type="number"
              value={formNuevo.cantidad_sesiones}
              onChange={(e) =>
                setFormNuevo({
                  ...formNuevo,
                  cantidad_sesiones: e.target.value,
                })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Valor neto
            </label>
            <input
              type="number"
              value={formNuevo.valor_neto}
              onChange={(e) =>
                setFormNuevo({ ...formNuevo, valor_neto: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Valor con IVA
            </label>
            <input
              type="number"
              value={formNuevo.valor_con_iva}
              onChange={(e) =>
                setFormNuevo({ ...formNuevo, valor_con_iva: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={creando}
            className="bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            {creando ? 'Creando...' : 'Crear plan'}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {Object.values(planes).map((p) => (
          <div
            key={p.id}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
          >
            {editando === p.id ? (
              <div className="flex flex-col gap-2">
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Nombre del plan"
                />
                <input
                  type="number"
                  value={form.cantidad_sesiones}
                  onChange={(e) =>
                    setForm({ ...form, cantidad_sesiones: e.target.value })
                  }
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Sesiones (vacío = ilimitado)"
                />
                <input
                  type="number"
                  value={form.valor_neto}
                  onChange={(e) =>
                    setForm({ ...form, valor_neto: e.target.value })
                  }
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Valor neto"
                />
                <input
                  type="number"
                  value={form.valor_con_iva}
                  onChange={(e) =>
                    setForm({ ...form, valor_con_iva: e.target.value })
                  }
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Valor con IVA"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => guardar(p.id)}
                    className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm transition-transform active:scale-[0.98]"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    className="flex-1 bg-white/10 text-white rounded-lg py-2 text-sm transition-transform active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-display text-xl">{p.nombre}</p>
                  <p className="text-white/40 text-sm">
                    {p.cantidad_sesiones
                      ? `${p.cantidad_sesiones} sesiones/mes`
                      : 'Ilimitado'}{' '}
                    · Neto ${p.valor_neto.toLocaleString('es-CL')} · Con IVA $
                    {p.valor_con_iva.toLocaleString('es-CL')}
                  </p>
                </div>
                <button
                  onClick={() => abrirEdicion(p)}
                  className="text-cyan-brand text-sm font-medium transition-transform active:scale-95"
                >
                  Editar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
