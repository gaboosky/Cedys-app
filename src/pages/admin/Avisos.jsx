import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { vencimientoDe } from '../../lib/ingresos';
import { Send, Search, Check, Users, RefreshCw, UserMinus, Dumbbell, Globe, UserCheck, Bell, Sparkles } from 'lucide-react';
import { LOGO_CEDS_WORDMARK } from '../../assets/logoWordmark';

const PLANTILLAS = [
  { t: 'Feriado', m: 'El [día] el gimnasio estará cerrado por feriado. ¡Nos vemos a la vuelta! 💪' },
  { t: 'Clase cancelada', m: 'La clase de hoy a las [hora] se cancela. Tu sesión no se descuenta. ¡Disculpa las molestias!' },
  { t: 'Recordatorio de pago', m: 'Te recordamos renovar tu plan para seguir reservando clases. Puedes hacerlo desde tu Perfil o escribirnos. 🙌' },
  { t: 'Nuevo horario', m: '¡Novedad! Sumamos una nueva clase los [día] a las [hora]. Ya puedes reservar desde la app.' },
  { t: 'Motivación', m: '¡Esta semana es tuya! Reserva tus clases y no pierdas el ritmo. Te esperamos en CED&S 🔥' },
];

// Avisos masivos: notificación en la app y al celular para un grupo de personas.
export default function Avisos() {
  const { usuarios, planes, diasRenovacion, enviarAvisoMasivo } = useAuth();
  const [grupo, setGrupo] = useState('alumnos');
  const [mensaje, setMensaje] = useState('');
  const [elegidos, setElegidos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [confirmar, setConfirmar] = useState(false);

  const alumnos = usuarios.filter((u) => u.rol === 'usuario' && u.estado === 'activo');
  const GRUPOS = [
    { valor: 'alumnos', label: 'Alumnos activos', icono: Users, lista: alumnos },
    {
      valor: 'renovar',
      label: 'Por renovar',
      ayuda: 'vencidos o vencen en 7 días',
      icono: RefreshCw,
      lista: alumnos.filter((u) => {
        const v = u.plan_id ? vencimientoDe(u, planes, diasRenovacion) : null;
        return v && v.dias <= 7;
      }),
    },
    { valor: 'sinplan', label: 'Sin plan', icono: UserMinus, lista: alumnos.filter((u) => !u.plan_id) },
    {
      valor: 'coaches',
      label: 'Coaches',
      icono: Dumbbell,
      lista: usuarios.filter((u) => (u.rol === 'coach' || u.rol === 'head_coach') && u.estado !== 'inactivo'),
    },
    { valor: 'todos', label: 'Todos', ayuda: 'alumnos y coaches', icono: Globe, lista: usuarios.filter((u) => u.estado === 'activo') },
    { valor: 'elegir', label: 'Elegir personas', icono: UserCheck, lista: usuarios.filter((u) => elegidos.includes(u.id)) },
  ];
  const actual = GRUPOS.find((g) => g.valor === grupo);
  const destinatarios = actual.lista;

  const texto = busqueda.trim().toLowerCase();
  const candidatos = usuarios
    .filter((u) => u.estado === 'activo')
    .filter((u) => !texto || (u.nombre || '').toLowerCase().includes(texto))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  async function enviar() {
    setEnviando(true);
    const r = await enviarAvisoMasivo(
      destinatarios.map((u) => u.id),
      mensaje
    );
    setEnviando(false);
    setConfirmar(false);
    setResultado(r);
    if (r.ok) setMensaje('');
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-2xl mx-auto">
      <p className="font-display text-3xl text-white leading-tight">Avisos</p>
      <p className="text-white/40 text-xs mt-1 mb-5">
        Llegan como notificación en la app y al celular (a quienes las activaron).
      </p>

      {/* Paso 1: mensaje */}
      <p className="text-white/70 text-sm font-semibold mb-2">
        <span className="text-cyan-brand">1.</span> Escribe el mensaje
      </p>
      <div className="flex gap-1.5 overflow-x-auto -mx-6 px-6 pb-2 mb-1" style={{ scrollbarWidth: 'none' }}>
        {PLANTILLAS.map((pl) => (
          <button
            key={pl.t}
            onClick={() => {
              setMensaje(pl.m);
              setResultado(null);
            }}
            className="shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-white/70 active:scale-95"
          >
            <Sparkles size={11} className="text-cyan-brand" /> {pl.t}
          </button>
        ))}
      </div>
      <textarea
        value={mensaje}
        onChange={(e) => {
          setMensaje(e.target.value);
          setResultado(null);
        }}
        rows={4}
        maxLength={300}
        placeholder="Ej: Mañana lunes cerramos por feriado. ¡Nos vemos el martes!"
        className="w-full bg-black/30 border border-white/10 rounded-2xl px-3.5 py-3 text-white text-sm outline-none focus:border-cyan-brand resize-none"
      />
      <div className="flex justify-between text-[11px] mb-4">
        <span className="text-white/35">{/\[.+?\]/.test(mensaje) ? 'Reemplaza lo que está entre [corchetes].' : ''}</span>
        <span className={mensaje.length > 270 ? 'text-yellow-200' : 'text-white/30'}>{mensaje.length}/300</span>
      </div>

      {/* Vista previa tipo notificación */}
      {mensaje.trim() && (
        <div className="mb-5">
          <p className="text-white/40 text-[11px] uppercase tracking-wide mb-1.5">Así se verá en el celular</p>
          <div className="bg-white/[0.08] backdrop-blur border border-white/15 rounded-2xl p-3 flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-ink border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={LOGO_CEDS_WORDMARK} alt="" className="w-8 h-auto" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold flex items-center gap-1">
                CED&S <span className="text-white/40 font-normal">· ahora</span>
              </p>
              <p className="text-white/85 text-sm leading-snug mt-0.5 whitespace-pre-line">{mensaje}</p>
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: a quién */}
      <p className="text-white/70 text-sm font-semibold mb-2">
        <span className="text-cyan-brand">2.</span> ¿A quién se lo envías?
      </p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {GRUPOS.map((g) => {
          const Icono = g.icono || Bell;
          const activo = grupo === g.valor;
          return (
            <button
              key={g.valor}
              onClick={() => {
                setGrupo(g.valor);
                setResultado(null);
              }}
              className={`relative rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                activo ? 'bg-cyan-brand/10 border-cyan-brand/50' : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icono size={17} className={activo ? 'text-cyan-brand' : 'text-white/50'} />
                <span className={`font-display text-xl leading-none ${activo ? 'text-cyan-brand' : 'text-white/70'}`}>
                  {g.lista.length}
                </span>
              </div>
              <p className={`text-sm mt-2 leading-tight ${activo ? 'text-white' : 'text-white/75'}`}>{g.label}</p>
              {g.ayuda && <p className="text-white/35 text-[10px] leading-tight mt-0.5">{g.ayuda}</p>}
              {activo && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-brand flex items-center justify-center -mt-3 -mr-3">
                  <Check size={10} className="text-ink" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {grupo === 'elegir' && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 mb-4">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre"
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
            />
          </div>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {candidatos.map((u) => {
              const marcado = elegidos.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() =>
                    setElegidos((prev) => (marcado ? prev.filter((x) => x !== u.id) : [...prev, u.id]))
                  }
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      marcado ? 'bg-cyan-brand border-cyan-brand' : 'border-white/30'
                    }`}
                  >
                    {marcado && <Check size={11} className="text-ink" />}
                  </span>
                  <span className="text-white text-sm">{u.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {resultado && (
        <p className={`text-sm mb-3 ${resultado.ok ? 'text-cyan-brand' : 'text-red-400'}`}>{resultado.mensaje}</p>
      )}

      {confirmar ? (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4">
          <p className="text-yellow-100 text-sm mb-3">
            ¿Enviar este aviso a {destinatarios.length} persona{destinatarios.length !== 1 ? 's' : ''}?
          </p>
          <div className="flex gap-2">
            <button
              onClick={enviar}
              disabled={enviando}
              className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Sí, enviar'}
            </button>
            <button onClick={() => setConfirmar(false)} className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmar(true)}
          disabled={!mensaje.trim() || destinatarios.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-2xl py-3.5 text-sm disabled:opacity-40"
        >
          <Send size={15} /> <span className="text-ink/60 font-normal">3.</span> Enviar a {destinatarios.length} persona
          {destinatarios.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
