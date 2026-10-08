import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import FormularioPago from '../../components/FormularioPago';
import {
  MEDIOS_PAGO,
  etiquetaMedio,
  formatearPesos,
  montoPlanDe,
  vencimientoDe,
  TIPOS_PAGO,
} from '../../lib/ingresos';
import { Search, RefreshCw, Pencil, History, X, Trash2, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

function fechaLargaSinAnio(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
}

// Link de WhatsApp con un recordatorio de pago listo para enviar
function linkRecordatorio(u, v, monto, plan, gimnasio) {
  const numero = String(u.telefono || '').replace(/\D/g, '');
  if (!numero) return null;
  const nombre = (u.nombre || '').split(' ')[0];
  const cuando = !v
    ? 'tienes pendiente el pago de tu plan'
    : v.dias < 0
    ? `tu plan venció el ${fechaLargaSinAnio(v.vence)}`
    : v.dias === 0
    ? 'tu plan vence hoy'
    : `tu plan vence el ${fechaLargaSinAnio(v.vence)}`;
  const texto = `Hola ${nombre}! Te escribimos de ${gimnasio || 'CED&S'} 💪 Te recordamos que ${cuando}${
    plan ? ` (${plan.nombre}` : ''
  }${plan && monto ? `, ${formatearPesos(monto)})` : plan ? ')' : ''}. Puedes renovarlo por transferencia o en el gimnasio. ¡Gracias!`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function fechaCorta(fechaISO) {
  if (!fechaISO) return '—';
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ESTADOS = {
  vencido: { label: 'Vencido', clase: 'bg-red-500/10 text-red-300 border-red-500/30', orden: 0 },
  por_vencer: { label: 'Por vencer', clase: 'bg-yellow-400/10 text-yellow-200 border-yellow-400/30', orden: 1 },
  sin_pago: { label: 'Sin pago', clase: 'bg-white/5 text-white/60 border-white/15', orden: 2 },
  al_dia: { label: 'Al día', clase: 'bg-cyan-brand/10 text-cyan-brand border-cyan-brand/25', orden: 3 },
};

const FILTROS = [
  { valor: 'renovar', label: 'Por renovar' },
  { valor: 'al_dia', label: 'Al día' },
  { valor: 'todos', label: 'Todos' },
];

function textoDias(dias) {
  if (dias === null) return '';
  if (dias < 0) return `venció hace ${-dias} día${dias === -1 ? '' : 's'}`;
  if (dias === 0) return 'vence hoy';
  return `vence en ${dias} día${dias === 1 ? '' : 's'}`;
}

function Modal({ titulo, subtitulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCerrar} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-ink border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-white font-display text-lg leading-tight">{titulo}</p>
            {subtitulo && <p className="text-white/40 text-xs mt-0.5">{subtitulo}</p>}
          </div>
          <button onClick={onCerrar} className="text-white/40 p-1 hover:text-white" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditarPago({ pago, venceInicial, onListo }) {
  const { actualizarPago } = useAuth();
  const [form, setForm] = useState({
    monto: String(pago.monto ?? ''),
    fecha: pago.fecha || '',
    medio: pago.medio || 'transferencia',
    vence: pago.vence || venceInicial || '',
    nota: pago.nota || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    if (!form.monto || !form.fecha) return setError('Completa el monto y la fecha.');
    setGuardando(true);
    const cambios = {
      monto: form.monto,
      fecha: form.fecha,
      medio: form.medio,
      nota: form.nota.trim() || null,
    };
    if (form.vence) cambios.vence = form.vence;
    const r = await actualizarPago(pago.id, cambios);
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    onListo();
  }

  const campo =
    'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand';

  return (
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
          <label className="text-white/40 text-xs mb-1 block">Fecha del pago</label>
          <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={campo} />
        </div>
      </div>
      <div>
        <label className="text-white/40 text-xs mb-1 block">Medio de pago</label>
        <div className="flex gap-1.5">
          {MEDIOS_PAGO.map((m) => (
            <button
              key={m.valor}
              onClick={() => setForm({ ...form, medio: m.valor })}
              className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                form.medio === m.valor
                  ? 'bg-cyan-brand text-ink border-cyan-brand font-semibold'
                  : 'bg-white/[0.04] text-white/60 border-white/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {pago.tipo !== 'manual' && (
        <div>
          <label className="text-white/40 text-xs mb-1 block">Vence el</label>
          <input type="date" value={form.vence} onChange={(e) => setForm({ ...form, vence: e.target.value })} className={campo} />
        </div>
      )}
      <div>
        <label className="text-white/40 text-xs mb-1 block">Nota (opcional)</label>
        <input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} className={campo} />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button onClick={onListo} className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Historial({ pagosAlumno, onEditar }) {
  const { eliminarPago } = useAuth();
  const [borrando, setBorrando] = useState(null);

  if (pagosAlumno.length === 0) return <p className="text-white/35 text-xs px-4 pb-3">Sin pagos registrados.</p>;

  return (
    <div className="px-3 pb-3 flex flex-col gap-1.5">
      {pagosAlumno.map((p) => (
        <div key={p.id} className="bg-black/25 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white text-sm tabular-nums">
              {formatearPesos(p.monto)} <span className="text-white/40 text-xs">· {etiquetaMedio(p.medio)}</span>
            </p>
            <p className="text-white/40 text-[11px]">
              {fechaCorta(p.fecha)} · {TIPOS_PAGO[p.tipo] || 'Pago'}
              {p.vence ? ` · vence ${fechaCorta(p.vence)}` : ''}
            </p>
          </div>
          {borrando === p.id ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-red-300 text-[11px]">¿Borrar?</span>
              <button
                onClick={async () => {
                  const r = await eliminarPago(p.id);
                  if (!r.ok) alert(r.mensaje);
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
              <button onClick={() => onEditar(p)} className="text-cyan-brand/80 p-1.5 hover:text-cyan-brand" aria-label="Editar pago">
                <Pencil size={14} />
              </button>
              <button onClick={() => setBorrando(p.id)} className="text-red-400/60 p-1.5 hover:text-red-400" aria-label="Borrar pago">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Renovaciones() {
  const { usuarios, planes, pagos, diasRenovacion, infoGimnasio } = useAuth();
  const [filtro, setFiltro] = useState('renovar');
  const [busqueda, setBusqueda] = useState('');
  const [renovando, setRenovando] = useState(null); // usuario
  const [editando, setEditando] = useState(null); // { pago, usuario }
  const [historialAbierto, setHistorialAbierto] = useState(null);

  const filas = useMemo(() => {
    return usuarios
      .filter((u) => u.estado !== 'inactivo' && u.estado !== 'pendiente' && u.plan_id)
      .map((u) => {
        const pagosAlumno = pagos
          .filter((p) => p.usuario_id === u.id)
          .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.creado_en || '').localeCompare(a.creado_en || ''));
        const ultimo = pagosAlumno[0] || null;
        const v = vencimientoDe(u, planes, diasRenovacion);
        let estado;
        if (!v) estado = 'sin_pago';
        else if (v.dias <= 0) estado = 'vencido';
        else if (v.dias <= 7) estado = 'por_vencer';
        else estado = 'al_dia';
        return { u, plan: planes[u.plan_id], pagosAlumno, ultimo, v, estado };
      })
      .sort(
        (a, b) =>
          ESTADOS[a.estado].orden - ESTADOS[b.estado].orden ||
          (a.v?.dias ?? 0) - (b.v?.dias ?? 0) ||
          (a.u.nombre || '').localeCompare(b.u.nombre || '')
      );
  }, [usuarios, planes, pagos, diasRenovacion]);

  const porRenovar = filas.filter((f) => f.estado !== 'al_dia');
  const conteo = {
    renovar: porRenovar.length,
    al_dia: filas.length - porRenovar.length,
    todos: filas.length,
  };
  const montoPorRenovar = porRenovar.reduce((acc, f) => acc + (montoPlanDe(f.u, planes) || 0), 0);

  const texto = busqueda.trim().toLowerCase();
  const visibles = filas
    .filter((f) => (filtro === 'renovar' ? f.estado !== 'al_dia' : filtro === 'al_dia' ? f.estado === 'al_dia' : true))
    .filter(
      (f) =>
        !texto ||
        (f.u.nombre || '').toLowerCase().includes(texto) ||
        (f.u.correo || '').toLowerCase().includes(texto) ||
        (f.u.rut || '').toLowerCase().includes(texto)
    );

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-3xl mx-auto">
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
          <p className="text-white/40 text-[11px] uppercase tracking-wide">Por renovar</p>
          <p className="text-white font-display text-2xl leading-tight mt-0.5">{porRenovar.length}</p>
          <p className="text-white/35 text-[11px]">vencidos, por vencer o sin pago</p>
        </div>
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
          <p className="text-white/40 text-[11px] uppercase tracking-wide">Monto por cobrar</p>
          <p className="text-white font-display text-2xl leading-tight mt-0.5">{formatearPesos(montoPorRenovar)}</p>
          <p className="text-white/35 text-[11px]">según el valor de cada plan</p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar alumno por nombre, correo o RUT"
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
        />
      </div>

      <div className="flex gap-2 mb-5">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              filtro === f.valor ? 'bg-cyan-brand text-ink' : 'bg-white/[0.06] text-white/50'
            }`}
          >
            {f.label} ({conteo[f.valor]})
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <p className="text-white/30 text-sm text-center py-12">
          {filtro === 'renovar' ? 'No hay alumnos por renovar. 🎉' : 'No hay alumnos para mostrar.'}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {visibles.map(({ u, plan, pagosAlumno, ultimo, v, estado }) => {
          const historialAqui = historialAbierto === u.id;
          return (
            <div key={u.id} className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{u.nombre}</p>
                    <p className="text-white/40 text-xs truncate">{plan?.nombre || 'Plan eliminado'}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${ESTADOS[estado].clase}`}>
                    {ESTADOS[estado].label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-black/20 rounded-xl px-3 py-2">
                    <p className="text-white/35 text-[10px] uppercase tracking-wide">Último pago</p>
                    {ultimo ? (
                      <>
                        <p className="text-white text-sm font-semibold tabular-nums">{formatearPesos(ultimo.monto)}</p>
                        <p className="text-white/45 text-[11px]">
                          {fechaCorta(ultimo.fecha)} · {etiquetaMedio(ultimo.medio)}
                        </p>
                      </>
                    ) : (
                      <p className="text-white/40 text-sm">Sin pagos</p>
                    )}
                  </div>
                  <div className="bg-black/20 rounded-xl px-3 py-2">
                    <p className="text-white/35 text-[10px] uppercase tracking-wide">Vence el</p>
                    <p className="text-white text-sm font-semibold">{v ? fechaCorta(v.vence) : '—'}</p>
                    <p
                      className={`text-[11px] ${
                        estado === 'vencido' ? 'text-red-300' : estado === 'por_vencer' ? 'text-yellow-200' : 'text-white/45'
                      }`}
                    >
                      {v ? textoDias(v.dias) : `Plan: ${formatearPesos(montoPlanDe(u, planes) || 0)}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setRenovando(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm transition-transform active:scale-[0.98]"
                  >
                    <RefreshCw size={14} /> Renovar
                  </button>
                  <button
                    onClick={() => ultimo && setEditando({ pago: ultimo, usuario: u, venceInicial: v?.vence })}
                    disabled={!ultimo}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 text-white rounded-lg py-2 text-sm disabled:opacity-30"
                  >
                    <Pencil size={14} /> Editar pago
                  </button>
                  {estado !== 'al_dia' && linkRecordatorio(u, v, montoPlanDe(u, planes), plan, infoGimnasio?.nombre) && (
                    <a
                      href={linkRecordatorio(u, v, montoPlanDe(u, planes), plan, infoGimnasio?.nombre)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center bg-[#25D366]/15 border border-[#25D366]/40 text-[#7ee2a5] rounded-lg px-3 py-2"
                      aria-label="Recordar pago por WhatsApp"
                      title="Recordar pago por WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => setHistorialAbierto(historialAqui ? null : u.id)}
                    className="flex items-center justify-center gap-1 bg-white/[0.06] text-white/70 rounded-lg px-3 py-2 text-sm"
                    aria-label="Historial de pagos"
                  >
                    <History size={14} />
                    {historialAqui ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {historialAqui && (
                <div className="border-t border-white/10 pt-3">
                  <p className="text-white/35 text-[11px] uppercase tracking-wide px-4 mb-2">
                    Historial de pagos ({pagosAlumno.length})
                  </p>
                  <Historial pagosAlumno={pagosAlumno} onEditar={(p) => setEditando({ pago: p, usuario: u, venceInicial: p.id === ultimo?.id ? v?.vence : '' })} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {renovando && (
        <Modal
          titulo={`Renovar a ${renovando.nombre}`}
          subtitulo={planes[renovando.plan_id]?.nombre}
          onCerrar={() => setRenovando(null)}
        >
          <FormularioPago
            usuarioFijo={renovando}
            soloRenovacion
            onCancelar={() => setRenovando(null)}
            onListo={() => setRenovando(null)}
          />
        </Modal>
      )}

      {editando && (
        <Modal
          titulo="Editar pago"
          subtitulo={`${editando.usuario.nombre} · ${fechaCorta(editando.pago.fecha)}`}
          onCerrar={() => setEditando(null)}
        >
          <EditarPago pago={editando.pago} venceInicial={editando.venceInicial} onListo={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  );
}
