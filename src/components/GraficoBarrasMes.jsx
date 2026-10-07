import { useState } from 'react';

// Gráfico de barras verticales, una barra por mes.
// datos: [{ key, etiqueta, etiquetaLarga, valor }]
// seleccionado: key destacada (barra en celeste pleno, con su valor encima).
// onSeleccionar: al tocar una barra (opcional).
// formatear: cómo mostrar el valor (ej. pesos o número de clases).
export default function GraficoBarrasMes({
  datos,
  seleccionado,
  onSeleccionar,
  formatear = (v) => String(v),
  alto = 140,
}) {
  const [hover, setHover] = useState(null);
  const maximo = Math.max(...datos.map((d) => d.valor), 0);
  const activo = hover ?? seleccionado;
  const datoActivo = datos.find((d) => d.key === activo);

  return (
    <div>
      {/* Lectura del mes activo: se actualiza al pasar el mouse o tocar una barra */}
      <div className="flex items-baseline justify-between mb-2 min-h-[20px]">
        <span className="text-white/40 text-xs">{datoActivo?.etiquetaLarga || ''}</span>
        <span className="text-white text-sm font-medium tabular-nums">
          {datoActivo ? formatear(datoActivo.valor) : ''}
        </span>
      </div>

      <div className="relative" style={{ height: alto }}>
        {/* Línea base */}
        <div className="absolute left-0 right-0 bottom-0 h-px bg-white/15" />

        <div className="absolute inset-0 flex items-end gap-[2px]">
          {datos.map((d) => {
            const pct = maximo > 0 ? (d.valor / maximo) * 100 : 0;
            const esActivo = d.key === activo;
            const esSeleccionado = d.key === seleccionado;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => {
                  setHover(null);
                  onSeleccionar?.(d.key);
                }}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(d.key)}
                onPointerLeave={() => setHover(null)}
                aria-label={`${d.etiquetaLarga}: ${formatear(d.valor)}`}
                className="flex-1 h-full flex items-end justify-center outline-none"
              >
                <div
                  className={`w-full max-w-[22px] rounded-t transition-colors ${
                    esSeleccionado || esActivo ? 'bg-cyan-brand' : 'bg-cyan-brand/35'
                  }`}
                  style={{ height: d.valor > 0 ? `max(${pct}%, 3px)` : '0px' }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-[2px] mt-1.5">
        {datos.map((d) => (
          <span
            key={d.key}
            className={`flex-1 text-center text-[9px] uppercase ${
              d.key === seleccionado ? 'text-white' : 'text-white/35'
            }`}
          >
            {d.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}
