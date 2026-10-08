import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatearPesos, hoyLocalISO, mesActualKey, sumarMeses, nombreMes } from '../../lib/ingresos';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';

export const CATEGORIAS_GASTO = [
  { valor: 'arriendo', label: 'Arriendo' },
  { valor: 'sueldos', label: 'Sueldos y coaches' },
  { valor: 'servicios', label: 'Luz, agua, internet' },
  { valor: 'equipamiento', label: 'Equipamiento' },
  { valor: 'insumos', label: 'Insumos y limpieza' },
  { valor: 'marketing', label: 'Publicidad' },
  { valor: 'otro', label: 'Otro' },
];

const etiquetaCategoria = (v) => CATEGORIAS_GASTO.find((c) => c.valor === v)?.label || 'Otro';

function fechaCorta(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function FormularioGasto({ inicial, onCerrar }) {
  const { guardarGasto } = useAuth();
  const [form, setForm] = useState(
    inicial || { fecha: hoyLocalISO(), monto: '', categoria: 'arriendo', descripcion: '' }
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    if (!form.monto || Number(form.monto) <= 0) return setError('Ingresa el monto.');
    if (!form.fecha) return setError('Elige la fecha.');
    setGuardando(true);
    const r = await guardarGasto(form);
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    onCerrar();
  }

  const campo =
    'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCerrar} />
      <div className="relative w-full sm:max-w-md bg-ink border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-display text-lg">{inicial?.id ? 'Editar gasto' : 'Nuevo gasto'}</p>
          <button onClick={onCerrar} className="text-white/40 p-1" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-white/40 text-xs mb-1 block">Monto</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className={campo}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={campo} />
            </div>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Categoría</label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={campo}>
              {CATEGORIAS_GASTO.map((c) => (
                <option key={c.valor} value={c.valor} className="bg-ink">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Detalle (opcional)</label>
            <input
              value={form.descripcion || ''}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej: Arriendo octubre, mancuernas 10 kg..."
              className={campo}
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={onCerrar} className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Gastos() {
  const { gastos, pagos, eliminarGasto } = useAuth();
  const [mes, setMes] = useState(mesActualKey());
  const [formulario, setFormulario] = useState(null); // null | {} (nuevo) | gasto (editar)
  const [borrando, setBorrando] = useState(null);

  const delMes = (gastos || [])
    .filter((g) => (g.fecha || '').slice(0, 7) === mes)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const total = delMes.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  const ingresos = (pagos || [])
    .filter((p) => (p.fecha || '').slice(0, 7) === mes)
    .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const porCategoria = CATEGORIAS_GASTO.map((c) => ({
    ...c,
    total: delMes.filter((g) => g.categoria === c.valor).reduce((acc, g) => acc + (Number(g.monto) || 0), 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxCat = Math.max(1, ...porCategoria.map((c) => c.total));

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMes(sumarMeses(mes, -1))} className="p-2 text-white/50" aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <p className="text-white font-display text-lg">{nombreMes(mes)}</p>
        <button
          onClick={() => setMes(sumarMeses(mes, 1))}
          disabled={mes >= mesActualKey()}
          className="p-2 text-white/50 disabled:opacity-20"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Cifra etiqueta="Ingresos" valor={formatearPesos(ingresos)} />
        <Cifra etiqueta="Gastos" valor={formatearPesos(total)} />
        <Cifra etiqueta="Utilidad" valor={formatearPesos(ingresos - total)} resaltar={ingresos - total >= 0} />
      </div>

      <button
        onClick={() => setFormulario({})}
        className="w-full flex items-center justify-center gap-1.5 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm mb-5"
      >
        <Plus size={16} /> Registrar gasto
      </button>

      {porCategoria.length > 0 && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-3">Por categoría</p>
          <div className="flex flex-col gap-2.5">
            {porCategoria.map((c) => (
              <div key={c.valor}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">{c.label}</span>
                  <span className="text-white tabular-nums">{formatearPesos(c.total)}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-brand rounded-full" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {delMes.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-10">No hay gastos registrados este mes.</p>
      ) : (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/10">
          {delMes.map((g) => (
            <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold tabular-nums">{formatearPesos(g.monto)}</p>
                <p className="text-white/45 text-xs truncate">
                  {fechaCorta(g.fecha)} · {etiquetaCategoria(g.categoria)}
                  {g.descripcion ? ` · ${g.descripcion}` : ''}
                </p>
              </div>
              {borrando === g.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-red-300 text-[11px]">¿Borrar?</span>
                  <button
                    onClick={async () => {
                      await eliminarGasto(g.id);
                      setBorrando(null);
                    }}
                    className="bg-red-500/80 text-white text-[11px] font-semibold px-2 py-1 rounded-md"
                  >
                    Sí
                  </button>
                  <button onClick={() => setBorrando(null)} className="bg-white/10 text-white text-[11px] px-2 py-1 rounded-md">
                    No
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setFormulario(g)} className="text-cyan-brand/80 p-1.5" aria-label="Editar gasto">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setBorrando(g.id)} className="text-red-400/60 p-1.5" aria-label="Borrar gasto">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formulario && (
        <FormularioGasto
          inicial={formulario.id ? { ...formulario, monto: String(formulario.monto) } : null}
          onCerrar={() => setFormulario(null)}
        />
      )}
    </div>
  );
}

function Cifra({ etiqueta, valor, resaltar }) {
  return (
    <div
      className={`rounded-2xl p-3 border ${
        resaltar ? 'bg-cyan-brand/[0.07] border-cyan-brand/40' : 'bg-white/[0.04] border-white/10'
      }`}
    >
      <p className="text-white/40 text-[11px]">{etiqueta}</p>
      <p className="text-white font-display text-lg leading-tight tabular-nums">{valor}</p>
    </div>
  );
}
