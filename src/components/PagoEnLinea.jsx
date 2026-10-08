import { useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { montoPlanDe, formatearPesos } from '../lib/ingresos';

// Lo que devuelve Mercado Pago al volver a la app (?pago=ok | pendiente | error)
function leerResultado() {
  try {
    const q = new URLSearchParams(window.location.search);
    const r = q.get('pago');
    if (r) window.history.replaceState(null, '', window.location.pathname);
    return r;
  } catch (e) {
    return null;
  }
}

const RESULTADOS = {
  ok: {
    icon: CheckCircle2,
    clase: 'bg-cyan-brand/10 border-cyan-brand/40 text-cyan-brand',
    texto: '¡Pago recibido! Tu plan se renueva solo en unos segundos. Si aún no ves el cambio, cierra y vuelve a abrir la app.',
  },
  pendiente: {
    icon: Clock,
    clase: 'bg-yellow-400/10 border-yellow-400/30 text-yellow-100',
    texto: 'Tu pago quedó pendiente. Cuando Mercado Pago lo apruebe, tu plan se renovará solo y te llegará un aviso.',
  },
  error: {
    icon: AlertTriangle,
    clase: 'bg-red-500/10 border-red-400/30 text-red-200',
    texto: 'El pago no se completó. Puedes intentarlo de nuevo o pagar en el gimnasio.',
  },
};

// Botón para que el alumno pague (renueve) su plan con Mercado Pago.
// Aparece cuando el gimnasio activó el pago en línea y al plan le quedan 10 días o menos.
export default function PagoEnLinea({ diasParaVencer }) {
  const { usuarioActual, planes, infoGimnasio, pagarEnLinea } = useAuth();
  const [resultado] = useState(leerResultado);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const monto = montoPlanDe(usuarioActual, planes);
  const mostrarBoton =
    infoGimnasio?.pago_online_activo &&
    usuarioActual.rol === 'usuario' &&
    usuarioActual.plan_id &&
    monto > 0 &&
    (diasParaVencer === null || diasParaVencer <= 10);

  async function pagar() {
    setCargando(true);
    setError(null);
    const r = await pagarEnLinea();
    if (!r.ok) {
      setError(r.mensaje);
      setCargando(false);
    }
  }

  const res = resultado ? RESULTADOS[resultado] || RESULTADOS.error : null;

  return (
    <>
      {res && (
        <div className={`flex items-start gap-2 border rounded-2xl px-4 py-3 mb-4 text-sm ${res.clase}`}>
          <res.icon size={16} className="shrink-0 mt-0.5" /> {res.texto}
        </div>
      )}
      {mostrarBoton && (
        <div className="mb-4">
          <button
            onClick={pagar}
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-2xl py-3.5 text-sm disabled:opacity-60 transition-transform active:scale-[0.98]"
          >
            <CreditCard size={17} />
            {cargando ? 'Abriendo Mercado Pago...' : `Renovar mi plan en línea · ${formatearPesos(monto)}`}
          </button>
          <p className="text-white/35 text-[11px] text-center mt-1.5">
            Pago seguro con Mercado Pago (tarjeta, débito o transferencia). Tu plan se renueva solo al pagar.
          </p>
          {error && <p className="text-red-400 text-xs text-center mt-1">{error}</p>}
        </div>
      )}
    </>
  );
}
