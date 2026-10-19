import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import {
  Search,
  RefreshCw,
  Pencil,
  History,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Check,
  Receipt,
  CalendarClock,
  UserX,
} from 'lucide-react';
import {
  alumnosEnRiesgo,
  contactadoReciente,
  diasDesdeContacto,
  numeroWhatsapp,
} from '../../lib/seguimiento';

function fechaLargaSinAnio(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
  });
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
  const texto = `Hola ${nombre}! Te escribimos de ${
    gimnasio || 'CED&S'
  } 💪 Te recordamos que ${cuando}${plan ? ` (${plan.nombre}` : ''}${
    plan && monto ? `, ${formatearPesos(monto)})` : plan ? ')' : ''
  }. Puedes renovarlo por transferencia o en el gimnasio. ¡Gracias!`;
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
  vencido: {
    label: 'Vencido',
    clase: 'bg-red-500/10 text-red-300 border-red-500/30',
    orden: 0,
  },
  por_vencer: {
    label: 'Por vencer',
    clase: 'bg-yellow-400/10 text-yellow-200 border-yellow-400/30',
    orden: 1,
  },
  sin_pago: {
    label: 'Sin pago',
    clase: 'bg-white/5 text-white/60 border-white/15',
    orden: 2,
  },
  al_dia: {
    label: 'Al día',
    clase: 'bg-cyan-brand/10 text-cyan-brand border-cyan-brand/25',
    orden: 3,
  },
};

const FILTROS = [
  { valor: 'renovar', label: 'Por renovar' },
  { valor: 'vencidos', label: 'Vencidos' },
  { valor: 'sin_venir', label: 'Sin venir' },
  { valor: 'al_dia', label: 'Al día' },
  { valor: 'todos', label: 'Todos' },
];

function textoContacto(u) {
  const d = diasDesdeContacto(u);
  if (d === null) return null;
  if (d === 0) return 'Contactado hoy';
  if (d === 1) return 'Contactado ayer';
  return `Contactado hace ${d} días`;
}

function filtroInicial() {
  try {
    const t = new URLSearchParams(window.location.search).get('tab');
    return FILTROS.some((f) => f.valor === t) ? t : 'renovar';
  } catch (e) {
    return 'renovar';
  }
}

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
            <p className="text-white font-display text-lg leading-tight">
              {titulo}
            </p>
            {subtitulo && (
              <p className="text-white/40 text-xs mt-0.5">{subtitulo}</p>
            )}
          </div>
          <button
            onClick={onCerrar}
            className="text-white/40 p-1 hover:text-white"
            aria-label="Cerrar"
          >
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
    if (!form.monto || !form.fecha)
      return setError('Completa el monto y la fecha.');
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
          <label className="text-white/40 text-xs mb-1 block">
            Fecha del pago
          </label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className={campo}
          />
        </div>
      </div>
      <div>
        <label className="text-white/40 text-xs mb-1 block">
          Medio de pago
        </label>
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
          <input
            type="date"
            value={form.vence}
            onChange={(e) => setForm({ ...form, vence: e.target.value })}
            className={campo}
          />
        </div>
      )}
      <div>
        <label className="text-white/40 text-xs mb-1 block">
          Nota (opcional)
        </label>
        <input
          value={form.nota}
          onChange={(e) => setForm({ ...form, nota: e.target.value })}
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
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button
          onClick={onListo}
          className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Historial({ pagosAlumno, onEditar }) {
  const { eliminarPago } = useAuth();
  const [borrando, setBorrando] = useState(null);

  if (pagosAlumno.length === 0)
    return (
      <p className="text-white/35 text-xs px-4 pb-3">Sin pagos registrados.</p>
    );

  return (
    <div className="px-3 pb-3 flex flex-col gap-1.5">
      {pagosAlumno.map((p) => (
        <div
          key={p.id}
          className="bg-black/25 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <p className="text-white text-sm tabular-nums">
              {formatearPesos(p.monto)}{' '}
              <span className="text-white/40 text-xs">
                · {etiquetaMedio(p.medio)}
              </span>
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
              <button
                onClick={() => setBorrando(null)}
                className="bg-white/10 text-white text-[11px] px-2 py-1 rounded-md"
              >
                No
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEditar(p)}
                className="text-cyan-brand/80 p-1.5 hover:text-cyan-brand"
                aria-label="Editar pago"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setBorrando(p.id)}
                className="text-red-400/60 p-1.5 hover:text-red-400"
                aria-label="Borrar pago"
              >
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
  const {
    usuarios,
    planes,
    pagos,
    diasRenovacion,
    infoGimnasio,
    reservas,
    marcarContactadoSeguimiento,
  } = useAuth();
  const [filtro, setFiltro] = useState(filtroInicial);
  const location = useLocation();
  // Si se llega con ?tab=... (por ejemplo desde Pendientes del Dashboard), se abre esa pestaña
  useEffect(() => {
    const t = new URLSearchParams(location.search).get('tab');
    if (t && FILTROS.some((f) => f.valor === t)) setFiltro(t);
  }, [location.search]);
  const [busqueda, setBusqueda] = useState('');
  const [renovando, setRenovando] = useState(null); // usuario
  const [editando, setEditando] = useState(null); // { pago, usuario }
  const [historialAbierto, setHistorialAbierto] = useState(null);

  const filas = useMemo(() => {
    return usuarios
      .filter(
        (u) => u.estado !== 'inactivo' && u.estado !== 'pendiente' && u.plan_id
      )
      .map((u) => {
        const pagosAlumno = pagos
          .filter((p) => p.usuario_id === u.id)
          .sort(
            (a, b) =>
              (b.fecha || '').localeCompare(a.fecha || '') ||
              (b.creado_en || '').localeCompare(a.creado_en || '')
          );
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
  // Alumnos con plan vigente que llevan 14 días o más sin venir (y sin reservas próximas)
  const sinVenir = useMemo(() => {
    const { sinVenir: lista } = alumnosEnRiesgo(
      usuarios,
      reservas || [],
      planes,
      diasRenovacion
    );
    return Object.fromEntries(lista.map((x) => [x.usuario.id, x]));
  }, [usuarios, reservas, planes, diasRenovacion]);
  const enFiltro = (f, filtroActual) =>
    filtroActual === 'renovar'
      ? f.estado === 'por_vencer' || f.estado === 'sin_pago'
      : filtroActual === 'vencidos'
      ? f.estado === 'vencido'
      : filtroActual === 'sin_venir'
      ? !!sinVenir[f.u.id]
      : filtroActual === 'al_dia'
      ? f.estado === 'al_dia'
      : true;
  const conteo = Object.fromEntries(
    FILTROS.map((x) => [
      x.valor,
      filas.filter((f) => enFiltro(f, x.valor)).length,
    ])
  );
  const montoPorRenovar = porRenovar.reduce(
    (acc, f) => acc + (montoPlanDe(f.u, planes) || 0),
    0
  );

  const texto = busqueda.trim().toLowerCase();
  const visibles = filas
    .filter((f) => enFiltro(f, filtro))
    .filter(
      (f) =>
        !texto ||
        (f.u.nombre || '').toLowerCase().includes(texto) ||
        (f.u.correo || '').toLowerCase().includes(texto) ||
        (f.u.rut || '').toLowerCase().includes(texto)
    )
    .map((f) => ({ ...f, riesgo: sinVenir[f.u.id] || null }))
    // En "Sin venir", los que llevan más tiempo primero; los ya contactados esta semana al final
    .sort((a, b) =>
      filtro === 'sin_venir'
        ? Number(contactadoReciente(a.u)) - Number(contactadoReciente(b.u)) ||
          (b.riesgo?.diasSinVenir ?? 9999) - (a.riesgo?.diasSinVenir ?? 9999)
        : 0
    );

  function mensajeSinVenir(u, riesgo) {
    const nombre = (u.nombre || '').split(' ')[0];
    return `Hola ${nombre}! Te extrañamos en ${
      infoGimnasio?.nombre || 'CED&S'
    } 💪 ${
      riesgo?.diasSinVenir
        ? `Hace ${riesgo.diasSinVenir} días que no vienes.`
        : 'Todavía no has venido a tu primera clase.'
    } ¿Te reservamos una clase esta semana? Si te pasó algo, cuéntanos y vemos cómo ayudarte.`;
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-3xl mx-auto">
      <p className="font-display text-3xl text-white leading-tight">
        Por contactar
      </p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        A quién escribirle hoy para renovar o volver a entrenar
      </p>

      <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-4">
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">
              Por cobrar
            </p>
            <p className="font-display text-white text-4xl leading-none mt-2">
              {formatearPesos(montoPorRenovar)}
            </p>
            <p className="text-white/45 text-xs mt-1.5">
              según el valor del plan de cada uno
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-3xl text-yellow-200 leading-none">
              {porRenovar.length}
            </p>
            <p className="text-white/45 text-[11px] mt-1">
              alumno{porRenovar.length !== 1 ? 's' : ''} por
              <br />
              renovar
            </p>
          </div>
        </div>
      </div>

      {/* Pestañas como recuadros de color */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[
          {
            v: 'renovar',
            t: 'Por renovar',
            c: 'text-yellow-200',
            on: 'border-yellow-400/50 bg-yellow-400/10',
          },
          {
            v: 'vencidos',
            t: 'Vencidos',
            c: 'text-red-300',
            on: 'border-red-500/50 bg-red-500/10',
          },
          {
            v: 'sin_venir',
            t: 'Sin venir',
            c: 'text-orange-300',
            on: 'border-orange-400/50 bg-orange-400/10',
          },
          {
            v: 'al_dia',
            t: 'Al día',
            c: 'text-cyan-brand',
            on: 'border-cyan-brand/50 bg-cyan-brand/10',
          },
        ].map((x) => {
          const activo = filtro === x.v;
          return (
            <button
              key={x.v}
              onClick={() => setFiltro(x.v)}
              className={`rounded-2xl border py-2.5 text-center transition-all active:scale-95 ${
                activo ? x.on : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <p className={`font-display text-2xl leading-none ${x.c}`}>
                {conteo[x.v]}
              </p>
              <p
                className={`text-[10px] mt-1 ${
                  activo ? 'text-white/80' : 'text-white/45'
                }`}
              >
                {x.t}
              </p>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar alumno"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
          />
        </div>
        <button
          onClick={() => setFiltro('todos')}
          className={`shrink-0 text-xs font-semibold px-3 py-2.5 rounded-xl border transition-colors ${
            filtro === 'todos'
              ? 'bg-cyan-brand text-ink border-cyan-brand'
              : 'bg-white/[0.04] text-white/60 border-white/10'
          }`}
        >
          Todos ({conteo.todos})
        </button>
      </div>

      {visibles.length === 0 && (
        <p className="text-white/30 text-sm text-center py-12">
          {filtro === 'renovar'
            ? 'No hay alumnos por renovar. 🎉'
            : filtro === 'sin_venir'
            ? '¡Todos tus alumnos están viniendo! 🎉'
            : filtro === 'vencidos'
            ? 'No hay planes vencidos. 🎉'
            : 'No hay alumnos para mostrar.'}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {visibles.map(({ u, plan, pagosAlumno, ultimo, v, estado, riesgo }) => {
          const historialAqui = historialAbierto === u.id;
          const contacto = textoContacto(u);
          const reciente = contactadoReciente(u);
          const linkWhatsapp =
            filtro === 'sin_venir'
              ? numeroWhatsapp(u.telefono) &&
                `https://wa.me/${numeroWhatsapp(
                  u.telefono
                )}?text=${encodeURIComponent(mensajeSinVenir(u, riesgo))}`
              : estado !== 'al_dia' &&
                linkRecordatorio(
                  u,
                  v,
                  montoPlanDe(u, planes),
                  plan,
                  infoGimnasio?.nombre
                );
          return (
            <div
              key={u.id}
              className={`bg-white/[0.04] border border-white/10 rounded-3xl overflow-hidden ${
                reciente && estado !== 'al_dia' ? 'opacity-70' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-display text-sm border-2 ${
                      estado === 'vencido'
                        ? 'border-red-400/60 text-red-300 bg-red-500/10'
                        : estado === 'por_vencer'
                        ? 'border-yellow-400/60 text-yellow-200 bg-yellow-400/10'
                        : riesgo
                        ? 'border-orange-400/60 text-orange-300 bg-orange-400/10'
                        : estado === 'al_dia'
                        ? 'border-cyan-brand/50 text-cyan-brand bg-cyan-brand/10'
                        : 'border-white/20 text-white/60 bg-white/5'
                    }`}
                  >
                    {(u.nombre || '?')
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">
                          {u.nombre}
                        </p>
                        <p className="text-white/40 text-xs truncate">
                          {plan?.nombre || 'Plan eliminado'}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${ESTADOS[estado].clase}`}
                      >
                        {ESTADOS[estado].label}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 mt-2.5 text-xs">
                      <p className="flex items-center gap-1.5 text-white/60">
                        <CalendarClock
                          size={13}
                          className="text-white/35 shrink-0"
                        />
                        {v ? (
                          <>
                            Vence {fechaCorta(v.vence)} ·{' '}
                            <span
                              className={
                                estado === 'vencido'
                                  ? 'text-red-300'
                                  : estado === 'por_vencer'
                                  ? 'text-yellow-200'
                                  : 'text-white/60'
                              }
                            >
                              {textoDias(v.dias)}
                            </span>
                          </>
                        ) : (
                          <>
                            Sin vencimiento · plan{' '}
                            {formatearPesos(montoPlanDe(u, planes) || 0)}
                          </>
                        )}
                      </p>
                      <p className="flex items-center gap-1.5 text-white/60">
                        <Receipt size={13} className="text-white/35 shrink-0" />
                        {ultimo ? (
                          <>
                            Último pago {formatearPesos(ultimo.monto)} ·{' '}
                            {fechaCorta(ultimo.fecha)} ·{' '}
                            {etiquetaMedio(ultimo.medio)}
                          </>
                        ) : (
                          <span className="text-white/40">
                            Sin pagos registrados
                          </span>
                        )}
                      </p>
                      {riesgo && (
                        <p className="flex items-center gap-1.5 text-orange-300">
                          <UserX size={13} className="shrink-0" />
                          {riesgo.diasSinVenir
                            ? `Última clase hace ${riesgo.diasSinVenir} días`
                            : 'Nunca ha venido a una clase'}
                        </p>
                      )}
                      {contacto && (
                        <p className="flex items-center gap-1.5 text-cyan-brand/80">
                          <Check size={13} className="shrink-0" /> {contacto}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3.5">
                  {linkWhatsapp && (
                    <a
                      href={linkWhatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => marcarContactadoSeguimiento(u.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] text-white font-semibold rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
                      title="Escribir por WhatsApp (queda marcado como contactado)"
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => setRenovando(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
                  >
                    <RefreshCw size={14} /> Renovar
                  </button>
                  <button
                    onClick={() =>
                      ultimo &&
                      setEditando({
                        pago: ultimo,
                        usuario: u,
                        venceInicial: v?.vence,
                      })
                    }
                    disabled={!ultimo}
                    className="w-10 flex items-center justify-center bg-white/[0.06] text-white/70 rounded-xl disabled:opacity-30"
                    aria-label="Editar último pago"
                    title="Editar último pago"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() =>
                      setHistorialAbierto(historialAqui ? null : u.id)
                    }
                    className={`w-10 flex items-center justify-center rounded-xl ${
                      historialAqui
                        ? 'bg-cyan-brand/15 text-cyan-brand'
                        : 'bg-white/[0.06] text-white/70'
                    }`}
                    aria-label="Historial de pagos"
                    title="Historial de pagos"
                  >
                    <History size={15} />
                  </button>
                </div>
                {estado !== 'al_dia' || riesgo
                  ? !reciente && (
                      <button
                        onClick={() => marcarContactadoSeguimiento(u.id)}
                        className="mt-2.5 text-white/45 text-xs flex items-center gap-1 border border-white/10 rounded-full px-2.5 py-1"
                      >
                        <Check size={12} /> Marcar como contactado
                      </button>
                    )
                  : null}
              </div>

              {historialAqui && (
                <div className="border-t border-white/10 pt-3">
                  <p className="text-white/35 text-[11px] uppercase tracking-wide px-4 mb-2">
                    Historial de pagos ({pagosAlumno.length})
                  </p>
                  <Historial
                    pagosAlumno={pagosAlumno}
                    onEditar={(p) =>
                      setEditando({
                        pago: p,
                        usuario: u,
                        venceInicial: p.id === ultimo?.id ? v?.vence : '',
                      })
                    }
                  />
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
          subtitulo={`${editando.usuario.nombre} · ${fechaCorta(
            editando.pago.fecha
          )}`}
          onCerrar={() => setEditando(null)}
        >
          <EditarPago
            pago={editando.pago}
            venceInicial={editando.venceInicial}
            onListo={() => setEditando(null)}
          />
        </Modal>
      )}
    </div>
  );
}
