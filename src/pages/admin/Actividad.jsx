import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { History, Search } from 'lucide-react';

function fechaHora(iso) {
  const d = new Date(iso);
  return d.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function diaDe(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tituloDia(clave) {
  const d = new Date(clave + 'T12:00:00');
  const t = d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Historial de cambios: quién hizo qué y cuándo (pagos, planes, clases, etc.)
export default function Actividad() {
  const { obtenerActividad, usuarios } = useAuth();
  const [registros, setRegistros] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [persona, setPersona] = useState('');

  useEffect(() => {
    obtenerActividad(500).then(setRegistros);
  }, []);

  const personas = [...new Set((registros || []).map((r) => r.actor_nombre).filter(Boolean))];
  const texto = busqueda.trim().toLowerCase();
  const visibles = (registros || []).filter(
    (r) =>
      (!persona || r.actor_nombre === persona) &&
      (!texto || `${r.accion} ${r.detalle || ''}`.toLowerCase().includes(texto))
  );
  const porDia = visibles.reduce((acc, r) => {
    const k = diaDe(r.creado_en);
    (acc[k] = acc[k] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <History size={18} className="text-cyan-brand" />
        <p className="text-white font-display text-xl">Historial de cambios</p>
      </div>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar (pago, plan, nombre...)"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand"
          />
        </div>
        {personas.length > 1 && (
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-xl px-2 text-white text-sm outline-none"
          >
            <option value="" className="bg-ink">Todos</option>
            {personas.map((p) => (
              <option key={p} value={p} className="bg-ink">
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {registros === null && <p className="text-white/30 text-sm">Cargando...</p>}
      {registros && visibles.length === 0 && (
        <p className="text-white/30 text-sm text-center py-10">
          {registros.length === 0 ? 'Todavía no hay cambios registrados.' : 'No hay resultados.'}
        </p>
      )}

      <div className="flex flex-col gap-5">
        {Object.entries(porDia).map(([dia, lista]) => (
          <div key={dia}>
            <p className="text-white/40 text-xs uppercase tracking-wide mb-2">{tituloDia(dia)}</p>
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/10">
              {lista.map((r) => (
                <div key={r.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-sm">{r.accion}</p>
                    <p className="text-white/35 text-[11px] shrink-0">{fechaHora(r.creado_en).split(', ').pop()}</p>
                  </div>
                  {r.detalle && <p className="text-white/55 text-xs">{r.detalle}</p>}
                  <p className="text-white/30 text-[11px]">por {r.actor_nombre || 'sistema'}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
