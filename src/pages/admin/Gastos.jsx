import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatearPesos, hoyLocalISO, mesActualKey, sumarMeses, nombreMes } from '../../lib/ingresos';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X, Home, Users, Zap, Dumbbell, SprayCan, Megaphone, Package, CheckCircle2, AlertTriangle, AlertOctagon, TrendingUp, TrendingDown } from 'lucide-react';

export const CATEGORIAS_GASTO = [
  { valor: 'arriendo', label: 'Arriendo' },
  { valor: 'sueldos', label: 'Sueldos y coaches' },
  { valor: 'servicios', label: 'Luz, agua, internet' },
  { valor: 'equipamiento', label: 'Equipamiento' },
  { valor: 'insumos', label: 'Insumos y limpieza' },
  { valor: 'marketing', label: 'Publicidad' },
  { valor: 'otro', label: 'Otro' },
];

const ICONO_CATEGORIA = {
  arriendo: Home,
  sueldos: Users,
  servicios: Zap,
  equipamiento: Dumbbell,
  insumos: SprayCan,
  marketing: Megaphone,
  otro: Package,
};

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

  // Comparación con el mes anterior y cuánto de lo que entra se va en gastos
  const mesAnterior = sumarMeses(mes, -1);
  const totalAnterior = (gastos || [])
    .filter((g) => (g.fecha || '').slice(0, 7) === mesAnterior)
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  const diferencia = total - totalAnterior;
  const pctDeIngresos = ingresos > 0 ? Math.round((total / ingresos) * 100) : null;
  const estado =
    total === 0 ? 'bien' : pctDeIngresos === null ? 'revisar' : pctDeIngresos <= 70 ? 'bien' : pctDeIngresos <= 100 ? 'atencion' : 'revisar';
  const SEM = {
    bien: { t: 'Bien', i: CheckCircle2, c: 'bg-green-400/10 text-green-300 border-green-400/30' },
    atencion: { t: 'Atención', i: AlertTriangle, c: 'bg-yellow-400/10 text-yellow-200 border-yellow-400/30' },
    revisar: { t: 'Revisar', i: AlertOctagon, c: 'bg-red-500/10 text-red-300 border-red-500/30' },
  }[estado];
  const IconoSem = SEM.i;
  const resultado = ingresos - total;
  const esteMes = mes === mesActualKey();

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-3xl mx-auto">
      <p className="font-display text-3xl text-white leading-tight">Gastos</p>
      <p className="text-white/40 text-xs mt-1 mb-4">Todo lo que sale del gimnasio: arriendo, coaches, cuentas…</p>

      <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-2 py-1.5 mb-4">
        <button onClick={() => setMes(sumarMeses(mes, -1))} className="p-2 text-white/60" aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <p className="text-white font-semibold">{nombreMes(mes)}</p>
        <button
          onClick={() => setMes(sumarMeses(mes, 1))}
          disabled={esteMes}
          className="p-2 text-white/60 disabled:opacity-20"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Resumen en palabras */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-4">
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <p className="text-white/70 text-sm">{esteMes ? 'Este mes llevas gastado' : `En ${nombreMes(mes, { conAnio: false }).toLowerCase()} gastaste`}</p>
            <span className={`flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2 py-0.5 ${SEM.c}`}>
              <IconoSem size={12} /> {SEM.t}
            </span>
          </div>
          <p className="font-display text-white text-5xl leading-none mt-1.5 tabular-nums">{formatearPesos(total)}</p>

          {totalAnterior > 0 && diferencia !== 0 && (
            <p
              className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 mt-2 ${
                diferencia > 0 ? 'bg-yellow-400/15 text-yellow-200' : 'bg-green-400/15 text-green-300'
              }`}
            >
              {diferencia > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {formatearPesos(Math.abs(diferencia))} {diferencia > 0 ? 'más' : 'menos'} que {nombreMes(mesAnterior, { conAnio: false }).toLowerCase()}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-black/25 rounded-xl py-2">
              <p className="text-white text-sm font-semibold tabular-nums">{formatearPesos(ingresos)}</p>
              <p className="text-white/40 text-[10px]">Entró</p>
            </div>
            <div className="bg-black/25 rounded-xl py-2">
              <p className="text-red-300 text-sm font-semibold tabular-nums">{formatearPesos(total)}</p>
              <p className="text-white/40 text-[10px]">Salió</p>
            </div>
            <div className={`rounded-xl py-2 ${resultado >= 0 ? 'bg-green-400/10' : 'bg-red-500/10'}`}>
              <p className={`text-sm font-bold tabular-nums ${resultado >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {resultado < 0 ? '−' : ''}
                {formatearPesos(Math.abs(resultado))}
              </p>
              <p className="text-white/40 text-[10px]">{resultado >= 0 ? 'Ganancia' : 'Pérdida'}</p>
            </div>
          </div>

          <p className="text-white/75 text-xs mt-3 leading-snug">
            {total === 0
              ? 'Aún no registras gastos este mes.'
              : pctDeIngresos === null
              ? 'Todavía no entra dinero este mes, así que los gastos aún no se cubren.'
              : `De cada $100 que entraron, $${pctDeIngresos} se fueron en gastos. ${
                  pctDeIngresos <= 70 ? 'Vas bien.' : pctDeIngresos <= 100 ? 'Ojo, queda poco margen.' : 'Los gastos superan lo que entró.'
                }`}
          </p>
        </div>
      </div>

      <button
        onClick={() => setFormulario({})}
        className="w-full flex items-center justify-center gap-1.5 bg-cyan-brand text-ink font-semibold rounded-xl py-3 text-sm mb-5"
      >
        <Plus size={16} /> Registrar gasto
      </button>

      {porCategoria.length > 0 && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-white text-sm font-medium">¿En qué se va la plata?</p>
          <p className="text-white/45 text-xs mb-3">
            Lo que más pesa: <span className="text-white">{porCategoria[0].label}</span> ({Math.round((porCategoria[0].total / total) * 100)}% de los gastos)
          </p>
          <div className="flex flex-col gap-3">
            {porCategoria.map((c) => {
              const Icono = ICONO_CATEGORIA[c.valor] || Package;
              const pct = Math.round((c.total / total) * 100);
              return (
                <div key={c.valor} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/[0.06] text-white/70 flex items-center justify-center shrink-0">
                    <Icono size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80 truncate">{c.label}</span>
                      <span className="text-white tabular-nums shrink-0 ml-2">
                        {formatearPesos(c.total)} <span className="text-white/40">· {pct}%</span>
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400/80 rounded-full" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Detalle ({delMes.length})</p>
      {delMes.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-10">No hay gastos registrados este mes.</p>
      ) : (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/10">
          {delMes.map((g) => (
            <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const Icono = ICONO_CATEGORIA[g.categoria] || Package;
                  return (
                    <span className="w-8 h-8 rounded-lg bg-white/[0.06] text-white/60 flex items-center justify-center shrink-0">
                      <Icono size={15} />
                    </span>
                  );
                })()}
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">{g.descripcion || etiquetaCategoria(g.categoria)}</p>
                  <p className="text-white/45 text-xs truncate">
                    {fechaCorta(g.fecha)} · {etiquetaCategoria(g.categoria)}
                  </p>
                </div>
              </div>
              <p className="text-white text-sm font-semibold tabular-nums shrink-0 ml-auto mr-1">{formatearPesos(g.monto)}</p>
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
