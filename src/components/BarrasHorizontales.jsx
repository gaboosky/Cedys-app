// Lista de barras horizontales con etiqueta y valor (ej. ingresos por plan o por medio de pago).
// items: [{ key, etiqueta, valor, detalle? }]
export default function BarrasHorizontales({ items, formatear = (v) => String(v), vacio = 'Sin datos.' }) {
  const maximo = Math.max(...items.map((i) => i.valor), 0);
  const total = items.reduce((acc, i) => acc + i.valor, 0);

  if (items.length === 0 || total === 0) {
    return <p className="text-white/30 text-xs py-1">{vacio}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((i) => {
        const pct = maximo > 0 ? (i.valor / maximo) * 100 : 0;
        const participacion = total > 0 ? Math.round((i.valor / total) * 100) : 0;
        return (
          <div key={i.key}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-white/70 text-xs truncate">
                {i.etiqueta}
                {i.detalle && <span className="text-white/30"> · {i.detalle}</span>}
              </span>
              <span className="text-white text-xs font-medium tabular-nums shrink-0">
                {formatear(i.valor)} <span className="text-white/35 font-normal">({participacion}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-cyan-brand rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
