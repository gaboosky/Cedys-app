import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const solo = (s) => String(s || '').replace(/\D/g, '');
const sinTildes = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Buscador para coaches y admin: escribe un nombre, RUT o teléfono y salta a la ficha del alumno.
export default function BuscadorRapido({ onCerrar }) {
  const { usuarios, rolEfectivo } = useAuth();
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const ref = useRef(null);
  const esAdmin = rolEfectivo === 'head_coach';

  useEffect(() => {
    ref.current?.focus();
    const tecla = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  const t = sinTildes(texto.trim());
  const digitos = solo(texto);
  const resultados = t
    ? usuarios
        .filter(
          (u) => u.estado !== 'pendiente' && (esAdmin || u.rol === 'usuario')
        )
        .filter(
          (u) =>
            sinTildes(u.nombre).includes(t) ||
            (digitos.length >= 3 &&
              (solo(u.rut).includes(digitos) ||
                solo(u.telefono).includes(digitos)))
        )
        .sort((a, b) => {
          // primero los que empiezan con lo escrito
          const ia = sinTildes(a.nombre).startsWith(t) ? 0 : 1;
          const ib = sinTildes(b.nombre).startsWith(t) ? 0 : 1;
          return ia - ib || (a.nombre || '').localeCompare(b.nombre || '');
        })
        .slice(0, 8)
    : [];

  function abrir(u) {
    onCerrar();
    // El admin va a la ficha completa; el coach a la ficha en Alumnos
    navigate(esAdmin ? `/usuarios/${u.id}` : `/alumnos?ver=${u.id}`);
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/80 flex justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))]"
      onClick={onCerrar}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            ref={ref}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && resultados[0] && abrir(resultados[0])
            }
            placeholder="Buscar alumno por nombre, RUT o teléfono"
            className="w-full bg-ink border border-cyan-brand/50 rounded-2xl pl-10 pr-11 py-3.5 text-white text-[15px] placeholder-white/35 outline-none"
          />
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 p-1.5"
          >
            <X size={18} />
          </button>
        </div>
        {t && (
          <div className="mt-2 bg-ink border border-white/10 rounded-2xl overflow-hidden">
            {resultados.length === 0 && (
              <p className="text-white/40 text-sm px-4 py-4">
                No encontré a nadie con "{texto}".
              </p>
            )}
            {resultados.map((u) => (
              <button
                key={u.id}
                onClick={() => abrir(u)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-white/5 last:border-0 hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">
                    {u.nombre}
                    {u.rol !== 'usuario' && (
                      <span className="ml-1.5 text-cyan-brand/80 text-[10px] font-semibold uppercase">
                        {u.rol === 'head_coach' ? 'Admin' : 'Coach'}
                      </span>
                    )}
                  </p>
                  <p className="text-white/40 text-xs truncate">
                    {u.telefono || u.correo || ''}
                    {u.estado === 'inactivo' ? ' · inactivo' : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
