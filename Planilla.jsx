import { FileSpreadsheet } from 'lucide-react';

export default function Planilla() {
  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-10">
      <p className="font-display text-3xl text-white mb-6">
        Planilla / Histórico
      </p>

      <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-8 text-center">
        <FileSpreadsheet size={32} className="text-white/20 mx-auto mb-3" />
        <p className="text-white/50 text-sm">
          Esta sección se conecta con tu planilla de Excel actual.
        </p>
        <p className="text-white/30 text-xs mt-1">
          Pendiente: compartir el formato para adaptar la importación.
        </p>
      </div>
    </div>
  );
}
