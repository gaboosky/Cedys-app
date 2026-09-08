import { useAuth } from '../../context/AuthContext';
import { LOGO_CEDS } from '../../assets/logo';
import { Upload } from 'lucide-react';

export default function Configuracion() {
  const { logoUrl, actualizarLogo } = useAuth();

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es muy pesada. Usa una de menos de 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => actualizarLogo(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-10">
      <p className="font-display text-3xl text-white mb-6">Configuración</p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <p className="text-white/50 text-sm mb-4">Logo del gimnasio</p>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden p-1 shrink-0">
            <img
              src={logoUrl || LOGO_CEDS}
              alt="Logo actual"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-white text-sm">Logo actual</p>
            <p className="text-white/40 text-xs">
              Se muestra en el topbar de la app
            </p>
          </div>
        </div>

        <label className="flex items-center justify-center gap-2 bg-cyan-brand text-ink text-sm font-semibold rounded-lg py-3 cursor-pointer hover:bg-cyan-brandLight transition-colors">
          <Upload size={16} />
          Subir nuevo logo
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
          />
        </label>
        <p className="text-white/30 text-xs mt-2 text-center">
          Formatos: PNG, JPG. Máximo 2MB.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <p className="text-white/50 text-sm mb-3">Marca</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-brand" />
          <div>
            <p className="text-white text-sm">Cian principal</p>
            <p className="text-white/40 text-xs">#03CDE6</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-white/50 text-sm mb-3">Políticas</p>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-white text-sm">Tiempo mínimo para cancelar</p>
            <p className="text-white/40 text-xs">2 horas antes de la clase</p>
          </div>
          <div>
            <p className="text-white text-sm">Renovación de plan</p>
            <p className="text-white/40 text-xs">Automática cada 30 días</p>
          </div>
        </div>
      </div>
    </div>
  );
}
