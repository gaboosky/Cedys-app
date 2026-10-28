import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { InsigniaEvaluacion, promedio } from '../../components/EvaluarClase';
import {
  formatearPesos,
  hoyLocalISO,
  mesActualKey,
  sumarMeses,
  nombreMes,
} from '../../lib/ingresos';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Check,
  AlertTriangle,
  Wallet,
  Pencil,
  Info,
} from 'lucide-react';

function ultimoDiaDelMes(mesKey) {
  const [anio, mes] = mesKey.split('-').map(Number);
  return `${mesKey}-${String(new Date(anio, mes, 0).getDate()).padStart(
    2,
    '0'
  )}`;
}

function fechaCorta(fechaISO) {
  const t = new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Cuántas clases hizo cada coach en el mes y cuánto hay que pagarle.
// Solo cuentan las clases realizadas: con alumnos y finalizadas (o registradas por el admin).
export default function PagoCoaches() {
  const {
    usuarios,
    reservas,
    clasesRealizadasConAlumnosEnRango,
    clasesPorFinalizarEnRango,
    finalizacionDe,
    coachDeClase,
    tarifasCoach,
    guardarTarifaCoach,
    hiitConfig,
    gastos,
    guardarGasto,
    evaluaciones,
    pagos,
  } = useAuth();

  const [mes, setMes] = useState(mesActualKey());
  const [coachFiltro, setCoachFiltro] = useState('todos');
  const [abierto, setAbierto] = useState(null);
  const [editandoValor, setEditandoValor] = useState(null);
  const [valor, setValor] = useState('');
  const [registrando, setRegistrando] = useState(null);

  const hoy = hoyLocalISO();
  const desde = `${mes}-01`;
  const fin = ultimoDiaDelMes(mes);
  const hasta = fin > hoy ? hoy : fin;
  const mesFuturo = desde > hoy;

  const realizadas = mesFuturo
    ? []
    : clasesRealizadasConAlumnosEnRango(desde, hasta);
  const pendientes = mesFuturo ? [] : clasesPorFinalizarEnRango(desde, hasta);

  const coachDe = (o) => {
    const f = finalizacionDe(o.horario.id, o.fecha);
    const c = coachDeClase(o.horario, o.fecha);
    return {
      id: f?.coach_id || c.id || 'sin-coach',
      nombre: f?.coach_nombre || c.nombre || 'Sin coach',
      fin: f,
    };
  };

  // Coaches: todos los del equipo + cualquiera que aparezca en las clases
  const equipo = usuarios.filter(
    (u) =>
      (u.rol === 'coach' || u.rol === 'head_coach') && u.estado !== 'inactivo'
  );
  const porCoach = {};
  for (const u of equipo)
    porCoach[u.id] = { id: u.id, nombre: u.nombre, clases: [], pendientes: 0 };
  for (const o of realizadas) {
    const c = coachDe(o);
    if (!porCoach[c.id])
      porCoach[c.id] = {
        id: c.id,
        nombre: c.nombre,
        clases: [],
        pendientes: 0,
      };
    const presentes = c.fin
      ? c.fin.presentes
      : reservas.filter(
          (r) =>
            r.horario_id === o.horario.id &&
            r.fecha === o.fecha &&
            r.asistio === true
        ).length;
    const porAdmin = !!c.fin && c.fin.presentes === 0 && c.fin.ausentes === 0;
    porCoach[c.id].clases.push({
      ...o,
      presentes,
      porAdmin,
      comentario: c.fin?.comentario || '',
    });
  }
  for (const o of pendientes) {
    const c = coachDe(o);
    if (porCoach[c.id]) porCoach[c.id].pendientes += 1;
  }

  const lista = Object.values(porCoach)
    .map((c) => {
      const valorClase = tarifasCoach?.[c.id] || 0;
      const valorHiit = hiitConfig?.tarifa || 0;
      const clases = [...c.clases].sort(
        (a, b) =>
          a.fecha.localeCompare(b.fecha) ||
          a.horario.hora.localeCompare(b.horario.hora)
      );
      // Las clases HIIT tienen su propia tarifa
      const clasesHiit = clases.filter((x) => x.horario?.tipo === 'hiit').length;
      const clasesNormales = clases.length - clasesHiit;
      return {
        ...c,
        clases,
        valorClase,
        valorHiit,
        clasesHiit,
        clasesNormales,
        total: clasesNormales * valorClase + clasesHiit * valorHiit,
        alumnos: clases.reduce((acc, x) => acc + x.presentes, 0),
        evals: (evaluaciones || []).filter(
          (e) => e.coach_id === c.id && e.fecha >= desde && e.fecha <= hasta
        ),
        descripcionGasto: `Pago coach ${c.nombre} · ${nombreMes(mes)}`,
      };
    })
    .filter(
      (c) =>
        c.clases.length > 0 ||
        c.pendientes > 0 ||
        equipo.some((u) => u.id === c.id)
    )
    .sort(
      (a, b) =>
        b.clases.length - a.clases.length || a.nombre.localeCompare(b.nombre)
    );

  const visibles =
    coachFiltro === 'todos' ? lista : lista.filter((c) => c.id === coachFiltro);
  const totalClases = visibles.reduce((acc, c) => acc + c.clases.length, 0);
  const totalPagar = visibles.reduce((acc, c) => acc + c.total, 0);

  async function guardarValor(coachId) {
    await guardarTarifaCoach(coachId, valor);
    setEditandoValor(null);
  }

  async function registrarComoGasto(c) {
    setRegistrando(c.id);
    await guardarGasto({
      fecha: hasta,
      monto: c.total,
      categoria: 'sueldos',
      descripcion: c.descripcionGasto,
    });
    setRegistrando(null);
  }

  async function descargarExcel() {
    const XLSX = await import('xlsx');
    const resumen = visibles.map((c) => ({
      Coach: c.nombre,
      'Clases realizadas': c.clases.length,
      'Alumnos atendidos': c.alumnos,
      'Valor por clase': c.valorClase,
      'Clases HIIT': c.clasesHiit,
      'Valor clase HIIT': c.valorHiit,
      'Total a pagar': c.total,
      'Clases sin finalizar (no cuentan)': c.pendientes,
      'Evaluación promedio':
        promedio(c.evals) === null ? '' : Number(promedio(c.evals).toFixed(1)),
      'N° evaluaciones': c.evals.length,
    }));
    resumen.push({});
    resumen.push({
      Coach: 'TOTAL',
      'Clases realizadas': totalClases,
      'Total a pagar': totalPagar,
    });
    const detalle = visibles.flatMap((c) =>
      c.clases.map((x) => ({
        Coach: c.nombre,
        Fecha: x.fecha,
        Hora: x.horario.hora,
        Tipo: x.horario?.tipo === 'hiit' ? 'HIIT' : 'Normal',
        'Alumnos presentes': x.presentes,
        Nota: x.porAdmin ? 'Registrada por admin (sin alumnos)' : x.comentario,
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(resumen),
      'Resumen'
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(
        detalle.length ? detalle : [{ Coach: 'Sin clases' }]
      ),
      'Detalle'
    );
    const nombre =
      coachFiltro === 'todos'
        ? 'todos'
        : (visibles[0]?.nombre || 'coach').replace(/\s+/g, '-');
    XLSX.writeFile(libro, `pago-coaches-${nombre}-${mes}.xlsx`);
  }

  const ingresosMes = (pagos || [])
    .filter((p) => (p.fecha || '').slice(0, 7) === mes)
    .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const pctIngresos =
    ingresosMes > 0 ? Math.round((totalPagar / ingresosMes) * 100) : null;
  const totalPendientes = visibles.reduce((acc, c) => acc + c.pendientes, 0);
  const sinValor = visibles.filter((c) => c.clases.length > 0 && !c.valorClase);
  const yaPagado = visibles
    .filter(
      (c) =>
        c.total > 0 &&
        (gastos || []).some((g) => g.descripcion === c.descripcionGasto)
    )
    .reduce((acc, c) => acc + c.total, 0);
  const esteMes = mes === mesActualKey();

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-3xl mx-auto">
      <p className="font-display text-3xl text-white leading-tight">
        Pago a coaches
      </p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        Cuántas clases hizo cada coach y cuánto pagarle
      </p>

      <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-2 py-1.5 mb-3">
        <button
          onClick={() => setMes(sumarMeses(mes, -1))}
          className="p-2 text-white/60"
          aria-label="Mes anterior"
        >
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
      <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-3">
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-white/70 text-sm">
            {esteMes
              ? 'Hasta hoy, a los coaches les corresponde'
              : 'Total a pagar ese mes'}
          </p>
          <p className="font-display text-white text-5xl leading-none mt-1.5 tabular-nums">
            {formatearPesos(totalPagar)}
          </p>
          <p className="text-white/55 text-xs mt-2">
            por {totalClases} clase{totalClases !== 1 ? 's' : ''} realizada
            {totalClases !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-black/25 rounded-xl px-3 py-2">
              <p className="text-green-300 text-sm font-semibold tabular-nums">
                {formatearPesos(yaPagado)}
              </p>
              <p className="text-white/40 text-[10px]">
                Ya registrado como pagado
              </p>
            </div>
            <div className="bg-black/25 rounded-xl px-3 py-2">
              <p className="text-yellow-200 text-sm font-semibold tabular-nums">
                {formatearPesos(Math.max(0, totalPagar - yaPagado))}
              </p>
              <p className="text-white/40 text-[10px]">Falta por pagar</p>
            </div>
          </div>

          {pctIngresos !== null && totalPagar > 0 && (
            <p className="text-white/75 text-xs mt-3 leading-snug">
              De cada $100 que entraron este mes, ${pctIngresos} van para pagar
              a los coaches.
            </p>
          )}
        </div>
      </div>

      {totalPendientes > 0 && (
        <div className="flex items-start gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-3.5 py-3 mb-3">
          <AlertTriangle
            size={16}
            className="text-yellow-300 shrink-0 mt-0.5"
          />
          <p className="text-yellow-100/90 text-xs">
            Hay{' '}
            <b>
              {totalPendientes} clase{totalPendientes !== 1 ? 's' : ''} sin
              finalizar
            </b>
            . No se suman al pago hasta que el coach las finalice (o tú desde
            "Clases realizadas").
          </p>
        </div>
      )}
      {sinValor.length > 0 && (
        <div className="flex items-start gap-2 bg-white/[0.04] border border-white/10 rounded-2xl px-3.5 py-3 mb-3">
          <Info size={16} className="text-cyan-brand shrink-0 mt-0.5" />
          <p className="text-white/70 text-xs">
            Falta definir cuánto se paga por clase a:{' '}
            <span className="text-white">
              {sinValor.map((c) => c.nombre.split(' ')[0]).join(', ')}
            </span>
            . Sin ese valor su total queda en $0.
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-1 mt-4">
        <select
          value={coachFiltro}
          onChange={(e) => setCoachFiltro(e.target.value)}
          className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
        >
          <option value="todos" className="bg-ink">
            Todos los coaches
          </option>
          {lista.map((c) => (
            <option key={c.id} value={c.id} className="bg-ink">
              {c.nombre}
            </option>
          ))}
        </select>
        <button
          onClick={descargarExcel}
          className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 text-white/80 rounded-xl px-3 text-sm"
        >
          <Download size={14} /> Excel
        </button>
      </div>
      <p className="text-white/35 text-[11px] mb-4">
        Solo se pagan las clases realizadas: con alumnos y finalizadas. Las
        clases sin alumnos no cuentan.
      </p>

      <div className="flex flex-col gap-2.5">
        {visibles.map((c) => {
          const abiertoAqui = abierto === c.id;
          const gastoRegistrado = (gastos || []).some(
            (g) => g.descripcion === c.descripcionGasto
          );
          return (
            <div
              key={c.id}
              className={`border rounded-3xl overflow-hidden ${
                gastoRegistrado
                  ? 'bg-green-400/[0.04] border-green-400/25'
                  : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-cyan-brand/15 border border-cyan-brand/40 flex items-center justify-center shrink-0 font-display text-sm text-cyan-brand">
                    {(c.nombre || '?')
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {c.nombre}
                    </p>
                    <InsigniaEvaluacion lista={c.evals} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-display text-2xl leading-none tabular-nums">
                      {formatearPesos(c.total)}
                    </p>
                    <p
                      className={`text-[10px] mt-1 ${
                        gastoRegistrado
                          ? 'text-green-300'
                          : c.total > 0
                          ? 'text-yellow-200'
                          : 'text-white/35'
                      }`}
                    >
                      {gastoRegistrado
                        ? 'Pagado ✓'
                        : c.total > 0
                        ? 'Por pagar'
                        : 'Sin monto'}
                    </p>
                  </div>
                </div>

                {/* La cuenta, en simple */}
                <div className="mt-3 bg-black/20 rounded-xl px-3 py-2.5 flex flex-col gap-1 text-xs">
                  <span className="text-white/70">
                    <b className="text-white">{c.clasesNormales}</b> clase
                    {c.clasesNormales !== 1 ? 's' : ''} ×{' '}
                    {editandoValor === c.id ? null : (
                      <button
                        onClick={() => {
                          setEditandoValor(c.id);
                          setValor(c.valorClase ? String(c.valorClase) : '');
                        }}
                        className="inline-flex items-center gap-1 text-cyan-brand font-semibold"
                      >
                        {c.valorClase
                          ? `${formatearPesos(c.valorClase)} por clase`
                          : 'definir valor por clase'}{' '}
                        <Pencil size={11} />
                      </button>
                    )}
                    {c.valorClase ? (
                      <>
                        {' '}
                        ={' '}
                        <b className="text-white">{formatearPesos(c.clasesNormales * c.valorClase)}</b>
                      </>
                    ) : null}
                  </span>
                  {c.clasesHiit > 0 && (
                    <span className="text-white/70">
                      <b className="text-white">{c.clasesHiit}</b> clase{c.clasesHiit !== 1 ? 's' : ''} HIIT ×{' '}
                      <span className="text-orange-300 font-semibold">{formatearPesos(c.valorHiit)}</span> ={' '}
                      <b className="text-white">{formatearPesos(c.clasesHiit * c.valorHiit)}</b>
                    </span>
                  )}
                  <span className="text-white/50">
                    {c.alumnos} alumno{c.alumnos !== 1 ? 's' : ''} atendido
                    {c.alumnos !== 1 ? 's' : ''}
                    {c.clases.length > 0
                      ? ` · ${(c.alumnos / c.clases.length)
                          .toFixed(1)
                          .replace('.', ',')} por clase`
                      : ''}
                  </span>
                </div>

                {editandoValor === c.id && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      autoFocus
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="Cuánto se paga por clase"
                      className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
                    />
                    <button
                      onClick={() => guardarValor(c.id)}
                      className="bg-cyan-brand text-ink font-semibold rounded-lg px-3 py-2 text-xs"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoValor(null)}
                      className="text-white/40 text-xs px-1"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {c.pendientes > 0 && (
                  <p className="flex items-center gap-1.5 text-yellow-200/90 text-xs mt-2">
                    <AlertTriangle size={12} /> {c.pendientes} clase
                    {c.pendientes !== 1 ? 's' : ''} sin finalizar (aún no suman)
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  {c.total > 0 &&
                    (gastoRegistrado ? (
                      <span className="flex-1 flex items-center justify-center gap-1.5 text-green-300 text-xs bg-green-400/10 border border-green-400/25 rounded-xl py-2.5">
                        <Check size={13} /> Pago registrado en Gastos
                      </span>
                    ) : (
                      <button
                        onClick={() => registrarComoGasto(c)}
                        disabled={registrando === c.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-brand text-ink text-xs font-semibold rounded-xl py-2.5 disabled:opacity-50"
                      >
                        <Wallet size={13} />{' '}
                        {registrando === c.id
                          ? 'Registrando...'
                          : 'Marcar como pagado'}
                      </button>
                    ))}
                  {c.clases.length > 0 && (
                    <button
                      onClick={() => setAbierto(abiertoAqui ? null : c.id)}
                      className="flex items-center justify-center gap-1 bg-white/[0.06] text-white/70 rounded-xl px-3 py-2.5 text-xs"
                    >
                      Ver clases{' '}
                      {abiertoAqui ? (
                        <ChevronUp size={13} />
                      ) : (
                        <ChevronDown size={13} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {abiertoAqui && (
                <div className="border-t border-white/10 px-4 py-3 flex flex-col gap-1.5">
                  {c.clases.map((x) => (
                    <div
                      key={`${x.horario.id}_${x.fecha}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-white/80">
                        {fechaCorta(x.fecha)} · {x.horario.hora}
                      </span>
                      <span className="text-white/45 text-xs">
                        {x.porAdmin
                          ? 'Registrada por admin'
                          : `${x.presentes} alumno${
                              x.presentes !== 1 ? 's' : ''
                            }`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {visibles.length === 0 && (
          <p className="text-white/30 text-sm text-center py-10">
            No hay coaches para mostrar.
          </p>
        )}
      </div>
    </div>
  );
}
