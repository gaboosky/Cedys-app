import { useEffect, useState } from 'react';
import { Gift, Share2, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// "Trae a un amigo": cada alumno tiene su propio link a la sesión de prueba.
export default function TraeUnAmigo() {
  const { usuarioActual, misReferidos, infoGimnasio } = useAuth();
  const [stats, setStats] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const link = `${window.location.origin}/prueba?ref=${usuarioActual.id}`;
  const gimnasio = infoGimnasio?.nombre || 'CED&S';
  const texto = `¡Hola! Yo entreno en ${gimnasio} 💪 y me encanta. Pide tu sesión de prueba aquí: ${link}`;

  useEffect(() => {
    let vivo = true;
    misReferidos().then((r) => vivo && setStats(r));
    return () => {
      vivo = false;
    };
  }, []);

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Sesión de prueba en ${gimnasio}`, text: texto });
        return;
      } catch (e) {
        // canceló o no se pudo: se abre WhatsApp
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      // el navegador no permitió copiar
    }
  }

  return (
    <div className="bg-gradient-to-br from-cyan-brand/[0.12] to-white/[0.03] border border-cyan-brand/30 rounded-2xl p-5 mb-6">
      <p className="flex items-center gap-2 text-white font-semibold">
        <Gift size={18} className="text-cyan-brand" /> Trae a un amigo
      </p>
      <p className="text-white/60 text-sm mt-1">
        Comparte tu link para que pida su sesión de prueba. Si se inscribe, te regalamos una sesión extra 🎁
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={compartir}
          className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm"
        >
          <Share2 size={15} /> Compartir
        </button>
        <button
          onClick={copiar}
          className="flex items-center justify-center gap-1.5 bg-white/[0.08] border border-white/10 text-white/80 rounded-xl px-4 text-sm"
        >
          {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? 'Copiado' : 'Copiar link'}
        </button>
      </div>
      {stats && stats.solicitudes > 0 && (
        <p className="text-white/55 text-xs mt-3">
          {stats.solicitudes} amigo{stats.solicitudes !== 1 ? 's' : ''} pidi{stats.solicitudes !== 1 ? 'eron' : 'ó'} prueba con
          tu link · {stats.inscritos} se inscribi{stats.inscritos !== 1 ? 'eron' : 'ó'}
        </p>
      )}
    </div>
  );
}
