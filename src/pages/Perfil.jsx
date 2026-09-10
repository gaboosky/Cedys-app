import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subirImagen } from '../lib/storage';
import {
  activarNotificacionesPush,
  yaEstaSuscrito,
  pushDisponible,
} from '../lib/push';
import {
  LogOut,
  Mail,
  Phone,
  Fingerprint,
  Cake,
  Flag,
  Pencil,
  Camera,
  Users,
  Calendar,
  ClipboardList,
  Snowflake,
  Flame,
  Award,
  BellRing,
} from 'lucide-react';

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function lunesDeLaSemana(fecha) {
  const dia = fecha.getDay() === 0 ? 7 : fecha.getDay();
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() - (dia - 1));
  return lunes.toISOString().slice(0, 10);
}

function calcularRacha(fechasAsistidas) {
  const semanas = new Set(
    fechasAsistidas.map((f) => lunesDeLaSemana(new Date(f + 'T00:00:00')))
  );
  let racha = 0;
  let cursor = new Date();
  cursor = new Date(lunesDeLaSemana(cursor) + 'T00:00:00');
  while (semanas.has(cursor.toISOString().slice(0, 10))) {
    racha++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return racha;
}

const HITOS = [
  { minimo: 10, nombre: 'Bronce' },
  { minimo: 25, nombre: 'Plata' },
  { minimo: 50, nombre: 'Oro' },
  { minimo: 100, nombre: 'Platino' },
];

function calcularLogro(total) {
  const alcanzado = [...HITOS].reverse().find((h) => total >= h.minimo) || null;
  const siguiente = HITOS.find((h) => total < h.minimo) || null;
  return { alcanzado, siguiente };
}

export default function Perfil() {
  const {
    usuarioActual,
    logout,
    planes,
    sesionesRestantes,
    actualizarPerfil,
    horarios,
    reservas,
    congelacionActivaDe,
    solicitarCongelacion,
    congelaciones,
    rolEfectivo,
    cambiarVista,
  } = useAuth();
  const plan = usuarioActual.plan_id ? planes[usuarioActual.plan_id] : null;
  const restantes = sesionesRestantes(usuarioActual);
  const edad = calcularEdad(usuarioActual.fecha_nacimiento);
  const esAdmin = usuarioActual.rol === 'head_coach';
  const esCoach = rolEfectivo === 'coach';
  const esUsuario = rolEfectivo === 'usuario';

  const congelacionActiva = esUsuario
    ? congelacionActivaDe(usuarioActual.id)
    : null;
  const tienePendiente =
    esUsuario &&
    congelaciones.some(
      (c) => c.usuario_id === usuarioActual.id && c.estado === 'pendiente'
    );

  const misAsistencias = esUsuario
    ? reservas.filter(
        (r) => r.usuario_id === usuarioActual.id && r.asistio === true
      )
    : [];
  const racha = calcularRacha(misAsistencias.map((r) => r.fecha));
  const { alcanzado, siguiente } = calcularLogro(misAsistencias.length);

  const [mostrarCongelar, setMostrarCongelar] = useState(false);
  const [motivoCongelar, setMotivoCongelar] = useState('');
  const [enviandoCongelar, setEnviandoCongelar] = useState(false);
  const [mensajeCongelar, setMensajeCongelar] = useState(null);

  const [editando, setEditando] = useState(false);
  const [pushActivo, setPushActivo] = useState(false);
  const [activandoPush, setActivandoPush] = useState(false);
  const [mensajePush, setMensajePush] = useState(null);

  useEffect(() => {
    if (pushDisponible()) {
      yaEstaSuscrito().then(setPushActivo);
    }
  }, []);

  async function handleActivarPush() {
    setActivandoPush(true);
    const resultado = await activarNotificacionesPush(usuarioActual.id);
    setActivandoPush(false);
    setMensajePush(resultado);
    if (resultado.ok) setPushActivo(true);
    setTimeout(() => setMensajePush(null), 3000);
  }
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [form, setForm] = useState({
    telefono: usuarioActual.telefono || '',
    fecha_nacimiento: usuarioActual.fecha_nacimiento || '',
    nacionalidad: usuarioActual.nacionalidad || '',
  });

  // --- Resumen para coach ---
  const misHorarios = esCoach
    ? horarios.filter((h) => h.coach_id === usuarioActual.id)
    : [];
  const misHorarioIds = misHorarios.map((h) => h.id);
  const alumnosUnicos = esCoach
    ? new Set(
        reservas
          .filter((r) => misHorarioIds.includes(r.horario_id))
          .map((r) => r.usuario_id)
      ).size
    : 0;
  const hoyISO = new Date().toISOString().slice(0, 10);
  const reservasProximas = esCoach
    ? reservas.filter(
        (r) => misHorarioIds.includes(r.horario_id) && r.fecha >= hoyISO
      ).length
    : 0;

  function abrirEdicion() {
    setForm({
      telefono: usuarioActual.telefono || '',
      fecha_nacimiento: usuarioActual.fecha_nacimiento || '',
      nacionalidad: usuarioActual.nacionalidad || '',
    });
    setEditando(true);
    setMensaje(null);
  }

  async function guardar() {
    setGuardando(true);
    const resultado = await actualizarPerfil(usuarioActual.id, form);
    setGuardando(false);
    setMensaje(resultado);
    if (resultado.ok) {
      setTimeout(() => {
        setEditando(false);
        setMensaje(null);
      }, 800);
    }
  }

  async function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy pesada. Usa una de menos de 5MB.');
      return;
    }
    try {
      const url = await subirImagen(file, 'perfil');
      actualizarPerfil(usuarioActual.id, { foto_url: url });
    } catch (err) {
      alert('Error al subir la foto: ' + err.message);
    }
  }

  async function handleSolicitarCongelar(e) {
    e.preventDefault();
    setEnviandoCongelar(true);
    const resultado = await solicitarCongelacion(motivoCongelar);
    setEnviandoCongelar(false);
    setMensajeCongelar(resultado);
    if (resultado.ok) {
      setMotivoCongelar('');
      setTimeout(() => {
        setMostrarCongelar(false);
        setMensajeCongelar(null);
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <div className="w-[72px] h-[72px] rounded-full bg-white border-2 border-cyan-brand shadow-lg shadow-black/40 flex items-center justify-center overflow-hidden">
            {usuarioActual.foto_url ? (
              <img
                src={usuarioActual.foto_url}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display text-2xl text-ink">
                {usuarioActual.nombre.charAt(0)}
              </span>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-cyan-brand rounded-full flex items-center justify-center cursor-pointer border-2 border-ink transition-transform active:scale-90">
            <Camera size={13} className="text-ink" />
            <input
              type="file"
              accept="image/*"
              onChange={handleFoto}
              className="hidden"
            />
          </label>
        </div>
        <div>
          <p className="text-white font-display text-2xl leading-tight">
            {usuarioActual.nombre}
          </p>
          <p className="text-cyan-brand/80 text-xs font-semibold tracking-wide uppercase mt-1 capitalize">
            {usuarioActual.rol.replace('_', ' ')}
          </p>
        </div>
      </div>

      {esAdmin && (
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
            Verme como
          </p>
          <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1">
            {[
              { valor: 'head_coach', label: 'Admin' },
              { valor: 'coach', label: 'Coach' },
              { valor: 'usuario', label: 'Usuario' },
            ].map((opcion) => (
              <button
                key={opcion.valor}
                onClick={() => cambiarVista(opcion.valor)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  rolEfectivo === opcion.valor
                    ? 'bg-cyan-brand text-ink'
                    : 'text-white/50'
                }`}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {esCoach && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <ResumenStat icon={Users} valor={alumnosUnicos} label="Alumnos" />
          <ResumenStat
            icon={Calendar}
            valor={misHorarios.length}
            label="Horarios"
          />
          <ResumenStat
            icon={ClipboardList}
            valor={reservasProximas}
            label="Reservas"
          />
        </div>
      )}

      {plan && (
        <div className="relative bg-white/[0.04] border border-cyan-brand/25 rounded-3xl p-6 mb-4 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-brand" />
          <p className="text-white/50 text-sm mb-1">{plan.nombre}</p>
          {restantes !== null ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl text-cyan-brand">
                  {restantes}
                </span>
                <span className="text-white/50 text-sm">
                  disponibles de {plan.cantidad_sesiones}
                </span>
              </div>
              <p className="text-white/30 text-xs mt-1">
                {usuarioActual.sesiones_usadas} sesión
                {usuarioActual.sesiones_usadas !== 1 ? 'es' : ''} ya utilizada
                {usuarioActual.sesiones_usadas !== 1 ? 's' : ''} este mes
              </p>
            </>
          ) : (
            <p className="font-display text-3xl text-cyan-brand">Ilimitado</p>
          )}
          <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-cyan-brand rounded-full transition-all"
              style={{
                width: plan.cantidad_sesiones
                  ? `${
                      100 -
                      (usuarioActual.sesiones_usadas / plan.cantidad_sesiones) *
                        100
                    }%`
                  : '100%',
              }}
            />
          </div>
        </div>
      )}

      {esUsuario && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <Flame
              size={20}
              className={racha > 0 ? 'text-orange-400' : 'text-white/20'}
            />
            <p className="font-display text-3xl text-white leading-none mt-2">
              {racha}
            </p>
            <p className="text-white/40 text-xs mt-1">
              semana{racha !== 1 ? 's' : ''} seguida{racha !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <Award
              size={20}
              className={alcanzado ? 'text-cyan-brand' : 'text-white/20'}
            />
            <p className="font-display text-lg text-white leading-tight mt-2">
              {alcanzado ? alcanzado.nombre : 'Sin logros'}
            </p>
            <p className="text-white/40 text-xs mt-1">
              {siguiente
                ? `${misAsistencias.length}/${siguiente.minimo} para ${siguiente.nombre}`
                : `${misAsistencias.length} clases completadas`}
            </p>
          </div>
        </div>
      )}

      {esUsuario && congelacionActiva && (
        <div className="bg-blue-400/10 border border-blue-400/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Snowflake size={20} className="text-blue-300 shrink-0" />
          <div>
            <p className="text-blue-200 text-sm font-medium">
              Membresía congelada
            </p>
            <p className="text-white/40 text-xs">
              Hasta el {congelacionActiva.fecha_fin}
            </p>
          </div>
        </div>
      )}

      {esUsuario && !congelacionActiva && (
        <div className="mb-6">
          {!mostrarCongelar ? (
            <button
              onClick={() => setMostrarCongelar(true)}
              disabled={tienePendiente}
              className="flex items-center justify-center gap-2 w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 text-white/70 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
            >
              <Snowflake size={15} />
              {tienePendiente
                ? 'Solicitud de congelamiento pendiente'
                : 'Congelar membresía'}
            </button>
          ) : (
            <form
              onSubmit={handleSolicitarCongelar}
              className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex flex-col gap-2"
            >
              <label className="text-white/40 text-xs block">
                Motivo (opcional)
              </label>
              <textarea
                value={motivoCongelar}
                onChange={(e) => setMotivoCongelar(e.target.value)}
                placeholder="Ej: viaje, lesión..."
                rows={2}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
              />
              {mensajeCongelar && (
                <p
                  className={`text-xs ${
                    mensajeCongelar.ok ? 'text-cyan-brand' : 'text-red-400'
                  }`}
                >
                  {mensajeCongelar.mensaje}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={enviandoCongelar}
                  className="flex-1 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
                >
                  {enviandoCongelar ? 'Enviando...' : 'Enviar solicitud'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarCongelar(false)}
                  className="flex-1 bg-white/10 text-white rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {pushDisponible() && !pushActivo && (
        <button
          onClick={handleActivarPush}
          disabled={activandoPush}
          className="flex items-center justify-center gap-2 w-full bg-white/[0.04] border border-cyan-brand/25 rounded-2xl py-3 text-white/80 text-sm mb-6 transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <BellRing size={15} className="text-cyan-brand" />
          {activandoPush ? 'Activando...' : 'Activar notificaciones'}
        </button>
      )}
      {mensajePush && (
        <p
          className={`text-xs mb-4 -mt-4 ${
            mensajePush.ok ? 'text-cyan-brand' : 'text-red-400'
          }`}
        >
          {mensajePush.mensaje}
        </p>
      )}

      <div className="flex items-center justify-between mb-2">
        <p className="text-white/40 text-xs uppercase tracking-wide">
          Datos personales
        </p>
        {!editando && (
          <button
            onClick={abrirEdicion}
            className="flex items-center gap-1 text-cyan-brand text-xs font-medium transition-transform active:scale-95"
          >
            <Pencil size={13} /> Editar
          </button>
        )}
      </div>

      {editando ? (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <div>
            <label className="text-white/40 text-xs mb-1 block">Teléfono</label>
            <input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
            />
          </div>
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
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Nacionalidad
            </label>
            <input
              value={form.nacionalidad}
              onChange={(e) =>
                setForm({ ...form, nacionalidad: e.target.value })
              }
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand"
            />
          </div>

          {mensaje && (
            <p
              className={`text-sm ${
                mensaje.ok ? 'text-cyan-brand' : 'text-red-400'
              }`}
            >
              {mensaje.mensaje}
            </p>
          )}

          <div className="flex gap-2 mt-1">
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex-1 bg-cyan-brand text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setEditando(false)}
              className="flex-1 bg-white/10 text-white rounded-xl py-2.5 text-sm transition-transform active:scale-[0.98]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/10">
          <InfoRow icon={Fingerprint} label="RUT" value={usuarioActual.rut} />
          <InfoRow icon={Mail} label="Correo" value={usuarioActual.correo} />
          <InfoRow
            icon={Phone}
            label="Teléfono"
            value={usuarioActual.telefono}
          />
          {edad !== null && (
            <InfoRow icon={Cake} label="Edad" value={`${edad} años`} />
          )}
          {usuarioActual.nacionalidad && (
            <InfoRow
              icon={Flag}
              label="Nacionalidad"
              value={usuarioActual.nacionalidad}
            />
          )}
        </div>
      )}

      <button
        onClick={logout}
        className="w-full mt-8 flex items-center justify-center gap-2 text-white/50 py-3 rounded-2xl border border-white/10 hover:text-white hover:border-white/30 transition-all active:scale-[0.98]"
      >
        <LogOut size={18} />
        <span className="text-sm">Cerrar sesión</span>
      </button>
    </div>
  );
}

function ResumenStat({ icon: Icon, valor, label }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 text-center">
      <Icon size={16} className="text-cyan-brand/70 mx-auto mb-1" />
      <p className="font-display text-xl text-white leading-none">{valor}</p>
      <p className="text-white/40 text-[10px] mt-1">{label}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Icon size={18} className="text-cyan-brand/70" />
      <div>
        <p className="text-white/40 text-xs">{label}</p>
        <p className="text-white text-sm">{value}</p>
      </div>
    </div>
  );
}
