import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatearRut } from '../../lib/formato';
import { Users, CalendarCheck, DollarSign, Download, CalendarX, CalendarRange, Dumbbell } from 'lucide-react';
import { normalizarEjercicio, variacionPct } from '../../lib/cargas';
import GraficoBarrasMes from '../../components/GraficoBarrasMes';
import {
  MEDIOS_PAGO, TIPOS_PAGO, etiquetaMedio, hoyLocalISO, mesDe, mesActualKey, sumarMeses,
  ultimosMeses, nombreMes, formatearPesos, totalDe, totalesPorMes,
} from '../../lib/ingresos';

function ultimoDiaDelMes(mesKey) {
  const [anio, mes] = mesKey.split('-').map(Number);
  return `${mesKey}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`;
}

function formatoFecha(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Atajos de rango de fechas
function rangoAtajo(atajo) {
  const hoy = hoyLocalISO();
  const mes = mesActualKey();
  if (atajo === 'mes') return { desde: `${mes}-01`, hasta: hoy };
  if (atajo === 'mes-anterior') {
    const ant = sumarMeses(mes, -1);
    return { desde: `${ant}-01`, hasta: ultimoDiaDelMes(ant) };
  }
  if (atajo === '3-meses') return { desde: `${sumarMeses(mes, -2)}-01`, hasta: hoy };
  if (atajo === 'anio') return { desde: `${mes.slice(0, 4)}-01-01`, hasta: hoy };
  return null;
}

const ATAJOS = [
  { valor: 'mes', label: 'Este mes' },
  { valor: 'mes-anterior', label: 'Mes anterior' },
  { valor: '3-meses', label: 'Últimos 3 meses' },
  { valor: 'anio', label: 'Este año' },
];

export default function Reportes() {
  const { usuarios, planes, reservas, horarios, pagos, registrosPeso = [] } = useAuth();
  const [generando, setGenerando] = useState(null);

  const [atajo, setAtajo] = useState('mes');
  const [rango, setRango] = useState(rangoAtajo('mes'));
  const { desde, hasta } = rango;
  const enRango = (fecha) => !!fecha && fecha >= desde && fecha <= hasta;

  function elegirAtajo(valor) {
    setAtajo(valor);
    setRango(rangoAtajo(valor));
  }

  function cambiarFecha(campo, valor) {
    if (!valor) return;
    setAtajo(null);
    setRango((r) => ({ ...r, [campo]: valor }));
  }

  const nombreUsuario = (id) => usuarios.find((u) => u.id === id)?.nombre || 'Alumno eliminado';
  const sufijoArchivo = `${desde}_a_${hasta}`;

  // --- Datos para gráficos ---
  const mesHoy = mesActualKey();
  const [mesIngresos, setMesIngresos] = useState(mesHoy);
  const [mesClases, setMesClases] = useState(mesHoy);

  const totalesIngresos = useMemo(() => totalesPorMes(pagos), [pagos]);
  const datosIngresos = ultimosMeses(12).map((k) => ({
    key: k,
    etiqueta: nombreMes(k, { corto: true, conAnio: false }).slice(0, 3),
    etiquetaLarga: nombreMes(k),
    valor: totalesIngresos[k] || 0,
  }));

  const hoy = hoyLocalISO();
  const clasesPorMes = useMemo(() => {
    const conteo = {};
    for (const r of reservas) {
      if (!r.fecha || r.fecha > hoy) continue;
      const k = mesDe(r.fecha);
      conteo[k] = (conteo[k] || 0) + 1;
    }
    return conteo;
  }, [reservas, hoy]);
  const datosClases = ultimosMeses(12).map((k) => ({
    key: k,
    etiqueta: nombreMes(k, { corto: true, conAnio: false }).slice(0, 3),
    etiquetaLarga: nombreMes(k),
    valor: clasesPorMes[k] || 0,
  }));

  // --- Conteos dentro del rango ---
  const pagosRango = pagos.filter((p) => enRango(p.fecha));
  const reservasRango = reservas.filter((r) => enRango(r.fecha));
  const totalSocios = usuarios.filter((u) => u.estado === 'activo').length;
  const fechaLocalDe = (creadoEn) => {
    const d = new Date(creadoEn);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const cargasRango = registrosPeso.filter((r) => r.creado_en && enRango(fechaLocalDe(r.creado_en)));
  const alumnosConCargas = new Set(cargasRango.map((r) => r.usuario_id)).size;

  // --- Exportaciones ---

  async function exportarSocios() {
    setGenerando('socios');
    const XLSX = await import('xlsx');

    const filas = usuarios
      .filter((u) => u.estado !== 'pendiente')
      .map((u) => ({
        Nombre: u.nombre,
        RUT: formatearRut(u.rut),
        Correo: u.correo,
        Teléfono: u.telefono || '',
        Plan: u.plan_id ? planes[u.plan_id]?.nombre || '' : 'Sin plan',
        Estado: u.estado,
        'Sesiones usadas': u.sesiones_usadas,
        'Fecha de registro': u.fecha_registro || '',
        'Última renovación': u.fecha_ultima_renovacion || '',
      }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Socios');
    XLSX.writeFile(libro, `socios-ceds-${hoyLocalISO()}.xlsx`);
    setGenerando(null);
  }

  async function exportarAsistencia() {
    setGenerando('asistencia');
    const XLSX = await import('xlsx');

    const filas = reservasRango
      .map((r) => {
        const horario = horarios.find((h) => h.id === r.horario_id);
        const usuario = usuarios.find((u) => u.id === r.usuario_id);
        if (!horario || !usuario) return null;
        const fechaReserva = r.creado_en ? new Date(r.creado_en) : null;
        return {
          Fecha: r.fecha,
          Hora: horario.hora,
          Coach: horario.coach_nombre || '',
          Alumno: usuario.nombre,
          Asistió: r.asistio === true ? 'Sí' : r.asistio === false ? 'No' : 'Sin marcar',
          'Fecha en que reservó': fechaReserva ? fechaReserva.toLocaleDateString('es-CL') : '',
          'Hora en que reservó': fechaReserva
            ? fechaReserva.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
            : '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.Fecha.localeCompare(a.Fecha));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Asistencia');
    XLSX.writeFile(libro, `asistencia-ceds-${sufijoArchivo}.xlsx`);
    setGenerando(null);
  }

  async function exportarCanceladas() {
    setGenerando('canceladas');
    const XLSX = await import('xlsx');

    const { data: canceladas } = await supabase
      .from('reservas')
      .select('*')
      .eq('estado', 'cancelada')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('cancelado_en', { ascending: false });

    const filas = (canceladas || []).map((r) => {
      const horario = horarios.find((h) => h.id === r.horario_id);
      const usuario = usuarios.find((u) => u.id === r.usuario_id);
      const fechaCancelacion = r.cancelado_en ? new Date(r.cancelado_en) : null;
      return {
        Alumno: usuario?.nombre || '',
        'Fecha de la clase': r.fecha,
        'Hora de la clase': horario?.hora || '',
        'Fecha en que canceló': fechaCancelacion ? fechaCancelacion.toLocaleDateString('es-CL') : '',
        'Hora en que canceló': fechaCancelacion
          ? fechaCancelacion.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
          : '',
        'Cancelación tardía': r.penalizada ? 'Sí' : 'No',
      };
    });

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Canceladas');
    XLSX.writeFile(libro, `horas-canceladas-ceds-${sufijoArchivo}.xlsx`);
    setGenerando(null);
  }

  async function exportarIngresos() {
    setGenerando('ingresos');
    const XLSX = await import('xlsx');
    const ordenados = [...pagosRango].sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Hoja 1: cada pago
    const filasPagos = ordenados.map((p) => {
      const usuario = usuarios.find((u) => u.id === p.usuario_id);
      return {
        Fecha: p.fecha,
        Socio: usuario?.nombre || 'Alumno eliminado',
        RUT: usuario ? formatearRut(usuario.rut) : '',
        Plan: p.plan_id ? planes[p.plan_id]?.nombre || 'Plan eliminado' : 'Sin plan',
        'Medio de pago': etiquetaMedio(p.medio),
        Tipo: TIPOS_PAGO[p.tipo] || 'Pago',
        Monto: Number(p.monto) || 0,
        Nota: p.nota || '',
      };
    });
    filasPagos.push({ Fecha: '', Socio: '', RUT: '', Plan: '', 'Medio de pago': '', Tipo: 'TOTAL', Monto: totalDe(ordenados), Nota: '' });

    // Hoja 2: resumen por mes y medio de pago
    const meses = [...new Set(ordenados.map((p) => mesDe(p.fecha)))].sort();
    const filasMes = meses.map((m) => {
      const delMes = ordenados.filter((p) => mesDe(p.fecha) === m);
      const fila = { Mes: nombreMes(m), Pagos: delMes.length };
      for (const medio of MEDIOS_PAGO) {
        fila[medio.label] = totalDe(delMes.filter((p) => (p.medio || 'transferencia') === medio.valor));
      }
      fila.Total = totalDe(delMes);
      return fila;
    });
    const filaTotal = { Mes: 'TOTAL', Pagos: ordenados.length };
    for (const medio of MEDIOS_PAGO) {
      filaTotal[medio.label] = totalDe(ordenados.filter((p) => (p.medio || 'transferencia') === medio.valor));
    }
    filaTotal.Total = totalDe(ordenados);
    filasMes.push(filaTotal);

    // Hoja 3: por plan
    const porPlan = {};
    for (const p of ordenados) {
      const nombre = p.plan_id ? planes[p.plan_id]?.nombre || 'Plan eliminado' : 'Sin plan / pago suelto';
      if (!porPlan[nombre]) porPlan[nombre] = { Plan: nombre, Pagos: 0, Total: 0 };
      porPlan[nombre].Pagos += 1;
      porPlan[nombre].Total += Number(p.monto) || 0;
    }
    const filasPlan = Object.values(porPlan).sort((a, b) => b.Total - a.Total);

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasPagos), 'Pagos');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasMes), 'Resumen por mes');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasPlan), 'Por plan');
    XLSX.writeFile(libro, `ingresos-ceds-${sufijoArchivo}.xlsx`);
    setGenerando(null);
  }

  async function exportarCargas() {
    setGenerando('cargas');
    const XLSX = await import('xlsx');
    const ordenados = [...cargasRango].sort((a, b) => (a.creado_en || '').localeCompare(b.creado_en || ''));

    // Hoja 1: cada registro, con la variación respecto al registro anterior del mismo ejercicio
    const ultimoPorClave = {};
    const filasRegistros = ordenados.map((r) => {
      const clave = `${r.usuario_id}|${normalizarEjercicio(r.ejercicio)}`;
      const anterior = ultimoPorClave[clave];
      ultimoPorClave[clave] = r;
      const base =
        r.peso_anterior !== null && r.peso_anterior !== undefined ? Number(r.peso_anterior) : anterior ? Number(anterior.peso) : null;
      const pct = base !== null ? variacionPct(r.peso, base) : null;
      return {
        Fecha: new Date(r.creado_en).toLocaleDateString('es-CL'),
        Alumno: nombreUsuario(r.usuario_id),
        Ejercicio: r.ejercicio,
        'Peso anterior (kg)': base === null ? '' : base,
        'Peso nuevo (kg)': Number(r.peso),
        'Variación (%)': pct === null ? '' : pct,
      };
    });

    // Hoja 2: resumen por alumno y ejercicio (primer y último peso del período)
    const grupos = {};
    for (const r of ordenados) {
      const clave = `${r.usuario_id}|${normalizarEjercicio(r.ejercicio)}`;
      if (!grupos[clave]) grupos[clave] = [];
      grupos[clave].push(r);
    }
    const filasResumen = Object.values(grupos)
      .map((lista) => {
        const primero = lista[0];
        const ultimo = lista[lista.length - 1];
        const inicio =
          primero.peso_anterior !== null && primero.peso_anterior !== undefined ? Number(primero.peso_anterior) : Number(primero.peso);
        const comparable = lista.length > 1 || (primero.peso_anterior !== null && primero.peso_anterior !== undefined);
        const pct = comparable ? variacionPct(ultimo.peso, inicio) : null;
        return {
          Alumno: nombreUsuario(primero.usuario_id),
          Ejercicio: ultimo.ejercicio,
          'Peso inicial (kg)': inicio,
          'Último peso (kg)': Number(ultimo.peso),
          'Variación (%)': pct === null ? '' : pct,
          Cambios: lista.length,
          'Primera fecha': new Date(primero.creado_en).toLocaleDateString('es-CL'),
          'Última fecha': new Date(ultimo.creado_en).toLocaleDateString('es-CL'),
        };
      })
      .sort((a, b) => a.Alumno.localeCompare(b.Alumno) || a.Ejercicio.localeCompare(b.Ejercicio));

    // Hoja 3: promedio de variación por alumno
    const porAlumno = {};
    for (const f of filasResumen) {
      if (!porAlumno[f.Alumno]) porAlumno[f.Alumno] = { Alumno: f.Alumno, Ejercicios: 0, suma: 0, conVariacion: 0 };
      porAlumno[f.Alumno].Ejercicios += 1;
      if (f['Variación (%)'] !== '') {
        porAlumno[f.Alumno].suma += f['Variación (%)'];
        porAlumno[f.Alumno].conVariacion += 1;
      }
    }
    const filasAlumno = Object.values(porAlumno).map((a) => ({
      Alumno: a.Alumno,
      'Ejercicios registrados': a.Ejercicios,
      'Variación promedio (%)': a.conVariacion ? Math.round((a.suma / a.conVariacion) * 10) / 10 : '',
    }));

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasAlumno), 'Por alumno');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasResumen), 'Por ejercicio');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasRegistros), 'Registros');
    XLSX.writeFile(libro, `progreso-cargas-ceds-${sufijoArchivo}.xlsx`);
    setGenerando(null);
  }

  const inputFecha =
    'w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors';

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      {/* Gráficos */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Resumen</p>
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-3">
        <p className="text-white text-sm font-medium mb-3">Ingresos por mes</p>
        <GraficoBarrasMes
          datos={datosIngresos}
          seleccionado={mesIngresos}
          onSeleccionar={setMesIngresos}
          formatear={formatearPesos}
        />
      </div>
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6">
        <p className="text-white text-sm font-medium mb-3">Clases tomadas por mes</p>
        <GraficoBarrasMes
          datos={datosClases}
          seleccionado={mesClases}
          onSeleccionar={setMesClases}
          formatear={(v) => `${v} clase${v !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Rango de fechas para las descargas */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Descargar en Excel</p>
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-1.5 mb-3">
          <CalendarRange size={15} className="text-cyan-brand" />
          <p className="text-white text-sm font-medium">Período</p>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ATAJOS.map((a) => (
            <button
              key={a.valor}
              onClick={() => elegirAtajo(a.valor)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                atajo === a.valor ? 'bg-cyan-brand text-ink' : 'bg-white/[0.06] text-white/50'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <label className="text-white/40 text-xs mb-1 block">Desde</label>
            <input type="date" value={desde} max={hasta} onChange={(e) => cambiarFecha('desde', e.target.value)} className={inputFecha} />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-white/40 text-xs mb-1 block">Hasta</label>
            <input type="date" value={hasta} min={desde} onChange={(e) => cambiarFecha('hasta', e.target.value)} className={inputFecha} />
          </div>
        </div>
        <p className="text-white/30 text-[11px] mt-2">
          Se aplica a ingresos, asistencia, horas canceladas y cargas: del {formatoFecha(desde)} al {formatoFecha(hasta)}.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <TarjetaReporte
          icono={DollarSign}
          titulo="Ingresos"
          detalle={`${formatearPesos(totalDe(pagosRango))} · ${pagosRango.length} pago${pagosRango.length !== 1 ? 's' : ''} en el período`}
          onDescargar={exportarIngresos}
          generando={generando === 'ingresos'}
        />
        <TarjetaReporte
          icono={CalendarCheck}
          titulo="Asistencia"
          detalle={`${reservasRango.length} reserva${reservasRango.length !== 1 ? 's' : ''} en el período`}
          onDescargar={exportarAsistencia}
          generando={generando === 'asistencia'}
        />
        <TarjetaReporte
          icono={CalendarX}
          titulo="Horas canceladas"
          detalle="Quién canceló, qué clase y cuándo, en el período"
          onDescargar={exportarCanceladas}
          generando={generando === 'canceladas'}
        />
        <TarjetaReporte
          icono={Dumbbell}
          titulo="Progreso de cargas"
          detalle={`${cargasRango.length} registro${cargasRango.length !== 1 ? 's' : ''} de ${alumnosConCargas} alumno${alumnosConCargas !== 1 ? 's' : ''} en el período`}
          onDescargar={exportarCargas}
          generando={generando === 'cargas'}
        />
        <TarjetaReporte
          icono={Users}
          titulo="Listado de socios"
          detalle={`${totalSocios} socios activos (no depende del período)`}
          onDescargar={exportarSocios}
          generando={generando === 'socios'}
        />
      </div>
    </div>
  );
}

function TarjetaReporte({ icono: Icono, titulo, detalle, onDescargar, generando }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
          <Icono size={18} className="text-cyan-brand" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium">{titulo}</p>
          <p className="text-white/40 text-xs">{detalle}</p>
        </div>
      </div>
      <button
        onClick={onDescargar}
        disabled={generando}
        className="w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
      >
        <Download size={15} /> {generando ? 'Generando...' : 'Descargar Excel'}
      </button>
    </div>
  );
}
