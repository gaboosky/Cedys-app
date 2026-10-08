import { useState } from 'react';
import { TrendingUp, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import {
  resumenPorEjercicio,
  formatearKg,
  formatearPct,
  fechaRegistro,
} from '../lib/cargas';

// Evolución del peso de un ejercicio: una sola línea (un color), puntos tocables.
function GraficoEjercicio({ puntos }) {
  const [activo, setActivo] = useState(puntos.length - 1);
  const W = 300;
  const H = 120;
  const M = { izq: 8, der: 8, arr: 18, aba: 18 };
  const valores = puntos.map((p) => p.peso);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const x = (i) => M.izq + (puntos.length === 1 ? (W - M.izq - M.der) / 2 : (i * (W - M.izq - M.der)) / (puntos.length - 1));
  const y = (v) => M.arr + (1 - (v - min) / rango) * (H - M.arr - M.aba);
  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.peso)}`).join(' ');
  const p = puntos[activo];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Evolución del peso">
        <line x1={M.izq} x2={W - M.der} y1={H - M.aba} y2={H - M.aba} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <path d={linea} fill="none" stroke="#03CDE6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map((pt, i) => (
          <g key={i} onClick={() => setActivo(i)} onMouseEnter={() => setActivo(i)} style={{ cursor: 'pointer' }}>
            <circle cx={x(i)} cy={y(pt.peso)} r="12" fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(pt.peso)}
              r={i === activo ? 5 : 4}
              fill={i === activo ? '#03CDE6' : '#0A0A0A'}
              stroke="#03CDE6"
              strokeWidth="2"
            />
          </g>
        ))}
        <text x={M.izq} y={H - 4} fill="rgba(255,255,255,0.4)" fontSize="10">
          {fechaRegistro(puntos[0].fecha)}
        </text>
        {puntos.length > 1 && (
          <text x={W - M.der} y={H - 4} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end">
            {fechaRegistro(puntos[puntos.length - 1].fecha)}
          </text>
        )}
      </svg>
      {p && (
        <p className="text-white/70 text-xs text-center -mt-1">
          {fechaRegistro(p.fecha)}: <span className="text-white font-semibold">{formatearKg(p.peso)}</span>
        </p>
      )}
    </div>
  );
}

// Progreso de cargas del alumno, con los cambios de peso que hace en su rutina.
// Se separa por semana y día de la rutina, porque los pesos varían según estos.
export default function CargasRutina({ registros, usuarioId, titulo = 'Mis cargas en la rutina', textoVacio }) {
  const [abierto, setAbierto] = useState(null);
  const [semanaFiltro, setSemanaFiltro] = useState('todas');
  const resumen = resumenPorEjercicio(registros || [], usuarioId);

  const semanas = [...new Set(resumen.map((r) => r.semana).filter((x) => x !== null && x !== undefined))].sort(
    (a, b) => a - b
  );
  const visibles = semanaFiltro === 'todas' ? resumen : resumen.filter((r) => String(r.semana) === semanaFiltro);

  // Agrupar por sesión (semana + día), en el orden de la rutina
  const grupos = [];
  for (const r of visibles) {
    const etiqueta = r.sesion || 'Sin semana ni día';
    let g = grupos.find((x) => x.etiqueta === etiqueta);
    if (!g) {
      g = { etiqueta, items: [] };
      grupos.push(g);
    }
    g.items.push(r);
  }

  function puntosDe(r) {
    const lista = r.lista;
    const puntos = [];
    if (lista[0] && lista[0].peso_anterior !== null && lista[0].peso_anterior !== undefined) {
      puntos.push({ peso: Number(lista[0].peso_anterior), fecha: lista[0].creado_en });
    }
    lista.forEach((x) => puntos.push({ peso: Number(x.peso), fecha: x.creado_en }));
    return puntos;
  }

  return (
    <div className="mb-6">
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Dumbbell size={13} /> {titulo}
      </p>
      {resumen.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <p className="text-white/40 text-sm">
            {textoVacio ||
              'Cuando cambies el peso de un ejercicio en tu Rutina ("Editar peso"), aquí verás cómo vas progresando.'}
          </p>
        </div>
      ) : (
        <>
          {semanas.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
              {['todas', ...semanas.map(String)].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSemanaFiltro(sem)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                    semanaFiltro === sem ? 'bg-cyan-brand text-ink' : 'bg-white/[0.06] text-white/50'
                  }`}
                >
                  {sem === 'todas' ? 'Todas' : `Semana ${sem}`}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {grupos.map((g) => (
              <div key={g.etiqueta}>
                <p className="text-cyan-brand/80 text-[11px] font-semibold uppercase tracking-wide mb-1.5">{g.etiqueta}</p>
                <div className="flex flex-col gap-2">
                  {g.items.map((r) => {
                    const estaAbierto = abierto === r.clave;
                    return (
                      <div key={r.clave} className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setAbierto(estaAbierto ? null : r.clave)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">{r.ejercicio}</p>
                            <p className="text-white/35 text-[11px]">
                              {r.registros} cambio{r.registros !== 1 ? 's' : ''} · último {fechaRegistro(r.fechaUltimo)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-white text-sm tabular-nums">
                                {r.cambios ? `${formatearKg(r.primero)} → ` : ''}
                                {formatearKg(r.ultimo)}
                              </p>
                              {r.variacion !== null && (
                                <p
                                  className={`text-[11px] flex items-center justify-end gap-1 ${
                                    r.variacion > 0 ? 'text-cyan-brand' : 'text-white/45'
                                  }`}
                                >
                                  {r.variacion > 0 && <TrendingUp size={11} />}
                                  {formatearPct(r.variacion)}
                                </p>
                              )}
                            </div>
                            {estaAbierto ? (
                              <ChevronUp size={16} className="text-white/40" />
                            ) : (
                              <ChevronDown size={16} className="text-white/40" />
                            )}
                          </div>
                        </button>
                        {estaAbierto && (
                          <div className="px-4 pb-4">
                            {r.sesion && <p className="text-white/40 text-[11px] mb-1">{r.sesion}</p>}
                            <GraficoEjercicio puntos={puntosDe(r)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
