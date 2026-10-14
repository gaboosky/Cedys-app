import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Estrellas, promedio } from '../../components/EvaluarClase';
import { Star, MessageSquareQuote, TrendingUp, TrendingDown } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');
function isoLocal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fechaCorta(fechaISO) {
  return new Date(fechaISO + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}
const coma = (n) => n.toFixed(1).replace('.', ',');

// Todas las evaluaciones de las clases del coach, en un solo lugar (anónimas).
export default function MisEvaluaciones() {
  const { usuarioActual, evaluaciones, horarios, coachDeClase } = useAuth();
  const [periodo, setPeriodo] = useState('3m'); // mes | 3m | todo
  const [soloComentarios, setSoloComentarios] = useState(false);

  const horarioDe = {};
  for (const h of horarios || []) horarioDe[h.id] = h;

  // Evaluaciones de mis clases: por el coach guardado en la evaluación, o el coach de esa clase ese día
  const mias = (evaluaciones || [])
    .filter((e) => {
      if (e.coach_id) return String(e.coach_id) === String(usuarioActual.id);
      const h = horarioDe[e.horario_id];
      return h ? String(coachDeClase(h, e.fecha).id) === String(usuarioActual.id) : false;
    })
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || String(b.id).localeCompare(String(a.id)));

  const hoy = new Date();
  const inicioMes = isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const inicioMesAnterior = isoLocal(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
  const hace3m = isoLocal(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1));
  const desde = periodo === 'mes' ? inicioMes : periodo === '3m' ? hace3m : '0000';
  const delPeriodo = mias.filter((e) => e.fecha >= desde);

  const prom = promedio(delPeriodo);
  const promMes = promedio(mias.filter((e) => e.fecha >= inicioMes));
  const promMesAnterior = promedio(mias.filter((e) => e.fecha >= inicioMesAnterior && e.fecha < inicioMes));
  const cambio = promMes !== null && promMesAnterior !== null ? promMes - promMesAnterior : null;

  const conteo = [5, 4, 3, 2, 1].map((n) => ({ n, c: delPeriodo.filter((e) => Number(e.puntaje) === n).length }));
  const maxConteo = Math.max(1, ...conteo.map((x) => x.c));
  const lista = soloComentarios ? delPeriodo.filter((e) => (e.comentario || '').trim()) : delPeriodo;
  const comentarios = delPeriodo.filter((e) => (e.comentario || '').trim()).length;

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <p className="font-display text-3xl text-white leading-tight">Mis evaluaciones</p>
      <p className="text-white/40 text-xs mt-1 mb-4">Lo que opinan los alumnos de tus clases. Son anónimas.</p>

      <div className="flex gap-2 mb-4">
        {[
          { v: 'mes', t: 'Este mes' },
          { v: '3m', t: 'Últimos 3 meses' },
          { v: 'todo', t: 'Todo' },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => setPeriodo(o.v)}
            className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
              periodo === o.v ? 'bg-cyan-brand border-cyan-brand text-ink font-semibold' : 'bg-white/[0.04] border-white/10 text-white/60'
            }`}
          >
            {o.t}
          </button>
        ))}
      </div>

      {/* Resumen */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/25 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-5">
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-5">
          <div className="text-center shrink-0">
            <p className="font-display text-5xl text-white leading-none">{prom === null ? '—' : coma(prom)}</p>
            <div className="flex justify-center mt-2">
              <Estrellas valor={prom === null ? 0 : Math.round(prom)} tamano={14} />
            </div>
            <p className="text-white/45 text-[11px] mt-1">
              {delPeriodo.length} evaluaci{delPeriodo.length === 1 ? 'ón' : 'ones'}
            </p>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            {conteo.map(({ n, c }) => (
              <div key={n} className="flex items-center gap-2">
                <span className="text-white/50 text-[11px] w-3 text-right">{n}</span>
                <Star size={10} className="text-yellow-300 shrink-0" fill="currentColor" />
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-yellow-300/80 rounded-full" style={{ width: `${(c / maxConteo) * 100}%` }} />
                </div>
                <span className="text-white/40 text-[11px] w-4 text-right">{c}</span>
              </div>
            ))}
          </div>
        </div>
        {cambio !== null && Math.abs(cambio) >= 0.05 && (
          <p
            className={`relative inline-flex items-center gap-1 mt-4 text-xs font-semibold rounded-full px-2.5 py-1 ${
              cambio > 0 ? 'bg-green-400/15 text-green-300' : 'bg-yellow-400/15 text-yellow-200'
            }`}
          >
            {cambio > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            Este mes {cambio > 0 ? 'subiste' : 'bajaste'} {coma(Math.abs(cambio))} vs. el mes pasado
          </p>
        )}
      </div>

      {/* Lista */}
      <div className="flex items-center justify-between mb-2">
        <p className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-wide">
          <MessageSquareQuote size={13} /> Opiniones
        </p>
        {comentarios > 0 && (
          <label className="flex items-center gap-1.5 text-white/50 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={soloComentarios}
              onChange={(e) => setSoloComentarios(e.target.checked)}
              className="w-4 h-4 accent-cyan-500"
            />
            Solo con comentario
          </label>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-12">
          <Star size={32} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Todavía no hay evaluaciones en este período.</p>
          <p className="text-white/30 text-xs mt-1">Los alumnos evalúan la clase después de asistir.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lista.map((e) => {
            const h = horarioDe[e.horario_id];
            return (
              <div key={e.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Estrellas valor={Number(e.puntaje)} tamano={14} />
                  <span className="text-white/35 text-[11px] capitalize">
                    {fechaCorta(e.fecha)}
                    {h ? ` · ${h.hora.slice(0, 5)}` : ''}
                  </span>
                </div>
                {(e.comentario || '').trim() ? (
                  <p className="text-white/80 text-sm mt-2">“{e.comentario.trim()}”</p>
                ) : (
                  <p className="text-white/30 text-xs mt-1.5">Sin comentario</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
