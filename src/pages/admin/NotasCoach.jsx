import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, MessageCircle, Search, Clock } from 'lucide-react';
import { numeroWhatsapp } from '../../lib/seguimiento';

const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function grupoDe(creadoEn) {
  const d = isoLocal(new Date(creadoEn));
  const hoy = isoLocal(new Date());
  const ayer = isoLocal(new Date(Date.now() - 86400000));
  const hace7 = isoLocal(new Date(Date.now() - 7 * 86400000));
  if (d === hoy) return 'Hoy';
  if (d === ayer) return 'Ayer';
  if (d >= hace7) return 'Esta semana';
  return 'Antes';
}

function hora(creadoEn) {
  return new Date(creadoEn).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fechaClase(fechaISO) {
  if (!fechaISO) return null;
  const d = new Date(fechaISO + 'T12:00:00');
  const dia = d
    .toLocaleDateString('es-CL', { weekday: 'short' })
    .replace('.', '');
  return {
    dia: dia.charAt(0).toUpperCase() + dia.slice(1, 3),
    num: d.getDate(),
    mes: MESES[d.getMonth()],
  };
}

// Notas que los coaches dejan al admin sobre sus clases (desde "Mis Clases").
export default function NotasCoach() {
  const { notasCoach, usuarios, horarios } = useAuth();
  const [coach, setCoach] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [periodo, setPeriodo] = useState('todas'); // semana | mes | mes_anterior | todas

  const usuarioDe = Object.fromEntries(usuarios.map((u) => [u.id, u]));
  const horarioDe = Object.fromEntries(horarios.map((h) => [h.id, h]));
  const coachesConNotas = [...new Set(notasCoach.map((n) => n.coach_id))]
    .map((id) => usuarioDe[id])
    .filter(Boolean);

  // Período según la fecha en que se escribió la nota
  const hoyD = new Date();
  const mesActual = `${hoyD.getFullYear()}-${pad(hoyD.getMonth() + 1)}`;
  const dAnt = new Date(hoyD.getFullYear(), hoyD.getMonth() - 1, 1);
  const mesAnterior = `${dAnt.getFullYear()}-${pad(dAnt.getMonth() + 1)}`;
  const hace7 = isoLocal(new Date(Date.now() - 6 * 86400000));
  const estaEn = (n, p) => {
    const d = isoLocal(new Date(n.creado_en));
    if (p === 'semana') return d >= hace7;
    if (p === 'mes') return d.slice(0, 7) === mesActual;
    if (p === 'mes_anterior') return d.slice(0, 7) === mesAnterior;
    return true;
  };
  const enPeriodo = (n) => estaEn(n, periodo);
  const PERIODOS = [
    { v: 'semana', t: 'Última semana' },
    { v: 'mes', t: 'Este mes' },
    { v: 'mes_anterior', t: 'Mes anterior' },
    { v: 'todas', t: 'Todas' },
  ];

  const texto = busqueda.trim().toLowerCase();
  const lista = notasCoach
    .filter(enPeriodo)
    .filter((n) => coach === 'todos' || n.coach_id === coach)
    .filter((n) => !texto || (n.nota || '').toLowerCase().includes(texto));

  const ORDEN = ['Hoy', 'Ayer', 'Esta semana', 'Antes'];
  const grupos = ORDEN.map((g) => ({
    g,
    items: lista.filter((n) => grupoDe(n.creado_en) === g),
  })).filter((x) => x.items.length);
  const deHoy = notasCoach.filter((n) => grupoDe(n.creado_en) === 'Hoy').length;

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-2xl mx-auto">
      <p className="font-display text-3xl text-white leading-tight">
        Notas de coaches
      </p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        Lo que tus coaches te cuentan sobre sus clases
        {deHoy > 0 ? ` · ${deHoy} nota${deHoy !== 1 ? 's' : ''} hoy` : ''}
      </p>

      {notasCoach.length > 0 && (
        <>
          <div className="relative mb-2">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en las notas"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
            />
          </div>
          <div
            className="flex gap-1.5 overflow-x-auto -mx-6 px-6 pb-1 mb-2"
            style={{ scrollbarWidth: 'none' }}
          >
            {PERIODOS.map((p) => {
              const n = notasCoach.filter((x) => estaEn(x, p.v)).length;
              return (
                <button
                  key={p.v}
                  onClick={() => setPeriodo(p.v)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
                    periodo === p.v
                      ? 'bg-cyan-brand border-cyan-brand text-ink'
                      : 'bg-white/[0.04] border-white/10 text-white/60'
                  }`}
                >
                  {p.t}{' '}
                  <span
                    className={
                      periodo === p.v ? 'text-ink/60' : 'text-white/35'
                    }
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
          {coachesConNotas.length > 1 && (
            <div
              className="flex gap-1.5 overflow-x-auto -mx-6 px-6 pb-1 mb-4"
              style={{ scrollbarWidth: 'none' }}
            >
              {[{ id: 'todos', nombre: 'Todos' }, ...coachesConNotas].map(
                (c) => (
                  <button
                    key={c.id}
                    onClick={() => setCoach(c.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
                      coach === c.id
                        ? 'bg-cyan-brand border-cyan-brand text-ink'
                        : 'bg-white/[0.04] border-white/10 text-white/60'
                    }`}
                  >
                    {c.id === 'todos'
                      ? 'Todos'
                      : (c.nombre || '').split(' ')[0]}
                  </button>
                )
              )}
            </div>
          )}
        </>
      )}

      {notasCoach.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-cyan-brand/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-cyan-brand/60" />
          </div>
          <p className="text-white/60 text-sm">Aún no hay notas de coaches.</p>
          <p className="text-white/35 text-xs mt-1 px-6">
            Los coaches pueden dejarte una nota desde cada clase en "Mis Clases"
            (por ejemplo, si algo se rompió o un alumno se lesionó).
          </p>
        </div>
      )}
      {notasCoach.length > 0 && lista.length === 0 && (
        <p className="text-white/35 text-sm text-center py-10">
          No hay notas en este período.
        </p>
      )}

      {grupos.map(({ g, items }) => (
        <div key={g} className="mb-5">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
            {g}
          </p>
          <div className="flex flex-col gap-2">
            {items.map((n) => {
              const c = usuarioDe[n.coach_id];
              const h = horarioDe[n.horario_id];
              const f = fechaClase(n.fecha);
              const wsp = numeroWhatsapp(c?.telefono);
              const primerNombre = (c?.nombre || 'Coach').split(' ')[0];
              return (
                <div
                  key={n.id}
                  className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-400/15 border border-violet-400/40 flex items-center justify-center shrink-0 font-display text-sm text-violet-200">
                      {(c?.nombre || '?')
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((x) => x[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-semibold truncate">
                          {c?.nombre || 'Coach'}
                        </p>
                        <span className="text-white/35 text-[11px] flex items-center gap-1 shrink-0">
                          <Clock size={11} /> {hora(n.creado_en)}
                          {g === 'Antes'
                            ? ` · ${new Date(n.creado_en).toLocaleDateString(
                                'es-CL',
                                { day: 'numeric', month: 'short' }
                              )}`
                            : ''}
                        </span>
                      </div>
                      {f && (
                        <span className="inline-flex items-center gap-1.5 mt-1 bg-cyan-brand/10 text-cyan-brand text-[11px] rounded-full px-2 py-0.5">
                          Clase {f.dia} {f.num} {f.mes}
                          {h ? ` · ${h.hora.slice(0, 5)}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-white/85 text-sm mt-3 bg-black/20 rounded-xl px-3 py-2.5 whitespace-pre-line">
                    {n.nota}
                  </p>
                  {wsp && (
                    <a
                      href={`https://wa.me/${wsp}?text=${encodeURIComponent(
                        `Hola ${primerNombre}, vi tu nota sobre la clase${
                          f ? ` del ${f.dia} ${f.num}` : ''
                        }: `
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[#7ee2a5] text-xs font-semibold"
                    >
                      <MessageCircle size={13} /> Responder por WhatsApp
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
