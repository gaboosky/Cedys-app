import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ChevronRight, ExternalLink, Dumbbell, Download } from 'lucide-react';
import { descargarRutinaExcel } from '../../lib/excelRutinaExport';
import { pesoVigente } from '../../lib/cargas';

export default function RutinaSemanas() {
  const { rutinaId } = useParams();
  const navigate = useNavigate();
  const { rutinas, obtenerSemanas, obtenerRutinaCompleta, registrosPeso } = useAuth();
  const [semanas, setSemanas] = useState(null);
  const [descargando, setDescargando] = useState(false);

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

  const rutina = rutinas.find((r) => r.id === rutinaId);

  useEffect(() => {
    obtenerSemanas(rutinaId).then(setSemanas);
  }, [rutinaId]);

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-white/40 text-sm mb-6 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-6 mb-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-cyan-brand/15 border border-cyan-brand/30 flex items-center justify-center shrink-0">
            <Dumbbell size={18} className="text-cyan-brand" />
          </div>
          <p
            className="font-display text-white leading-tight"
            style={{ fontSize: '1.5rem' }}
          >
            {rutina?.nombre || 'Rutina'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
          <button
            onClick={descargar}
            disabled={descargando}
            className="flex items-center gap-1 text-cyan-brand text-xs font-medium disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            <Download size={12} /> {descargando ? 'Generando Excel...' : 'Descargar Excel (pesos actualizados)'}
          </button>
          {rutina?.link_googlesheet && (
            <a
              href={rutina.link_googlesheet}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-white/45 text-xs transition-transform active:scale-[0.98]"
            >
              <ExternalLink size={12} /> Ver en Google Sheets
            </a>
          )}
        </div>
      </div>

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
        Semanas
      </p>

      {semanas === null && <p className="text-white/30 text-sm">Cargando...</p>}
      {semanas && semanas.length === 0 && (
        <p className="text-white/30 text-sm">
          Esta rutina todavía no tiene semanas cargadas.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {semanas?.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/rutinas/${rutinaId}/semanas/${s.id}`)}
            className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl p-4 transition-transform active:scale-[0.98]"
          >
            <div className="text-left">
              <p className="text-white font-display text-xl leading-tight">
                Semana {s.numero}
              </p>
              {s.objetivo && (
                <p className="text-white/40 text-sm mt-0.5">{s.objetivo}</p>
              )}
            </div>
            <ChevronRight size={18} className="text-cyan-brand/60" />
          </button>
        ))}
      </div>
    </div>
  );
}
