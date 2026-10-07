import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { horaAFecha } from '../../lib/horarioUtils';
import {
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  MessageSquarePlus,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

function yaSeRealizo(fecha, hora) {
  return Date.now() >= horaAFecha(fecha, hora).getTime() + DOS_HORAS_MS;
}

// La clase ya empezó: desde aquí el coach puede finalizarla.
function yaEmpezo(fecha, hora) {
  return Date.now() >= horaAFecha(fecha, hora).getTime();
}

const COMENTARIO_DEFECTO = 'Sin novedades';

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFechaLarga(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  const texto = fecha.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return capitalizar(texto);
}

// Convierte un Date a "YYYY-MM-DD" usando el calendario LOCAL (no UTC).
// fecha.toISOString() convierte a UTC y puede saltar al día siguiente en horario
// de tarde/noche en Chile (UTC-3).
function soloFechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function proximosDiasHabiles(cantidad = 14) {
  const dias = [];
  const hoy = new Date();
  let offset = 0;
  while (dias.length < cantidad) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + offset);
    if (fecha.getDay() !== 0) {
      const nombreDia = capitalizar(
        fecha.toLocaleDateString('es-CL', { weekday: 'long' })
      );
      dias.push({ key: soloFechaLocal(fecha), nombreDia });
    }
    offset++;
  }
  return dias;
}

function nombreMes(mesKey) {
  const [anio, mes] = mesKey.split('-');
  const fecha = new Date(Number(anio), Number(mes) - 1, 1);
  return capitalizar(
    fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  );
}

function FilaAlumno({ item, onMarcar, bloqueada }) {
  const { usuario, reservaId, asistio } = item;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <span className="text-white text-sm block">{usuario.nombre}</span>
        <span className="text-white/40 text-xs">{usuario.telefono}</span>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => onMarcar(reservaId, true)}
          disabled={bloqueada}
          className={`w-9 h-9 disabled:opacity-60 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
            asistio === true
              ? 'bg-cyan-brand text-ink'
              : 'bg-white/5 text-white/30'
          }`}
        >
          <Check size={16} />
        </button>
        <button
          onClick={() => onMarcar(reservaId, false)}
          disabled={bloqueada}
          className={`w-9 h-9 disabled:opacity-60 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
            asistio === false
              ? 'bg-red-500/80 text-white'
              : 'bg-white/5 text-white/30'
          }`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function CierreClase({ horarioId, fecha, inscritos }) {
  const { finalizacionDe, finalizarClase, reabrirClase } = useAuth();
  const finalizada = finalizacionDe(horarioId, fecha);
  const [comentario, setComentario] = useState(COMENTARIO_DEFECTO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [confirmarReabrir, setConfirmarReabrir] = useState(false);

  const sinMarcar = inscritos.filter((i) => i.asistio !== true && i.asistio !== false).length;

  async function handleFinalizar() {
    setGuardando(true);
    setError('');
    const r = await finalizarClase(horarioId, fecha, comentario);
    setGuardando(false);
    if (!r.ok) setError(r.mensaje);
  }

  async function handleReabrir() {
    const r = await reabrirClase(horarioId, fecha);
    setConfirmarReabrir(false);
    if (!r.ok) setError(r.mensaje);
    else setComentario(finalizada?.comentario || COMENTARIO_DEFECTO);
  }

  if (finalizada) {
    return (
      <div className="px-4 py-3 border-t border-white/10">
        <div className="bg-cyan-brand/10 border border-cyan-brand/25 rounded-xl px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-cyan-brand text-sm font-semibold">
            <CheckCircle2 size={15} /> Clase finalizada
          </p>
          <p className="text-white/50 text-xs mt-0.5">
            {finalizada.presentes} presentes · {finalizada.ausentes} ausentes
          </p>
          <p className="text-white/80 text-sm mt-1.5">{finalizada.comentario}</p>
        </div>
        {confirmarReabrir ? (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-white/50 text-xs">¿Reabrir para corregir asistencia?</span>
            <button onClick={handleReabrir} className="bg-white/15 text-white text-xs px-2.5 py-1 rounded-md">
              Sí
            </button>
            <button onClick={() => setConfirmarReabrir(false)} className="text-white/40 text-xs px-2 py-1">
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmarReabrir(true)}
            className="text-white/35 text-xs mt-2 hover:text-white/60"
          >
            Reabrir para corregir
          </button>
        )}
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  if (inscritos.length === 0) {
    return (
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-white/40 text-xs">
          Nadie se inscribió en esta clase, así que no cuenta como realizada. Solo el admin puede registrarla.
        </p>
      </div>
    );
  }

  const listo = sinMarcar === 0 && comentario.trim() !== '';

  return (
    <div className="px-4 py-3 border-t border-white/10 flex flex-col gap-2">
      <p className="text-white/40 text-[11px] uppercase tracking-wide">Finalizar clase</p>
      {sinMarcar > 0 && (
        <p className="flex items-center gap-1.5 text-yellow-300 text-xs">
          <Lock size={12} /> Marca la asistencia de {sinMarcar === 1 ? 'el alumno que falta' : `los ${sinMarcar} alumnos que faltan`} (✓ o ✕).
        </p>
      )}
      <label className="text-white/40 text-xs">Comentario de la clase</label>
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors resize-none"
      />
      {comentario.trim() !== COMENTARIO_DEFECTO && (
        <button
          onClick={() => setComentario(COMENTARIO_DEFECTO)}
          className="self-start text-cyan-brand text-xs"
        >
          Usar "{COMENTARIO_DEFECTO}"
        </button>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        onClick={handleFinalizar}
        disabled={!listo || guardando}
        className="bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-40 transition-transform active:scale-[0.98]"
      >
        {guardando ? 'Finalizando...' : 'Finalizar clase'}
      </button>
    </div>
  );
}

function NotaCoach({ horarioId, fecha }) {
  const { crearNotaCoach, notasCoach, usuarioActual } = useAuth();
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const notasDeEstaClase = notasCoach
    .filter(
      (n) =>
        n.horario_id === horarioId &&
        n.fecha === fecha &&
        n.coach_id === usuarioActual.id
    )
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

  async function handleEnviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    const resultado = await crearNotaCoach(horarioId, fecha, texto.trim());
    setEnviando(false);
    setMensaje(resultado);
    if (resultado.ok) {
      setTexto('');
      setTimeout(() => {
        setAbierta(false);
        setMensaje(null);
      }, 1500);
    }
  }

  return (
    <div className="px-4 py-3 border-t border-white/5">
      {notasDeEstaClase.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {notasDeEstaClase.map((n) => (
            <div
              key={n.id}
              className="bg-cyan-brand/10 border border-cyan-brand/20 rounded-lg px-3 py-2"
            >
              <p className="text-white/80 text-xs">{n.nota}</p>
              <p className="text-white/30 text-[10px] mt-0.5">
                {new Date(n.creado_en).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
      {!abierta ? (
        <button
          onClick={() => setAbierta(true)}
          className="flex items-center gap-1.5 text-cyan-brand text-xs font-medium"
        >
          <MessageSquarePlus size={14} />{' '}
          {notasDeEstaClase.length > 0
            ? 'Agregar otra nota'
            : 'Agregar nota para el admin'}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: un alumno se lesionó, faltó material, etc."
            rows={2}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors resize-none"
          />
          {mensaje && (
            <p
              className={`text-xs ${
                mensaje.ok ? 'text-cyan-brand' : 'text-red-400'
              }`}
            >
              {mensaje.mensaje}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2 text-xs disabled:opacity-50 transition-transform active:scale-[0.98]"
            >
              {enviando ? 'Enviando...' : 'Enviar al admin'}
            </button>
            <button
              onClick={() => {
                setAbierta(false);
                setTexto('');
              }}
              className="flex-1 bg-white/10 text-white rounded-lg py-2 text-xs transition-transform active:scale-[0.98]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function restarDias(fechaISO, dias) {
  const f = new Date(fechaISO + 'T00:00:00');
  f.setDate(f.getDate() - dias);
  return soloFechaLocal(f);
}

function TarjetaClase({ h, fecha, abierta, setAbierta, inscritosDe, modo }) {
  const { marcarAsistencia, finalizacionDe } = useAuth();
  const inscritos = inscritosDe(h.id, fecha);
  const fin = finalizacionDe(h.id, fecha);
  const clave = `${h.id}_${fecha}`;
  const abiertaAqui = abierta === clave;
  const empezo = yaEmpezo(fecha, h.hora);
  const asistieron = inscritos.filter((i) => i.asistio === true).length;

  return (
    <div
      className={`bg-white/[0.04] border rounded-2xl overflow-hidden ${
        modo === 'pendiente' ? 'border-yellow-400/30' : 'border-white/10'
      }`}
    >
      <button
        onClick={() => setAbierta(abiertaAqui ? null : clave)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <p className="text-white font-display text-2xl leading-none">{h.hora}</p>
          {modo === 'pendiente' && (
            <span className="text-[10px] bg-yellow-400/15 text-yellow-300 px-1.5 py-0.5 rounded">
              Por finalizar
            </span>
          )}
          {modo === 'proxima' && empezo && inscritos.length > 0 && (
            <span className="text-[10px] bg-yellow-400/15 text-yellow-300 px-1.5 py-0.5 rounded">
              En curso
            </span>
          )}
          {modo === 'realizada' && fin?.presentes === 0 && fin?.ausentes === 0 && (
            <span className="text-[10px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded">
              Registrada por admin
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {modo === 'realizada' ? (
            <span className="flex items-center gap-1 text-white/50 text-xs">
              <Users size={13} /> {asistieron}/{inscritos.length} asistieron
            </span>
          ) : (
            <span className="flex items-center gap-1 text-cyan-brand/80 text-xs font-medium">
              <Users size={13} /> {inscritos.length}/{h.cupo_max}
            </span>
          )}
          {abiertaAqui ? (
            <ChevronUp size={16} className="text-white/40" />
          ) : (
            <ChevronDown size={16} className="text-white/40" />
          )}
        </div>
      </button>
      {abiertaAqui && (
        <div className="border-t border-white/10 divide-y divide-white/5">
          {inscritos.length === 0 && (
            <p className="text-white/30 text-sm px-4 py-3">Nadie inscrito.</p>
          )}
          {inscritos.map((item) => (
            <FilaAlumno
              key={item.reservaId}
              item={item}
              onMarcar={marcarAsistencia}
              bloqueada={!!fin}
            />
          ))}
        </div>
      )}
      {abiertaAqui && (fin || (empezo && modo !== 'realizada')) && (
        <CierreClase horarioId={h.id} fecha={fecha} inscritos={inscritos} />
      )}
      {abiertaAqui && <NotaCoach horarioId={h.id} fecha={fecha} />}
    </div>
  );
}

export default function MisClases() {
  const {
    usuarioActual,
    horarios,
    usuarios,
    reservas,
    finalizacionDe,
    clasesPorFinalizarEnRango,
    clasesRealizadasConAlumnosEnRango,
  } = useAuth();
  const [tab, setTab] = useState('proximas');
  const [abierta, setAbierta] = useState(null);
  const [mesFiltro, setMesFiltro] = useState('todos');

  const hoy = soloFechaLocal(new Date());
  const esMio = (h) => h.coach_id === usuarioActual.id;
  const misHorarios = horarios.filter(esMio);

  function inscritosDe(horarioId, fecha) {
    return reservas
      .filter((r) => r.horario_id === horarioId && r.fecha === fecha)
      .map((r) => {
        const usuario = usuarios.find((u) => u.id === r.usuario_id);
        return usuario ? { usuario, reservaId: r.id, asistio: r.asistio } : null;
      })
      .filter(Boolean);
  }

  // 1) Por finalizar: ya empezaron, tuvieron alumnos y falta cerrarlas.
  const porFinalizar = clasesPorFinalizarEnRango(restarDias(hoy, 60), hoy).filter((o) =>
    esMio(o.horario)
  );
  const clavesPorFinalizar = new Set(porFinalizar.map((o) => `${o.horario.id}_${o.fecha}`));

  // 2) Próximas: todavía no empiezan (o empezaron sin alumnos, hasta 2 h después).
  const diasProximos = proximosDiasHabiles(14);

  // 3) Realizadas: finalizadas (o anteriores al sistema de finalizar) y registradas a mi nombre.
  const realizadas = useMemo(
    () =>
      clasesRealizadasConAlumnosEnRango(restarDias(hoy, 365), hoy).filter((o) => {
        const fin = finalizacionDe(o.horario.id, o.fecha);
        return fin ? fin.coach_id === usuarioActual.id : esMio(o.horario);
      }),
    [clasesRealizadasConAlumnosEnRango, finalizacionDe, hoy, usuarioActual.id]
  );

  const mesesDisponibles = [...new Set(realizadas.map((o) => o.fecha.slice(0, 7)))];
  const realizadasFiltradas =
    mesFiltro === 'todos' ? realizadas : realizadas.filter((o) => o.fecha.slice(0, 7) === mesFiltro);
  const realizadasPorFecha = realizadasFiltradas.reduce((acc, o) => {
    (acc[o.fecha] = acc[o.fecha] || []).push(o);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('proximas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'proximas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Próximas{porFinalizar.length > 0 ? ` · ${porFinalizar.length} por finalizar` : ''}
        </button>
        <button
          onClick={() => setTab('realizadas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'realizadas' ? 'bg-cyan-brand text-ink' : 'text-white/50'
          }`}
        >
          Realizadas
        </button>
      </div>

      {tab === 'proximas' && (
        <div className="flex flex-col gap-6">
          {porFinalizar.length > 0 && (
            <div>
              <p className="text-yellow-300 text-xs uppercase tracking-wide mb-1">Por finalizar</p>
              <p className="text-white/40 text-xs mb-2">
                Marca la asistencia y deja un comentario para que pasen a Realizadas.
              </p>
              <div className="flex flex-col gap-2">
                {porFinalizar.map((o) => (
                  <div key={`${o.horario.id}_${o.fecha}`}>
                    <p className="text-white/40 text-[11px] mb-1">{formatFechaLarga(o.fecha)}</p>
                    <TarjetaClase
                      h={o.horario}
                      fecha={o.fecha}
                      abierta={abierta}
                      setAbierta={setAbierta}
                      inscritosDe={inscritosDe}
                      modo="pendiente"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {diasProximos.map((dia) => {
            const horariosDelDia = misHorarios
              .filter((h) => (h.fecha_unica ? h.fecha_unica === dia.key : h.dia === dia.nombreDia))
              .filter((h) => !clavesPorFinalizar.has(`${h.id}_${dia.key}`))
              .filter((h) => !finalizacionDe(h.id, dia.key))
              .filter((h) => {
                if (!yaEmpezo(dia.key, h.hora)) return true;
                // Ya empezó sin alumnos: se muestra un rato y después desaparece (no cuenta).
                return !yaSeRealizo(dia.key, h.hora);
              })
              .sort((a, b) => a.hora.localeCompare(b.hora));
            if (horariosDelDia.length === 0) return null;
            return (
              <div key={dia.key}>
                <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                  {formatFechaLarga(dia.key)}
                </p>
                <div className="flex flex-col gap-2">
                  {horariosDelDia.map((h) => (
                    <TarjetaClase
                      key={h.id}
                      h={h}
                      fecha={dia.key}
                      abierta={abierta}
                      setAbierta={setAbierta}
                      inscritosDe={inscritosDe}
                      modo="proxima"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'realizadas' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand transition-colors"
            >
              <option value="todos">Todos los meses</option>
              {mesesDisponibles.map((m) => (
                <option key={m} value={m}>
                  {nombreMes(m)}
                </option>
              ))}
            </select>
            <span className="text-cyan-brand text-sm font-medium">
              {realizadasFiltradas.length} clases
            </span>
          </div>

          {realizadasFiltradas.length === 0 && (
            <p className="text-white/30 text-sm">Aún no tienes clases realizadas.</p>
          )}

          <div className="flex flex-col gap-6">
            {Object.entries(realizadasPorFecha).map(([fecha, items]) => (
              <div key={fecha}>
                <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                  {formatFechaLarga(fecha)}
                </p>
                <div className="flex flex-col gap-2">
                  {items.map((o) => (
                    <TarjetaClase
                      key={o.horario.id}
                      h={o.horario}
                      fecha={fecha}
                      abierta={abierta}
                      setAbierta={setAbierta}
                      inscritosDe={inscritosDe}
                      modo="realizada"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
