import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ExternalLink, Pencil, Check, X, TrendingUp, TrendingDown, Minus, Sparkles, ChevronRight, PartyPopper, Flame, Dumbbell, Wind } from 'lucide-react';
import { mensajeProgreso, formatearKg, formatearPct, variacionPct, fechaHoraRegistro, ultimoCambioDe, pesoVigente } from '../../lib/cargas';

const SECCIONES = [
  { key: 'calentamiento', label: 'Calentamiento', icono: Flame },
  { key: 'trabajo', label: 'Trabajo', icono: Dumbbell },
  { key: 'cierre', label: 'Cierre', icono: Wind },
];

// Lo que marca el alumno se guarda en este celular y se reinicia cada día.
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function leerHechos(diaId) {
  try {
    const g = JSON.parse(localStorage.getItem('cedys_rutina_hechos_' + diaId) || 'null');
    return g && g.fecha === hoyISO() ? g.ids : [];
  } catch {
    return [];
  }
}
function guardarLocal(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export default function RutinaEjercicios() {
  const { rutinaId, semanaId, diaId } = useParams();
  const navigate = useNavigate();
  const { obtenerEjercicios, obtenerDias, obtenerSemanas } = useAuth();
  const [ejercicios, setEjercicios] = useState(null);
  const [editando, setEditando] = useState(null); // ejercicio abierto en la ventana
  const [hechos, setHechos] = useState(() => leerHechos(diaId));
  const [dias, setDias] = useState([]);
  const [semana, setSemana] = useState(null);

  useEffect(() => {
    setEjercicios(null);
    setHechos(leerHechos(diaId));
    obtenerEjercicios(diaId).then(setEjercicios);
    window.scrollTo(0, 0);
  }, [diaId]);

  useEffect(() => {
    obtenerDias(semanaId).then(setDias);
    obtenerSemanas(rutinaId).then((lista) => setSemana(lista.find((s) => s.id === semanaId) || null));
  }, [rutinaId, semanaId]);

  const dia = dias.find((d) => d.id === diaId);
  const indiceDia = dias.findIndex((d) => d.id === diaId);
  const siguienteDia = indiceDia >= 0 ? dias[indiceDia + 1] : null;

  // Recordar el último día abierto (para "Continuar donde quedaste")
  useEffect(() => {
    if (dia && semana) {
      guardarLocal('cedys_rutina_ultima', {
        rutinaId,
        semanaId,
        diaId,
        semanaNumero: semana.numero,
        diaNombre: dia.nombre,
      });
    }
  }, [dia?.id, semana?.id]);

  function actualizarEjercicio(id, cambios) {
    setEjercicios((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)));
  }

  function alternarHecho(id) {
    setHechos((prev) => {
      const nuevos = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      guardarLocal('cedys_rutina_hechos_' + diaId, { fecha: hoyISO(), ids: nuevos });
      const todos = ejercicios && ejercicios.length > 0 && ejercicios.every((e) => nuevos.includes(e.id));
      guardarLocal('cedys_rutina_completo_' + diaId, todos ? hoyISO() : null);
      return nuevos;
    });
  }

  const total = ejercicios?.length || 0;
  const listos = ejercicios ? ejercicios.filter((e) => hechos.includes(e.id)).length : 0;
  const completo = total > 0 && listos === total;
  let numero = 0;

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate(`/rutinas/${rutinaId}?semana=${semanaId}`)}
        className="flex items-center gap-1 text-white/40 text-sm mb-5 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={15} /> Volver a la semana
      </button>

      {/* Encabezado del día con avance */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-4 mb-5">
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl" />
        <div className="relative">
          <p className="text-cyan-brand text-[11px] font-semibold tracking-[0.2em] uppercase">
            {semana ? `Semana ${semana.numero}` : 'Entrenamiento'}
          </p>
          <p className="font-display text-white text-2xl leading-tight mt-1">{dia?.nombre || 'Ejercicios'}</p>
          {total > 0 && (
            <>
              <div className="flex items-center justify-between mt-3 mb-1.5">
                <p className="text-white/50 text-xs">
                  {completo ? '¡Todo listo!' : `${listos} de ${total} ejercicios`}
                </p>
                <p className="text-cyan-brand text-xs font-semibold">{Math.round((listos / total) * 100)}%</p>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-cyan-brand rounded-full transition-all duration-500"
                  style={{ width: `${(listos / total) * 100}%` }}
                />
              </div>
              {listos === 0 && (
                <p className="text-white/35 text-[11px] mt-2">Toca el círculo de cada ejercicio cuando lo termines.</p>
              )}
            </>
          )}
        </div>
      </div>

      {ejercicios === null && <p className="text-white/30 text-sm">Cargando...</p>}

      {ejercicios &&
        SECCIONES.map(({ key, label, icono: Icono }) => {
          const items = ejercicios.filter((e) => e.seccion === key);
          if (items.length === 0) return null;
          const listosSeccion = items.filter((e) => hechos.includes(e.id)).length;
          return (
            <div key={key} className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <p className="flex items-center gap-1.5 text-cyan-brand text-xs font-semibold tracking-[0.15em] uppercase">
                  <Icono size={14} /> {label}
                </p>
                <p className="text-white/30 text-[11px]">
                  {listosSeccion}/{items.length}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((ej) => {
                  numero += 1;
                  return (
                    <TarjetaEjercicio
                      key={ej.id}
                      ej={ej}
                      numero={numero}
                      hecho={hechos.includes(ej.id)}
                      onHecho={() => alternarHecho(ej.id)}
                      onEditar={() => setEditando(ej)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

      {completo && (
        <div className="relative overflow-hidden text-center rounded-3xl border border-cyan-brand/30 bg-cyan-brand/10 px-5 py-6 mb-4">
          <PartyPopper size={34} className="text-cyan-brand mx-auto mb-2" />
          <p className="text-white font-display text-2xl">¡Entrenamiento completado!</p>
          <p className="text-white/55 text-sm mt-1">Buen trabajo. Hidrátate y descansa 💪</p>
        </div>
      )}

      {siguienteDia && (
        <button
          onClick={() => navigate(`/rutinas/${rutinaId}/semanas/${semanaId}/dias/${siguienteDia.id}`)}
          className="w-full flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl p-4 transition-transform active:scale-[0.98]"
        >
          <div className="text-left">
            <p className="text-white/40 text-[11px] uppercase tracking-wide">Siguiente día</p>
            <p className="text-white font-display text-lg leading-tight">{siguienteDia.nombre}</p>
          </div>
          <ChevronRight size={18} className="text-cyan-brand/70" />
        </button>
      )}

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

function TarjetaEjercicio({ ej, numero, hecho, onHecho, onEditar }) {
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

  const pesoTexto = peso.texto
    ? /^[\d.,]+$/.test(String(peso.texto).trim())
      ? `${peso.texto} kg`
      : peso.texto
    : null;
  const detalles = [
    ej.series && `${ej.series} series`,
    ej.repeticiones && `${ej.repeticiones} reps`,
    ej.rir && ej.rir !== '-' && `RIR ${ej.rir}`,
    ej.descanso && `desc. ${ej.descanso}`,
  ].filter(Boolean);

  return (
    <div
      className={`rounded-2xl border px-3 py-3 transition-colors ${
        hecho ? 'bg-cyan-brand/[0.06] border-cyan-brand/25' : 'bg-white/[0.04] border-white/10'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={onHecho}
          aria-label={hecho ? 'Marcar como pendiente' : 'Marcar como hecho'}
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all active:scale-90 ${
            hecho ? 'bg-cyan-brand border-cyan-brand text-ink' : 'border-white/25 text-white/50'
          }`}
        >
          {hecho ? <Check size={15} strokeWidth={3} /> : <span className="text-xs font-semibold">{numero}</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p
              className={`flex-1 text-[15px] font-medium leading-snug pt-0.5 ${
                hecho ? 'text-white/50 line-through decoration-white/30' : 'text-white'
              }`}
            >
              {ej.ejercicio}
            </p>
            {ej.referencia_url && (
              <a
                href={ej.referencia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-brand/80 shrink-0 p-1 transition-transform active:scale-90"
                aria-label="Ver video"
              >
                <ExternalLink size={15} />
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            {detalles.length > 0 && <span className="text-white/50 text-xs">{detalles.join(' · ')}</span>}
            <button
              onClick={onEditar}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-transform active:scale-95 ${
                pesoTexto
                  ? 'bg-cyan-brand/15 text-cyan-brand'
                  : 'border border-dashed border-cyan-brand/40 text-cyan-brand/80'
              }`}
            >
              {pesoTexto || 'Anotar peso'} <Pencil size={10} />
            </button>
          </div>

          {ej.notas && <p className="text-white/45 text-xs mt-1.5 italic">{ej.notas}</p>}

          {/* Mensaje fijo del último cambio de peso */}
          {mensaje && <MensajeProgreso mensaje={mensaje} />}
        </div>
      </div>
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
    <p className="flex items-center gap-1.5 mt-1.5 text-yellow-200/90 text-xs">
      <Icono size={13} className="shrink-0" /> {mensaje.titulo}
    </p>
  );
}

