import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ChevronRight, ExternalLink, Dumbbell, Download, Check, Target } from 'lucide-react';
import { descargarRutinaExcel } from '../../lib/excelRutinaExport';
import { pesoVigente } from '../../lib/cargas';

function leerUltimoDia(rutinaId) {
  try {
    const d = JSON.parse(localStorage.getItem('cedys_rutina_ultima') || 'null');
    return d && d.rutinaId === rutinaId ? d : null;
  } catch {
    return null;
  }
}

function diaCompletado(diaId) {
  try {
    return !!localStorage.getItem('cedys_rutina_completo_' + diaId);
  } catch {
    return false;
  }
}

export default function RutinaSemanas() {
  const { rutinaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { rutinas, obtenerSemanas, obtenerDias, obtenerRutinaCompleta, registrosPeso } = useAuth();
  const [semanas, setSemanas] = useState(null);
  const [semanaElegida, setSemanaElegida] = useState(null);
  const [dias, setDias] = useState(null);
  const [descargando, setDescargando] = useState(false);

  const rutina = rutinas.find((r) => r.id === rutinaId);

  async function descargar() {
    setDescargando(true);
    try {
      const completa = await obtenerRutinaCompleta(rutinaId);
      // Cada ejercicio con su peso vigente (el último cambio registrado)
      const conPesos = completa.map((semana) => ({
        ...semana,
        dias: semana.dias.map((dia) => ({
          ...dia,
          ejercicios: dia.ejercicios.map((ej) => ({ ...ej, peso_referencia: pesoVigente(ej, registrosPeso).texto })),
        })),
      }));
      await descargarRutinaExcel(rutina?.nombre, conPesos);
    } catch (e) {
      alert('No se pudo generar el Excel: ' + e.message);
    }
    setDescargando(false);
  }

  // Cargar semanas y elegir: la de ?semana=, la última que abrió, o la primera
  useEffect(() => {
    obtenerSemanas(rutinaId).then((lista) => {
      setSemanas(lista);
      const pedida = new URLSearchParams(location.search).get('semana');
      const ultima = leerUltimoDia(rutinaId)?.semanaId;
      const elegida =
        lista.find((s) => s.id === pedida) || lista.find((s) => s.id === ultima) || lista[0] || null;
      setSemanaElegida(elegida?.id || null);
    });
  }, [rutinaId]);

  useEffect(() => {
    if (!semanaElegida) return;
    setDias(null);
    obtenerDias(semanaElegida).then(setDias);
  }, [semanaElegida]);

  const semana = semanas?.find((s) => s.id === semanaElegida);
  const ultimo = leerUltimoDia(rutinaId);

  return (
    <div className="min-h-screen bg-ink pb-24 pt-6">
      <div className="px-6">
        <button
          onClick={() => navigate('/mi-rutina')}
          className="flex items-center gap-1 text-white/40 text-sm mb-5 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={15} /> Mi rutina
        </button>

        <div className="flex items-start gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
            <Dumbbell size={20} className="text-cyan-brand" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-white text-2xl leading-tight">{rutina?.nombre || 'Rutina'}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <button
                onClick={descargar}
                disabled={descargando}
                className="flex items-center gap-1 text-cyan-brand text-xs font-medium disabled:opacity-50"
              >
                <Download size={12} /> {descargando ? 'Generando...' : 'Descargar Excel'}
              </button>
              {rutina?.link_googlesheet && (
                <a
                  href={rutina.link_googlesheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-white/45 text-xs"
                >
                  <ExternalLink size={12} /> Google Sheets
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {semanas === null && <p className="text-white/30 text-sm px-6 mt-6">Cargando...</p>}
      {semanas && semanas.length === 0 && (
        <p className="text-white/30 text-sm px-6 mt-6">Esta rutina todavía no tiene semanas cargadas.</p>
      )}

      {/* Selector de semanas (mismo estilo que Horarios) */}
      {semanas && semanas.length > 0 && (
        <>
          <p className="text-white/40 text-xs uppercase tracking-wide px-6 mt-6 mb-2">Semana</p>
          <div className="flex gap-2 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
            {semanas.map((s) => {
              const activo = s.id === semanaElegida;
              const esUltima = ultimo?.semanaId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSemanaElegida(s.id)}
                  className={`shrink-0 w-[52px] rounded-2xl py-2.5 flex flex-col items-center border transition-all active:scale-95 ${
                    activo
                      ? 'bg-cyan-brand border-cyan-brand text-ink shadow-[0_6px_20px_-6px_rgba(0,200,230,0.6)]'
                      : 'bg-white/[0.04] border-white/10 text-white'
                  }`}
                >
                  <span className={`text-[10px] uppercase font-semibold ${activo ? 'text-ink/70' : 'text-white/40'}`}>
                    Sem
                  </span>
                  <span className="font-display text-xl leading-tight">{s.numero}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      esUltima ? (activo ? 'bg-ink' : 'bg-cyan-brand') : 'bg-transparent'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}

      {semana && (
        <div className="px-6 mt-4">
          {semana.objetivo && (
            <div className="flex items-start gap-2 bg-cyan-brand/[0.07] border border-cyan-brand/20 rounded-2xl px-4 py-3 mb-4">
              <Target size={16} className="text-cyan-brand shrink-0 mt-0.5" />
              <div>
                <p className="text-cyan-brand text-[11px] font-semibold uppercase tracking-wide">Objetivo de la semana</p>
                <p className="text-white/80 text-sm mt-0.5">{semana.objetivo}</p>
              </div>
            </div>
          )}

          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">¿Qué día entrenas hoy?</p>
          {dias === null && <p className="text-white/30 text-sm">Cargando...</p>}
          {dias && dias.length === 0 && (
            <p className="text-white/30 text-sm">Esta semana todavía no tiene días cargados.</p>
          )}
          <div className="flex flex-col gap-2">
            {dias?.map((d, i) => {
              const hecho = diaCompletado(d.id);
              const esUltimo = ultimo?.diaId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/rutinas/${rutinaId}/semanas/${semanaElegida}/dias/${d.id}`)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-transform active:scale-[0.98] ${
                    esUltimo ? 'bg-cyan-brand/[0.07] border-cyan-brand/30' : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-display text-xl ${
                      hecho ? 'bg-cyan-brand text-ink' : 'bg-white/[0.06] text-white/70'
                    }`}
                  >
                    {hecho ? <Check size={20} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-display text-lg leading-tight truncate">{d.nombre}</p>
                    <p className={`text-xs mt-0.5 ${hecho ? 'text-cyan-brand' : esUltimo ? 'text-cyan-brand/80' : 'text-white/35'}`}>
                      {hecho ? 'Completado' : esUltimo ? 'Lo último que abriste' : 'Toca para ver los ejercicios'}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-cyan-brand/60" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
