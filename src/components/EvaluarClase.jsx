import { useState } from 'react';
import { Star, X, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { horaAFecha } from '../lib/horarioUtils';

const TEXTOS = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', '¡Excelente!'];

export function Estrellas({ valor, onElegir, tamano = 22 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onElegir}
          onClick={() => onElegir && onElegir(n)}
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
          className={onElegir ? 'transition-transform active:scale-90' : 'cursor-default'}
        >
          <Star
            size={tamano}
            className={n <= valor ? 'text-yellow-300' : 'text-white/20'}
            fill={n <= valor ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}

// Evaluación de una clase ya hecha: estrellas (1 a 5) + comentario opcional.
export default function EvaluarClase({ reserva, compacto = false }) {
  const { evaluacionDe, evaluarClase } = useAuth();
  const existente = evaluacionDe(reserva.id);
  const [abierto, setAbierto] = useState(false);
  const [puntaje, setPuntaje] = useState(existente?.puntaje || 0);
  const [comentario, setComentario] = useState(existente?.comentario || '');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function elegir(n) {
    setPuntaje(n);
    setAbierto(true);
    setMensaje(null);
  }

  async function enviar() {
    setGuardando(true);
    const r = await evaluarClase(reserva, puntaje, comentario);
    setGuardando(false);
    setMensaje(r);
    if (r.ok) setAbierto(false);
  }

  if (existente && !abierto) {
    return (
      <div className={compacto ? '' : 'mt-3 pt-3 border-t border-white/10'}>
        <div className="flex items-center justify-between gap-2">
          <Estrellas valor={existente.puntaje} tamano={16} />
          <button
            onClick={() => {
              setPuntaje(existente.puntaje);
              setComentario(existente.comentario || '');
              setAbierto(true);
            }}
            className="text-cyan-brand text-xs"
          >
            Editar
          </button>
        </div>
        {existente.comentario && (
          <p className="text-white/55 text-xs mt-1.5 flex items-start gap-1.5">
            <MessageSquare size={12} className="shrink-0 mt-0.5" /> {existente.comentario}
          </p>
        )}
        {mensaje?.ok && <p className="text-cyan-brand text-xs mt-1">{mensaje.mensaje}</p>}
      </div>
    );
  }

  return (
    <div className={compacto ? '' : 'mt-3 pt-3 border-t border-white/10'}>
      {!compacto && <p className="text-white/45 text-xs mb-1.5">¿Cómo estuvo la clase?</p>}
      <div className="flex items-center gap-3">
        <Estrellas valor={puntaje} onElegir={elegir} />
        {puntaje > 0 && <span className="text-white/60 text-xs">{TEXTOS[puntaje]}</span>}
      </div>
      {abierto && (
        <div className="flex flex-col gap-2 mt-2.5">
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Comentario (opcional): qué te gustó o qué mejorarías"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand resize-none placeholder-white/30"
          />
          <div className="flex gap-2">
            <button
              onClick={enviar}
              disabled={guardando || !puntaje}
              className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
            >
              {guardando ? 'Enviando...' : 'Enviar evaluación'}
            </button>
            <button
              onClick={() => {
                setAbierto(false);
                setPuntaje(existente?.puntaje || 0);
              }}
              className="px-4 bg-white/10 text-white rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {mensaje && !mensaje.ok && <p className="text-red-400 text-xs mt-1">{mensaje.mensaje}</p>}
    </div>
  );
}

// Se puede evaluar una clase que ya empezó, a la que no quedó marcado como ausente.
export function sePuedeEvaluar(reserva, hora) {
  if (reserva.asistio === false) return false;
  return horaAFecha(reserva.fecha, hora).getTime() + 30 * 60 * 1000 < Date.now();
}

function leerOcultas() {
  try {
    return JSON.parse(localStorage.getItem('cedys_eval_ocultas') || '[]');
  } catch (e) {
    return [];
  }
}

// Tarjeta que invita a evaluar la última clase (de los últimos 3 días) que aún no se evalúa.
export function EvaluacionPendiente() {
  const { usuarioActual, reservas, horarios, evaluacionDe, coachDeClase } = useAuth();
  const [ocultas, setOcultas] = useState(leerOcultas);
  if (!usuarioActual || usuarioActual.rol !== 'usuario') return null;

  const limite = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const candidata = reservas
    .filter((r) => r.usuario_id === usuarioActual.id && !ocultas.includes(String(r.id)))
    .map((r) => ({ r, h: horarios.find((x) => x.id === r.horario_id) }))
    .filter(({ r, h }) => h && sePuedeEvaluar(r, h.hora) && horaAFecha(r.fecha, h.hora).getTime() > limite)
    .filter(({ r }) => !evaluacionDe(r.id))
    .sort((a, b) => b.r.fecha.localeCompare(a.r.fecha) || b.h.hora.localeCompare(a.h.hora))[0];

  if (!candidata) return null;
  const { r, h } = candidata;
  const dia = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  function ocultar() {
    const nuevas = [...ocultas, String(r.id)].slice(-50);
    setOcultas(nuevas);
    try {
      localStorage.setItem('cedys_eval_ocultas', JSON.stringify(nuevas));
    } catch (e) {
      // sin almacenamiento disponible
    }
  }

  return (
    <div className="relative bg-yellow-300/[0.07] border border-yellow-300/30 rounded-2xl p-4 mb-5">
      <button onClick={ocultar} aria-label="Ahora no" className="absolute top-2.5 right-2.5 text-white/35 p-1">
        <X size={16} />
      </button>
      <p className="text-yellow-200 text-[11px] font-semibold uppercase tracking-wide mb-0.5">Evalúa tu clase</p>
      <p className="text-white text-sm mb-2.5 pr-6">
        ¿Cómo estuvo tu clase del {dia} a las {h.hora.slice(0, 5)} con {coachDeClase(h, r.fecha).nombre || 'tu coach'}?
      </p>
      <EvaluarClase reserva={r} compacto />
    </div>
  );
}

export function promedio(lista) {
  if (!lista.length) return null;
  return lista.reduce((a, e) => a + Number(e.puntaje || 0), 0) / lista.length;
}

// Insignia corta con el promedio de estrellas de una clase (ej: ★ 4,5 · 3)
export function InsigniaEvaluacion({ lista }) {
  const p = promedio(lista);
  if (p === null) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-yellow-200/90">
      <Star size={11} className="text-yellow-300" fill="currentColor" />
      {p.toFixed(1).replace('.', ',')}
      <span className="text-white/35">({lista.length})</span>
    </span>
  );
}

// Detalle de las evaluaciones de una clase (para coach y admin).
// El coach las ve sin nombre; el admin ve quién evaluó.
export function EvaluacionesDeClase({ horarioId, fecha, conNombres = false }) {
  const { evaluacionesDeClase, usuarios } = useAuth();
  const lista = evaluacionesDeClase(horarioId, fecha);
  if (lista.length === 0) return null;
  return (
    <div className="px-4 py-3 border-t border-white/10">
      <p className="text-white/40 text-[11px] uppercase tracking-wide mb-2 flex items-center gap-2">
        Evaluaciones de alumnos <InsigniaEvaluacion lista={lista} />
      </p>
      <div className="flex flex-col gap-2">
        {lista.map((e) => (
          <div key={e.id} className="bg-black/20 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <Estrellas valor={e.puntaje} tamano={13} />
              {conNombres && (
                <span className="text-white/45 text-[11px] truncate">
                  {usuarios.find((u) => u.id === e.usuario_id)?.nombre || ''}
                </span>
              )}
            </div>
            {e.comentario && <p className="text-white/70 text-xs mt-1">{e.comentario}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
