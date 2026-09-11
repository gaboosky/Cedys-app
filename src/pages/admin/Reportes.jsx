import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Users,
  CalendarCheck,
  DollarSign,
  Download,
  CalendarX,
} from 'lucide-react';

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nombreMesActual() {
  const fecha = new Date();
  return capitalizar(
    fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  );
}

export default function Reportes() {
  const { usuarios, planes, reservas, horarios } = useAuth();
  const [generando, setGenerando] = useState(null);

  async function exportarSocios() {
    setGenerando('socios');
    const XLSX = await import('xlsx');

    const filas = usuarios
      .filter((u) => u.rol === 'usuario')
      .map((u) => ({
        Nombre: u.nombre,
        RUT: u.rut,
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
    XLSX.writeFile(
      libro,
      `socios-ceds-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    setGenerando(null);
  }

  async function exportarAsistencia() {
    setGenerando('asistencia');
    const XLSX = await import('xlsx');

    const filas = reservas
      .map((r) => {
        const horario = horarios.find((h) => h.id === r.horario_id);
        const usuario = usuarios.find((u) => u.id === r.usuario_id);
        if (!horario || !usuario) return null;
        const fechaReserva = r.creado_en ? new Date(r.creado_en) : null;
        return {
          Fecha: r.fecha,
          Día: r.dia_semana || '',
          Hora: horario.hora,
          Coach: horario.coach_nombre || '',
          Alumno: usuario.nombre,
          Asistió:
            r.asistio === true
              ? 'Sí'
              : r.asistio === false
              ? 'No'
              : 'Sin marcar',
          'Fecha en que reservó': fechaReserva
            ? fechaReserva.toLocaleDateString('es-CL')
            : '',
          'Hora en que reservó': fechaReserva
            ? fechaReserva.toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.Fecha.localeCompare(a.Fecha));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Asistencia');
    XLSX.writeFile(
      libro,
      `asistencia-ceds-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    setGenerando(null);
  }

  async function exportarCanceladas() {
    setGenerando('canceladas');
    const XLSX = await import('xlsx');

    const { data: canceladas } = await supabase
      .from('reservas')
      .select('*')
      .eq('estado', 'cancelada')
      .order('cancelado_en', { ascending: false });

    const filas = (canceladas || []).map((r) => {
      const horario = horarios.find((h) => h.id === r.horario_id);
      const usuario = usuarios.find((u) => u.id === r.usuario_id);
      const fechaCancelacion = r.cancelado_en ? new Date(r.cancelado_en) : null;
      return {
        Alumno: usuario?.nombre || '',
        'Fecha de la clase': r.fecha,
        'Hora de la clase': horario?.hora || '',
        'Fecha en que canceló': fechaCancelacion
          ? fechaCancelacion.toLocaleDateString('es-CL')
          : '',
        'Hora en que canceló': fechaCancelacion
          ? fechaCancelacion.toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
        'Cancelación tardía': r.penalizada ? 'Sí' : 'No',
      };
    });

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Canceladas');
    XLSX.writeFile(
      libro,
      `horas-canceladas-ceds-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    setGenerando(null);
  }

  async function exportarIngresos() {
    setGenerando('ingresos');
    const XLSX = await import('xlsx');

    const filas = usuarios
      .filter((u) => u.rol === 'usuario' && u.estado === 'activo' && u.plan_id)
      .map((u) => {
        const plan = planes[u.plan_id];
        return {
          Socio: u.nombre,
          Plan: plan?.nombre || '',
          'Valor neto': plan?.valor_neto || 0,
          'Valor con IVA':
            u.plan_monto_personalizado || plan?.valor_con_iva || 0,
          'Duración (días)': u.plan_dias_personalizado || '',
          'Última renovación':
            u.fecha_ultima_renovacion || 'Sin renovación registrada',
        };
      });

    const totalNeto = filas.reduce((acc, f) => acc + f['Valor neto'], 0);
    const totalConIva = filas.reduce((acc, f) => acc + f['Valor con IVA'], 0);
    filas.push({
      Socio: '',
      Plan: 'TOTAL',
      'Valor neto': totalNeto,
      'Valor con IVA': totalConIva,
      'Duración (días)': '',
      'Última renovación': '',
    });

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Ingresos');
    XLSX.writeFile(
      libro,
      `ingresos-ceds-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    setGenerando(null);
  }

  const totalSocios = usuarios.filter(
    (u) => u.rol === 'usuario' && u.estado === 'activo'
  ).length;
  const totalReservas = reservas.length;
  const ingresoTotal = usuarios
    .filter((u) => u.rol === 'usuario' && u.estado === 'activo' && u.plan_id)
    .reduce((acc, u) => acc + (planes[u.plan_id]?.valor_con_iva || 0), 0);

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="text-white/40 text-xs mb-6">
        Exporta información en Excel para tu contabilidad o registros
      </p>

      <div className="flex flex-col gap-3">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
              <Users size={18} className="text-cyan-brand" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                Listado de socios
              </p>
              <p className="text-white/40 text-xs">
                {totalSocios} socios activos
              </p>
            </div>
          </div>
          <button
            onClick={exportarSocios}
            disabled={generando === 'socios'}
            className="w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            <Download size={15} />{' '}
            {generando === 'socios' ? 'Generando...' : 'Descargar Excel'}
          </button>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
              <CalendarCheck size={18} className="text-cyan-brand" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Asistencia</p>
              <p className="text-white/40 text-xs">
                {totalReservas} reservas registradas en total
              </p>
            </div>
          </div>
          <button
            onClick={exportarAsistencia}
            disabled={generando === 'asistencia'}
            className="w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            <Download size={15} />{' '}
            {generando === 'asistencia' ? 'Generando...' : 'Descargar Excel'}
          </button>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
              <DollarSign size={18} className="text-cyan-brand" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                Ingresos por planes
              </p>
              <p className="text-white/40 text-xs">
                ${ingresoTotal.toLocaleString('es-CL')} estimado este mes
              </p>
            </div>
          </div>
          <button
            onClick={exportarIngresos}
            disabled={generando === 'ingresos'}
            className="w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            <Download size={15} />{' '}
            {generando === 'ingresos' ? 'Generando...' : 'Descargar Excel'}
          </button>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
              <CalendarX size={18} className="text-cyan-brand" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Horas canceladas</p>
              <p className="text-white/40 text-xs">
                Quién canceló, qué clase, y cuándo lo hizo
              </p>
            </div>
          </div>
          <button
            onClick={exportarCanceladas}
            disabled={generando === 'canceladas'}
            className="w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            <Download size={15} />{' '}
            {generando === 'canceladas' ? 'Generando...' : 'Descargar Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
