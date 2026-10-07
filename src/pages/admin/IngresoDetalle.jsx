import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft, DollarSign, Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3,
} from 'lucide-react';
import FormularioPago from '../../components/FormularioPago';
import {
  MEDIOS_PAGO, TIPOS_PAGO, etiquetaMedio, mesDe, mesActualKey, sumarMeses,
  nombreMes, formatearPesos, totalDe, totalesPorMes, pendientesDeCobro,
} from '../../lib/ingresos';

function fechaCorta(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function IngresoDetalle() {
  const navigate = useNavigate();
  const { usuarios, planes, pagos, diasRenovacion, actualizarPago, eliminarPago } = useAuth();

  const mesHoy = mesActualKey();
  const mesInicial = new URLSearchParams(window.location.search).get('mes');
  const [mes, setMes] = useState(mesInicial && /^\d{4}-\d{2}$/.test(mesInicial) && mesInicial <= mesHoy ? mesInicial : mesHoy);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [cobrandoId, setCobrandoId] = useState(null);
  const [verPendientes, setVerPendientes] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formEdicion, setFormEdicion] = useState({ monto: '', medio: 'transferencia', fecha: '' });
  const [borrandoId, setBorrandoId] = useState(null);

  const totales = useMemo(() => totalesPorMes(pagos), [pagos]);
  const pagosMes = pagos
    .filter((p) => mesDe(p.fecha) === mes)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creado_en || '').localeCompare(a.creado_en || ''));
  const totalMes = totalDe(pagosMes);
  const mesAnterior = sumarMeses(mes, -1);
  const totalAnterior = totales[mesAnterior] || 0;
  const diferencia = totalMes - totalAnterior;
  const variacionPct = totalAnterior > 0 ? Math.round((diferencia / totalAnterior) * 100) : null;

  const esMesActual = mes === mesHoy;
  const pendientes = esMesActual ? pendientesDeCobro(usuarios, planes, diasRenovacion) : [];
  const porCobrar = pendientes.reduce((acc, p) => acc + p.monto, 0);

  function abrirEdicion(p) {
    setEditandoId(p.id);
    setBorrandoId(null);
    setFormEdicion({ monto: String(p.monto), medio: p.medio || 'transferencia', fecha: p.fecha });
  }

  async function guardarEdicion(pagoId) {
    const resultado = await actualizarPago(pagoId, formEdicion);
    if (!resultado.ok) return alert(resultado.mensaje);
    setEditandoId(null);
  }

  async function confirmarBorrado(pagoId) {
    const resultado = await eliminarPago(pagoId);
    if (!resultado.ok) alert(resultado.mensaje);
    setBorrandoId(null);
  }

  const nombreDe = (id) => usuarios.find((u) => u.id === id)?.nombre || 'Alumno eliminado';

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
        <ArrowLeft size={16} /> Dashboard
      </button>

      {/* Selector de mes */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMes(sumarMeses(mes, -1))} className="p-2 text-white/50 hover:text-white" aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <p className="text-white font-display text-lg">{nombreMes(mes)}</p>
        <button
          onClick={() => setMes(sumarMeses(mes, 1))}
          disabled={mes >= mesHoy}
          className="p-2 text-white/50 hover:text-white disabled:opacity-20"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Total del mes + comparación con el mes anterior */}
      <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-6 mb-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
        <div className="flex items-center gap-1.5 mb-1">
          <DollarSign size={14} className="text-cyan-brand" />
          <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">
            {esMesActual ? 'Pagado este mes' : 'Pagado en el mes'}
          </p>
        </div>
        <p className="font-display text-white leading-none" style={{ fontSize: '2.5rem' }}>
          {formatearPesos(totalMes)}
        </p>
        <p className="text-white/40 text-xs mt-2">
          {pagosMes.length} pago{pagosMes.length !== 1 ? 's' : ''} registrado{pagosMes.length !== 1 ? 's' : ''}
        </p>

        <div className="flex items-center gap-1.5 mt-3 text-xs">
          {diferencia > 0 ? (
            <TrendingUp size={14} className="text-cyan-brand shrink-0" />
          ) : diferencia < 0 ? (
            <TrendingDown size={14} className="text-red-400 shrink-0" />
          ) : (
            <Minus size={14} className="text-white/40 shrink-0" />
          )}
          <span className="text-white/70">
            {diferencia === 0
              ? 'Igual que'
              : `${diferencia > 0 ? '+' : '−'}${formatearPesos(Math.abs(diferencia))}${
                  variacionPct !== null ? ` (${diferencia > 0 ? '+' : ''}${variacionPct}%)` : ''
                } vs`}{' '}
            {nombreMes(mesAnterior, { conAnio: false }).toLowerCase()} ({formatearPesos(totalAnterior)})
          </span>
        </div>
      </div>

      {/* Acceso a los gráficos */}
      <button
        onClick={() => navigate(`/ingresos-graficos?mes=${mes}`)}
        className="w-full flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 mb-4 transition-transform active:scale-[0.99] hover:border-cyan-brand/40"
      >
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center">
            <BarChart3 size={17} className="text-cyan-brand" />
          </span>
          <span className="text-left">
            <span className="block text-white text-sm font-medium">Ver gráficos</span>
            <span className="block text-white/40 text-xs">Evolución mensual, por plan y por medio de pago</span>
          </span>
        </span>
        <ChevronRight size={18} className="text-white/40" />
      </button>

      {/* Proyección: solo para el mes en curso */}
      {esMesActual && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide">Proyección del mes</p>
              <p className="text-white text-xl font-display mt-1">{formatearPesos(totalMes + porCobrar)}</p>
              <p className="text-white/40 text-xs mt-0.5">
                Pagado {formatearPesos(totalMes)} + por cobrar {formatearPesos(porCobrar)}
              </p>
            </div>
            {pendientes.length > 0 && (
              <button
                onClick={() => setVerPendientes(!verPendientes)}
                className="flex items-center gap-1 text-yellow-200 text-xs bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-2.5 py-1.5 shrink-0"
              >
                {pendientes.length} por cobrar
                {verPendientes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>

          {totalMes + porCobrar > 0 && (
            <div className="flex h-1.5 rounded-full overflow-hidden mt-3 gap-[2px]">
              <div className="bg-cyan-brand" style={{ width: `${(totalMes / (totalMes + porCobrar)) * 100}%` }} />
              <div className="bg-white/15 flex-1" />
            </div>
          )}

          {verPendientes && (
            <div className="flex flex-col gap-1.5 mt-3">
              {pendientes.map(({ usuario, monto }) => (
                <div key={usuario.id}>
                  <div className="flex items-center justify-between bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{usuario.nombre}</p>
                      <p className="text-white/35 text-[11px]">
                        {planes[usuario.plan_id]?.nombre} ·{' '}
                        {usuario.fecha_ultima_renovacion
                          ? `último pago ${fechaCorta(usuario.fecha_ultima_renovacion)}`
                          : 'sin pagos'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white/70 text-xs tabular-nums">{formatearPesos(monto)}</span>
                      <button
                        onClick={() => setCobrandoId(cobrandoId === usuario.id ? null : usuario.id)}
                        className="bg-cyan-brand text-ink text-[11px] font-semibold px-2 py-1 rounded-md"
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                  {cobrandoId === usuario.id && (
                    <div className="mt-1.5">
                      <FormularioPago
                        usuarioFijo={usuario}
                        soloRenovacion
                        onCancelar={() => setCobrandoId(null)}
                        onListo={() => setCobrandoId(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de pagos del mes */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/40 text-xs uppercase tracking-wide">
          Pagos de {nombreMes(mes, { conAnio: false }).toLowerCase()}
        </p>
        <button
          onClick={() => setMostrarNuevo(!mostrarNuevo)}
          className="flex items-center gap-1 bg-cyan-brand text-ink text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-transform active:scale-95"
        >
          <Plus size={14} /> Registrar pago
        </button>
      </div>

      {mostrarNuevo && (
        <div className="mb-3">
          <FormularioPago onCancelar={() => setMostrarNuevo(false)} onListo={() => setMostrarNuevo(false)} />
        </div>
      )}

      {pagosMes.length === 0 ? (
        <p className="text-white/30 text-sm py-6 text-center">No hay pagos registrados en este mes.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {pagosMes.map((p) => {
            const editando = editandoId === p.id;
            const borrando = borrandoId === p.id;
            return (
              <div key={p.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{nombreDe(p.usuario_id)}</p>
                    <p className="text-white/40 text-xs">
                      {fechaCorta(p.fecha)} · {etiquetaMedio(p.medio)} · {TIPOS_PAGO[p.tipo] || 'Pago'}
                      {p.plan_id && planes[p.plan_id] ? ` · ${planes[p.plan_id].nombre}` : ''}
                    </p>
                    {p.nota && <p className="text-white/30 text-[11px] mt-0.5">{p.nota}</p>}
                  </div>
                  {!editando && !borrando && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-white font-display text-lg mr-1 tabular-nums">{formatearPesos(p.monto)}</span>
                      <button onClick={() => abrirEdicion(p)} className="text-cyan-brand/70 p-1.5 hover:text-cyan-brand" aria-label="Editar pago">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setBorrandoId(p.id);
                          setEditandoId(null);
                        }}
                        className="text-red-400/60 p-1.5 hover:text-red-400"
                        aria-label="Borrar pago"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {editando && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formEdicion.monto}
                        onChange={(e) => setFormEdicion({ ...formEdicion, monto: e.target.value })}
                        className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-cyan-brand"
                      />
                      <input
                        type="date"
                        value={formEdicion.fecha}
                        onChange={(e) => setFormEdicion({ ...formEdicion, fecha: e.target.value })}
                        className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-cyan-brand"
                      />
                    </div>
                    <div className="flex bg-black/20 border border-white/10 rounded-lg p-1">
                      {MEDIOS_PAGO.map((m) => (
                        <button
                          key={m.valor}
                          type="button"
                          onClick={() => setFormEdicion({ ...formEdicion, medio: m.valor })}
                          className={`flex-1 py-1 rounded-md text-[11px] font-medium ${
                            formEdicion.medio === m.valor ? 'bg-cyan-brand text-ink' : 'text-white/50'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => guardarEdicion(p.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-cyan-brand text-ink font-semibold rounded-lg py-1.5 text-xs"
                      >
                        <Check size={14} /> Guardar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white rounded-lg py-1.5 text-xs"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {borrando && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                    <p className="text-red-200 text-xs mb-2">
                      ¿Borrar este pago de {formatearPesos(p.monto)}?
                      {p.tipo !== 'manual' && ' El alumno volverá a quedar con el pago pendiente.'}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => confirmarBorrado(p.id)} className="flex-1 bg-red-500/80 text-white font-semibold rounded-md py-1.5 text-xs">
                        Sí, borrar
                      </button>
                      <button onClick={() => setBorrandoId(null)} className="flex-1 bg-white/10 text-white rounded-md py-1.5 text-xs">
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
