import { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  Package,
  CalendarCheck,
  Plus,
  Minus,
  X,
  Check,
  MessageCircle,
  Pencil,
  Trash2,
  ImagePlus,
  Clock,
  Truck,
  Ban,
  Wallet,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { subirImagen } from '../lib/storage';
import { MEDIOS_PAGO } from '../lib/ingresos';

// Tienda: el admin publica productos (ej. calcetas) y servicios (ej. bioimpedancia);
// los alumnos los piden o agendan. El pago se coordina en el gimnasio y el admin lo
// registra (queda en Finanzas como "Tienda").

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-CL');
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fechaLinda = (s) => {
  const d = new Date(s + 'T12:00:00');
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};
const fechaCorta = (ts) =>
  new Date(ts).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
const digitos = (s) => String(s || '').replace(/\D/g, '');

const ESTADOS = {
  pendiente: { t: 'Por pagar', c: 'bg-yellow-400/15 text-yellow-200 border-yellow-400/30' },
  pagado: { t: 'Pagado', c: 'bg-cyan-brand/15 text-cyan-brand border-cyan-brand/40' },
  entregado: { t: 'Entregado', c: 'bg-white/10 text-white/70 border-white/20' },
  cancelado: { t: 'Cancelado', c: 'bg-red-500/10 text-red-300 border-red-500/25' },
};
const estadoTexto = (p) =>
  p.estado === 'entregado' && p.fecha ? 'Realizado' : ESTADOS[p.estado]?.t || p.estado;

export default function Tienda() {
  const { rolEfectivo } = useAuth();
  return rolEfectivo === 'head_coach' ? <TiendaAdmin /> : <TiendaAlumno />;
}

function Imagen({ url, tipo, className = '' }) {
  if (url)
    return <img src={url} alt="" className={`object-cover bg-white/5 ${className}`} loading="lazy" />;
  const Icono = tipo === 'servicio' ? CalendarCheck : Package;
  return (
    <div className={`bg-gradient-to-br from-cyan-brand/20 to-white/[0.03] flex items-center justify-center ${className}`}>
      <Icono size={34} className="text-cyan-brand/70" />
    </div>
  );
}

// ───────────────────────────── Alumno ─────────────────────────────

function TiendaAlumno() {
  const { usuarioActual } = useAuth();
  const [productos, setProductos] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [abierto, setAbierto] = useState(null);
  const [aviso, setAviso] = useState(null);

  async function cargar() {
    const [rp, rd] = await Promise.all([
      supabase.from('productos').select('*').eq('activo', true).order('orden').order('nombre'),
      supabase
        .from('pedidos')
        .select('*')
        .eq('usuario_id', usuarioActual.id)
        .order('creado_en', { ascending: false })
        .limit(30),
    ]);
    setProductos(rp.data || []);
    setPedidos(rd.data || []);
  }
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelar(p) {
    if (!window.confirm(`¿Cancelar tu pedido de ${p.producto_nombre}?`)) return;
    const { data, error } = await supabase.rpc('cancelar_mi_pedido', { p_pedido: p.id });
    setAviso(error ? { ok: false, mensaje: error.message } : data);
    cargar();
  }

  const activos = pedidos.filter((p) => p.estado !== 'cancelado');

  return (
    <div className="min-h-screen bg-ink px-4 pt-4 pb-28 max-w-md mx-auto">
      <h1 className="font-display uppercase text-3xl text-white">Tienda</h1>
      <p className="text-white/45 text-sm mb-5">Productos y servicios de CED&amp;S</p>

      {aviso && (
        <p className={`text-sm mb-3 ${aviso.ok ? 'text-cyan-brand' : 'text-red-400'}`}>{aviso.mensaje}</p>
      )}

      {productos === null ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-14 text-white/40 text-sm">
          <ShoppingBag size={36} className="mx-auto mb-3 text-white/20" />
          Pronto habrá productos y servicios aquí.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {productos.map((p) => {
            const agotado = p.stock !== null && p.stock <= 0;
            return (
              <button
                key={p.id}
                onClick={() => !agotado && setAbierto(p)}
                className={`text-left bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform ${
                  agotado ? 'opacity-50' : ''
                }`}
              >
                <Imagen url={p.imagen_url} tipo={p.tipo} className="w-full aspect-square" />
                <div className="p-3">
                  <p className="text-white text-sm font-medium leading-tight line-clamp-2">{p.nombre}</p>
                  <p className="text-cyan-brand font-semibold mt-1">{p.precio ? pesos(p.precio) : 'Consultar'}</p>
                  <p className="text-white/40 text-[11px] mt-0.5">
                    {agotado
                      ? 'Agotado'
                      : p.agendable
                      ? 'Agendar hora'
                      : p.stock !== null && p.stock <= 5
                      ? `Quedan ${p.stock}`
                      : p.tipo === 'servicio'
                      ? 'Servicio'
                      : 'Producto'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activos.length > 0 && (
        <div className="mt-8">
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Mis pedidos</h2>
          <div className="flex flex-col gap-2">
            {pedidos.map((p) => (
              <div key={p.id} className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">
                      {p.producto_nombre}
                      {p.variante ? ` · ${p.variante}` : ''}
                      {p.cantidad > 1 ? ` x${p.cantidad}` : ''}
                    </p>
                    <p className="text-white/45 text-xs">
                      {p.fecha ? `${fechaLinda(p.fecha)} · ${p.hora}` : `Pedido el ${fechaCorta(p.creado_en)}`}
                      {' · '}
                      {pesos(p.total)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${ESTADOS[p.estado]?.c}`}>
                    {estadoTexto(p)}
                  </span>
                </div>
                {p.estado === 'pendiente' && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-white/40 text-[11px]">Paga en el gimnasio o por transferencia.</p>
                    <button onClick={() => cancelar(p)} className="text-red-300/80 text-[11px] font-semibold">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {abierto && (
        <DetalleProducto
          producto={abierto}
          onCerrar={() => setAbierto(null)}
          onListo={(r) => {
            setAviso(null);
            cargar();
            return r;
          }}
        />
      )}
    </div>
  );
}

function DetalleProducto({ producto: p, onCerrar, onListo }) {
  const { horarios, infoGimnasio } = useAuth();
  const [variante, setVariante] = useState(p.variantes?.length === 1 ? p.variantes[0] : '');
  const [cantidad, setCantidad] = useState(1);
  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState(null);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [hecho, setHecho] = useState(null);

  // Días y horas disponibles para agendar (horarios de clases normales, próximos 14 días)
  const dias = useMemo(() => {
    if (!p.agendable) return [];
    const ahora = Date.now();
    const lista = [];
    const hoy = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i, 12);
      const f = iso(d);
      const horas = [
        ...new Set(
          (horarios || [])
            .filter((h) => h.tipo !== 'hiit' && (h.fecha_unica ? h.fecha_unica === f : h.dia === DIAS[d.getDay()]))
            .map((h) => h.hora.slice(0, 5))
            .filter((hh) => new Date(`${f}T${hh}:00`).getTime() - ahora > 2 * 3600 * 1000)
        ),
      ].sort();
      if (horas.length) lista.push({ fecha: f, horas });
    }
    return lista;
  }, [p, horarios]);
  const dia = dias.find((d) => d.fecha === fecha) || dias[0];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const total = (p.precio || 0) * (p.agendable ? 1 : cantidad);
  const maximo = Math.min(20, p.stock ?? 20);
  const falta = p.variantes?.length && !variante ? 'Elige una opción' : p.agendable && !hora ? 'Elige día y hora' : null;

  async function pedir() {
    setEnviando(true);
    setError(null);
    const { data, error: e } = await supabase.rpc('pedir_producto', {
      p_producto: p.id,
      p_cantidad: cantidad,
      p_variante: variante || null,
      p_fecha: p.agendable ? dia?.fecha : null,
      p_hora: p.agendable ? hora : null,
      p_nota: nota,
    });
    setEnviando(false);
    if (e || !data?.ok) return setError(data?.mensaje || e?.message || 'No se pudo enviar el pedido.');
    setHecho(data.pedido);
    onListo(data);
  }

  const numero = digitos(infoGimnasio?.whatsapp);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-[#111] w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10">
        <div className="relative">
          <Imagen url={p.imagen_url} tipo={p.tipo} className="w-full h-52" />
          <button
            onClick={onCerrar}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {hecho ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-cyan-brand text-ink flex items-center justify-center mx-auto">
                <Check size={28} strokeWidth={3} />
              </div>
              <p className="font-display uppercase text-2xl text-white mt-3">
                {p.agendable ? '¡Agendado!' : '¡Pedido enviado!'}
              </p>
              <p className="text-white/70 text-sm mt-1">
                {p.nombre}
                {hecho.variante ? ` · ${hecho.variante}` : ''}
                {hecho.cantidad > 1 ? ` x${hecho.cantidad}` : ''}
              </p>
              {hecho.fecha && (
                <p className="text-cyan-brand font-semibold mt-0.5">
                  {fechaLinda(hecho.fecha)} · {hecho.hora} hrs
                </p>
              )}
              <p className="text-white font-semibold mt-1">{pesos(hecho.total)}</p>
              <p className="text-white/50 text-xs mt-3">
                Paga en el gimnasio o por transferencia. Cuando registremos tu pago te llegará un aviso.
              </p>
              {numero && (
                <a
                  href={`https://wa.me/${numero}?text=${encodeURIComponent(
                    `Hola! Hice un pedido en la app: ${p.nombre}${hecho.variante ? ` (${hecho.variante})` : ''}${
                      hecho.cantidad > 1 ? ` x${hecho.cantidad}` : ''
                    }${hecho.fecha ? `, ${fechaLinda(hecho.fecha)} ${hecho.hora}` : ''} por ${pesos(hecho.total)}. ¿Cómo pago?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-1.5 bg-[#25D366] text-white font-semibold rounded-xl py-2.5 text-sm"
                >
                  <MessageCircle size={16} /> Coordinar pago por WhatsApp
                </a>
              )}
              <button onClick={onCerrar} className="mt-3 text-white/50 text-sm">
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <p className="text-white text-xl font-semibold leading-tight">{p.nombre}</p>
              <p className="text-cyan-brand text-lg font-semibold mt-1">{p.precio ? pesos(p.precio) : 'Consultar precio'}</p>
              {p.descripcion && <p className="text-white/60 text-sm mt-2 whitespace-pre-line">{p.descripcion}</p>}

              {p.variantes?.length > 0 && (
                <div className="mt-4">
                  <p className="text-white/50 text-xs mb-1.5">Opción</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.variantes.map((v) => (
                      <button
                        key={v}
                        onClick={() => setVariante(v)}
                        className={`px-3 py-1.5 rounded-lg text-sm border ${
                          variante === v ? 'bg-cyan-brand text-ink border-cyan-brand' : 'bg-white/[0.04] text-white border-white/10'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!p.agendable && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-white/50 text-xs">Cantidad</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                      className="w-8 h-8 rounded-lg bg-white/[0.06] text-white flex items-center justify-center"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="text-white font-semibold w-5 text-center">{cantidad}</span>
                    <button
                      onClick={() => setCantidad(Math.min(maximo, cantidad + 1))}
                      className="w-8 h-8 rounded-lg bg-white/[0.06] text-white flex items-center justify-center"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              )}

              {p.agendable && (
                <div className="mt-4">
                  <p className="text-white/50 text-xs mb-1.5">Día y hora</p>
                  {dias.length === 0 ? (
                    <p className="text-white/40 text-sm">No hay horarios disponibles en los próximos días.</p>
                  ) : (
                    <>
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
                        {dias.map((d) => {
                          const dd = new Date(d.fecha + 'T12:00:00');
                          const activo = dia?.fecha === d.fecha;
                          return (
                            <button
                              key={d.fecha}
                              onClick={() => {
                                setFecha(d.fecha);
                                setHora(null);
                              }}
                              className={`shrink-0 w-12 rounded-xl py-1.5 text-center border ${
                                activo ? 'bg-cyan-brand text-ink border-cyan-brand' : 'bg-white/[0.04] text-white border-white/10'
                              }`}
                            >
                              <span className={`block text-[9px] uppercase ${activo ? 'text-ink/70' : 'text-white/45'}`}>
                                {DIAS_CORTOS[dd.getDay()]}
                              </span>
                              <span className="block font-display text-lg leading-tight">{dd.getDate()}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 mt-1">
                        {dia?.horas.map((h) => (
                          <button
                            key={h}
                            onClick={() => setHora(h)}
                            className={`rounded-lg py-2 text-sm border tabular-nums ${
                              hora === h ? 'bg-cyan-brand text-ink border-cyan-brand' : 'bg-white/[0.04] text-white border-white/10'
                            }`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Comentario (opcional)"
                className="mt-4 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-cyan-brand min-h-[60px]"
              />

              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              <button
                onClick={pedir}
                disabled={!!falta || enviando}
                className="mt-4 w-full bg-cyan-brand text-ink font-semibold rounded-xl py-3 disabled:opacity-40"
              >
                {enviando
                  ? 'Enviando…'
                  : falta || `${p.agendable ? 'Agendar' : 'Pedir'}${total ? ` · ${pesos(total)}` : ''}`}
              </button>
              <p className="text-white/35 text-[11px] text-center mt-2">
                El pago se coordina en el gimnasio o por transferencia.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Admin ─────────────────────────────

function TiendaAdmin() {
  const [seccion, setSeccion] = useState('pedidos');
  const [pendientes, setPendientes] = useState(0);
  return (
    <div className="min-h-screen bg-ink px-4 pt-4 pb-28 max-w-2xl mx-auto">
      <h1 className="font-display uppercase text-3xl text-white">Tienda</h1>
      <p className="text-white/45 text-sm mb-4">Lo que publiques aquí lo ven los alumnos en su pestaña Tienda</p>
      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-4">
        {[
          { v: 'pedidos', t: `Pedidos${pendientes ? ` (${pendientes})` : ''}` },
          { v: 'productos', t: 'Productos y servicios' },
        ].map((x) => (
          <button
            key={x.v}
            onClick={() => setSeccion(x.v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              seccion === x.v ? 'bg-cyan-brand text-ink' : 'text-white/55'
            }`}
          >
            {x.t}
          </button>
        ))}
      </div>
      {seccion === 'pedidos' ? <PedidosAdmin onPendientes={setPendientes} /> : <ProductosAdmin />}
    </div>
  );
}

function PedidosAdmin({ onPendientes }) {
  const { usuarios, registrarPago } = useAuth();
  const [pedidos, setPedidos] = useState(null);
  const [filtro, setFiltro] = useState('activos');
  const [cobrando, setCobrando] = useState(null);
  const [medio, setMedio] = useState('transferencia');
  const [aviso, setAviso] = useState(null);

  async function cargar() {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(300);
    setPedidos(data || []);
    onPendientes((data || []).filter((p) => p.estado === 'pendiente').length);
  }
  useEffect(() => {
    cargar();
    const canal = supabase
      .channel('pedidos-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargar())
      .subscribe();
    return () => supabase.removeChannel(canal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nombre = (id) => usuarios.find((u) => u.id === id);
  const lista = (pedidos || []).filter((p) =>
    filtro === 'activos' ? ['pendiente', 'pagado'].includes(p.estado) : !['pendiente', 'pagado'].includes(p.estado)
  );
  const orden = { pendiente: 0, pagado: 1 };
  if (filtro === 'activos')
    lista.sort((a, b) => (orden[a.estado] ?? 2) - (orden[b.estado] ?? 2));

  async function avisar(p, mensaje) {
    await supabase.from('notificaciones').insert({ usuario_id: p.usuario_id, mensaje });
  }

  async function marcarPagado(p) {
    setAviso(null);
    const r = await registrarPago({
      usuarioId: p.usuario_id,
      monto: p.total,
      medio,
      tipo: 'producto',
      nota: `Tienda: ${p.producto_nombre}${p.variante ? ` (${p.variante})` : ''}${p.cantidad > 1 ? ` x${p.cantidad}` : ''}`,
    });
    if (!r.ok) return setAviso(r);
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'pagado', pago_id: r.pago.id, actualizado_en: new Date().toISOString() })
      .eq('id', p.id);
    if (error) return setAviso({ ok: false, mensaje: error.message });
    await avisar(p, `Registramos tu pago de ${p.producto_nombre} (${pesos(p.total)}). ¡Gracias!`);
    setCobrando(null);
    setAviso({ ok: true, mensaje: 'Pago registrado. Ya aparece en Finanzas.' });
    cargar();
  }

  async function cambiarEstado(p, estado) {
    if (estado === 'cancelado' && !window.confirm(`¿Cancelar el pedido de ${p.producto_nombre}?`)) return;
    const { error } = await supabase
      .from('pedidos')
      .update({ estado, actualizado_en: new Date().toISOString() })
      .eq('id', p.id);
    if (error) return setAviso({ ok: false, mensaje: error.message });
    if (estado === 'cancelado' && p.estado === 'pendiente' && p.producto_id) {
      const { data: pr } = await supabase.from('productos').select('stock').eq('id', p.producto_id).single();
      if (pr && pr.stock !== null)
        await supabase.from('productos').update({ stock: pr.stock + p.cantidad }).eq('id', p.producto_id);
    }
    if (estado === 'cancelado') await avisar(p, `Tu pedido de ${p.producto_nombre} fue cancelado.`);
    if (estado === 'entregado' && !p.fecha) await avisar(p, `Tu pedido de ${p.producto_nombre} fue entregado.`);
    cargar();
  }

  if (pedidos === null) return <p className="text-white/40 text-sm">Cargando…</p>;

  return (
    <>
      <div className="flex gap-1.5 mb-3">
        {[
          { v: 'activos', t: 'Por gestionar' },
          { v: 'historial', t: 'Historial' },
        ].map((x) => (
          <button
            key={x.v}
            onClick={() => setFiltro(x.v)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              filtro === x.v ? 'bg-cyan-brand text-ink border-cyan-brand' : 'bg-white/[0.04] text-white/60 border-white/10'
            }`}
          >
            {x.t}
          </button>
        ))}
      </div>
      {aviso && <p className={`text-sm mb-3 ${aviso.ok ? 'text-cyan-brand' : 'text-red-400'}`}>{aviso.mensaje}</p>}
      {lista.length === 0 && (
        <p className="text-white/40 text-sm text-center py-10">
          {filtro === 'activos' ? 'No hay pedidos por gestionar.' : 'Todavía no hay historial.'}
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        {lista.map((p) => {
          const u = nombre(p.usuario_id);
          const tel = digitos(u?.telefono);
          return (
            <div key={p.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-medium">
                    {p.producto_nombre}
                    {p.variante ? ` · ${p.variante}` : ''}
                    {p.cantidad > 1 ? ` x${p.cantidad}` : ''}
                  </p>
                  <p className="text-white/60 text-sm">{u?.nombre || 'Alumno'}</p>
                  {p.fecha && (
                    <p className="text-cyan-brand text-xs font-semibold mt-0.5 flex items-center gap-1">
                      <Clock size={12} /> {fechaLinda(p.fecha)} · {p.hora}
                    </p>
                  )}
                  <p className="text-white/35 text-[11px] mt-0.5">Pedido el {fechaCorta(p.creado_en)}</p>
                  {p.nota && <p className="text-white/55 text-xs mt-1 italic">"{p.nota}"</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-semibold">{pesos(p.total)}</p>
                  <span className={`inline-block mt-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${ESTADOS[p.estado]?.c}`}>
                    {estadoTexto(p)}
                  </span>
                </div>
              </div>

              {cobrando === p.id ? (
                <div className="mt-3 bg-black/20 rounded-xl p-2.5 flex flex-col gap-2">
                  <p className="text-white/60 text-xs">¿Cómo pagó?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MEDIOS_PAGO.filter((m) => m.valor !== 'mercadopago').map((m) => (
                      <button
                        key={m.valor}
                        onClick={() => setMedio(m.valor)}
                        className={`text-xs px-2.5 py-1 rounded-lg border ${
                          medio === m.valor ? 'bg-cyan-brand text-ink border-cyan-brand' : 'bg-white/[0.04] text-white/70 border-white/10'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => marcarPagado(p)}
                      className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm"
                    >
                      Registrar pago de {pesos(p.total)}
                    </button>
                    <button onClick={() => setCobrando(null)} className="px-3 bg-white/10 text-white rounded-lg text-sm">
                      No
                    </button>
                  </div>
                </div>
              ) : (
                ['pendiente', 'pagado'].includes(p.estado) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.estado === 'pendiente' && (
                      <button
                        onClick={() => setCobrando(p.id)}
                        className="flex items-center gap-1.5 bg-cyan-brand text-ink font-semibold rounded-lg px-3 py-1.5 text-xs"
                      >
                        <Wallet size={13} /> Marcar pagado
                      </button>
                    )}
                    <button
                      onClick={() => cambiarEstado(p, 'entregado')}
                      className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs"
                    >
                      <Truck size={13} /> {p.fecha ? 'Realizado' : 'Entregado'}
                    </button>
                    {tel && (
                      <a
                        href={`https://wa.me/${tel.length === 9 ? '56' + tel : tel}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[#25D366] border border-[#25D366]/30 rounded-lg px-3 py-1.5 text-xs"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => cambiarEstado(p, 'cancelado')}
                      className="flex items-center gap-1 text-red-300/80 px-2 py-1.5 text-xs ml-auto"
                    >
                      <Ban size={13} /> Cancelar
                    </button>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

const VACIO = {
  nombre: '',
  descripcion: '',
  precio: '',
  tipo: 'producto',
  agendable: false,
  variantes: '',
  stock: '',
  imagen_url: '',
  activo: true,
  orden: 0,
};

function ProductosAdmin() {
  const [productos, setProductos] = useState(null);
  const [editando, setEditando] = useState(null); // objeto del formulario
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function cargar() {
    const { data } = await supabase.from('productos').select('*').order('orden').order('nombre');
    setProductos(data || []);
  }
  useEffect(() => {
    cargar();
  }, []);

  function abrir(p) {
    setAviso(null);
    setEditando(
      p
        ? {
            ...p,
            precio: String(p.precio ?? ''),
            stock: p.stock === null ? '' : String(p.stock),
            variantes: (p.variantes || []).join(', '),
          }
        : { ...VACIO, orden: (productos?.length || 0) + 1 }
    );
  }

  async function subir(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      const url = await subirImagen(file, 'tienda');
      setEditando((x) => ({ ...x, imagen_url: url }));
    } catch (err) {
      setAviso({ ok: false, mensaje: 'No se pudo subir la imagen: ' + err.message });
    }
    setSubiendo(false);
  }

  async function guardar() {
    const f = editando;
    if (!f.nombre.trim()) return setAviso({ ok: false, mensaje: 'Ponle un nombre.' });
    setGuardando(true);
    const fila = {
      nombre: f.nombre.trim(),
      descripcion: f.descripcion?.trim() || null,
      precio: Number(f.precio) || 0,
      tipo: f.tipo,
      agendable: f.tipo === 'servicio' && !!f.agendable,
      variantes: String(f.variantes || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      stock: f.stock === '' ? null : Math.max(0, Number(f.stock) || 0),
      imagen_url: f.imagen_url || null,
      activo: !!f.activo,
      orden: Number(f.orden) || 0,
    };
    const { error } = f.id
      ? await supabase.from('productos').update(fila).eq('id', f.id)
      : await supabase.from('productos').insert(fila);
    setGuardando(false);
    if (error) return setAviso({ ok: false, mensaje: 'No se pudo guardar: ' + error.message });
    setEditando(null);
    setAviso({ ok: true, mensaje: fila.activo ? 'Guardado. Ya lo ven los alumnos.' : 'Guardado (oculto para los alumnos).' });
    cargar();
  }

  async function alternar(p) {
    await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id);
    cargar();
  }

  async function borrar(p) {
    if (!window.confirm(`¿Borrar "${p.nombre}"? Los pedidos anteriores se mantienen.`)) return;
    await supabase.from('productos').delete().eq('id', p.id);
    setEditando(null);
    cargar();
  }

  const input =
    'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand';

  if (productos === null) return <p className="text-white/40 text-sm">Cargando…</p>;

  if (editando)
    return (
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-white font-semibold">{editando.id ? 'Editar' : 'Nuevo producto o servicio'}</p>
        <div className="flex gap-3 items-center">
          <Imagen url={editando.imagen_url} tipo={editando.tipo} className="w-20 h-20 rounded-xl shrink-0" />
          <label className="flex items-center gap-1.5 text-cyan-brand text-sm font-semibold cursor-pointer">
            <ImagePlus size={16} /> {subiendo ? 'Subiendo…' : editando.imagen_url ? 'Cambiar foto' : 'Agregar foto'}
            <input type="file" accept="image/*" className="hidden" onChange={subir} disabled={subiendo} />
          </label>
        </div>
        <div className="flex bg-black/30 border border-white/10 rounded-lg p-1">
          {[
            { v: 'producto', t: 'Producto' },
            { v: 'servicio', t: 'Servicio' },
          ].map((x) => (
            <button
              key={x.v}
              onClick={() => setEditando({ ...editando, tipo: x.v })}
              className={`flex-1 py-1.5 rounded-md text-sm ${
                editando.tipo === x.v ? 'bg-cyan-brand text-ink font-semibold' : 'text-white/55'
              }`}
            >
              {x.t}
            </button>
          ))}
        </div>
        <input
          className={input}
          placeholder="Nombre (ej: Calcetas CED&S)"
          value={editando.nombre}
          onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
        />
        <textarea
          className={input + ' min-h-[70px]'}
          placeholder="Descripción"
          value={editando.descripcion || ''}
          onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
        />
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="text-white/45 text-xs">Precio ($)</span>
            <input
              className={input}
              type="number"
              min="0"
              value={editando.precio}
              onChange={(e) => setEditando({ ...editando, precio: e.target.value })}
            />
          </label>
          {editando.tipo === 'producto' && (
            <label className="flex-1">
              <span className="text-white/45 text-xs">Stock (vacío = sin límite)</span>
              <input
                className={input}
                type="number"
                min="0"
                value={editando.stock}
                onChange={(e) => setEditando({ ...editando, stock: e.target.value })}
              />
            </label>
          )}
        </div>
        <label>
          <span className="text-white/45 text-xs">Opciones separadas por coma (ej: S, M, L) — opcional</span>
          <input
            className={input}
            value={editando.variantes}
            onChange={(e) => setEditando({ ...editando, variantes: e.target.value })}
          />
        </label>
        {editando.tipo === 'servicio' && (
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={!!editando.agendable}
              onChange={(e) => setEditando({ ...editando, agendable: e.target.checked })}
            />
            El alumno elige día y hora (ej: bioimpedancia)
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={!!editando.activo}
            onChange={(e) => setEditando({ ...editando, activo: e.target.checked })}
          />
          Visible para los alumnos
        </label>
        {aviso && !aviso.ok && <p className="text-red-400 text-sm">{aviso.mensaje}</p>}
        <div className="flex gap-2">
          <button
            onClick={guardar}
            disabled={guardando || subiendo}
            className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={() => setEditando(null)} className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm">
            Cancelar
          </button>
        </div>
        {editando.id && (
          <button onClick={() => borrar(editando)} className="text-red-300/80 text-xs self-center flex items-center gap-1">
            <Trash2 size={12} /> Borrar
          </button>
        )}
      </div>
    );

  return (
    <>
      {aviso && <p className={`text-sm mb-3 ${aviso.ok ? 'text-cyan-brand' : 'text-red-400'}`}>{aviso.mensaje}</p>}
      <button
        onClick={() => abrir(null)}
        className="w-full flex items-center justify-center gap-1.5 border border-dashed border-cyan-brand/40 text-cyan-brand text-sm font-semibold rounded-xl py-3 mb-3"
      >
        <Plus size={16} /> Nuevo producto o servicio
      </button>
      <div className="flex flex-col gap-2">
        {productos.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-xl p-2.5 ${
              p.activo ? '' : 'opacity-55'
            }`}
          >
            <Imagen url={p.imagen_url} tipo={p.tipo} className="w-14 h-14 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
              <p className="text-white/45 text-xs">
                {p.precio ? pesos(p.precio) : 'Sin precio'} · {p.tipo === 'servicio' ? (p.agendable ? 'Servicio con hora' : 'Servicio') : 'Producto'}
                {p.stock !== null ? ` · stock ${p.stock}` : ''}
              </p>
              {!p.activo && <p className="text-white/40 text-[11px]">Oculto para los alumnos</p>}
            </div>
            <button
              onClick={() => alternar(p)}
              className="p-2 text-white/50"
              aria-label={p.activo ? 'Ocultar' : 'Mostrar'}
              title={p.activo ? 'Ocultar' : 'Mostrar'}
            >
              {p.activo ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
            <button onClick={() => abrir(p)} className="p-2 text-cyan-brand" aria-label="Editar">
              <Pencil size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
