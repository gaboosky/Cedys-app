import { useState } from 'react';
import { CalendarCheck, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors';

function leerCorreoGuardado() {
  try {
    return localStorage.getItem('cedys_ultimo_correo') || '';
  } catch (e) {
    return '';
  }
}

const PRUEBA_VACIA = { nombre: '', telefono: '', correo: '', preferencia: '', comentario: '' };

// Datos que pueden venir en el link: ?ref= (amigo que recomienda) y, en el link de registro
// que manda el admin después de la sesión de prueba, ?p= (solicitud) &n= &t= &c= (nombre, teléfono, correo).
function leerParametros() {
  try {
    const q = new URLSearchParams(window.location.search);
    return { ref: q.get('ref') || '', p: q.get('p') || '', n: q.get('n') || '', t: q.get('t') || '', c: q.get('c') || '' };
  } catch (e) {
    return { ref: '', p: '', n: '', t: '', c: '' };
  }
}

const LINK_TERMINOS =
  'https://docs.google.com/forms/d/e/1FAIpQLSfUWWCQPOlvTI5a7tVhAqOti3aYzLIp7N2Np9wAubf5pgxFHQ/viewform';

export default function Login({ inicial = 'login' }) {
  const { login, error, setError, registrarUsuario, solicitarRecuperacion, enviarSolicitudPrueba } =
    useAuth();
  const [modo, setModo] = useState(inicial); // 'login' | 'registro' | 'recuperar' | 'prueba'
  const [correo, setCorreo] = useState(leerCorreoGuardado);
  const [mantener, setMantener] = useState(true);
  const [params] = useState(leerParametros);
  const [prueba, setPrueba] = useState(PRUEBA_VACIA);
  const [mensajePrueba, setMensajePrueba] = useState(null);
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [mensajeRegistro, setMensajeRegistro] = useState(null);
  const [form, setForm] = useState(() => ({
    nombre: params.n,
    rut: '',
    correo: params.c,
    telefono: params.t,
    nacionalidad: '',
    fecha_nacimiento: '',
    obs_salud: '',
  }));

  const [passwordRegistro, setPasswordRegistro] = useState('');
  const [passwordConfirma, setPasswordConfirma] = useState('');
  const [aceptoTerminos, setAceptoTerminos] = useState(false);

  const [correoRecuperar, setCorreoRecuperar] = useState('');
  const [mensajeRecuperar, setMensajeRecuperar] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      localStorage.setItem('cedys_ultimo_correo', correo.trim());
    } catch (err) {
      // sin almacenamiento disponible
    }
    await login(correo, password, mantener);
    setEnviando(false);
  }

  async function handlePrueba(e) {
    e.preventDefault();
    setEnviando(true);
    const resultado = await enviarSolicitudPrueba({ ...prueba, referido_por: params.ref });
    setEnviando(false);
    setMensajePrueba(resultado);
    if (resultado.ok) setPrueba(PRUEBA_VACIA);
  }

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo);
    setError('');
    setMensajeRegistro(null);
    setMensajeRecuperar(null);
    setMensajePrueba(null);
    if (window.location.pathname !== '/') window.history.replaceState(null, '', '/');
  }

  async function handleRegistro(e) {
    e.preventDefault();
    if (passwordRegistro.length < 6) {
      setMensajeRegistro({
        ok: false,
        mensaje: 'La contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }
    if (passwordRegistro !== passwordConfirma) {
      setMensajeRegistro({
        ok: false,
        mensaje: 'Las contraseñas no coinciden.',
      });
      return;
    }
    if (!aceptoTerminos) {
      setMensajeRegistro({
        ok: false,
        mensaje: 'Debes aceptar los términos y condiciones para continuar.',
      });
      return;
    }
    setEnviando(true);
    const resultado = await registrarUsuario(
      { ...form, acepto_terminos: true, origen_prueba_id: params.p || null },
      passwordRegistro
    );
    setEnviando(false);
    setMensajeRegistro(resultado);
    if (resultado.ok) {
      setForm({
        nombre: '',
        rut: '',
        correo: '',
        telefono: '',
        nacionalidad: '',
        fecha_nacimiento: '',
        obs_salud: '',
      });
      setPasswordRegistro('');
      setPasswordConfirma('');
      setAceptoTerminos(false);
    }
  }

  async function handleRecuperar(e) {
    e.preventDefault();
    setEnviando(true);
    const resultado = await solicitarRecuperacion(correoRecuperar);
    setEnviando(false);
    setMensajeRecuperar(resultado);
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col justify-center px-8 py-10">
      <div className="mb-8">
        <p className="font-display text-6xl tracking-tight text-white leading-none">
          CED<span className="text-cyan-brand">&amp;</span>S
        </p>
        <p className="text-white/40 text-xs mt-2 tracking-wide">
          Ciencias del Entrenamiento para el Deporte y la Salud
        </p>
      </div>

      {modo === 'login' && (
        <button
          type="button"
          onClick={() => cambiarModo('prueba')}
          className="mb-6 w-full flex items-center gap-3 bg-cyan-brand/10 border border-cyan-brand/40 rounded-2xl px-4 py-3.5 text-left hover:bg-cyan-brand/15 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-cyan-brand/20 flex items-center justify-center shrink-0">
            <CalendarCheck size={20} className="text-cyan-brand" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-white font-semibold text-sm">Pide tu sesión de prueba</span>
            <span className="block text-white/50 text-xs">¿Primera vez en CED&amp;S? Déjanos tus datos y te contactamos.</span>
          </span>
          <ChevronRight size={18} className="text-cyan-brand shrink-0" />
        </button>
      )}

      {modo === 'prueba' && (
        <form onSubmit={handlePrueba} className="flex flex-col gap-3">
          <div className="mb-1">
            <p className="text-white text-lg font-semibold">Sesión de prueba</p>
            <p className="text-white/50 text-sm">
              Completa tus datos y te contactaremos para agendar tu primera clase.
            </p>
            {params.ref && (
              <p className="text-cyan-brand text-sm mt-1">🙌 Te invitó un amigo que entrena con nosotros.</p>
            )}
          </div>
          <input
            value={prueba.nombre}
            onChange={(e) => setPrueba({ ...prueba, nombre: e.target.value })}
            placeholder="Nombre y apellido"
            className={INPUT}
            required
          />
          <input
            type="tel"
            value={prueba.telefono}
            onChange={(e) => setPrueba({ ...prueba, telefono: e.target.value })}
            placeholder="Teléfono / WhatsApp"
            className={INPUT}
            required
          />
          <input
            type="email"
            value={prueba.correo}
            onChange={(e) => setPrueba({ ...prueba, correo: e.target.value })}
            placeholder="Correo (opcional)"
            className={INPUT}
          />
          <input
            value={prueba.preferencia}
            onChange={(e) => setPrueba({ ...prueba, preferencia: e.target.value })}
            placeholder="Días u horario que te acomodan"
            className={INPUT}
          />
          <textarea
            value={prueba.comentario}
            onChange={(e) => setPrueba({ ...prueba, comentario: e.target.value })}
            placeholder="Cuéntanos tu objetivo o algo importante (lesión, enfermedad, etc.) — opcional"
            rows={3}
            className={INPUT + ' resize-none'}
          />
          {mensajePrueba && (
            <p className={`text-sm ${mensajePrueba.ok ? 'text-cyan-brand' : 'text-red-400'}`}>
              {mensajePrueba.mensaje}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="mt-1 bg-cyan-brand text-ink font-semibold rounded-lg py-3 hover:bg-cyan-brandLight transition-colors disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Pedir sesión de prueba'}
          </button>
        </form>
      )}

      {modo === 'login' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-white/60 text-sm mb-1 block">Correo</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.cl"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
            />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1 block">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
            />
          </div>

          <label className="flex items-center gap-2 text-white/60 text-sm select-none">
            <input
              type="checkbox"
              checked={mantener}
              onChange={(e) => setMantener(e.target.checked)}
              className="w-4 h-4 accent-cyan-brand"
            />
            Mantener sesión iniciada
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="mt-1 bg-cyan-brand text-ink font-semibold rounded-lg py-3 hover:bg-cyan-brandLight transition-colors disabled:opacity-50"
          >
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => cambiarModo('recuperar')}
            className="text-white/40 text-sm text-center mt-1 hover:text-white/70 transition-colors"
          >
            Olvidé mi contraseña
          </button>
        </form>
      )}

      {modo === 'recuperar' && (
        <form onSubmit={handleRecuperar} className="flex flex-col gap-4">
          <p className="text-white/50 text-sm">
            Ingresa tu correo y te enviaremos un link para restablecer tu
            contraseña.
          </p>
          <input
            type="email"
            value={correoRecuperar}
            onChange={(e) => setCorreoRecuperar(e.target.value)}
            placeholder="tu@correo.cl"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
          />
          {mensajeRecuperar && (
            <p
              className={`text-sm ${
                mensajeRecuperar.ok ? 'text-cyan-brand' : 'text-red-400'
              }`}
            >
              {mensajeRecuperar.mensaje}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="bg-cyan-brand text-ink font-semibold rounded-lg py-3 disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>
      )}

      {modo === 'registro' && (
        <form onSubmit={handleRegistro} className="flex flex-col gap-3">
          {params.p && (
            <p className="text-cyan-brand text-sm mb-1">
              ¡Qué bueno que te quedas con nosotros! Completa tus datos para crear tu cuenta.
            </p>
          )}
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Nombre completo"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
            required
          />
          <input
            value={form.rut}
            onChange={(e) => setForm({ ...form, rut: e.target.value })}
            placeholder="RUT"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
            required
          />
          <input
            value={form.nacionalidad}
            onChange={(e) => setForm({ ...form, nacionalidad: e.target.value })}
            placeholder="Nacionalidad"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
          />
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) =>
                setForm({ ...form, fecha_nacimiento: e.target.value })
              }
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-brand transition-colors"
              required
            />
          </div>
          <input
            type="email"
            value={form.correo}
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
            placeholder="Correo"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
            required
          />
          <input
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="Teléfono"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
            required
          />
          <input
            type="password"
            value={passwordRegistro}
            onChange={(e) => setPasswordRegistro(e.target.value)}
            placeholder="Contraseña (mínimo 6 caracteres)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
            required
          />
          <input
            type="password"
            value={passwordConfirma}
            onChange={(e) => setPasswordConfirma(e.target.value)}
            placeholder="Confirma tu contraseña"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-cyan-brand transition-colors"
            required
          />
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              OBS (opcional): algo que tu coach deba saber
            </label>
            <textarea
              value={form.obs_salud}
              onChange={(e) => setForm({ ...form, obs_salud: e.target.value })}
              placeholder="Ej: enfermedad, lesión u otro dato importante"
              rows={3}
              maxLength={500}
              className={INPUT + ' resize-none'}
            />
          </div>

          <label className="flex items-start gap-2 text-white/60 text-xs">
            <input
              type="checkbox"
              checked={aceptoTerminos}
              onChange={(e) => setAceptoTerminos(e.target.checked)}
              className="mt-0.5 accent-cyan-brand"
            />
            <span>
              He leído y acepto los{' '}
              <a
                href={LINK_TERMINOS}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-brand underline"
              >
                términos y condiciones
              </a>
            </span>
          </label>

          {mensajeRegistro && (
            <p
              className={`text-sm ${
                mensajeRegistro.ok ? 'text-cyan-brand' : 'text-red-400'
              }`}
            >
              {mensajeRegistro.mensaje}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-2 bg-cyan-brand text-ink font-semibold rounded-lg py-3 hover:bg-cyan-brandLight transition-colors disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        {modo === 'login' && (
          <button
            onClick={() => cambiarModo('registro')}
            className="text-white/50 text-sm hover:text-white transition-colors"
          >
            ¿No tienes cuenta?{' '}
            <span className="text-cyan-brand">Regístrate</span>
          </button>
        )}
        {modo === 'prueba' && (
          <button
            onClick={() => cambiarModo('login')}
            className="text-white/50 text-sm hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Volver a <span className="text-cyan-brand">iniciar sesión</span>
          </button>
        )}
        {(modo === 'registro' || modo === 'recuperar') && (
          <button
            onClick={() => cambiarModo('login')}
            className="text-white/50 text-sm hover:text-white transition-colors"
          >
            ¿Ya tienes cuenta?{' '}
            <span className="text-cyan-brand">Inicia sesión</span>
          </button>
        )}
      </div>
    </div>
  );
}
