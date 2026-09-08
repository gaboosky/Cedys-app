import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Camera,
  Trash2,
} from 'lucide-react';

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFecha(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  return capitalizar(
    fecha.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );
}

export default function Progreso() {
  const { usuarioActual, obtenerProgreso, agregarProgreso, eliminarProgreso } =
    useAuth();
  const [entradas, setEntradas] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    peso_kg: '',
    notas: '',
    foto_url: '',
  });
  const [ejercicios, setEjercicios] = useState([{ nombre: '', peso_kg: '' }]);

  async function cargar() {
    const data = await obtenerProgreso(usuarioActual.id);
    setEntradas(data);
  }

  useEffect(() => {
    cargar();
  }, []);

  function agregarFilaEjercicio() {
    setEjercicios([...ejercicios, { nombre: '', peso_kg: '' }]);
  }

  function actualizarEjercicio(index, campo, valor) {
    const copia = [...ejercicios];
    copia[index][campo] = valor;
    setEjercicios(copia);
  }

  function quitarEjercicio(index) {
    setEjercicios(ejercicios.filter((_, i) => i !== index));
  }

  function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es muy pesada. Usa una de menos de 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, foto_url: reader.result });
    reader.readAsDataURL(file);
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    const ejerciciosValidos = ejercicios
      .filter((ej) => ej.nombre.trim())
      .map((ej) => ({
        nombre: ej.nombre.trim(),
        peso_kg: ej.peso_kg ? Number(ej.peso_kg) : null,
      }));

    const resultado = await agregarProgreso({
      fecha: form.fecha,
      peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
      notas: form.notas.trim() || null,
      foto_url: form.foto_url || null,
      ejercicios: ejerciciosValidos,
    });
    setGuardando(false);
    setMensaje(resultado);
    if (resultado.ok) {
      setForm({
        fecha: new Date().toISOString().slice(0, 10),
        peso_kg: '',
        notas: '',
        foto_url: '',
      });
      setEjercicios([{ nombre: '', peso_kg: '' }]);
      await cargar();
      setTimeout(() => {
        setMostrarForm(false);
        setMensaje(null);
      }, 1000);
    }
  }

  async function handleEliminar(id) {
    await eliminarProgreso(id);
    setEliminandoId(null);
    await cargar();
  }

  const ultimoPeso = entradas?.[0]?.peso_kg ?? null;
  const pesoAnterior = entradas?.[1]?.peso_kg ?? null;
  const diferencia =
    ultimoPeso !== null && pesoAnterior !== null
      ? ultimoPeso - pesoAnterior
      : null;

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-6">
      <div className="flex items-center justify-between mb-6">
        <p className="font-display text-3xl text-white">Progreso</p>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-1 bg-cyan-brand text-ink text-sm font-semibold px-3 py-2 rounded-lg"
        >
          <Plus size={16} /> Registrar
        </button>
      </div>

      {ultimoPeso !== null && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <p className="text-white/50 text-sm mb-1">Peso actual</p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl text-cyan-brand">
              {ultimoPeso}
            </span>
            <span className="text-white/50 text-sm">kg</span>
            {diferencia !== null && diferencia !== 0 && (
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ml-2 ${
                  diferencia < 0 ? 'text-green-400' : 'text-yellow-400'
                }`}
              >
                {diferencia < 0 ? (
                  <TrendingDown size={14} />
                ) : (
                  <TrendingUp size={14} />
                )}
                {Math.abs(diferencia)} kg
              </span>
            )}
          </div>
        </div>
      )}

      {mostrarForm && (
        <form
          onSubmit={handleGuardar}
          className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex flex-col gap-3"
        >
          <div>
            <label className="text-white/40 text-xs mb-1 block">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.peso_kg}
              onChange={(e) => setForm({ ...form, peso_kg: e.target.value })}
              placeholder="Ej: 72.5"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs mb-2 block">
              Ejercicios y peso usado
            </label>
            <div className="flex flex-col gap-2">
              {ejercicios.map((ej, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={ej.nombre}
                    onChange={(e) =>
                      actualizarEjercicio(i, 'nombre', e.target.value)
                    }
                    placeholder="Ej: Sentadilla"
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <input
                    type="number"
                    value={ej.peso_kg}
                    onChange={(e) =>
                      actualizarEjercicio(i, 'peso_kg', e.target.value)
                    }
                    placeholder="kg"
                    className="w-20 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  {ejercicios.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarEjercicio(i)}
                      className="text-red-400/70 px-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={agregarFilaEjercicio}
              className="flex items-center gap-1 text-cyan-brand text-xs font-medium mt-2"
            >
              <Plus size={13} /> Agregar ejercicio
            </button>
          </div>

          <label className="flex items-center justify-center gap-2 bg-white/5 border border-dashed border-white/20 rounded-lg py-3 text-sm text-white/60 cursor-pointer">
            <Camera size={15} />
            {form.foto_url ? 'Foto lista ✓' : 'Agregar foto (opcional)'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFoto}
              className="hidden"
            />
          </label>

          <textarea
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            placeholder="Notas (opcional)"
            rows={2}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
          />

          {mensaje && (
            <p
              className={`text-sm ${
                mensaje.ok ? 'text-cyan-brand' : 'text-red-400'
              }`}
            >
              {mensaje.ok ? 'Registro guardado.' : mensaje.mensaje}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar registro'}
          </button>
        </form>
      )}

      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
        Historial
      </p>

      {entradas === null && (
        <p className="text-white/30 text-sm">Cargando...</p>
      )}
      {entradas && entradas.length === 0 && (
        <p className="text-white/30 text-sm">
          Aún no tienes registros. Toca "Registrar" para empezar.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {entradas?.map((e) => (
          <div
            key={e.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              {e.foto_url && (
                <img
                  src={e.foto_url}
                  alt="Progreso"
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-white font-display text-lg leading-none">
                    {formatFecha(e.fecha)}
                  </p>
                  {eliminandoId === e.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEliminar(e.id)}
                        className="text-red-400 text-xs font-semibold px-2 py-1 bg-red-500/20 rounded"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setEliminandoId(null)}
                        className="text-white/50 text-xs px-2 py-1 bg-white/10 rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEliminandoId(e.id)}
                      className="text-white/20 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {e.peso_kg && (
                  <p className="text-cyan-brand text-sm font-medium mt-1">
                    {e.peso_kg} kg
                  </p>
                )}
                {e.ejercicios?.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {e.ejercicios.map((ej, i) => (
                      <span key={i} className="text-white/50 text-xs">
                        {ej.nombre}
                        {ej.peso_kg ? ` · ${ej.peso_kg}kg` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {e.notas && (
                  <p className="text-white/40 text-xs mt-1 italic">{e.notas}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
