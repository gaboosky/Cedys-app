import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  Trash2,
  Pencil,
  Ticket,
  CalendarDays,
  Snowflake,
  Users,
} from 'lucide-react';

export default function Planes() {
  const { planes: todosPlanes, guardarPlan, crearPlan, eliminarPlan, usuarios } = useAuth();
  // Los planes HIIT se editan en la pestaña HIIT
  const planes = Object.fromEntries(Object.entries(todosPlanes).filter(([, p]) => p.tipo !== 'hiit'));
  const [eliminando, setEliminando] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState(null);

  async function confirmarEliminar(planId) {
    const resultado = await eliminarPlan(planId);
    setEliminando(null);
    setErrorEliminar(
      resultado.ok ? null : { planId, mensaje: resultado.mensaje }
    );
  }
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});

  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [formNuevo, setFormNuevo] = useState({
    nombre: '',
    cantidad_sesiones: '',
    valor_neto: '',
    valor_con_iva: '',
    duracion_dias: '30',
  });
  const [creando, setCreando] = useState(false);

  function abrirEdicion(plan) {
    setEditando(plan.id);
    setForm({
      nombre: plan.nombre,
      cantidad_sesiones: plan.cantidad_sesiones ?? '',
      valor_neto: plan.valor_neto,
      valor_con_iva: plan.valor_con_iva,
      duracion_dias: plan.duracion_dias ?? 30,
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
      duracion_dias:
        form.duracion_dias === '' ? 30 : Number(form.duracion_dias),
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
      duracion_dias:
        formNuevo.duracion_dias === '' ? 30 : Number(formNuevo.duracion_dias),
    });
    setCreando(false);
    setFormNuevo({
      nombre: '',
      cantidad_sesiones: '',
      valor_neto: '',
      valor_con_iva: '',
      duracion_dias: '30',
    });
    setMostrarNuevo(false);
  }

  const [vista, setVista] = useState(() => {
    try {
      return localStorage.getItem('cedys_planes_vista') || 'lista';
    } catch (e) {
      return 'lista';
    }
  });
  function cambiarVista(v) {
    setVista(v);
    try {
      localStorage.setItem('cedys_planes_vista', v);
    } catch (e) {}
  }

  const alumnosDe = (planId) =>
    usuarios.filter((u) => u.plan_id === planId && u.estado !== 'inactivo')
      .length;
  const precio = (n) => '$' + (n || 0).toLocaleString('es-CL');

  const ordenados = Object.values(planes).sort(
    (a, b) =>
      (a.duracion_dias || 30) - (b.duracion_dias || 30) ||
      (a.valor_con_iva || 0) - (b.valor_con_iva || 0)
  );
  // Grupos por duración para la vista lista
  const GRUPOS = [
    { t: 'Mensuales', f: (d) => d < 90 },
    { t: 'Trimestrales y semestrales', f: (d) => d >= 90 && d < 365 },
    { t: 'Anuales', f: (d) => d >= 365 },
  ]
    .map((g) => ({
      ...g,
      planes: ordenados.filter((p) => g.f(p.duracion_dias || 30)),
    }))
    .filter((g) => g.planes.length);

  const tarjeta = (p) => (
    <div
      key={p.id}
      className="relative overflow-hidden bg-white/[0.04] border border-white/10 rounded-3xl p-5"
    >
      {editando === p.id ? (
        <div className="flex flex-col gap-2">
          <input
            value={form.nombre}
            onChange={(e) =>
              setForm({ ...form, nombre: e.target.value })
            }
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
          <input
            type="number"
            value={form.duracion_dias}
            onChange={(e) =>
              setForm({ ...form, duracion_dias: e.target.value })
            }
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            placeholder="Duración en días (ej: 30, 90, 180, 365)"
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
          <button
            onClick={() => {
              setEditando(null);
              setEliminando(p.id);
              setErrorEliminar(null);
            }}
            className="text-red-300/80 text-xs mt-1 self-center hover:underline"
          >
            Eliminar este plan
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-display text-2xl leading-tight">
                {p.nombre}
              </p>
              <p className="font-display text-3xl text-cyan-brand leading-none mt-2">
                ${(p.valor_con_iva || 0).toLocaleString('es-CL')}
                <span className="text-white/40 text-xs font-sans ml-1.5">
                  con IVA
                </span>
              </p>
              <p className="text-white/35 text-xs mt-1">
                Neto ${(p.valor_neto || 0).toLocaleString('es-CL')}
              </p>
            </div>
            {eliminando === p.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-red-300 text-xs">¿Eliminar?</span>
                <button
                  onClick={() => confirmarEliminar(p.id)}
                  className="bg-red-500/80 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md"
                >
                  Sí
                </button>
                <button
                  onClick={() => setEliminando(null)}
                  className="bg-white/10 text-white text-xs px-2.5 py-1.5 rounded-md"
                >
                  No
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => abrirEdicion(p)}
                  className="w-9 h-9 rounded-full bg-cyan-brand/15 text-cyan-brand flex items-center justify-center transition-transform active:scale-90"
                  aria-label="Editar plan"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => {
                    setEliminando(p.id);
                    setErrorEliminar(null);
                  }}
                  className="w-9 h-9 rounded-full bg-red-500/10 text-red-300 flex items-center justify-center transition-transform active:scale-90"
                  aria-label="Eliminar plan"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-4">
            <span className="flex items-center gap-1 bg-white/[0.06] text-white/75 text-xs rounded-full px-2.5 py-1">
              <Ticket size={12} className="text-cyan-brand" />
              {p.cantidad_sesiones
                ? `${p.cantidad_sesiones} sesiones`
                : 'Ilimitado'}
            </span>
            <span className="flex items-center gap-1 bg-white/[0.06] text-white/75 text-xs rounded-full px-2.5 py-1">
              <CalendarDays size={12} className="text-amber-300" />
              {p.duracion_dias || 30} días
            </span>
            <span
              className={`flex items-center gap-1 text-xs rounded-full px-2.5 py-1 ${
                (p.duracion_dias || 30) >= 90
                  ? 'bg-sky-400/10 text-sky-200'
                  : 'bg-white/[0.04] text-white/40'
              }`}
            >
              <Snowflake size={12} />
              {(p.duracion_dias || 30) >= 90
                ? 'Puede congelar'
                : 'Sin congelar'}
            </span>
            {p.cantidad_sesiones && p.valor_con_iva ? (
              <span className="bg-white/[0.04] text-white/45 text-xs rounded-full px-2.5 py-1">
                $
                {Math.round(
                  p.valor_con_iva / p.cantidad_sesiones
                ).toLocaleString('es-CL')}{' '}
                por sesión
              </span>
            ) : null}
          </div>
        </div>
      )}
      {editando !== p.id && (
        <p className="flex items-center gap-1.5 text-white/45 text-xs mt-3 pt-3 border-t border-white/[0.06]">
          <Users size={13} />
          {(() => {
            const n = alumnosDe(p.id);
            return n === 0
              ? 'Ningún alumno con este plan'
              : `${n} ${n === 1 ? 'alumno' : 'alumnos'} con este plan`;
          })()}
        </p>
      )}
      {errorEliminar?.planId === p.id && (
        <p className="text-red-400 text-xs mt-2">
          {errorEliminar.mensaje}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex items-end justify-between gap-3 mb-5">
        <div>
          <p className="font-display text-3xl text-white leading-tight">
            Planes
          </p>
          <p className="text-white/40 text-xs mt-1">
            {Object.keys(planes).length} plan
            {Object.keys(planes).length !== 1 ? 'es' : ''} ·{' '}
            {
              usuarios.filter((u) => u.plan_id && u.estado !== 'inactivo')
                .length
            }{' '}
            alumnos con plan
          </p>
        </div>
        <button
          onClick={() => {
            setMostrarNuevo(!mostrarNuevo);
            setEditando(null);
          }}
          className="flex items-center gap-1 bg-cyan-brand text-ink text-sm font-semibold px-3 py-2 rounded-xl shrink-0 transition-transform active:scale-95"
        >
          <Plus size={16} /> Nuevo plan
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
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Duración (días)
            </label>
            <input
              type="number"
              value={formNuevo.duracion_dias}
              onChange={(e) =>
                setFormNuevo({ ...formNuevo, duracion_dias: e.target.value })
              }
              placeholder="30"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
            <p className="text-white/30 text-xs mt-1">
              Ej: mensual 30, trimestral 90, semestral 180, anual 365. Solo los
              planes de 90 días o más permiten congelar membresía.
            </p>
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

      {/* Lista / Tarjetas */}
      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-4 max-w-xs">
        {[
          { v: 'lista', t: 'Lista' },
          { v: 'tarjetas', t: 'Tarjetas' },
        ].map((x) => (
          <button
            key={x.v}
            onClick={() => cambiarVista(x.v)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              vista === x.v ? 'bg-cyan-brand text-ink' : 'text-white/50'
            }`}
          >
            {x.t}
          </button>
        ))}
      </div>

      {vista === 'tarjetas' ? (
        <div className="flex flex-col gap-3">{ordenados.map(tarjeta)}</div>
      ) : (
        <div className="flex flex-col gap-5">
          {GRUPOS.map((g) => (
            <div key={g.t}>
              <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wide mb-2 px-1">
                {g.t}
              </p>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                {g.planes.map((p, i) =>
                  editando === p.id || eliminando === p.id ? (
                    <div key={p.id} className="p-2">
                      {tarjeta(p)}
                    </div>
                  ) : (
                    <button
                      key={p.id}
                      onClick={() => abrirEdicion(p)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors ${
                        i ? 'border-t border-white/[0.06]' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">
                          {p.nombre}
                        </p>
                        <p className="text-white/40 text-[11px] truncate">
                          {p.cantidad_sesiones
                            ? `${p.cantidad_sesiones} sesiones`
                            : 'Ilimitado'}{' '}
                          · {p.duracion_dias || 30} días
                          {' · '}
                          {(() => {
                            const n = alumnosDe(p.id);
                            return n
                              ? `${n} alumno${n === 1 ? '' : 's'}`
                              : 'sin alumnos';
                          })()}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-cyan-brand font-semibold text-sm">
                          {precio(p.valor_con_iva)}
                        </p>
                        <p className="text-white/30 text-[10px]">
                          neto {precio(p.valor_neto)}
                        </p>
                      </div>
                      <Pencil size={14} className="text-white/30 shrink-0" />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
