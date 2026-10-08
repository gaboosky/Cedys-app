import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

// Pantalla a la que llega el link de "Olvidé mi contraseña".
// Supabase lee el link y deja una sesión temporal; aquí se elige la contraseña nueva.
export default function NuevaContrasena() {
  const [estado, setEstado] = useState('verificando'); // verificando | listo | invalido | guardado
  const [password, setPassword] = useState('');
  const [confirma, setConfirma] = useState('');
  const [ver, setVer] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Si el link venció o ya se usó, Supabase lo indica en la dirección.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    if (hash.get('error') || query.get('error')) {
      setEstado('invalido');
      return;
    }

    let resuelto = false;
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (sesion && (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) {
        resuelto = true;
        setEstado('listo');
      }
    });
    supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) {
        resuelto = true;
        setEstado('listo');
      }
    });
    const espera = setTimeout(() => {
      if (!resuelto) setEstado('invalido');
    }, 6000);

    return () => {
      clearTimeout(espera);
      data.subscription.unsubscribe();
    };
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirma) return setError('Las contraseñas no coinciden.');
    setGuardando(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setGuardando(false);
    if (err) {
      if ((err.message || '').toLowerCase().includes('different from the old'))
        return setError('La contraseña nueva debe ser distinta a la anterior.');
      return setError('No se pudo cambiar la contraseña: ' + err.message);
    }
    await supabase.auth.signOut();
    setEstado('guardado');
  }

  function irAlInicio() {
    window.location.href = '/';
  }

  const campo =
    'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-brand transition-colors';

  return (
    <div className="min-h-screen bg-ink flex flex-col justify-center px-8 py-10">
      <div className="mb-8">
        <p className="font-display text-6xl tracking-tight text-white leading-none">
          CED<span className="text-cyan-brand">&amp;</span>S
        </p>
        <p className="text-white/40 text-xs mt-2 tracking-wide">Restablecer contraseña</p>
      </div>

      {estado === 'verificando' && <p className="text-white/50 text-sm">Verificando el link...</p>}

      {estado === 'invalido' && (
        <div className="flex flex-col gap-4">
          <p className="text-white text-base font-semibold">Este link ya no sirve</p>
          <p className="text-white/50 text-sm">
            Puede que haya vencido o que ya se haya usado. Vuelve al inicio, aprieta "Olvidé mi contraseña" y usa el
            correo más reciente que te llegue.
          </p>
          <button onClick={irAlInicio} className="bg-cyan-brand text-ink font-semibold rounded-xl py-3 text-sm">
            Volver al inicio
          </button>
        </div>
      )}

      {estado === 'listo' && (
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <p className="text-white/60 text-sm">Escribe tu nueva contraseña.</p>
          <div className="relative">
            <input
              type={ver ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              autoComplete="new-password"
              className={campo + ' pr-11'}
            />
            <button
              type="button"
              onClick={() => setVer(!ver)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
              aria-label={ver ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {ver ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <input
            type={ver ? 'text' : 'password'}
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            className={campo}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="bg-cyan-brand text-ink font-semibold rounded-xl py-3 text-sm disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      )}

      {estado === 'guardado' && (
        <div className="flex flex-col gap-4">
          <p className="text-white text-base font-semibold">¡Listo! Tu contraseña fue cambiada.</p>
          <p className="text-white/50 text-sm">Ahora entra con tu correo y la contraseña nueva.</p>
          <button onClick={irAlInicio} className="bg-cyan-brand text-ink font-semibold rounded-xl py-3 text-sm">
            Ir a iniciar sesión
          </button>
        </div>
      )}
    </div>
  );
}
