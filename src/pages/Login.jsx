import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LINK_TERMINOS =
  'https://docs.google.com/forms/d/e/1FAIpQLSfUWWCQPOlvTI5a7tVhAqOti3aYzLIp7N2Np9wAubf5pgxFHQ/viewform';

export default function Login() {
  const { login, error, setError, registrarUsuario, solicitarRecuperacion } =
    useAuth();
  const [modo, setModo] = useState('login'); // 'login' | 'registro' | 'recuperar'
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [mensajeRegistro, setMensajeRegistro] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    rut: '',
    correo: '',
    telefono: '',
    nacionalidad: '',
    fecha_nacimiento: '',
  });
  const [passwordRegistro, setPasswordRegistro] = useState('');
  const [passwordConfirma, setPasswordConfirma] = useState('');
  const [aceptoTerminos, setAceptoTerminos] = useState(false);

  const [correoRecuperar, setCorreoRecuperar] = useState('');
  const [mensajeRecuperar, setMensajeRecuperar] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    await login(correo, password);
    setEnviando(false);
  }

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo);
    setError('');
    setMensajeRegistro(null);
    setMensajeRecuperar(null);
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
      { ...form, acepto_terminos: true },
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="mt-2 bg-cyan-brand text-ink font-semibold rounded-lg py-3 hover:bg-cyan-brandLight transition-colors disabled:opacity-50"
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
