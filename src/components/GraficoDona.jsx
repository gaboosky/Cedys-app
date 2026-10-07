// Gráfico de dona con su tabla al lado (cada parte con nombre, monto y %).
// items: [{ key, etiqueta, valor, color, detalle? }]
export default function GraficoDona({ items, formatear = (v) => String(v), etiquetaCentro = 'Total', vacio = 'Sin datos.' }) {
  const total = items.reduce((acc, i) => acc + i.valor, 0);
  if (total <= 0) return <p className="text-white/30 text-xs py-2">{vacio}</p>;

  const radio = 48;
  const circunferencia = 2 * Math.PI * radio;
  const conDatos = items.filter((i) => i.valor > 0);
  const separacion = conDatos.length > 1 ? 2 : 0; // pequeño espacio entre partes
  let acumulado = 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
      <div className="relative w-36 h-36 shrink-0 mx-auto sm:mx-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={radio} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
          {conDatos.map((i) => {
            const largo = (i.valor / total) * circunferencia;
            const visible = Math.max(largo - separacion, 0.5);
            const segmento = (
              <circle
                key={i.key}
                cx="60"
                cy="60"
                r={radio}
                fill="none"
                stroke={i.color}
                strokeWidth="14"
                strokeDasharray={`${visible} ${circunferencia - visible}`}
                strokeDashoffset={-acumulado}
              >
                <title>{`${i.etiqueta}: ${formatear(i.valor)}`}</title>
              </circle>
            );
            acumulado += largo;
            return segmento;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-white/40 text-[10px] uppercase tracking-wide">{etiquetaCentro}</span>
          <span className="text-white text-sm font-semibold tabular-nums">{formatear(total)}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-white/35 text-[10px] uppercase tracking-wide pb-1.5 border-b border-white/10">
          <span>Medio</span>
          <span>Monto · %</span>
        </div>
        {items.map((i) => (
          <div key={i.key} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.06] last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: i.color }} />
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{i.etiqueta}</p>
                {i.detalle && <p className="text-white/35 text-[11px]">{i.detalle}</p>}
              </div>
            </div>
            <p className="text-white text-sm tabular-nums shrink-0">
              {formatear(i.valor)} <span className="text-white/35 text-xs">{Math.round((i.valor / total) * 100)}%</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
