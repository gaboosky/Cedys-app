import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MEDIOS_PAGO, hoyLocalISO, montoPlanDe, venceSugerido, fechaVenceDe } from '../lib/ingresos';

// Formulario para registrar un pago.
// - usuarioFijo: si viene, el alumno ya está elegido (ej. desde su tarjeta en Usuarios).
// - soloRenovacion: el pago siempre renueva el plan (no muestra la opción).
export default function FormularioPago({ usuarioFijo, soloRenovacion = false, onCancelar, onListo }) {
  const { usuarios, planes, diasRenovacion, confirmarRenovacion, registrarPago } = useAuth();

  const [usuarioId, setUsuarioId] = useState(usuarioFijo?.id || '');
  const usuario = usuarioFijo || usuarios.find((u) => u.id === usuarioId);
  const [monto, setMonto] = useState(usuarioFijo ? String(montoPlanDe(usuarioFijo, planes) || '') : '');
  const [medio, setMedio] = useState('transferencia');
  const [fecha, setFecha] = useState(hoyLocalISO());
  const [renueva, setRenueva] = useState(soloRenovacion || !!usuarioFijo?.plan_id);
  // Fecha en que vence el plan con este pago (sugerida, pero editable)
  const [vence, setVence] = useState(() =>
    usuarioFijo?.plan_id ? venceSugerido(usuarioFijo, planes, diasRenovacion, hoyLocalISO()) : ''
  );
  const [venceEditado, setVenceEditado] = useState(false);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const candidatos = usuarios
    .filter((u) => u.estado === 'activo')
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  function elegirUsuario(id) {
    setUsuarioId(id);
    const u = usuarios.find((x) => x.id === id);
    setMonto(u ? String(montoPlanDe(u, planes) || '') : '');
    setRenueva(!!u?.plan_id);
    setVence(u?.plan_id ? venceSugerido(u, planes, diasRenovacion, fecha) : '');
    setVenceEditado(false);
  }

  function cambiarFecha(valor) {
    setFecha(valor);
    if (!venceEditado && usuario?.plan_id && valor) setVence(venceSugerido(usuario, planes, diasRenovacion, valor));
  }

  function restablecerVence() {
    if (usuario?.plan_id) setVence(venceSugerido(usuario, planes, diasRenovacion, fecha));
    setVenceEditado(false);
  }

  const venceAnterior = usuario ? fechaVenceDe(usuario, planes, diasRenovacion) : null;
  const textoFecha = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  async function guardar() {
    setError('');
    if (!usuario) return setError('Elige un alumno.');
    if (!monto || Number(monto) <= 0) return setError('Ingresa el monto.');
    if (renueva && !usuario.plan_id) return setError('Este alumno no tiene plan asignado; desmarca "Renueva su plan".');
    if (renueva && (!vence || vence <= fecha)) return setError('La fecha de vencimiento debe ser posterior a la fecha del pago.');

    setEnviando(true);
    const resultado = renueva
      ? await confirmarRenovacion(usuario.id, { monto: Number(monto), medio, fecha, nota, vence })
      : await registrarPago({ usuarioId: usuario.id, monto: Number(monto), medio, fecha, tipo: 'manual', nota });
    setEnviando(false);

    if (!resultado?.ok) return setError(resultado?.mensaje || 'No se pudo registrar el pago.');
    onListo?.(resultado);
  }

  const inputClase =
    'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors';

  return (
    <div className="bg-black/20 border border-white/10 rounded-xl p-3 flex flex-col gap-2.5">
      {!usuarioFijo && (
        <div>
          <label className="text-white/40 text-xs mb-1 block">Alumno</label>
          <select value={usuarioId} onChange={(e) => elegirUsuario(e.target.value)} className={inputClase}>
            <option value="">Elige un alumno…</option>
            {candidatos.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
                {u.plan_id && planes[u.plan_id] ? ` · ${planes[u.plan_id].nombre}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-white/40 text-xs mb-1 block">Monto ($)</label>
          <input
            type="number"
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={inputClase}
          />
        </div>
        <div className="flex-1">
          <label className="text-white/40 text-xs mb-1 block">Fecha del pago</label>
          <input type="date" value={fecha} onChange={(e) => cambiarFecha(e.target.value)} className={inputClase} />
        </div>
      </div>

      {renueva && usuario?.plan_id && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-white/40 text-xs">Vence el</label>
            {venceEditado && (
              <button type="button" onClick={restablecerVence} className="text-cyan-brand text-[11px] font-medium">
                Usar fecha sugerida
              </button>
            )}
          </div>
          <input
            type="date"
            value={vence}
            min={fecha}
            onChange={(e) => {
              setVence(e.target.value);
              setVenceEditado(true);
            }}
            className={inputClase}
          />
          <p className="text-white/30 text-[11px] mt-1">
            {venceEditado
              ? 'Fecha elegida a mano.'
              : venceAnterior
              ? `Sugerida: mismo día del mes que su vencimiento anterior (${textoFecha(venceAnterior)}).`
              : 'Sugerida: mismo día del mes, contando desde la fecha del pago.'}
          </p>
        </div>
      )}

      <div>
        <label className="text-white/40 text-xs mb-1 block">Medio de pago</label>
        <div className="flex bg-black/20 border border-white/10 rounded-lg p-1">
          {MEDIOS_PAGO.map((m) => (
            <button
              key={m.valor}
              type="button"
              onClick={() => setMedio(m.valor)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                medio === m.valor ? 'bg-cyan-brand text-ink' : 'text-white/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {!soloRenovacion && (
        <label className="flex items-start gap-2 text-xs text-white/60 cursor-pointer">
          <input
            type="checkbox"
            checked={renueva}
            onChange={(e) => setRenueva(e.target.checked)}
            className="mt-0.5 accent-cyan-500"
          />
          <span>
            Renueva su plan
            <span className="block text-white/30">
              Reinicia sus sesiones y cuenta como su pago del período. Desmárcalo para pagos sueltos (ej. una clase extra).
            </span>
          </span>
        </label>
      )}

      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota (opcional)"
        className={inputClase}
      />

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={enviando}
          className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
        >
          {enviando ? 'Guardando...' : 'Registrar pago'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 bg-white/10 text-white rounded-lg py-2 text-sm transition-transform active:scale-[0.98]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
