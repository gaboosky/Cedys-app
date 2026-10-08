import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { InsigniaEvaluacion, promedio } from '../../components/EvaluarClase';
import { formatearPesos, hoyLocalISO, mesActualKey, sumarMeses, nombreMes } from '../../lib/ingresos';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, Check, AlertTriangle, Wallet } from 'lucide-react';

function ultimoDiaDelMes(mesKey) {
  const [anio, mes] = mesKey.split('-').map(Number);
  return `${mesKey}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`;
}

function fechaCorta(fechaISO) {
  const t = new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
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
    gastos,
    guardarGasto,
    evaluaciones,
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

  const realizadas = mesFuturo ? [] : clasesRealizadasConAlumnosEnRango(desde, hasta);
  const pendientes = mesFuturo ? [] : clasesPorFinalizarEnRango(desde, hasta);

  const coachDe = (o) => {
    const f = finalizacionDe(o.horario.id, o.fecha);
    const c = coachDeClase(o.horario, o.fecha);
    return { id: f?.coach_id || c.id || 'sin-coach', nombre: f?.coach_nombre || c.nombre || 'Sin coach', fin: f };
  };

  // Coaches: todos los del equipo + cualquiera que aparezca en las clases
  const equipo = usuarios.filter((u) => (u.rol === 'coach' || u.rol === 'head_coach') && u.estado !== 'inactivo');
  const porCoach = {};
  for (const u of equipo) porCoach[u.id] = { id: u.id, nombre: u.nombre, clases: [], pendientes: 0 };
  for (const o of realizadas) {
    const c = coachDe(o);
    if (!porCoach[c.id]) porCoach[c.id] = { id: c.id, nombre: c.nombre, clases: [], pendientes: 0 };
    const presentes = c.fin
      ? c.fin.presentes
      : reservas.filter((r) => r.horario_id === o.horario.id && r.fecha === o.fecha && r.asistio === true).length;
    const porAdmin = !!c.fin && c.fin.presentes === 0 && c.fin.ausentes === 0;
    porCoach[c.id].clases.push({ ...o, presentes, porAdmin, comentario: c.fin?.comentario || '' });
  }
  for (const o of pendientes) {
    const c = coachDe(o);
    if (porCoach[c.id]) porCoach[c.id].pendientes += 1;
  }

  const lista = Object.values(porCoach)
    .map((c) => {
      const valorClase = tarifasCoach?.[c.id] || 0;
      const clases = [...c.clases].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horario.hora.localeCompare(b.horario.hora));
      return {
        ...c,
        clases,
        valorClase,
        total: clases.length * valorClase,
        alumnos: clases.reduce((acc, x) => acc + x.presentes, 0),
        evals: (evaluaciones || []).filter(
          (e) => e.coach_id === c.id && e.fecha >= desde && e.fecha <= hasta
        ),
        descripcionGasto: `Pago coach ${c.nombre} · ${nombreMes(mes)}`,
      };
    })
    .filter((c) => c.clases.length > 0 || c.pendientes > 0 || equipo.some((u) => u.id === c.id))
    .sort((a, b) => b.clases.length - a.clases.length || a.nombre.localeCompare(b.nombre));

  const visibles = coachFiltro === 'todos' ? lista : lista.filter((c) => c.id === coachFiltro);
  const totalClases = visibles.reduce((acc, c) => acc + c.clases.length, 0);
  const totalPagar = visibles.reduce((acc, c) => acc + c.total, 0);

  async function guardarValor(coachId) {
    await guardarTarifaCoach(coachId, valor);
    setEditandoValor(null);
  }

  async function registrarComoGasto(c) {
    setRegistrando(c.id);
    await guardarGasto({ fecha: hasta, monto: c.total, categoria: 'sueldos', descripcion: c.descripcionGasto });
    setRegistrando(null);
  }

  async function descargarExcel() {
    const XLSX = await import('xlsx');
    const resumen = visibles.map((c) => ({
      Coach: c.nombre,
      'Clases realizadas': c.clases.length,
      'Alumnos atendidos': c.alumnos,
      'Valor por clase': c.valorClase,
      'Total a pagar': c.total,
      'Clases sin finalizar (no cuentan)': c.pendientes,
      'Evaluación promedio': promedio(c.evals) === null ? '' : Number(promedio(c.evals).toFixed(1)),
      'N° evaluaciones': c.evals.length,
    }));
    resumen.push({});
    resumen.push({ Coach: 'TOTAL', 'Clases realizadas': totalClases, 'Total a pagar': totalPagar });
    const detalle = visibles.flatMap((c) =>
      c.clases.map((x) => ({
        Coach: c.nombre,
        Fecha: x.fecha,
        Hora: x.horario.hora,
        'Alumnos presentes': x.presentes,
        Nota: x.porAdmin ? 'Registrada por admin (sin alumnos)' : x.comentario,
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(resumen), 'Resumen');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(detalle.length ? detalle : [{ Coach: 'Sin clases' }]), 'Detalle');
    const nombre = coachFiltro === 'todos' ? 'todos' : (visibles[0]?.nombre || 'coach').replace(/\s+/g, '-');
    XLSX.writeFile(libro, `pago-coaches-${nombre}-${mes}.xlsx`);
  }

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

      <div className="flex gap-2 mb-4">
        <select
          value={coachFiltro}
          onChange={(e) => setCoachFiltro(e.target.value)}
          className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
        >
          <option value="todos" className="bg-ink">Todos los coaches</option>
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

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
          <p className="text-white/40 text-[11px] uppercase tracking-wide">Clases realizadas</p>
          <p className="text-white font-display text-2xl leading-tight">{totalClases}</p>
        </div>
        <div className="bg-cyan-brand/[0.07] border border-cyan-brand/40 rounded-2xl p-3.5">
          <p className="text-white/40 text-[11px] uppercase tracking-wide">Total a pagar</p>
          <p className="text-white font-display text-2xl leading-tight">{formatearPesos(totalPagar)}</p>
        </div>
      </div>
      <p className="text-white/35 text-[11px] mb-5">
        Solo cuentan las clases realizadas: con alumnos y finalizadas por el coach (o registradas por ti). Las clases sin
        alumnos no cuentan.
      </p>

      <div className="flex flex-col gap-2.5">
        {visibles.map((c) => {
          const abiertoAqui = abierto === c.id;
          const gastoRegistrado = (gastos || []).some((g) => g.descripcion === c.descripcionGasto);
          return (
            <div key={c.id} className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{c.nombre}</p>
                    <p className="text-white/45 text-xs">
                      {c.clases.length} clase{c.clases.length !== 1 ? 's' : ''} · {c.alumnos} alumno
                      {c.alumnos !== 1 ? 's' : ''} atendido{c.alumnos !== 1 ? 's' : ''}
                    </p>
                    <InsigniaEvaluacion lista={c.evals} />
                  </div>
                  <p className="text-white font-display text-xl tabular-nums shrink-0">{formatearPesos(c.total)}</p>
                </div>

                {c.pendientes > 0 && (
                  <p className="flex items-center gap-1.5 text-yellow-200/90 text-xs mt-2">
                    <AlertTriangle size={12} /> {c.pendientes} clase{c.pendientes !== 1 ? 's' : ''} sin finalizar (no se
                    cuentan hasta que se finalicen)
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  {editandoValor === c.id ? (
                    <>
                      <input
                        type="number"
                        inputMode="numeric"
                        autoFocus
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        placeholder="Valor por clase"
                        className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
                      />
                      <button onClick={() => guardarValor(c.id)} className="bg-cyan-brand text-ink font-semibold rounded-lg px-3 py-2 text-xs">
                        Guardar
                      </button>
                      <button onClick={() => setEditandoValor(null)} className="text-white/40 text-xs px-1">
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditandoValor(c.id);
                        setValor(c.valorClase ? String(c.valorClase) : '');
                      }}
                      className="text-xs text-white/60 bg-black/20 rounded-lg px-3 py-2"
                    >
                      {c.valorClase ? `${formatearPesos(c.valorClase)} por clase · cambiar` : 'Definir valor por clase'}
                    </button>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  {c.total > 0 &&
                    (gastoRegistrado ? (
                      <span className="flex-1 flex items-center justify-center gap-1.5 text-cyan-brand text-xs bg-cyan-brand/10 border border-cyan-brand/25 rounded-lg py-2">
                        <Check size={13} /> Pago registrado en Gastos
                      </span>
                    ) : (
                      <button
                        onClick={() => registrarComoGasto(c)}
                        disabled={registrando === c.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 text-white text-xs font-semibold rounded-lg py-2 disabled:opacity-50"
                      >
                        <Wallet size={13} /> {registrando === c.id ? 'Registrando...' : 'Registrar pago en Gastos'}
                      </button>
                    ))}
                  {c.clases.length > 0 && (
                    <button
                      onClick={() => setAbierto(abiertoAqui ? null : c.id)}
                      className="flex items-center justify-center gap-1 bg-white/[0.06] text-white/70 rounded-lg px-3 py-2 text-xs"
                    >
                      Ver clases {abiertoAqui ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                </div>
              </div>

              {abiertoAqui && (
                <div className="border-t border-white/10 px-4 py-3 flex flex-col gap-1.5">
                  {c.clases.map((x) => (
                    <div key={`${x.horario.id}_${x.fecha}`} className="flex items-center justify-between text-sm">
                      <span className="text-white/80">
                        {fechaCorta(x.fecha)} · {x.horario.hora}
                      </span>
                      <span className="text-white/45 text-xs">
                        {x.porAdmin ? 'Registrada por admin' : `${x.presentes} alumno${x.presentes !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {visibles.length === 0 && <p className="text-white/30 text-sm text-center py-10">No hay coaches para mostrar.</p>}
      </div>
    </div>
  );
}
