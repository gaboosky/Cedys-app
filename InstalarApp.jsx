import { useState, useEffect } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';

export default function InstalarApp() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [instalada, setInstalada] = useState(false);
  const [descartada, setDescartada] = useState(false);
  const [mostrarInstruccionesIOS, setMostrarInstruccionesIOS] = useState(false);

  const esIOS = /iphone|ipad|ipod/.test(
    window.navigator.userAgent.toLowerCase()
  );
  const yaInstalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setPromptEvent(e);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstalar() {
    if (esIOS) {
      setMostrarInstruccionesIOS(true);
      return;
    }
    if (!promptEvent) return;
    promptEvent.prompt();
    const resultado = await promptEvent.userChoice;
    if (resultado.outcome === 'accepted') setInstalada(true);
    setPromptEvent(null);
  }

  if (yaInstalada || instalada || descartada) return null;
  if (!esIOS && !promptEvent) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-30 max-w-sm mx-auto">
      {!mostrarInstruccionesIOS ? (
        <div className="flex items-center gap-3 bg-ink border border-cyan-brand/30 rounded-2xl p-3 shadow-lg">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              Instala la app en tu celular
            </p>
            <p className="text-white/40 text-xs">
              Acceso directo, sin navegador
            </p>
          </div>
          <button
            onClick={handleInstalar}
            className="flex items-center gap-1 bg-cyan-brand text-ink font-semibold rounded-lg px-3 py-2 text-xs shrink-0 transition-transform active:scale-95"
          >
            <Download size={14} /> Instalar
          </button>
          <button
            onClick={() => setDescartada(true)}
            className="text-white/30 p-1 shrink-0"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="bg-ink border border-cyan-brand/30 rounded-2xl p-4 shadow-lg">
          <div className="flex items-start justify-between mb-2">
            <p className="text-white text-sm font-medium">Instalar en iPhone</p>
            <button
              onClick={() => setDescartada(true)}
              className="text-white/30 p-1"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-white/80 text-xs">
              <Share size={14} className="text-cyan-brand shrink-0" />
              1. Toca el ícono de compartir en Safari
            </p>
            <p className="flex items-center gap-2 text-white/80 text-xs">
              <Plus size={14} className="text-cyan-brand shrink-0" />
              2. Elige "Agregar a inicio" (Add to Home Screen)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
