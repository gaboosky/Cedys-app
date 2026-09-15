import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subirImagen } from '../lib/storage';
import {
  MessageCircle,
  Plus,
  Trash2,
  Pencil,
  Newspaper,
  FileText,
  Shield,
  AtSign,
  MapPin,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Camera,
  X,
} from 'lucide-react';

const WHATSAPP_NUMERO = '56958540928';
const INSTAGRAM_USUARIO = 'ce.cedys';
const DIRECCION = 'Carlos Aguirre Luco 2546, Puente Alto, Santiago, Chile';

const PREGUNTAS_FRECUENTES = [
  {
    pregunta: '¿Cómo cancelo una reserva?',
    respuesta:
      'Ve a "Mis Reservas", elige la clase y toca "Cancelar esta reserva". Debes hacerlo con al menos 3 horas de anticipación, o la sesión se descontará igual.',
  },
  {
    pregunta: '¿Qué pasa si llego tarde a una clase?',
    respuesta:
      'Se acepta un atraso máximo de 15 minutos. Pasado ese tiempo, se pierde la sesión reservada y no se puede ingresar a esa clase.',
  },
  {
    pregunta: '¿Puedo congelar mi plan si me voy de viaje?',
    respuesta:
      'Sí, desde tu Perfil puedes solicitar congelar tu membresía. Avisa con al menos 7 días de anticipación; se permite congelar hasta 1 mes.',
  },
  {
    pregunta: '¿Qué hago si la clase que quiero está llena?',
    respuesta:
      'Puedes anotarte en la lista de espera desde esa clase. Si alguien cancela, se te notifica automáticamente para que reserves ese cupo.',
  },
  {
    pregunta: '¿Puedo transferirle mi plan a otra persona?',
    respuesta:
      'Sí, los planes son transferibles. Escríbenos por WhatsApp para coordinarlo.',
  },
];

function renderizarContenido(texto) {
  const partes = texto.split(/(\*\*.*?\*\*|\{\{.*?\}\})/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    if (parte.startsWith('{{') && parte.endsWith('}}')) {
      return (
        <span key={i} className="text-cyan-brand font-medium">
          {parte.slice(2, -2)}
        </span>
      );
    }
    return parte;
  });
}

function FormularioNoticia({
  valorInicial,
  onGuardar,
  onCancelar,
  textoBoton,
}) {
  const [form, setForm] = useState(valorInicial);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  async function handleImagen(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy pesada. Usa una de menos de 5MB.');
      return;
    }
    setSubiendoImagen(true);
    try {
      const url = await subirImagen(file, 'noticias');
      setForm((prev) => ({ ...prev, imagen_url: url }));
    } catch (err) {
      alert('Error al subir la imagen: ' + err.message);
    }
    setSubiendoImagen(false);
  }

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-3 flex flex-col gap-2">
      <input
        value={form.titulo}
        onChange={(e) => setForm({ ...form, titulo: e.target.value })}
        placeholder="Título"
        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
      />
      <textarea
        value={form.contenido}
        onChange={(e) => setForm({ ...form, contenido: e.target.value })}
        placeholder={
          'Contenido\n\nEnter = párrafo nuevo · "- " = lista · **negrita** · {{celeste}}'
        }
        rows={6}
        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
      />

      {form.imagen_url ? (
        <div className="relative">
          <img
            src={form.imagen_url}
            alt="Adjunto"
            className="w-full rounded-lg max-h-48 object-cover"
          />
          <button
            type="button"
            onClick={() => setForm({ ...form, imagen_url: '' })}
            className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 bg-white/[0.03] border border-dashed border-white/20 rounded-lg py-3 text-sm text-white/60 cursor-pointer">
          <Camera size={15} />
          {subiendoImagen ? 'Subiendo...' : 'Adjuntar una foto (opcional)'}
          <input
            type="file"
            accept="image/*"
            onChange={handleImagen}
            disabled={subiendoImagen}
            className="hidden"
          />
        </label>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onGuardar(form)}
          className="flex-1 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
        >
          {textoBoton}
        </button>
        <button
          onClick={onCancelar}
          className="flex-1 bg-white/10 text-white rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function General() {
  const {
    usuarioActual,
    noticias,
    crearNoticia,
    eliminarNoticia,
    actualizarNoticia,
  } = useAuth();
  const esAdmin = usuarioActual.rol === 'head_coach';

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [faqAbierta, setFaqAbierta] = useState(null);

  function handleCrearNoticia(datos) {
    if (!datos.titulo || !datos.contenido) return;
    crearNoticia(datos);
    setMostrarForm(false);
  }

  function handleGuardarEdicion(datos) {
    if (!datos.titulo || !datos.contenido) return;
    actualizarNoticia(editandoId, {
      titulo: datos.titulo,
      contenido: datos.contenido,
      imagen_url: datos.imagen_url,
    });
    setEditandoId(null);
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
            onClick={() => {
              setMostrarForm(!mostrarForm);
              setEditandoId(null);
            }}
            className="flex items-center gap-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs font-semibold px-3 py-1.5 rounded-full transition-transform active:scale-95"
          >
            <Plus size={13} /> Nueva
          </button>
        )}
      </div>

      {mostrarForm && (
        <FormularioNoticia
          valorInicial={{ titulo: '', contenido: '', imagen_url: '' }}
          onGuardar={handleCrearNoticia}
          onCancelar={() => setMostrarForm(false)}
          textoBoton="Publicar"
        />
      )}

      {noticias.length === 0 && (
        <div className="text-center py-10 mb-8">
          <Newspaper size={32} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Aún no hay publicaciones.</p>
        </div>
      )}

      {ultimaNoticia &&
        (editandoId === ultimaNoticia.id ? (
          <FormularioNoticia
            valorInicial={{
              titulo: ultimaNoticia.titulo,
              contenido: ultimaNoticia.contenido,
              imagen_url: ultimaNoticia.imagen_url || '',
            }}
            onGuardar={handleGuardarEdicion}
            onCancelar={() => setEditandoId(null)}
            textoBoton="Guardar cambios"
          />
        ) : (
          <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-5 mb-3 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-cyan-brand text-[10px] font-semibold tracking-[0.2em] uppercase">
                Última publicación
              </p>
              {esAdmin && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditandoId(ultimaNoticia.id);
                      setMostrarForm(false);
                    }}
                    className="text-cyan-brand/70 hover:text-cyan-brand transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => eliminarNoticia(ultimaNoticia.id)}
                    className="text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-white font-display text-xl leading-tight mt-2">
              {ultimaNoticia.titulo}
            </p>
            {ultimaNoticia.imagen_url && (
              <img
                src={ultimaNoticia.imagen_url}
                alt=""
                className="w-full rounded-xl mt-3 max-h-64 object-cover"
              />
            )}
            <p className="text-white/60 text-sm mt-1.5 whitespace-pre-line">
              {renderizarContenido(ultimaNoticia.contenido)}
            </p>
            <p className="text-white/30 text-xs mt-3">
              {formatearFecha(ultimaNoticia.created_at)}
            </p>
          </div>
        ))}

      {restoNoticias.length > 0 && (
        <div className="flex flex-col gap-2 mb-8">
          {restoNoticias.map((n) =>
            editandoId === n.id ? (
              <FormularioNoticia
                key={n.id}
                valorInicial={{
                  titulo: n.titulo,
                  contenido: n.contenido,
                  imagen_url: n.imagen_url || '',
                }}
                onGuardar={handleGuardarEdicion}
                onCancelar={() => setEditandoId(null)}
                textoBoton="Guardar cambios"
              />
            ) : (
              <div
                key={n.id}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white font-display text-lg leading-tight">
                    {n.titulo}
                  </p>
                  {esAdmin && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditandoId(n.id);
                          setMostrarForm(false);
                        }}
                        className="text-cyan-brand/70 hover:text-cyan-brand transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => eliminarNoticia(n.id)}
                        className="text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {n.imagen_url && (
                  <img
                    src={n.imagen_url}
                    alt=""
                    className="w-full rounded-lg mt-2 max-h-48 object-cover"
                  />
                )}
                <p className="text-white/60 text-sm mt-1 whitespace-pre-line">
                  {renderizarContenido(n.contenido)}
                </p>
                <p className="text-white/25 text-xs mt-2">
                  {formatearFecha(n.created_at)}
                </p>
              </div>
            )
          )}
        </div>
      )}
      {ultimaNoticia && restoNoticias.length === 0 && <div className="mb-8" />}

      {/* Redes sociales y ubicación */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
        Encuéntranos
      </p>
      <div className="flex flex-col gap-2 mb-8">
        <a
          href={`https://instagram.com/${INSTAGRAM_USUARIO}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-4 transition-transform active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <AtSign size={18} className="text-white/60" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Instagram</p>
            <p className="text-white/50 text-xs">@{INSTAGRAM_USUARIO}</p>
          </div>
        </a>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            DIRECCION
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-4 transition-transform active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-white/60" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Cómo llegar</p>
            <p className="text-white/50 text-xs">{DIRECCION}</p>
          </div>
        </a>
      </div>

      {/* Preguntas frecuentes */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
        Preguntas frecuentes
      </p>
      <div className="flex flex-col gap-2 mb-8">
        {PREGUNTAS_FRECUENTES.map((item, i) => {
          const abierta = faqAbierta === i;
          return (
            <div
              key={i}
              className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setFaqAbierta(abierta ? null : i)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle
                    size={15}
                    className="text-cyan-brand/70 shrink-0"
                  />
                  <p className="text-white text-sm font-medium">
                    {item.pregunta}
                  </p>
                </div>
                {abierta ? (
                  <ChevronUp size={16} className="text-white/40 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-white/40 shrink-0" />
                )}
              </button>
              {abierta && (
                <p className="text-white/60 text-sm px-4 pb-4 pl-11">
                  {item.respuesta}
                </p>
              )}
            </div>
          );
        })}
      </div>

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

      <Link
        to="/terminos"
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
      </Link>

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
