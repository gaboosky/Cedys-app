import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  DollarSign,
  Pencil,
  Check,
  X,
  Trash2,
  RotateCcw,
} from 'lucide-react';

export default function IngresoDetalle() {
  const navigate = useNavigate();
  const { usuarios, planes, actualizarPerfil } = useAuth();

  const [editandoId, setEditandoId] = useState(null);
  const [montoForm, setMontoForm] = useState('');
  const [quitandoId, setQuitandoId] = useState(null);

  const conPlan = usuarios
    .filter((u) => u.estado === 'activo' && u.plan_id)
    .map((u) => ({
      ...u,
      planNombre: planes[u.plan_id]?.nombre || 'Sin nombre',
      monto:
        u.plan_monto_personalizado || planes[u.plan_id]?.valor_con_iva || 0,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const incluidos = conPlan.filter((u) => !u.excluido_ingreso);
  const excluidos = conPlan.filter((u) => u.excluido_ingreso);

  const total = incluidos.reduce((acc, u) => acc + u.monto, 0);

  function abrirEdicion(u) {
    setEditandoId(u.id);
    setMontoForm(String(u.monto));
    setQuitandoId(null);
  }

  async function guardarMonto(usuarioId) {
    const monto = Number(montoForm);
    if (!Number.isFinite(monto) || monto < 0) return;
    await actualizarPerfil(usuarioId, { plan_monto_personalizado: monto });
    setEditandoId(null);
  }

  async function excluir(usuarioId) {
    // Al quitar un pago del cálculo, también se libera la renovación de ese alumno
    // (vuelve a aparecer el botón "Renovar plan" en Usuarios, como si no hubiera pagado).
    await actualizarPerfil(usuarioId, {
      excluido_ingreso: true,
      fecha_ultima_renovacion: null,
    });
    setQuitandoId(null);
  }

  async function reincluir(usuarioId) {
    await actualizarPerfil(usuarioId, { excluido_ingreso: false });
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-white/50 text-sm mb-4"
      >
        <ArrowLeft size={16} /> Dashboard
      </button>

      <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-6 mb-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
        <div className="flex items-center gap-1.5 mb-1">
          <DollarSign size={14} className="text-cyan-brand" />
          <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">
            Total estimado
          </p>
        </div>
        <p
          className="font-display text-white leading-none"
          style={{ fontSize: '2.5rem' }}
        >
          ${total.toLocaleString('es-CL')}
        </p>
        <p className="text-white/40 text-xs mt-2">
          {incluidos.length} alumno{incluidos.length !== 1 ? 's' : ''} con plan
          activo
        </p>
      </div>

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
        Detalle por alumno
      </p>

      {incluidos.length === 0 ? (
        <p className="text-white/30 text-sm mb-6">
          No hay alumnos con plan activo.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {incluidos.map((u) => {
            const editandoEste = editandoId === u.id;
            const quitandoEste = quitandoId === u.id;

            return (
              <div
                key={u.id}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {u.nombre}
                    </p>
                    <p className="text-white/40 text-xs truncate">
                      {u.planNombre}
                    </p>
                  </div>

                  {editandoEste ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        value={montoForm}
                        onChange={(e) => setMontoForm(e.target.value)}
                        autoFocus
                        className="w-24 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
                      />
                      <button
                        onClick={() => guardarMonto(u.id)}
                        className="text-cyan-brand p-1.5"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="text-white/40 p-1.5"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : quitandoEste ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-red-300 text-[11px]">¿Quitar?</span>
                      <button
                        onClick={() => excluir(u.id)}
                        className="bg-red-500/80 text-white text-[11px] font-semibold px-2 py-1 rounded-md"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setQuitandoId(null)}
                        className="bg-white/10 text-white text-[11px] px-2 py-1 rounded-md"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-white font-display text-lg mr-1">
                        ${u.monto.toLocaleString('es-CL')}
                      </span>
                      <button
                        onClick={() => abrirEdicion(u)}
                        className="text-cyan-brand/70 p-1.5 hover:text-cyan-brand"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setQuitandoId(u.id)}
                        title="Quita el pago del cálculo y habilita de nuevo su botón de renovar"
                        className="text-red-400/60 p-1.5 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {excluidos.length > 0 && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
            Excluidos de este cálculo
          </p>
          <div className="flex flex-col gap-2">
            {excluidos.map((u) => (
              <div
                key={u.id}
                className="bg-white/[0.02] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between opacity-60"
              >
                <div className="min-w-0">
                  <p className="text-white/70 text-sm font-medium truncate">
                    {u.nombre}
                  </p>
                  <p className="text-white/30 text-xs truncate">
                    {u.planNombre} · ${u.monto.toLocaleString('es-CL')}
                  </p>
                </div>
                <button
                  onClick={() => reincluir(u.id)}
                  className="flex items-center gap-1 text-cyan-brand/70 text-xs shrink-0 hover:text-cyan-brand"
                >
                  <RotateCcw size={13} /> Reincluir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
