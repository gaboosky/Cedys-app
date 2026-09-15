import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subirImagen } from '../../lib/storage';
import { LOGO_CEDS_WORDMARK } from '../../assets/logoWordmark';
import { Upload, Pencil } from 'lucide-react';

export default function Configuracion() {
  const {
    logoUrl,
    actualizarLogo,
    horasAnticipacion,
    diasRenovacion,
    actualizarPoliticas,
  } = useAuth();

  const [editandoPoliticas, setEditandoPoliticas] = useState(false);
  const [formPoliticas, setFormPoliticas] = useState({
    horas_anticipacion: horasAnticipacion,
    dias_renovacion: diasRenovacion,
  });
  const [guardando, setGuardando] = useState(false);

  async function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy pesada. Usa una de menos de 5MB.');
      return;
    }

    try {
      const url = await subirImagen(file, 'logo');
      actualizarLogo(url);
    } catch (err) {
      alert('Error al subir el logo: ' + err.message);
    }
  }

  function abrirEdicionPoliticas() {
    setFormPoliticas({
      horas_anticipacion: horasAnticipacion,
      dias_renovacion: diasRenovacion,
    });
    setEditandoPoliticas(true);
  }

  async function guardarPoliticas() {
    setGuardando(true);
    await actualizarPoliticas({
      horas_anticipacion: Number(formPoliticas.horas_anticipacion),
      dias_renovacion: Number(formPoliticas.dias_renovacion),
    });
    setGuardando(false);
    setEditandoPoliticas(false);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-10">
      <p className="font-display text-3xl text-white mb-6">Configuración</p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <p className="text-white/50 text-sm mb-4">Logo del gimnasio</p>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden p-1 shrink-0">
            <img
              src={logoUrl || LOGO_CEDS_WORDMARK}
              alt="Logo actual"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-white text-sm">Logo actual</p>
            <p className="text-white/40 text-xs">
              Se muestra en el header de la app, para todos los usuarios
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
        <p className="text-white/30 text-xs mt-2 text-center mb-3">
          Formatos: PNG, JPG. Máximo 2MB.
        </p>

        {logoUrl && (
          <button
            onClick={() => actualizarLogo(null)}
            className="w-full text-red-400/70 text-sm py-2 hover:text-red-400 transition-colors"
          >
            Quitar logo personalizado (usar el de por defecto)
          </button>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/50 text-sm">Políticas</p>
          {!editandoPoliticas && (
            <button
              onClick={abrirEdicionPoliticas}
              className="flex items-center gap-1 text-cyan-brand text-xs font-medium"
            >
              <Pencil size={13} /> Editar
            </button>
          )}
        </div>

        {editandoPoliticas ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-white text-sm mb-1 block">
                Tiempo mínimo para reservar o cancelar
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={formPoliticas.horas_anticipacion}
                  onChange={(e) =>
                    setFormPoliticas({
                      ...formPoliticas,
                      horas_anticipacion: e.target.value,
                    })
                  }
                  className="w-20 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                />
                <span className="text-white/40 text-sm">
                  horas antes de la clase
                </span>
              </div>
            </div>
            <div>
              <label className="text-white text-sm mb-1 block">
                Renovación de plan
              </label>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm">
                  Marcar como vencida después de
                </span>
                <input
                  type="number"
                  min="1"
                  value={formPoliticas.dias_renovacion}
                  onChange={(e) =>
                    setFormPoliticas({
                      ...formPoliticas,
                      dias_renovacion: e.target.value,
                    })
                  }
                  className="w-20 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                />
                <span className="text-white/40 text-sm">días</span>
              </div>
              <p className="text-white/30 text-xs mt-1">
                El admin la sigue confirmando manualmente en Usuarios
                ("Confirmar pago")
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={guardarPoliticas}
                disabled={guardando}
                className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditandoPoliticas(false)}
                className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-white text-sm">
                Tiempo mínimo para reservar o cancelar
              </p>
              <p className="text-white/40 text-xs">
                {horasAnticipacion} horas antes de la clase
              </p>
            </div>
            <div>
              <p className="text-white text-sm">Renovación de plan</p>
              <p className="text-white/40 text-xs">
                Se marca como vencida después de {diasRenovacion} días. El admin
                la confirma manualmente en Usuarios ("Confirmar pago")
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
