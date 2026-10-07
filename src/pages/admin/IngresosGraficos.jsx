import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import GraficoBarrasMes from '../../components/GraficoBarrasMes';
import BarrasHorizontales from '../../components/BarrasHorizontales';
import {
  MEDIOS_PAGO, mesDe, mesActualKey, sumarMeses, ultimosMeses,
  nombreMes, formatearPesos, totalDe, totalesPorMes,
} from '../../lib/ingresos';

const RANGOS = [
  { valor: 6, label: '6 meses' },
  { valor: 12, label: '12 meses' },
];

function Indicador({ etiqueta, valor, detalle }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
      <p className="text-white/40 text-[11px] uppercase tracking-wide">{etiqueta}</p>
      <p className="text-white font-display text-xl leading-tight mt-1 tabular-nums">{valor}</p>
      {detalle && <p className="text-white/35 text-[11px] mt-0.5">{detalle}</p>}
    </div>
  );
}

export default function IngresosGraficos() {
  const navigate = useNavigate();
  const { pagos, planes } = useAuth();

  const mesHoy = mesActualKey();
  const mesInicial = new URLSearchParams(window.location.search).get('mes');
  const [mes, setMes] = useState(
    mesInicial && /^\d{4}-\d{2}$/.test(mesInicial) && mesInicial <= mesHoy ? mesInicial : mesHoy
  );
  const [cantidadMeses, setCantidadMeses] = useState(12);

  const totales = useMemo(() => totalesPorMes(pagos), [pagos]);
  const meses = ultimosMeses(cantidadMeses, mesHoy);

  const datosGrafico = meses.map((k) => ({
    key: k,
    etiqueta: nombreMes(k, { corto: true, conAnio: false }).slice(0, 3),
    etiquetaLarga: nombreMes(k),
    valor: totales[k] || 0,
  }));

  // Resumen del período mostrado en el gráfico
  const totalPeriodo = meses.reduce((acc, k) => acc + (totales[k] || 0), 0);
  const mesesConPagos = meses.filter((k) => (totales[k] || 0) > 0);
  const promedioMensual = mesesConPagos.length > 0 ? totalPeriodo / mesesConPagos.length : 0;
  const mejorMes = meses.reduce((mejor, k) => ((totales[k] || 0) > (totales[mejor] || 0) ? k : mejor), meses[0]);

  // Mes elegido
  const pagosMes = pagos.filter((p) => mesDe(p.fecha) === mes);
  const totalMes = totalDe(pagosMes);
  const totalAnterior = totales[sumarMeses(mes, -1)] || 0;
  const variacion = totalAnterior > 0 ? Math.round(((totalMes - totalAnterior) / totalAnterior) * 100) : null;
  const promedioPago = pagosMes.length > 0 ? totalMes / pagosMes.length : 0;

  const porPlan = Object.values(
    pagosMes.reduce((acc, p) => {
      const key = p.plan_id || 'sin-plan';
      const etiqueta = p.plan_id ? planes[p.plan_id]?.nombre || 'Plan eliminado' : 'Sin plan / pago suelto';
      if (!acc[key]) acc[key] = { key, etiqueta, valor: 0, cantidad: 0 };
      acc[key].valor += Number(p.monto) || 0;
      acc[key].cantidad += 1;
      return acc;
    }, {})
  )
    .map((i) => ({ ...i, detalle: `${i.cantidad} pago${i.cantidad !== 1 ? 's' : ''}` }))
    .sort((a, b) => b.valor - a.valor);

  const porMedio = MEDIOS_PAGO.map((m) => {
    const delMedio = pagosMes.filter((p) => (p.medio || 'transferencia') === m.valor);
    return {
      key: m.valor,
      etiqueta: m.label,
      valor: totalDe(delMedio),
      detalle: `${delMedio.length} pago${delMedio.length !== 1 ? 's' : ''}`,
    };
  }).filter((i) => i.valor > 0);

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate(`/ingreso-detalle?mes=${mes}`)}
        className="flex items-center gap-1.5 text-white/50 text-sm mb-4"
      >
        <ArrowLeft size={16} /> Ingresos
      </button>

      {/* Evolución mensual */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white text-sm font-medium">Ingresos por mes</p>
          <div className="flex bg-black/20 border border-white/10 rounded-lg p-0.5">
            {RANGOS.map((r) => (
              <button
                key={r.valor}
                onClick={() => setCantidadMeses(r.valor)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  cantidadMeses === r.valor ? 'bg-cyan-brand text-ink' : 'text-white/50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <GraficoBarrasMes datos={datosGrafico} seleccionado={mes} onSeleccionar={setMes} formatear={formatearPesos} />
        <p className="text-white/25 text-[10px] mt-2">Toca una barra para ver el detalle de ese mes abajo.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Indicador
          etiqueta="Promedio mensual"
          valor={formatearPesos(promedioMensual)}
          detalle={`últimos ${cantidadMeses} meses`}
        />
        <Indicador
          etiqueta="Mejor mes"
          valor={(totales[mejorMes] || 0) > 0 ? formatearPesos(totales[mejorMes]) : '—'}
          detalle={(totales[mejorMes] || 0) > 0 ? nombreMes(mejorMes) : 'sin pagos aún'}
        />
      </div>

      {/* Detalle del mes elegido */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">{nombreMes(mes)}</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Indicador etiqueta="Total del mes" valor={formatearPesos(totalMes)} detalle={`${pagosMes.length} pago${pagosMes.length !== 1 ? 's' : ''}`} />
        <Indicador
          etiqueta="Vs mes anterior"
          valor={variacion === null ? '—' : `${variacion > 0 ? '+' : ''}${variacion}%`}
          detalle={`${nombreMes(sumarMeses(mes, -1), { conAnio: false })}: ${formatearPesos(totalAnterior)}`}
        />
        <Indicador etiqueta="Promedio por pago" valor={formatearPesos(promedioPago)} />
        <Indicador
          etiqueta="Medio más usado"
          valor={porMedio.length > 0 ? [...porMedio].sort((a, b) => b.valor - a.valor)[0].etiqueta : '—'}
        />
      </div>

      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-3">
        <p className="text-white text-sm font-medium mb-3">Por plan</p>
        <BarrasHorizontales items={porPlan} formatear={formatearPesos} vacio="Sin pagos este mes." />
      </div>

      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
        <p className="text-white text-sm font-medium mb-3">Por medio de pago</p>
        <BarrasHorizontales items={porMedio} formatear={formatearPesos} vacio="Sin pagos este mes." />
      </div>
    </div>
  );
}
