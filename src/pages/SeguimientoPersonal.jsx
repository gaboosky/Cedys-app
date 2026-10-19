import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Target, Ruler, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SeguimientoDashboard from '../components/SeguimientoDashboard';
import HistorialMediciones from '../components/HistorialMediciones';
import {
  OBJETIVOS,
  MEDIDAS,
  resumenSeguimiento,
  formatear,
} from '../lib/seguimientoPersonal';
import { hoyLocalISO } from '../lib/ingresos';

const CAMPO =
  'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand placeholder-white/25';

function FormularioPlan({ plan, onGuardar, onCancelar, onEliminar }) {
  const [form, setForm] = useState({
    objetivo: plan?.objetivo || 'bajar_peso',
    objetivo_detalle: plan?.objetivo_detalle || '',
    fecha_inicio: plan?.fecha_inicio || hoyLocalISO(),
    semanas: plan?.semanas ?? 12,
    sesiones_semana: plan?.sesiones_semana ?? 3,
    estatura_cm: plan?.estatura_cm ?? '',
    peso_meta: plan?.peso_meta ?? '',
    grasa_meta: plan?.grasa_meta ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function guardar() {
    setGuardando(true);
    const r = await onGuardar(form);
    setGuardando(false);
    if (!r.ok) setMensaje(r);
  }

  return (
    <div className="bg-white/[0.04] border border-cyan-brand/30 rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-white font-semibold flex items-center gap-2">
        <Target size={16} className="text-cyan-brand" />{' '}
        {plan ? 'Editar plan de seguimiento' : 'Nuevo plan de seguimiento'}
      </p>
      <div>
        <label className="text-white/40 text-xs mb-1 block">Objetivo</label>
        <select
          value={form.objetivo}
          onChange={set('objetivo')}
          className={CAMPO}
        >
          {OBJETIVOS.map((o) => (
            <option key={o.valor} value={o.valor} className="bg-ink">
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-white/40 text-xs mb-1 block">
          Detalle del objetivo (lo ve el alumno)
        </label>
        <textarea
          value={form.objetivo_detalle}
          onChange={set('objetivo_detalle')}
          rows={2}
          placeholder="Ej: bajar 6 kg y mejorar la resistencia para correr 10K"
          className={CAMPO + ' resize-none'}
        />
      </div>
      <div>
        <label className="text-white/40 text-xs mb-1 block">
          Fecha de inicio
        </label>
        <input
          type="date"
          value={form.fecha_inicio}
          onChange={set('fecha_inicio')}
          className={CAMPO}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-white/40 text-xs mb-1 block">
            Duración (semanas)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="104"
            value={form.semanas}
            onChange={set('semanas')}
            className={CAMPO}
          />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">
            Sesiones por semana
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="14"
            value={form.sesiones_semana}
            onChange={set('sesiones_semana')}
            className={CAMPO}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-white/40 text-xs mb-1 block">
            Estatura (cm)
          </label>
          <input
            inputMode="decimal"
            value={form.estatura_cm}
            onChange={set('estatura_cm')}
            placeholder="165"
            className={CAMPO}
          />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">
            Peso meta (kg)
          </label>
          <input
            inputMode="decimal"
            value={form.peso_meta}
            onChange={set('peso_meta')}
            placeholder="Opcional"
            className={CAMPO}
          />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">
            % grasa meta
          </label>
          <input
            inputMode="decimal"
            value={form.grasa_meta}
            onChange={set('grasa_meta')}
            placeholder="Opcional"
            className={CAMPO}
          />
        </div>
      </div>
      {mensaje && <p className="text-red-400 text-xs">{mensaje.mensaje}</p>}
      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar plan'}
        </button>
        <button
          onClick={onCancelar}
          className="px-4 bg-white/10 text-white rounded-xl text-sm"
        >
          Cancelar
        </button>
      </div>
      {plan && onEliminar && (
        <div className="border-t border-white/10 pt-3">
          {confirmarBorrar ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-200 text-xs">
                ¿Eliminar este plan? Se borra el objetivo, las semanas y las
                metas. Las mediciones del alumno se conservan.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={async () => {
                    setGuardando(true);
                    const r = await onEliminar();
                    setGuardando(false);
                    if (!r.ok) setMensaje(r);
                  }}
                  disabled={guardando}
                  className="flex-1 bg-red-500 text-white font-semibold rounded-lg py-2 text-xs disabled:opacity-50"
                >
                  Sí, eliminar plan
                </button>
                <button
                  onClick={() => setConfirmarBorrar(false)}
                  className="px-3 bg-white/10 text-white rounded-lg text-xs"
                >
                  No
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmarBorrar(true)}
              className="flex items-center gap-1.5 text-red-300/80 text-xs"
            >
              <Trash2 size={13} /> Eliminar plan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FormularioMedicion({ inicial, ultimas, onGuardar, onCancelar }) {
  const [form, setForm] = useState(() => {
    const base = {
      fecha: inicial?.fecha || hoyLocalISO(),
      comentario: inicial?.comentario || '',
    };
    for (const m of MEDIDAS) base[m.clave] = inicial?.[m.clave] ?? '';
    return base;
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function guardar() {
    setGuardando(true);
    const r = await onGuardar(form);
    setGuardando(false);
    if (!r.ok) setMensaje(r);
  }

  return (
    <div className="bg-white/[0.04] border border-cyan-brand/30 rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-white font-semibold flex items-center gap-2">
        <Ruler size={16} className="text-cyan-brand" />{' '}
        {inicial ? 'Editar medición' : 'Nueva medición'}
      </p>
      <div>
        <label className="text-white/40 text-xs mb-1 block">Fecha</label>
        <input
          type="date"
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          className={CAMPO}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {MEDIDAS.map((m) => (
          <div key={m.clave}>
            <label className="text-white/40 text-xs mb-1 block">
              {m.label} ({m.unidad})
            </label>
            <input
              inputMode="decimal"
              value={form[m.clave]}
              onChange={(e) => setForm({ ...form, [m.clave]: e.target.value })}
              placeholder={
                ultimas?.[m.clave] != null
                  ? `Antes: ${formatear(ultimas[m.clave], m.unidad)}`
                  : ''
              }
              className={CAMPO}
            />
          </div>
        ))}
      </div>
      <div>
        <label className="text-white/40 text-xs mb-1 block">
          Comentario (lo ve el alumno)
        </label>
        <textarea
          value={form.comentario}
          onChange={(e) => setForm({ ...form, comentario: e.target.value })}
          rows={2}
          placeholder="Ej: ¡Bajaste 2 cm de cintura este mes, sigue así!"
          className={CAMPO + ' resize-none'}
        />
      </div>
      <p className="text-white/35 text-[11px]">
        Puedes dejar en blanco las medidas que no tomaste.
      </p>
      {mensaje && <p className="text-red-400 text-xs">{mensaje.mensaje}</p>}
      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar medición'}
        </button>
        <button
          onClick={onCancelar}
          className="px-4 bg-white/10 text-white rounded-xl text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// Seguimiento personal de un alumno (para coaches y admin).
export default function SeguimientoPersonal() {
  const { usuarioId } = useParams();
  const navigate = useNavigate();
  const {
    usuarios,
    planesSeguimiento,
    mediciones,
    reservas,
    guardarPlanSeguimiento,
    eliminarPlanSeguimiento,
    guardarMedicion,
    eliminarMedicion,
  } = useAuth();
  const alumno = usuarios.find((u) => String(u.id) === String(usuarioId));
  const plan =
    (planesSeguimiento || []).find(
      (p) => String(p.usuario_id) === String(usuarioId)
    ) || null;
  const [editandoPlan, setEditandoPlan] = useState(false);
  const [medicion, setMedicion] = useState(null); // null | 'nueva' | objeto a editar
  const [aviso, setAviso] = useState(null);

  if (!alumno)
    return (
      <p className="text-white/40 text-sm p-6">No encontré a este alumno.</p>
    );

  const r = resumenSeguimiento({ plan, mediciones, reservas, usuarioId });
  const ultimas = Object.fromEntries(r.medidas.map((m) => [m.clave, m.actual]));

  function mostrar(msg) {
    setAviso(msg);
    setTimeout(() => setAviso(null), 2500);
  }

  async function guardarPlan(form) {
    const res = await guardarPlanSeguimiento(usuarioId, form);
    if (res.ok) {
      setEditandoPlan(false);
      mostrar(res.mensaje);
    }
    return res;
  }

  async function eliminarPlan() {
    const res = await eliminarPlanSeguimiento(usuarioId);
    if (res.ok) {
      setEditandoPlan(false);
      mostrar(res.mensaje);
    }
    return res;
  }

  async function guardarMed(form) {
    const res = await guardarMedicion(
      usuarioId,
      form,
      medicion && medicion !== 'nueva' ? medicion.id : null
    );
    if (res.ok) {
      setMedicion(null);
      mostrar(res.mensaje);
    }
    return res;
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-white/50 text-sm mb-3"
      >
        <ArrowLeft size={15} /> Volver
      </button>
      <p className="font-display text-3xl text-white leading-tight">
        {alumno.nombre}
      </p>
      <p className="text-white/40 text-xs mt-1 mb-4">
        Seguimiento personal · el alumno lo ve en su app (Progreso)
      </p>

      {aviso && <p className="text-cyan-brand text-sm mb-3">{aviso}</p>}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setMedicion('nueva');
            setEditandoPlan(false);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm"
        >
          <Plus size={16} /> Nueva medición
        </button>
        <button
          onClick={() => {
            setEditandoPlan(true);
            setMedicion(null);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.06] border border-white/10 text-white/85 rounded-xl py-2.5 text-sm"
        >
          {plan ? <Pencil size={14} /> : <Target size={14} />}{' '}
          {plan ? 'Editar plan' : 'Crear plan'}
        </button>
      </div>

      {editandoPlan && (
        <div className="mb-4">
          <FormularioPlan
            plan={plan}
            onGuardar={guardarPlan}
            onEliminar={eliminarPlan}
            onCancelar={() => setEditandoPlan(false)}
          />
        </div>
      )}
      {medicion && (
        <div className="mb-4">
          <FormularioMedicion
            key={medicion === 'nueva' ? 'nueva' : medicion.id}
            inicial={medicion === 'nueva' ? null : medicion}
            ultimas={ultimas}
            onGuardar={guardarMed}
            onCancelar={() => setMedicion(null)}
          />
        </div>
      )}

      {!plan && !r.hayDatos && !editandoPlan && !medicion && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-white text-sm">
            Este alumno aún no tiene seguimiento.
          </p>
          <p className="text-white/45 text-xs mt-1">
            Crea su plan (objetivo, semanas y meta) y registra su primera
            medición para ver su avance.
          </p>
        </div>
      )}

      <SeguimientoDashboard usuarioId={usuarioId} vistaStaff />

      <div className="mt-5">
        <HistorialMediciones
          lista={r.historial}
          onEditar={(m) => {
            setMedicion(m);
            setEditandoPlan(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onEliminar={async (id) => {
            const res = await eliminarMedicion(id);
            if (res.ok) mostrar('Medición eliminada.');
          }}
        />
      </div>
    </div>
  );
}
