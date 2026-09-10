import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subirImagen } from '../lib/storage';
import {
  MessageCircle,
  Plus,
  Trash2,
  Camera,
  FileText,
  Newspaper,
  Image as ImageIcon,
  Shield,
} from 'lucide-react';

const WHATSAPP_NUMERO = '56958540928';
const LINK_TERMINOS =
  'https://docs.google.com/forms/d/e/1FAIpQLSfUWWCQPOlvTI5a7tVhAqOti3aYzLIp7N2Np9wAubf5pgxFHQ/viewform';

export default function General() {
  const {
    usuarioActual,
    noticias,
    fotosGym,
    crearNoticia,
    eliminarNoticia,
    subirFotoGym,
    eliminarFotoGym,
  } = useAuth();
  const esAdmin = usuarioActual.rol === 'head_coach';

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ titulo: '', contenido: '' });

  function handleCrearNoticia(e) {
    e.preventDefault();
    if (!form.titulo || !form.contenido) return;
    crearNoticia(form);
    setForm({ titulo: '', contenido: '' });
    setMostrarForm(false);
  }

  async function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy pesada. Usa una de menos de 5MB.');
      return;
    }
    try {
      const url = await subirImagen(file, 'gym');
      subirFotoGym(url);
    } catch (err) {
      alert('Error al subir la foto: ' + err.message);
    }
  }

  function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
    });
  }

  const [ultimaNoticia, ...restoNoticias] = noticias;

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      {/* Muro de noticias */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 text-xs uppercase tracking-wide">
          Muro de noticias
        </p>
        {esAdmin && (
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="flex items-center gap-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs font-semibold px-3 py-1.5 rounded-full transition-transform active:scale-95"
          >
            <Plus size={13} /> Nueva
          </button>
        )}
      </div>

      {mostrarForm && (
        <form
          onSubmit={handleCrearNoticia}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-3 flex flex-col gap-2"
        >
          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Título"
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          />
          <textarea
            value={form.contenido}
            onChange={(e) => setForm({ ...form, contenido: e.target.value })}
            placeholder="Contenido"
            rows={3}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
          />
          <button
            type="submit"
            className="bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
          >
            Publicar
          </button>
        </form>
      )}

      {noticias.length === 0 && (
        <div className="text-center py-10 mb-8">
          <Newspaper size={32} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Aún no hay publicaciones.</p>
        </div>
      )}

      {ultimaNoticia && (
        <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-5 mb-3 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-cyan-brand text-[10px] font-semibold tracking-[0.2em] uppercase">
              Última publicación
            </p>
            {esAdmin && (
              <button
                onClick={() => eliminarNoticia(ultimaNoticia.id)}
                className="text-red-400/60 shrink-0 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="text-white font-display text-xl leading-tight mt-2">
            {ultimaNoticia.titulo}
          </p>
          <p className="text-white/60 text-sm mt-1.5">
            {ultimaNoticia.contenido}
          </p>
          <p className="text-white/30 text-xs mt-3">
            {formatearFecha(ultimaNoticia.created_at)}
          </p>
        </div>
      )}

      {restoNoticias.length > 0 && (
        <div className="flex flex-col gap-2 mb-8">
          {restoNoticias.map((n) => (
            <div
              key={n.id}
              className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-white font-display text-lg leading-tight">
                  {n.titulo}
                </p>
                {esAdmin && (
                  <button
                    onClick={() => eliminarNoticia(n.id)}
                    className="text-red-400/60 shrink-0 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-white/60 text-sm mt-1">{n.contenido}</p>
              <p className="text-white/25 text-xs mt-2">
                {formatearFecha(n.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
      {ultimaNoticia && restoNoticias.length === 0 && <div className="mb-8" />}

      {/* Fotos del gym */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 text-xs uppercase tracking-wide">
          Fotos del gimnasio
        </p>
        {esAdmin && (
          <label className="flex items-center gap-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-transform active:scale-95">
            <Camera size={13} /> Subir
            <input
              type="file"
              accept="image/*"
              onChange={handleFoto}
              className="hidden"
            />
          </label>
        )}
      </div>

      {fotosGym.length === 0 ? (
        <div className="text-center py-10 mb-8">
          <ImageIcon size={32} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Aún no se han subido fotos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-8">
          {fotosGym.map((f) => (
            <div
              key={f.id}
              className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10"
            >
              <img
                src={f.url}
                alt="Foto del gimnasio"
                className="w-full h-full object-cover"
              />
              {esAdmin && (
                <button
                  onClick={() => eliminarFotoGym(f.id)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center transition-transform active:scale-90"
                >
                  <Trash2 size={12} className="text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dudas y consultas */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
        Dudas y consultas
      </p>
      <a
        href={`https://wa.me/${WHATSAPP_NUMERO}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-cyan-brand/10 border border-cyan-brand/30 rounded-2xl p-4 transition-transform active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-full bg-cyan-brand flex items-center justify-center shrink-0">
          <MessageCircle size={20} className="text-ink" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">¿Tienes dudas?</p>
          <p className="text-white/50 text-xs">
            Escríbenos directo por WhatsApp
          </p>
        </div>
      </a>

      <a
        href={LINK_TERMINOS}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-4 mt-3 transition-transform active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <FileText size={18} className="text-white/60" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">
            Términos y condiciones
          </p>
          <p className="text-white/50 text-xs">
            Revisa las condiciones de tu membresía
          </p>
        </div>
      </a>

      <Link
        to="/privacidad"
        className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-4 mt-3 transition-transform active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <Shield size={18} className="text-white/60" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">
            Política de Privacidad
          </p>
          <p className="text-white/50 text-xs">
            Cómo cuidamos tus datos personales
          </p>
        </div>
      </Link>
    </div>
  );
}
