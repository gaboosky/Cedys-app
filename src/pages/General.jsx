import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { hoyLocalISO, sumarDias } from '../lib/ingresos';
import { useAuth } from '../context/AuthContext';
import { subirImagen } from '../lib/storage';
import { EvaluacionPendiente } from '../components/EvaluarClase';
import SaludoCumpleanos from '../components/SaludoCumpleanos';
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
  CalendarClock,
  Flame,
  Ticket,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const WHATSAPP_NUMERO = '56958540928';
const INSTAGRAM_USUARIO = 'ce.cedys';
const DIRECCION = 'Carlos Aguirre Luco 2546, Puente Alto, Santiago, Chile';

const PREGUNTAS_FRECUENTES = [
  {
    pregunta: '¿Cómo cancelo una reserva?',
    respuesta:
      'Ve a "Mis Reservas", elige la clase y toca "Cancelar". Debes hacerlo con al menos {HORAS} horas de anticipación, o la sesión se descontará igual.',
  },
  {
    pregunta: '¿Qué pasa si llego tarde a una clase?',
    respuesta:
      'Se acepta un atraso máximo de 15 minutos. Pasado ese tiempo, se pierde la sesión reservada y no se puede ingresar a esa clase.',
  },
  {
    pregunta: '¿Puedo congelar mi plan si me voy de viaje?',
    respuesta:
      'Esta opción esta disponible para planes desde 3 meses. Para ello, desde tu Perfil puedes solicitar congelar tu membresía.',
  },
  {
    pregunta: '¿Qué hago si la clase que quiero está llena?',
    respuesta:
      'Puedes anotarte en la lista de espera desde esa clase. Si alguien cancela, se te notifica automáticamente para que reserves ese cupo.',
  },
  {
    pregunta: '¿Puedo transferirle mi plan a otra persona?',
    respuesta:
      'No, los planes son instransferibles. Escríbenos por WhatsApp para cualquier duda o caso excepcional.',
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

const FRASES = [
  'Cada clase suma. Lo importante es volver.',
  'No tienes que ser el mejor, solo mejor que ayer.',
  'La constancia le gana a la motivación.',
  'Tu cuerpo agradece cada hora que le dedicas.',
  'Un buen entrenamiento nunca se lamenta.',
  'Pequeños pasos, grandes cambios.',
  'Hoy es un buen día para moverse.',
  'La disciplina es elegir lo que quieres a largo plazo.',
  'Entrenar también es cuidarte.',
  'Lo difícil hoy es lo fácil de mañana.',
  'Llegar ya es la mitad del trabajo.',
  'El progreso no siempre se ve, pero siempre se siente.',
  'Respira, enfócate y dale.',
  'Juntos se entrena mejor.',
];

const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function saludoSegunHora() {
  const h = new Date().getHours();
  if (h < 5) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function fraseDelDia() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), 0, 0);
  const diaDelAnio = Math.floor((hoy - inicio) / 86400000);
  return FRASES[diaDelAnio % FRASES.length];
}

function cuandoEs(fecha, hoy) {
  if (fecha === hoy) return 'Hoy';
  if (fecha === sumarDias(hoy, 1)) return 'Mañana';
  return DIAS_NOMBRE[new Date(fecha + 'T12:00:00').getDay()];
}

function Bienvenida() {
  const { usuarioActual, reservas, horarios, sesionesRestantes, rolEfectivo, coachDeClase, horarioEstaCancelado } = useAuth();
  const vista = rolEfectivo || usuarioActual.rol;
  const esAlumno = vista === 'usuario';
  const esCoach = vista === 'coach';
  const primerNombre = (usuarioActual.nombre || '').trim().split(/\s+/)[0] || '';
  const hoy = hoyLocalISO();

  const datos = useMemo(() => {
    const horarioDe = {};
    for (const h of horarios || []) horarioDe[h.id] = h;
    const ahora = new Date();
    const horaAhora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const confirmadas = (reservas || []).filter((r) => r.estado === 'confirmada');

    // Personas que entrenan hoy en el gimnasio
    const entrenanHoy = new Set(confirmadas.filter((r) => r.fecha === hoy).map((r) => r.usuario_id)).size;

    // Mis reservas
    const mias = confirmadas.filter((r) => r.usuario_id === usuarioActual.id);
    const proximas = mias
      .map((r) => ({ ...r, hora: horarioDe[r.horario_id]?.hora || '' }))
      .filter((r) => r.fecha > hoy || (r.fecha === hoy && r.hora >= horaAhora))
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const proxima = proximas[0] || null;

    const mes = hoy.slice(0, 7);
    const esteMes = mias.filter((r) => r.fecha.startsWith(mes) && r.fecha <= hoy && r.asistio !== false).length;

    // Semana actual (lunes a domingo)
    const diaSemana = (new Date(hoy + 'T12:00:00').getDay() + 6) % 7; // 0 = lunes
    const lunes = sumarDias(hoy, -diaSemana);
    const semana = DIAS_CORTOS.map((letra, i) => {
      const fecha = sumarDias(lunes, i);
      const r = mias.find((x) => x.fecha === fecha);
      let estado = 'nada';
      if (r) estado = fecha < hoy ? (r.asistio === false ? 'nada' : 'fue') : 'reservada';
      return { letra, fecha, estado, esHoy: fecha === hoy };
    });
    const clasesSemana = semana.filter((d) => d.estado === 'fue' || d.estado === 'reservada').length;

    // Para el equipo: clases y alumnos de hoy
    const clasesHoy = new Set(confirmadas.filter((r) => r.fecha === hoy).map((r) => r.horario_id)).size;

    // Para el coach: SOLO sus clases de hoy (las que dicta él, incluido si es reemplazo) y sus alumnos
    const nombreHoy = DIAS_NOMBRE[new Date(hoy + 'T12:00:00').getDay()];
    const misClasesHoy = (horarios || []).filter(
      (h) =>
        (h.fecha_unica ? h.fecha_unica === hoy : h.dia === nombreHoy) &&
        coachDeClase &&
        String(coachDeClase(h, hoy).id) === String(usuarioActual.id) &&
        !(horarioEstaCancelado && horarioEstaCancelado(h.id, hoy))
    );
    const idsMisClases = new Set(misClasesHoy.map((h) => h.id));
    const misAlumnosHoy = new Set(
      confirmadas.filter((r) => r.fecha === hoy && idsMisClases.has(r.horario_id)).map((r) => r.usuario_id)
    ).size;

    return { entrenanHoy, proxima, esteMes, semana, clasesSemana, clasesHoy, misClasesHoy: misClasesHoy.length, misAlumnosHoy };
  }, [reservas, horarios, usuarioActual.id, hoy]);

  const restantes = esAlumno ? sesionesRestantes(usuarioActual) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan-brand/20 bg-gradient-to-br from-[#06343d] via-[#0b1b1f] to-ink p-5 mb-6">
      <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-brand/10 blur-3xl" />

      <div className="relative">
        <p className="text-cyan-brand/80 text-xs font-semibold">{saludoSegunHora()},</p>
        <p className="text-white font-display text-3xl leading-tight mt-0.5">
          {primerNombre} 👋
        </p>
        <p className="text-white/60 text-sm mt-2 flex items-start gap-1.5">
          <Sparkles size={14} className="text-cyan-brand shrink-0 mt-0.5" />
          <span className="italic">{fraseDelDia()}</span>
        </p>

        {esAlumno ? (
          <>
            {/* Próxima clase */}
            {datos.proxima ? (
              <Link
                to="/reservas"
                className="mt-4 flex items-center gap-3 bg-white/[0.07] border border-white/10 rounded-2xl p-3 transition-transform active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-cyan-brand flex items-center justify-center shrink-0">
                  <CalendarClock size={20} className="text-ink" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-[11px] uppercase tracking-wide">Tu próxima clase</p>
                  <p className="text-white font-semibold">
                    {cuandoEs(datos.proxima.fecha, hoy)} · {datos.proxima.hora}
                  </p>
                </div>
                <ChevronRight size={18} className="text-white/40" />
              </Link>
            ) : (
              <Link
                to="/horarios"
                className="mt-4 flex items-center gap-3 bg-cyan-brand rounded-2xl p-3 transition-transform active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-ink/15 flex items-center justify-center shrink-0">
                  <CalendarClock size={20} className="text-ink" />
                </div>
                <div className="flex-1">
                  <p className="text-ink font-semibold">Reserva tu próxima clase</p>
                  <p className="text-ink/70 text-xs">Aún no tienes clases agendadas</p>
                </div>
                <ChevronRight size={18} className="text-ink/60" />
              </Link>
            )}

            {/* Mi semana */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/50 text-[11px] uppercase tracking-wide">Mi semana</p>
                <p className="text-white/50 text-[11px]">
                  {datos.clasesSemana === 0
                    ? '¡A empezar!'
                    : `${datos.clasesSemana} ${datos.clasesSemana === 1 ? 'clase' : 'clases'}`}
                </p>
              </div>
              <div className="flex justify-between">
                {datos.semana.map((d) => (
                  <div key={d.fecha} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                        d.estado === 'fue'
                          ? 'bg-cyan-brand text-ink'
                          : d.estado === 'reservada'
                          ? 'border-2 border-cyan-brand/70 text-cyan-brand'
                          : 'bg-white/[0.06] text-white/30'
                      } ${d.esHoy ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-[#0b1b1f]' : ''}`}
                    >
                      {d.estado === 'fue' ? '✓' : d.letra}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Datos rápidos */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Dato icono={Ticket} valor={restantes ?? '—'} texto={restantes === 1 ? 'sesión disponible' : 'sesiones disponibles'} />
              <Dato icono={Flame} valor={datos.esteMes} texto={datos.esteMes === 1 ? 'clase este mes' : 'clases este mes'} />
              {datos.entrenanHoy > 0 ? (
                <Dato icono={Users} valor={datos.entrenanHoy} texto={datos.entrenanHoy === 1 ? 'persona entrena hoy' : 'personas entrenan hoy'} />
              ) : (
                <Dato icono={Users} valor="💪" texto="¡Sé el primero hoy!" />
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {esCoach ? (
              <>
                <Dato icono={CalendarClock} valor={datos.misClasesHoy} texto={datos.misClasesHoy === 1 ? 'clase mía hoy' : 'clases mías hoy'} />
                <Dato icono={Users} valor={datos.misAlumnosHoy} texto={datos.misAlumnosHoy === 1 ? 'alumno en mis clases hoy' : 'alumnos en mis clases hoy'} />
              </>
            ) : (
              <>
                <Dato icono={CalendarClock} valor={datos.clasesHoy} texto={datos.clasesHoy === 1 ? 'clase con reservas hoy (gym)' : 'clases con reservas hoy (gym)'} />
                <Dato icono={Users} valor={datos.entrenanHoy} texto="alumnos entrenan hoy (gym)" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Dato({ icono: Icono, valor, texto }) {
  return (
    <div className="bg-black/25 border border-white/[0.07] rounded-2xl px-2 py-3 text-center">
      <Icono size={15} className="text-cyan-brand mx-auto" />
      <p className="text-white font-display text-2xl leading-none mt-1.5">{valor}</p>
      <p className="text-white/45 text-[10px] leading-tight mt-1">{texto}</p>
    </div>
  );
}

function haceCuanto(fecha) {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  return new Date(fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
}

function FormularioNoticia({
  valorInicial,
  onGuardar,
  onCancelar,
  textoBoton,
  conAviso,
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

      {conAviso && (
        <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.avisar}
            onChange={(e) => setForm((prev) => ({ ...prev, avisar: e.target.checked }))}
            className="w-4 h-4 accent-cyan-500"
          />
          Avisar a todos al celular
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
    usuarios,
    enviarAvisoMasivo,
    horasAnticipacion,
  } = useAuth();
  const esAdmin = usuarioActual.rol === 'head_coach';

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [faqAbierta, setFaqAbierta] = useState(null);

  function handleCrearNoticia(datos) {
    if (!datos.titulo || !datos.contenido) return;
    const { avisar, ...noticia } = datos;
    crearNoticia(noticia);
    if (avisar) {
      enviarAvisoMasivo(
        usuarios.filter((u) => u.estado === 'activo' && u.id !== usuarioActual.id).map((u) => u.id),
        `Nueva noticia: ${noticia.titulo}`
      );
    }
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


  const [ultimaNoticia, ...restoNoticias] = noticias;

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <Bienvenida />
      <SaludoCumpleanos />
      <EvaluacionPendiente />
      {/* Muro de noticias */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 text-xs uppercase tracking-wide">
          Novedades del gym
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
          valorInicial={{ titulo: '', contenido: '', imagen_url: '', avisar: true }}
          onGuardar={handleCrearNoticia}
          onCancelar={() => setMostrarForm(false)}
          textoBoton="Publicar"
          conAviso
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
              <p className="text-cyan-brand text-[10px] font-semibold tracking-[0.2em] uppercase flex items-center gap-2">
                Última publicación
                {Date.now() - new Date(ultimaNoticia.created_at).getTime() < 3 * 86400000 && (
                  <span className="bg-cyan-brand text-ink rounded-full px-2 py-0.5 tracking-normal">Nuevo</span>
                )}
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
              {haceCuanto(ultimaNoticia.created_at)}
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
                  {haceCuanto(n.created_at)}
                </p>
              </div>
            )
          )}
        </div>
      )}
      {ultimaNoticia && restoNoticias.length === 0 && <div className="mb-8" />}

      {/* Contacto rápido */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
        Estamos cerca
      </p>
      <div className="grid grid-cols-3 gap-2 mb-8">
        <a
          href={`https://wa.me/${WHATSAPP_NUMERO}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/25 rounded-2xl py-4 transition-transform active:scale-95"
        >
          <div className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center">
            <MessageCircle size={20} className="text-white" />
          </div>
          <p className="text-white text-xs font-medium">WhatsApp</p>
        </a>
        <a
          href={`https://instagram.com/${INSTAGRAM_USUARIO}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 bg-pink-500/10 border border-pink-500/25 rounded-2xl py-4 transition-transform active:scale-95"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center">
            <AtSign size={20} className="text-white" />
          </div>
          <p className="text-white text-xs font-medium">Instagram</p>
        </a>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DIRECCION)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 bg-cyan-brand/10 border border-cyan-brand/25 rounded-2xl py-4 transition-transform active:scale-95"
        >
          <div className="w-11 h-11 rounded-full bg-cyan-brand flex items-center justify-center">
            <MapPin size={20} className="text-ink" />
          </div>
          <p className="text-white text-xs font-medium">Cómo llegar</p>
        </a>
      </div>

      {/* Preguntas frecuentes */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
        Preguntas frecuentes
      </p>
      <div className="flex flex-col gap-2 mb-8">
        {PREGUNTAS_FRECUENTES.map((original, i) => {
          // Las horas de anticipación salen de Configuración → Políticas
          const item = { ...original, respuesta: original.respuesta.replace('{HORAS}', String(horasAnticipacion ?? 3)) };
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

      {/* Legal */}
      <div className="flex items-center justify-center gap-4 text-xs text-white/35">
        <Link to="/terminos" className="flex items-center gap-1 hover:text-white/60">
          <FileText size={12} /> Términos y condiciones
        </Link>
        <span>·</span>
        <Link to="/privacidad" className="flex items-center gap-1 hover:text-white/60">
          <Shield size={12} /> Privacidad
        </Link>
      </div>
      <p className="text-center text-white/20 text-[11px] mt-2">{DIRECCION}</p>
    </div>
  );
}
