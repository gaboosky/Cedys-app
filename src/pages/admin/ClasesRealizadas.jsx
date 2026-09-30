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

export default function ClasesRealizadas() {
  const navigate = useNavigate();
  const {
    clasesRealizadasConAlumnosEnRango,
    reservas,
    usuarios,
    marcarAsistencia,
  } = useAuth();

  const [abierta, setAbierta] = useState(null);
  const [filtro, setFiltro] = useState('semana'); // 'semana' | 'mes' | 'seleccionar'
  const [mesSeleccionado, setMesSeleccionado] = useState(OPCIONES_MES[0].valor);

  const { desde, hasta } = useMemo(() => {
    const hoy = hoyISO();
    if (filtro === 'semana') return { desde: restarDias(hoy, 6), hasta: hoy };
    if (filtro === 'mes') return { desde: restarDias(hoy, 29), hasta: hoy };
    return rangoDeMes(mesSeleccionado);
  }, [filtro, mesSeleccionado]);

  function inscritosDe(horarioId, fecha) {
    return reservas
      .filter(
        (r) =>
          r.horario_id === horarioId &&
          r.fecha === fecha &&
          r.estado === 'confirmada'
      )
      .map((r) => ({
        usuario: usuarios.find((u) => u.id === r.usuario_id),
        reservaId: r.id,
        asistio: r.asistio,
      }))
      .filter((x) => x.usuario);
  }

  // Solo mostramos clases que efectivamente tuvieron al menos un alumno inscrito.
  const ocurrencias = clasesRealizadasConAlumnosEnRango(desde, hasta);

  const porFecha = ocurrencias.reduce((acc, o) => {
    if (!acc[o.fecha]) acc[o.fecha] = [];
    acc[o.fecha].push(o);
    return acc;
  }, {});

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
          <p className="text-white font-display text-lg leading-tight">
            Clases realizadas
          </p>
          <p className="text-white/40 text-xs">
            {ocurrencias.length} clase{ocurrencias.length !== 1 ? 's' : ''} con
            alumnos
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
              filtro === op.valor
                ? 'bg-cyan-brand text-ink'
                : 'bg-white/[0.06] text-white/50'
            }`}
          >
            {op.etiqueta}
          </button>
        ))}
      </div>

      {filtro === 'seleccionar' && (
        <div className="relative mb-5">
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

      {filtro !== 'seleccionar' && <div className="mb-5" />}

      {ocurrencias.length === 0 ? (
        <div className="text-center py-16">
          <CalendarCheck size={40} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/30 text-sm">
            No hay clases con alumnos en este período.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Object.entries(porFecha).map(([fecha, items]) => (
            <div key={fecha}>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                {formatFechaLarga(fecha)}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((o) => {
                  const clave = `${o.horario.id}_${fecha}`;
                  const abiertaAqui = abierta === clave;
                  const inscritos = inscritosDe(o.horario.id, fecha);
                  const asistieron = inscritos.filter(
                    (i) => i.asistio === true
                  ).length;

                  return (
                    <div
                      key={clave}
                      className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => setAbierta(abiertaAqui ? null : clave)}
                        className="w-full flex items-center justify-between p-3.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <Clock size={14} className="text-cyan-brand/60" />
                          <div className="text-left">
                            <p className="text-white text-sm font-medium">
                              {o.horario.hora}
                            </p>
                            <p className="text-white/40 text-xs">
                              {o.horario.coach_nombre || 'Sin coach'} ·{' '}
                              {asistieron}/{inscritos.length} asistieron
                            </p>
                          </div>
                        </div>
                        {abiertaAqui ? (
                          <ChevronUp size={16} className="text-white/40" />
                        ) : (
                          <ChevronDown size={16} className="text-white/40" />
                        )}
                      </button>

                      {abiertaAqui && (
                        <div className="border-t border-white/10 p-3 flex flex-col gap-1.5">
                          {inscritos.map((item) => (
                            <FilaAsistencia
                              key={item.reservaId}
                              item={item}
                              onMarcar={marcarAsistencia}
                            />
                          ))}
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
