import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { vencimientoDe } from '../../lib/ingresos';
import { Megaphone, Send, Search, Check } from 'lucide-react';

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
    { valor: 'alumnos', label: 'Todos los alumnos activos', lista: alumnos },
    {
      valor: 'renovar',
      label: 'Alumnos por renovar (vencidos o vencen en 7 días)',
      lista: alumnos.filter((u) => {
        const v = u.plan_id ? vencimientoDe(u, planes, diasRenovacion) : null;
        return v && v.dias <= 7;
      }),
    },
    { valor: 'sinplan', label: 'Alumnos sin plan', lista: alumnos.filter((u) => !u.plan_id) },
    {
      valor: 'coaches',
      label: 'Coaches',
      lista: usuarios.filter((u) => (u.rol === 'coach' || u.rol === 'head_coach') && u.estado !== 'inactivo'),
    },
    { valor: 'todos', label: 'Todos (alumnos y coaches)', lista: usuarios.filter((u) => u.estado === 'activo') },
    { valor: 'elegir', label: 'Elegir personas', lista: usuarios.filter((u) => elegidos.includes(u.id)) },
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
      <div className="flex items-center gap-2 mb-1">
        <Megaphone size={18} className="text-cyan-brand" />
        <p className="text-white font-display text-xl">Enviar aviso</p>
      </div>
      <p className="text-white/40 text-xs mb-5">
        Les llega como notificación en la app y en el celular (a quienes activaron las notificaciones).
      </p>

      <label className="text-white/40 text-xs mb-1 block">Mensaje</label>
      <textarea
        value={mensaje}
        onChange={(e) => {
          setMensaje(e.target.value);
          setResultado(null);
        }}
        rows={4}
        maxLength={300}
        placeholder="Ej: Mañana lunes cerramos por feriado. ¡Nos vemos el martes!"
        className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-brand resize-none"
      />
      <p className="text-white/30 text-[11px] text-right mb-4">{mensaje.length}/300</p>

      <label className="text-white/40 text-xs mb-2 block">¿A quién?</label>
      <div className="flex flex-col gap-1.5 mb-4">
        {GRUPOS.map((g) => (
          <button
            key={g.valor}
            onClick={() => {
              setGrupo(g.valor);
              setResultado(null);
            }}
            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm ${
              grupo === g.valor ? 'bg-cyan-brand/10 border-cyan-brand/40 text-white' : 'bg-white/[0.03] border-white/10 text-white/70'
            }`}
          >
            <span>{g.label}</span>
            <span className="text-white/45 text-xs shrink-0 ml-2">{g.lista.length}</span>
          </button>
        ))}
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
          className="w-full flex items-center justify-center gap-2 bg-cyan-brand text-ink font-semibold rounded-xl py-3 text-sm disabled:opacity-40"
        >
          <Send size={15} /> Enviar a {destinatarios.length} persona{destinatarios.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
