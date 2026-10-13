import { useState } from 'react';
import {
  Target,
  CalendarCheck,
  TrendingDown,
  TrendingUp,
  Flag,
  Scale,
  Minus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  resumenSeguimiento,
  etiquetaObjetivo,
  direccionDeseada,
  formatear,
  etiquetaImc,
} from '../lib/seguimientoPersonal';

function fechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function Anillo({ pct, tam = 64, grosor = 7, children }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} className="-rotate-90">
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={grosor}
        />
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          stroke="#03CDE6"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, pct)) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-semibold">
        {children}
      </div>
    </div>
  );
}

// Cambio con flecha; color cian si va en la dirección deseada para el objetivo.
function Cambio({ valor, unidad, deseada }) {
  if (valor === null || valor === undefined)
    return <span className="text-white/30">—</span>;
  if (Math.abs(valor) < 0.05)
    return (
      <span className="text-white/50 inline-flex items-center gap-0.5">
        <Minus size={11} /> 0
      </span>
    );
  const bueno = deseada !== 0 && Math.sign(valor) === deseada;
  const malo = deseada !== 0 && Math.sign(valor) === -deseada;
  const Icono = valor < 0 ? TrendingDown : TrendingUp;
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${
        bueno ? 'text-cyan-brand' : malo ? 'text-orange-300' : 'text-white/70'
      }`}
    >
      <Icono size={12} />
      {valor > 0 ? '+' : ''}
      {formatear(valor, unidad)}
    </span>
  );
}

function Grafico({ medida, meta }) {
  const puntos = medida.serie;
  const [activo, setActivo] = useState(puntos.length - 1);
  const W = 320;
  const H = 140;
  const M = { izq: 10, der: 10, arr: 16, aba: 20 };
  const valores = puntos
    .map((p) => p.valor)
    .concat(meta !== null && meta !== undefined ? [meta] : []);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const x0 = Date.parse(puntos[0].fecha);
  const x1 = Date.parse(puntos[puntos.length - 1].fecha);
  const x = (f) =>
    puntos.length === 1
      ? W / 2
      : M.izq + ((Date.parse(f) - x0) / (x1 - x0 || 1)) * (W - M.izq - M.der);
  const y = (v) => M.arr + (1 - (v - min) / rango) * (H - M.arr - M.aba);
  const linea = puntos
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.fecha)},${y(p.valor)}`)
    .join(' ');
  const p = puntos[Math.min(activo, puntos.length - 1)];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Evolución de ${medida.label}`}
      >
        {meta !== null && meta !== undefined && (
          <>
            <line
              x1={M.izq}
              x2={W - M.der}
              y1={y(meta)}
              y2={y(meta)}
              stroke="rgba(255,255,255,0.35)"
              strokeDasharray="4 4"
            />
            <text
              x={W - M.der}
              y={y(meta) - 4}
              fill="rgba(255,255,255,0.5)"
              fontSize="10"
              textAnchor="end"
            >
              Meta {formatear(meta, medida.unidad)}
            </text>
          </>
        )}
        <line
          x1={M.izq}
          x2={W - M.der}
          y1={H - M.aba}
          y2={H - M.aba}
          stroke="rgba(255,255,255,0.12)"
        />
        <path
          d={linea}
          fill="none"
          stroke="#03CDE6"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {puntos.map((pt, i) => (
          <g
            key={i}
            onClick={() => setActivo(i)}
            onMouseEnter={() => setActivo(i)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={x(pt.fecha)}
              cy={y(pt.valor)}
              r="12"
              fill="transparent"
            />
            <circle
              cx={x(pt.fecha)}
              cy={y(pt.valor)}
              r={i === activo ? 5 : 3.5}
              fill={i === activo ? '#03CDE6' : '#0A0A0A'}
              stroke="#03CDE6"
              strokeWidth="2"
            />
          </g>
        ))}
        <text x={M.izq} y={H - 5} fill="rgba(255,255,255,0.4)" fontSize="10">
          {fechaCorta(puntos[0].fecha)}
        </text>
        {puntos.length > 1 && (
          <text
            x={W - M.der}
            y={H - 5}
            fill="rgba(255,255,255,0.4)"
            fontSize="10"
            textAnchor="end"
          >
            {fechaCorta(puntos[puntos.length - 1].fecha)}
          </text>
        )}
      </svg>
      {p && (
        <p className="text-white/70 text-xs text-center -mt-1">
          {fechaCorta(p.fecha)}:{' '}
          <span className="text-white font-semibold">
            {formatear(p.valor, medida.unidad)}
          </span>
        </p>
      )}
    </div>
  );
}

// Dashboard de avance del alumno (lo ven el alumno, su coach y el admin).
export default function SeguimientoDashboard({
  usuarioId,
  vistaStaff = false,
}) {
  const { planesSeguimiento, mediciones, reservas } = useAuth();
  const plan =
    (planesSeguimiento || []).find(
      (p) => String(p.usuario_id) === String(usuarioId)
    ) || null;
  const r = resumenSeguimiento({ plan, mediciones, reservas, usuarioId });
  const conDatos = r.medidas.filter((m) => m.serie.length > 0);
  const [grafico, setGrafico] = useState(null);
  const medidaGrafico =
    conDatos.find((m) => m.clave === grafico) || conDatos[0] || null;
  const objetivo = plan?.objetivo || 'salud';
  const peso = r.medidas.find((m) => m.clave === 'peso');

  if (!plan && !r.hayDatos) return null;

  return (
    <div className="flex flex-col gap-3">
      {plan && (
        <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
          <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.15em] uppercase flex items-center gap-1.5">
            <Target size={13} /> {etiquetaObjetivo(plan.objetivo)}
          </p>
          {plan.objetivo_detalle && (
            <p className="text-white/80 text-sm mt-1 whitespace-pre-line">
              {plan.objetivo_detalle}
            </p>
          )}
          <p className="text-white font-display text-2xl mt-3">
            {r.semana === 0
              ? 'Empieza pronto'
              : `Semana ${r.semana} de ${plan.semanas}`}
          </p>
          <p className="text-white/40 text-[11px]">
            {fechaCorta(plan.fecha_inicio)} → {fechaCorta(r.fin)}
          </p>
          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-cyan-brand rounded-full"
              style={{ width: `${(r.semana / plan.semanas) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {r.sesiones && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
            <Anillo
              pct={(r.sesiones.hechas / Math.max(1, r.sesiones.meta)) * 100}
              tam={52}
              grosor={6}
            >
              <CalendarCheck size={16} className="text-cyan-brand" />
            </Anillo>
            <div className="min-w-0">
              <p className="text-white/40 text-[10px] uppercase tracking-wide">
                Sesiones
              </p>
              <p className="text-white font-display text-xl leading-tight">
                {r.sesiones.hechas}
                <span className="text-white/40 text-sm">
                  {' '}
                  / {r.sesiones.meta}
                </span>
              </p>
            </div>
          </div>
        )}
        {peso.actual !== null && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
            <p className="text-white/40 text-[10px] uppercase tracking-wide flex items-center gap-1">
              <Scale size={11} /> Peso actual
            </p>
            <p className="text-white font-display text-xl leading-tight">
              {formatear(peso.actual, 'kg')}
            </p>
            <p className="text-xs">
              <Cambio
                valor={peso.cambio}
                unidad="kg"
                deseada={direccionDeseada(objetivo, 'peso')}
              />
              <span className="text-white/35"> desde el inicio</span>
            </p>
          </div>
        )}
        {r.ritmoSemanal !== null && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
            <p className="text-white/40 text-[10px] uppercase tracking-wide">
              Ritmo
            </p>
            <p className="text-sm mt-0.5">
              <Cambio
                valor={r.ritmoSemanal}
                unidad="kg"
                deseada={direccionDeseada(objetivo, 'peso')}
              />
              <span className="text-white/50"> por semana</span>
            </p>
          </div>
        )}
        {r.imc !== null && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
            <p className="text-white/40 text-[10px] uppercase tracking-wide">
              IMC
            </p>
            <p className="text-white font-display text-xl leading-tight">
              {r.imc.toFixed(1).replace('.', ',')}
            </p>
            {vistaStaff && (
              <p className="text-white/40 text-[11px]">{etiquetaImc(r.imc)}</p>
            )}
          </div>
        )}
      </div>

      {r.meta && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <Anillo pct={r.meta.pct} tam={76} grosor={8}>
            {Math.round(r.meta.pct)}%
          </Anillo>
          <div className="min-w-0">
            <p className="text-white/40 text-[10px] uppercase tracking-wide flex items-center gap-1">
              <Flag size={11} /> Avance a la meta
            </p>
            <p className="text-white text-sm">
              Meta:{' '}
              <span className="font-semibold">
                {formatear(r.meta.objetivo, r.meta.unidad)}
              </span>{' '}
              ({r.meta.label.toLowerCase()})
            </p>
            {r.meta.logrado ? (
              <p className="text-cyan-brand text-sm font-semibold">
                ¡Meta lograda! 🎉
              </p>
            ) : (
              <>
                <p className="text-white/60 text-xs">
                  Faltan {formatear(Math.abs(r.meta.falta), r.meta.unidad)}
                </p>
                <p className="text-white/45 text-[11px]">
                  {r.meta.fechaEstimada
                    ? `A este ritmo la alcanzarías cerca del ${fechaCorta(
                        r.meta.fechaEstimada
                      )}`
                    : 'Con más mediciones se calcula la fecha estimada'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {medidaGrafico && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1">
            {conDatos.map((m) => (
              <button
                key={m.clave}
                onClick={() => setGrafico(m.clave)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${
                  medidaGrafico.clave === m.clave
                    ? 'bg-cyan-brand text-ink'
                    : 'bg-white/[0.06] text-white/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Grafico
            key={medidaGrafico.clave}
            medida={medidaGrafico}
            meta={
              medidaGrafico.clave === 'peso'
                ? plan?.peso_meta ?? null
                : medidaGrafico.clave === 'grasa'
                ? plan?.grasa_meta ?? null
                : null
            }
          />
        </div>
      )}

      {conDatos.length > 0 && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 text-white/40 text-[10px] uppercase tracking-wide border-b border-white/10">
            <span>Medida</span>
            <span className="text-right">Inicio</span>
            <span className="text-right">Actual</span>
            <span className="text-right">Cambio</span>
          </div>
          {conDatos.map((m) => (
            <div
              key={m.clave}
              className="grid grid-cols-4 gap-2 px-4 py-2.5 text-sm border-b border-white/5 last:border-0"
            >
              <span className="text-white/80">{m.label}</span>
              <span className="text-right text-white/50 tabular-nums">
                {formatear(m.inicial, m.unidad)}
              </span>
              <span className="text-right text-white tabular-nums">
                {formatear(m.actual, m.unidad)}
              </span>
              <span className="text-right text-xs tabular-nums self-center">
                <Cambio
                  valor={m.cambio}
                  unidad={m.unidad}
                  deseada={direccionDeseada(objetivo, m.clave)}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
