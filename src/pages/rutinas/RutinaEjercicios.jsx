import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ExternalLink, Pencil, Check, X, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { mensajeProgreso, formatearKg, formatearPct, variacionPct, fechaHoraRegistro, ultimoCambioDe, pesoVigente } from '../../lib/cargas';

const SECCIONES = [
  { key: 'calentamiento', label: 'Calentamiento' },
  { key: 'trabajo', label: 'Trabajo' },
  { key: 'cierre', label: 'Cierre' },
];

export default function RutinaEjercicios() {
  const { rutinaId, semanaId, diaId } = useParams();
  const navigate = useNavigate();
  const { obtenerEjercicios } = useAuth();
  const [ejercicios, setEjercicios] = useState(null);
  const [editando, setEditando] = useState(null); // ejercicio abierto en la ventana

  useEffect(() => {
    obtenerEjercicios(diaId).then(setEjercicios);
  }, [diaId]);

  function actualizarEjercicio(id, cambios) {
    setEjercicios((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)));
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate(`/rutinas/${rutinaId}/semanas/${semanaId}`)}
        className="flex items-center gap-1 text-white/40 text-sm mb-6 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={15} /> Volver a días
      </button>

      {ejercicios === null && <p className="text-white/30 text-sm">Cargando...</p>}

      {ejercicios &&
        SECCIONES.map(({ key, label }) => {
          const items = ejercicios.filter((e) => e.seccion === key);
          if (items.length === 0) return null;
          return (
            <div key={key} className="mb-8">
              <p className="text-cyan-brand text-xs font-semibold tracking-[0.15em] uppercase mb-3">{label}</p>
              <div className="flex flex-col gap-2">
                {items.map((ej) => (
                  <TarjetaEjercicio key={ej.id} ej={ej} onEditar={() => setEditando(ej)} />
                ))}
              </div>
            </div>
          );
        })}

      {editando && (
        <VentanaPeso
          ej={editando}
          rutinaId={rutinaId}
          onCerrar={() => setEditando(null)}
          onGuardado={(pesoTexto) => {
            actualizarEjercicio(editando.id, { peso_referencia: pesoTexto });
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function TarjetaEjercicio({ ej, onEditar }) {
  const { registrosPeso } = useAuth();

  // Último cambio de peso de este ejercicio (para el mensaje fijo y el peso que se muestra)
  const ultimoCambio = ultimoCambioDe(registrosPeso, ej.id);
  const peso = pesoVigente(ej, registrosPeso);
  const mensaje = ultimoCambio
    ? mensajeProgreso(
        Number(ultimoCambio.peso),
        ultimoCambio.peso_anterior !== null && ultimoCambio.peso_anterior !== undefined
          ? Number(ultimoCambio.peso_anterior)
          : null
      )
    : null;

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white font-semibold text-base leading-snug">{ej.ejercicio}</p>
        {ej.referencia_url && (
          <a
            href={ej.referencia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-brand shrink-0 transition-transform active:scale-90"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>

      <div className="flex items-end justify-between gap-3 mt-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {ej.series && <Dato label="Series" valor={ej.series} />}
          {ej.repeticiones && <Dato label="Reps" valor={ej.repeticiones} />}
          {ej.rir && ej.rir !== '-' && <Dato label="RIR" valor={ej.rir} />}
          {peso.texto && <Dato label="Peso" valor={peso.texto} />}
          {ej.descanso && <Dato label="Descanso" valor={ej.descanso} />}
        </div>
        <button
          onClick={onEditar}
          className="flex items-center gap-1 text-cyan-brand text-[11px] font-semibold border border-cyan-brand/30 rounded-md px-2 py-1 shrink-0 transition-transform active:scale-95"
        >
          <Pencil size={11} /> Editar peso
        </button>
      </div>

      {ej.notas && <p className="text-white/70 text-sm mt-2.5 italic">{ej.notas}</p>}

      {/* Mensaje fijo del último cambio de peso */}
      {mensaje && <MensajeProgreso mensaje={mensaje} />}
    </div>
  );
}

function VentanaPeso({ ej, rutinaId, onCerrar, onGuardado }) {
  const { registrosPeso, registrarPeso } = useAuth();
  const pesoActual = pesoVigente(ej, registrosPeso).valor;
  const [valor, setValor] = useState(pesoActual !== null ? String(pesoActual) : '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const historial = (registrosPeso || [])
    .filter((r) => r.ejercicio_id === ej.id)
    .sort((a, b) => (b.creado_en || '').localeCompare(a.creado_en || ''));

  function ajustar(delta) {
    const actual = Number(String(valor).replace(',', '.')) || 0;
    setValor(String(Math.max(0, Math.round((actual + delta) * 100) / 100)));
  }

  async function guardar() {
    if (valor === '') return setError('Ingresa el peso.');
    setGuardando(true);
    const resultado = await registrarPeso({
      ejercicioId: ej.id,
      rutinaId,
      ejercicio: ej.ejercicio,
      peso: valor,
      pesoAnterior: pesoActual,
    });
    setGuardando(false);
    if (!resultado.ok) return setError(resultado.mensaje);
    if (resultado.aviso) alert(resultado.aviso);
    onGuardado(resultado.pesoTexto);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCerrar} />
      <div className="relative w-full sm:max-w-sm bg-ink border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-white/40 text-[11px] uppercase tracking-wide">Editar peso</p>
            <p className="text-white font-display text-lg leading-tight">{ej.ejercicio}</p>
            <p className="text-white/40 text-xs mt-0.5">
              Peso actual: {pesoActual !== null ? formatearKg(pesoActual) : ej.peso_referencia || 'sin peso'}
            </p>
          </div>
          <button onClick={onCerrar} className="text-white/40 p-1 hover:text-white" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => ajustar(-2.5)} className="w-14 h-12 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 text-sm shrink-0">
            −2,5
          </button>
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
              className="w-full bg-black/30 border border-white/15 rounded-xl pl-3 pr-10 py-3 text-white text-xl text-center outline-none focus:border-cyan-brand"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm pointer-events-none">kg</span>
          </div>
          <button onClick={() => ajustar(2.5)} className="w-14 h-12 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 text-sm shrink-0">
            +2,5
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 flex items-center justify-center gap-1 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50"
          >
            <Check size={16} /> {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={onCerrar} className="flex-1 bg-white/10 text-white rounded-xl py-2.5 text-sm">
            Cancelar
          </button>
        </div>

        {historial.length > 0 && (
          <div className="mt-4">
            <p className="text-white/35 text-[11px] uppercase tracking-wide mb-1.5">Cambios anteriores</p>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {historial.slice(0, 10).map((r) => {
                const tieneAnterior = r.peso_anterior !== null && r.peso_anterior !== undefined;
                const pct = tieneAnterior ? variacionPct(r.peso, r.peso_anterior) : null;
                return (
                  <div key={r.id} className="flex items-center justify-between text-xs bg-black/20 rounded-lg px-3 py-1.5">
                    <span className="text-white/45">{fechaHoraRegistro(r.creado_en)}</span>
                    <span className="text-white tabular-nums">
                      {tieneAnterior ? `${formatearKg(r.peso_anterior)} → ` : ''}
                      {formatearKg(r.peso)}
                      {pct !== null && pct !== 0 && (
                        <span className={`ml-1.5 ${pct > 0 ? 'text-cyan-brand' : 'text-white/45'}`}>{formatearPct(pct)}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MensajeProgreso({ mensaje }) {
  const Icono = { sube: TrendingUp, primero: Sparkles, igual: Minus, baja: TrendingDown }[mensaje.tipo];
  return (
    <div className="mt-3 bg-yellow-400/10 border border-yellow-400/35 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
      <Icono size={16} className="shrink-0 mt-0.5 text-yellow-300" />
      <div className="min-w-0">
        <p className="text-yellow-200 text-sm font-semibold">{mensaje.titulo}</p>
        <p className="text-yellow-100/70 text-xs mt-0.5">{mensaje.texto}</p>
      </div>
    </div>
  );
}

function Dato({ label, valor }) {
  return (
    <span className="text-white/85 text-sm font-medium">
      <span className="text-white/55 font-normal">{label}:</span> {valor}
    </span>
  );
}
