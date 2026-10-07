import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock,
  Calendar,
} from 'lucide-react';

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFechaLarga(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  return capitalizar(
    fecha.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  );
}

// "YYYY-MM-DD" en calendario LOCAL, no vía toISOString() (que convierte a UTC
// y puede saltar al día siguiente en horario de tarde/noche en Chile).
function soloFechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function hoyISO() {
  return soloFechaLocal(new Date());
}

function restarDias(fechaISO, dias) {
  const f = new Date(fechaISO + 'T00:00:00');
  f.setDate(f.getDate() - dias);
  return soloFechaLocal(f);
}

// Opciones del selector de mes: los últimos 12 meses, más recientes primero.
function opcionesMes() {
  const opciones = [];
  const ahora = new Date();
  for (let i = 0; i < 12; i++) {
    const f = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const valor = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
    const etiqueta = capitalizar(
      f.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    );
    opciones.push({ valor, etiqueta });
  }
  return opciones;
}

function rangoDeMes(valorMes) {
  const [anio, mes] = valorMes.split('-').map(Number);
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const hastaObj = new Date(anio, mes - 1, ultimoDia);
  const hoy = hoyISO();
  const hastaCalculado = soloFechaLocal(hastaObj);
  // Si el mes elegido es el actual (o futuro), no pasarse de hoy.
  const hasta = hastaCalculado > hoy ? hoy : hastaCalculado;
  return { desde, hasta };
}

function FilaAsistencia({ item, onMarcar }) {
  const { usuario, reservaId, asistio } = item;
  return (
    <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-white text-sm truncate">{usuario.nombre}</p>
        {usuario.telefono && (
          <p className="text-white/30 text-[11px]">{usuario.telefono}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onMarcar(reservaId, true)}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            asistio === true
              ? 'bg-cyan-brand text-ink'
              : 'bg-white/5 text-white/30'
          }`}
          title="Asistió"
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => onMarcar(reservaId, false)}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            asistio === false
              ? 'bg-red-500/80 text-white'
              : 'bg-white/5 text-white/30'
          }`}
          title="No asistió"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const OPCIONES_MES = opcionesMes();

function CierreAdmin({ horarioId, fecha, inscritos }) {
  const { finalizarClase } = useAuth();
  const [comentario, setComentario] = useState('Sin novedades');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const sinMarcar = inscritos.filter((i) => i.asistio !== true && i.asistio !== false).length;

  async function handleFinalizar() {
    setGuardando(true);
    setError('');
    const r = await finalizarClase(horarioId, fecha, comentario);
    setGuardando(false);
    if (!r.ok) setError(r.mensaje);
  }

  return (
    <div className="border-t border-white/10 p-3 flex flex-col gap-2">
      <p className="text-white/40 text-[11px] uppercase tracking-wide">Finalizar en nombre del coach</p>
      {sinMarcar > 0 && (
        <p className="text-yellow-300 text-xs">Falta marcar la asistencia de {sinMarcar}.</p>
      )}
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand resize-none"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        onClick={handleFinalizar}
        disabled={guardando || sinMarcar > 0 || !comentario.trim()}
        className="bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-40"
      >
        {guardando ? 'Finalizando...' : 'Finalizar clase'}
      </button>
    </div>
  );
}

function RegistrarSinAlumnos({ horario, fecha }) {
  const { finalizarClase } = useAuth();
  const [confirmar, setConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function handleRegistrar() {
    setGuardando(true);
    setError('');
    const r = await finalizarClase(horario.id, fecha, 'Registrada por admin (sin alumnos)', {
      permitirSinAlumnos: true,
    });
    setGuardando(false);
    setConfirmar(false);
    if (!r.ok) setError(r.mensaje);
  }

  if (!horario.coach_id) {
    return <p className="text-white/35 text-xs">Sin coach asignado: asígnale uno en Clases para poder registrarla.</p>;
  }

  return (
    <div>
      {confirmar ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/60 text-xs">¿Registrar como realizada para {horario.coach_nombre}?</span>
          <button
            onClick={handleRegistrar}
            disabled={guardando}
            className="bg-cyan-brand text-ink text-xs font-semibold px-2.5 py-1 rounded-md disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Sí'}
          </button>
          <button onClick={() => setConfirmar(false)} className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-md">
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmar(true)}
          className="text-cyan-brand text-xs font-semibold border border-cyan-brand/30 rounded-md px-2.5 py-1"
        >
          Registrar como realizada
        </button>
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function ClasesRealizadas() {
  const navigate = useNavigate();
  const {
    clasesRealizadasConAlumnosEnRango,
    clasesPorFinalizarEnRango,
    clasesSinAlumnosEnRango,
    reservas,
    usuarios,
    marcarAsistencia,
    finalizacionDe,
    reabrirClase,
  } = useAuth();

  const [abierta, setAbierta] = useState(null);
  const [filtro, setFiltro] = useState('semana'); // 'semana' | 'mes' | 'seleccionar'
  const [mesSeleccionado, setMesSeleccionado] = useState(OPCIONES_MES[0].valor);
  const [vista, setVista] = useState('realizadas'); // 'realizadas' | 'pendientes' | 'sinAlumnos'
  const [reabriendo, setReabriendo] = useState(null);

  const { desde, hasta } = useMemo(() => {
    const hoy = hoyISO();
    if (filtro === 'semana') return { desde: restarDias(hoy, 6), hasta: hoy };
    if (filtro === 'mes') return { desde: restarDias(hoy, 29), hasta: hoy };
    return rangoDeMes(mesSeleccionado);
  }, [filtro, mesSeleccionado]);

  function inscritosDe(horarioId, fecha) {
    return reservas
      .filter((r) => r.horario_id === horarioId && r.fecha === fecha && r.estado === 'confirmada')
      .map((r) => ({
        usuario: usuarios.find((u) => u.id === r.usuario_id),
        reservaId: r.id,
        asistio: r.asistio,
      }))
      .filter((x) => x.usuario);
  }

  const realizadas = clasesRealizadasConAlumnosEnRango(desde, hasta);
  const pendientes = clasesPorFinalizarEnRango(desde, hasta);
  const sinAlumnos = clasesSinAlumnosEnRango(desde, hasta);
  const lista = { realizadas, pendientes, sinAlumnos }[vista];

  const porFecha = lista.reduce((acc, o) => {
    (acc[o.fecha] = acc[o.fecha] || []).push(o);
    return acc;
  }, {});

  const vacio = {
    realizadas: 'No hay clases realizadas en este período.',
    pendientes: 'No hay clases pendientes de finalizar. 🎉',
    sinAlumnos: 'No hubo clases sin alumnos en este período.',
  }[vista];

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-white/50 text-sm mb-4"
      >
        <ArrowLeft size={16} /> Dashboard
      </button>

      <div className="flex items-center gap-2 mb-5">
        <CalendarCheck size={18} className="text-cyan-brand" />
        <div>
          <p className="text-white font-display text-lg leading-tight">Clases realizadas</p>
          <p className="text-white/40 text-xs">
            {realizadas.length} clase{realizadas.length !== 1 ? 's' : ''} realizada
            {realizadas.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {[
          { valor: 'semana', etiqueta: '7 días' },
          { valor: 'mes', etiqueta: '1 mes' },
          { valor: 'seleccionar', etiqueta: 'Seleccionar mes' },
        ].map((op) => (
          <button
            key={op.valor}
            onClick={() => setFiltro(op.valor)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              filtro === op.valor ? 'bg-cyan-brand text-ink' : 'bg-white/[0.06] text-white/50'
            }`}
          >
            {op.etiqueta}
          </button>
        ))}
      </div>

      {filtro === 'seleccionar' && (
        <div className="relative mb-3">
          <Calendar
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-brand/60 pointer-events-none"
          />
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
          >
            {OPCIONES_MES.map((op) => (
              <option key={op.valor} value={op.valor} className="bg-ink">
                {op.etiqueta}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-5">
        {[
          { valor: 'realizadas', etiqueta: 'Realizadas', n: realizadas.length },
          { valor: 'pendientes', etiqueta: 'Por finalizar', n: pendientes.length },
          { valor: 'sinAlumnos', etiqueta: 'Sin alumnos', n: sinAlumnos.length },
        ].map((op) => (
          <button
            key={op.valor}
            onClick={() => {
              setVista(op.valor);
              setAbierta(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              vista === op.valor ? 'bg-cyan-brand text-ink' : 'text-white/50'
            }`}
          >
            {op.etiqueta} ({op.n})
          </button>
        ))}
      </div>

      {vista === 'sinAlumnos' && sinAlumnos.length > 0 && (
        <p className="text-white/40 text-xs mb-4">
          Estas clases no cuentan como realizadas. Si el coach igual hizo la clase, regístrala aquí y se le sumará a sus
          clases realizadas.
        </p>
      )}

      {lista.length === 0 ? (
        <div className="text-center py-16">
          <CalendarCheck size={40} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/30 text-sm">{vacio}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Object.entries(porFecha).map(([fecha, items]) => (
            <div key={fecha}>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-2">{formatFechaLarga(fecha)}</p>
              <div className="flex flex-col gap-2">
                {items.map((o) => {
                  const clave = `${o.horario.id}_${fecha}`;
                  const abiertaAqui = abierta === clave;
                  const inscritos = inscritosDe(o.horario.id, fecha);
                  const asistieron = inscritos.filter((i) => i.asistio === true).length;
                  const fin = finalizacionDe(o.horario.id, fecha);

                  if (vista === 'sinAlumnos') {
                    return (
                      <div key={clave} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2">
                        <div className="flex items-center gap-2.5">
                          <Clock size={14} className="text-white/30" />
                          <p className="text-white text-sm font-medium">{o.horario.hora}</p>
                          <p className="text-white/40 text-xs">{o.horario.coach_nombre || 'Sin coach'} · 0 inscritos</p>
                        </div>
                        <RegistrarSinAlumnos horario={o.horario} fecha={fecha} />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={clave}
                      className={`bg-white/[0.04] border rounded-2xl overflow-hidden ${
                        vista === 'pendientes' ? 'border-yellow-400/30' : 'border-white/10'
                      }`}
                    >
                      <button
                        onClick={() => setAbierta(abiertaAqui ? null : clave)}
                        className="w-full flex items-center justify-between p-3.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <Clock size={14} className="text-cyan-brand/60" />
                          <div className="text-left">
                            <p className="text-white text-sm font-medium flex items-center gap-2">
                              {o.horario.hora}
                              {vista === 'pendientes' && (
                                <span className="text-[10px] bg-yellow-400/15 text-yellow-300 px-1.5 py-0.5 rounded font-normal">
                                  Sin finalizar
                                </span>
                              )}
                              {fin && inscritos.length === 0 && (
                                <span className="text-[10px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded font-normal">
                                  Registrada por admin
                                </span>
                              )}
                            </p>
                            <p className="text-white/40 text-xs">
                              {fin?.coach_nombre || o.horario.coach_nombre || 'Sin coach'} · {asistieron}/
                              {inscritos.length} asistieron
                            </p>
                          </div>
                        </div>
                        {abiertaAqui ? (
                          <ChevronUp size={16} className="text-white/40" />
                        ) : (
                          <ChevronDown size={16} className="text-white/40" />
                        )}
                      </button>

                      {!abiertaAqui && fin && fin.comentario.trim().toLowerCase() !== 'sin novedades' && inscritos.length > 0 && (
                        <p className="text-yellow-200/80 text-xs px-3.5 pb-3 -mt-1">💬 {fin.comentario}</p>
                      )}

                      {abiertaAqui && fin && (
                        <div className="border-t border-white/10 px-3 pt-3">
                          <p className="text-white/40 text-[11px] uppercase tracking-wide">Comentario</p>
                          <p className="text-white/85 text-sm mt-0.5">{fin.comentario}</p>
                          {fin.registrada_por && (
                            <p className="text-white/30 text-[11px] mt-0.5">Finalizada por {fin.registrada_por}</p>
                          )}
                        </div>
                      )}

                      {abiertaAqui && inscritos.length > 0 && (
                        <div className="border-t border-white/10 p-3 flex flex-col gap-1.5 mt-2">
                          {inscritos.map((item) => (
                            <FilaAsistencia key={item.reservaId} item={item} onMarcar={marcarAsistencia} />
                          ))}
                        </div>
                      )}

                      {abiertaAqui && vista === 'pendientes' && (
                        <CierreAdmin horarioId={o.horario.id} fecha={fecha} inscritos={inscritos} />
                      )}

                      {abiertaAqui && fin && (
                        <div className="px-3 pb-3">
                          {reabriendo === clave ? (
                            <div className="flex items-center gap-2">
                              <span className="text-white/50 text-xs">
                                {inscritos.length === 0 ? '¿Quitar de realizadas?' : '¿Volver a dejarla por finalizar?'}
                              </span>
                              <button
                                onClick={async () => {
                                  await reabrirClase(o.horario.id, fecha);
                                  setReabriendo(null);
                                }}
                                className="bg-white/15 text-white text-xs px-2.5 py-1 rounded-md"
                              >
                                Sí
                              </button>
                              <button onClick={() => setReabriendo(null)} className="text-white/40 text-xs px-2 py-1">
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReabriendo(clave)}
                              className="text-white/35 text-xs hover:text-white/60"
                            >
                              {inscritos.length === 0 ? 'Quitar registro' : 'Reabrir'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
