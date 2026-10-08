import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subirImagen } from '../../lib/storage';
import { LOGO_CEDS_WORDMARK } from '../../assets/logoWordmark';
import { Upload, Pencil, DatabaseBackup, CreditCard } from 'lucide-react';

// Pago en línea con Mercado Pago: el alumno renueva su plan desde la app.
function PagoOnline() {
  const { infoGimnasio, actualizarInfoGimnasio } = useAuth();
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [verPasos, setVerPasos] = useState(false);
  const activo = !!infoGimnasio.pago_online_activo;

  async function cambiar() {
    setGuardando(true);
    const r = await actualizarInfoGimnasio({ pago_online_activo: !activo });
    setGuardando(false);
    setMensaje(r.ok ? { ok: true, mensaje: !activo ? 'Pago en línea activado.' : 'Pago en línea desactivado.' } : r);
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-white font-semibold flex items-center gap-2">
            <CreditCard size={16} className="text-cyan-brand" /> Pago en línea (Mercado Pago)
          </p>
          <p className="text-white/45 text-xs mt-0.5">
            Los alumnos ven el botón "Renovar mi plan en línea" cuando a su plan le quedan 10 días o menos. Al pagar, el
            pago queda registrado y el plan se renueva solo.
          </p>
        </div>
        <button
          onClick={cambiar}
          disabled={guardando}
          aria-label={activo ? 'Desactivar' : 'Activar'}
          className={`relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-50 ${
            activo ? 'bg-cyan-brand' : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${activo ? 'left-6' : 'left-1'}`}
          />
        </button>
      </div>
      {mensaje && <p className={`text-xs mt-2 ${mensaje.ok ? 'text-cyan-brand' : 'text-red-400'}`}>{mensaje.mensaje}</p>}
      <button onClick={() => setVerPasos(!verPasos)} className="text-cyan-brand text-xs mt-3">
        {verPasos ? 'Ocultar pasos' : 'Ver qué se necesita para activarlo'}
      </button>
      {verPasos && (
        <ol className="list-decimal list-inside text-white/60 text-xs mt-2 flex flex-col gap-1">
          <li>Tener una cuenta de Mercado Pago a nombre del gimnasio.</li>
          <li>En Mercado Pago Developers, crear una aplicación y copiar el "Access Token" de producción.</li>
          <li>En Supabase → Edge Functions → Secrets, agregar MP_ACCESS_TOKEN con ese valor.</li>
          <li>Crear las funciones crear-pago y webhook-pago (webhook-pago con "Verify JWT" desactivado).</li>
          <li>Activar el interruptor de arriba y hacer un pago de prueba.</li>
        </ol>
      )}
    </div>
  );
}

function DatosGimnasio() {
  const { infoGimnasio, actualizarInfoGimnasio } = useAuth();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function abrir() {
    setForm({
      gimnasio_nombre: infoGimnasio.nombre || 'CED&S',
      direccion: infoGimnasio.direccion || '',
      whatsapp: infoGimnasio.whatsapp || '',
      instagram: infoGimnasio.instagram || '',
      horario_atencion: infoGimnasio.horario_atencion || '',
      reglamento: infoGimnasio.reglamento || '',
      recordatorio_horas: infoGimnasio.recordatorio_horas ?? 3,
    });
    setMensaje(null);
    setEditando(true);
  }

  async function guardar() {
    setGuardando(true);
    const r = await actualizarInfoGimnasio({ ...form, recordatorio_horas: Number(form.recordatorio_horas) || 3 });
    setGuardando(false);
    setMensaje(r);
    if (r.ok) setEditando(false);
  }

  const campo = 'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-brand';
  const filas = [
    ['Dirección', infoGimnasio.direccion],
    ['WhatsApp', infoGimnasio.whatsapp],
    ['Instagram', infoGimnasio.instagram],
    ['Horario de atención', infoGimnasio.horario_atencion],
    ['Recordatorio de clase', `${infoGimnasio.recordatorio_horas ?? 3} horas antes`],
    ['Reglamento adicional', infoGimnasio.reglamento],
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/50 text-sm">Datos del gimnasio (los ven los alumnos)</p>
        {!editando && (
          <button onClick={abrir} className="flex items-center gap-1 text-cyan-brand text-xs font-medium">
            <Pencil size={13} /> Editar
          </button>
        )}
      </div>
      {editando ? (
        <div className="flex flex-col gap-3">
          <Campo label="Nombre"><input value={form.gimnasio_nombre} onChange={(e) => setForm({ ...form, gimnasio_nombre: e.target.value })} className={campo} /></Campo>
          <Campo label="Dirección"><input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Ej: Av. Siempre Viva 123, Santiago" className={campo} /></Campo>
          <Campo label="WhatsApp (con código de país)"><input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+56 9 1234 5678" inputMode="tel" className={campo} /></Campo>
          <Campo label="Instagram"><input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@cedys" className={campo} /></Campo>
          <Campo label="Horario de atención"><textarea rows={3} value={form.horario_atencion} onChange={(e) => setForm({ ...form, horario_atencion: e.target.value })} placeholder={'Lunes a viernes 7:00 a 21:00\nSábado 9:00 a 13:00'} className={campo + ' resize-none'} /></Campo>
          <Campo label="Recordatorio de clase (horas antes)"><input type="number" min="1" max="24" value={form.recordatorio_horas} onChange={(e) => setForm({ ...form, recordatorio_horas: e.target.value })} className={campo + ' w-24'} /></Campo>
          <Campo label="Reglamento adicional"><textarea rows={5} value={form.reglamento} onChange={(e) => setForm({ ...form, reglamento: e.target.value })} placeholder="Ej: Llegar 5 minutos antes. Traer toalla..." className={campo + ' resize-none'} /></Campo>
          {mensaje && !mensaje.ok && <p className="text-red-400 text-sm">{mensaje.mensaje}</p>}
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando} className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar'}</button>
            <button onClick={() => setEditando(false)} className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filas.map(([label, valor]) => (
            <div key={label}>
              <p className="text-white text-sm">{label}</p>
              <p className="text-white/40 text-xs whitespace-pre-line">{valor || 'Sin completar'}</p>
            </div>
          ))}
          {mensaje?.ok && <p className="text-cyan-brand text-xs">{mensaje.mensaje}</p>}
        </div>
      )}
    </div>
  );
}

function Respaldo() {
  const { usuarios, pagos, reservas, planes, horarios, clasesFinalizadas, gastos, congelaciones } = useAuth();
  const [generando, setGenerando] = useState(false);

  async function descargar() {
    setGenerando(true);
    try {
      const XLSX = await import('xlsx');
      const libro = XLSX.utils.book_new();
      const nombreDe = (id) => usuarios.find((u) => u.id === id)?.nombre || '';
      const horaDe = (id) => horarios.find((h) => h.id === id)?.hora || '';
      const hoja = (filas, nombre) =>
        XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas.length ? filas : [{ '': 'Sin datos' }]), nombre);

      hoja(
        usuarios.map((u) => ({
          Nombre: u.nombre, RUT: u.rut, Correo: u.correo, Teléfono: u.telefono, Rol: u.rol, Estado: u.estado,
          Plan: planes[u.plan_id]?.nombre || '', 'Sesiones usadas': u.sesiones_usadas, 'Sesiones extra': u.sesiones_extra,
          'Último pago': u.fecha_ultima_renovacion, Vence: u.fecha_vencimiento, Nacimiento: u.fecha_nacimiento,
        })),
        'Personas'
      );
      hoja(
        (pagos || []).map((p) => ({
          Fecha: p.fecha, Alumno: nombreDe(p.usuario_id), Monto: Number(p.monto), Medio: p.medio, Tipo: p.tipo,
          Plan: planes[p.plan_id]?.nombre || '', 'Cubre hasta': p.vence, Nota: p.nota,
        })),
        'Pagos'
      );
      hoja(
        (gastos || []).map((g) => ({ Fecha: g.fecha, Monto: Number(g.monto), Categoría: g.categoria, Detalle: g.descripcion })),
        'Gastos'
      );
      hoja(
        reservas.map((r) => ({
          Fecha: r.fecha, Hora: horaDe(r.horario_id), Alumno: nombreDe(r.usuario_id),
          Asistió: r.asistio === true ? 'Sí' : r.asistio === false ? 'No' : '',
        })),
        'Reservas'
      );
      hoja(
        (clasesFinalizadas || []).map((c) => ({
          Fecha: c.fecha, Hora: horaDe(c.horario_id), Coach: c.coach_nombre, Presentes: c.presentes, Ausentes: c.ausentes,
          Comentario: c.comentario,
        })),
        'Clases realizadas'
      );
      hoja(
        horarios.map((h) => ({ Día: h.fecha_unica || h.dia, Hora: h.hora, Coach: h.coach_nombre, Cupo: h.cupo_max })),
        'Horarios'
      );
      hoja(
        Object.values(planes).map((p) => ({
          Plan: p.nombre, Sesiones: p.cantidad_sesiones ?? 'Ilimitado', 'Valor con IVA': p.valor_con_iva, 'Duración (días)': p.duracion_dias,
        })),
        'Planes'
      );
      hoja(
        (congelaciones || []).map((c) => ({
          Alumno: nombreDe(c.usuario_id), Estado: c.estado, Desde: c.fecha_inicio, Hasta: c.fecha_fin, Motivo: c.motivo,
        })),
        'Congelamientos'
      );
      const d = new Date();
      const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      XLSX.writeFile(libro, `respaldo-cedys-${fecha}.xlsx`);
    } catch (err) {
      alert('No se pudo generar el respaldo: ' + err.message);
    }
    setGenerando(false);
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-4">
      <p className="text-white/50 text-sm mb-1">Respaldo de datos</p>
      <p className="text-white/35 text-xs mb-4">
        Descarga un Excel con alumnos, pagos, gastos, reservas, asistencia, horarios, planes y congelamientos. Guárdalo
        de vez en cuando por seguridad.
      </p>
      <button
        onClick={descargar}
        disabled={generando}
        className="w-full flex items-center justify-center gap-2 bg-white/10 text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
      >
        <DatabaseBackup size={16} /> {generando ? 'Generando...' : 'Descargar respaldo (Excel)'}
      </button>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="text-white/40 text-xs mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function Configuracion() {
  const {
    logoUrl,
    actualizarLogo,
    horasAnticipacion,
    diasRenovacion,
    actualizarPoliticas,
  } = useAuth();

  const [editandoPoliticas, setEditandoPoliticas] = useState(false);
  const [formPoliticas, setFormPoliticas] = useState({
    horas_anticipacion: horasAnticipacion,
    dias_renovacion: diasRenovacion,
  });
  const [guardando, setGuardando] = useState(false);

  async function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy pesada. Usa una de menos de 5MB.');
      return;
    }

    try {
      const url = await subirImagen(file, 'logo');
      actualizarLogo(url);
    } catch (err) {
      alert('Error al subir el logo: ' + err.message);
    }
  }

  function abrirEdicionPoliticas() {
    setFormPoliticas({
      horas_anticipacion: horasAnticipacion,
      dias_renovacion: diasRenovacion,
    });
    setEditandoPoliticas(true);
  }

  async function guardarPoliticas() {
    setGuardando(true);
    await actualizarPoliticas({
      horas_anticipacion: Number(formPoliticas.horas_anticipacion),
      dias_renovacion: Number(formPoliticas.dias_renovacion),
    });
    setGuardando(false);
    setEditandoPoliticas(false);
  }

  return (
    <div className="min-h-screen bg-ink pb-24 px-6 pt-10">
      <p className="font-display text-3xl text-white mb-6">Configuración</p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <p className="text-white/50 text-sm mb-4">Logo del gimnasio</p>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden p-1 shrink-0">
            <img
              src={logoUrl || LOGO_CEDS_WORDMARK}
              alt="Logo actual"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-white text-sm">Logo actual</p>
            <p className="text-white/40 text-xs">
              Se muestra en el header de la app, para todos los usuarios
            </p>
          </div>
        </div>

        <label className="flex items-center justify-center gap-2 bg-cyan-brand text-ink text-sm font-semibold rounded-lg py-3 cursor-pointer hover:bg-cyan-brandLight transition-colors">
          <Upload size={16} />
          Subir nuevo logo
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
          />
        </label>
        <p className="text-white/30 text-xs mt-2 text-center">
          Formatos: PNG, JPG. Máximo 5MB.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/50 text-sm">Políticas</p>
          {!editandoPoliticas && (
            <button
              onClick={abrirEdicionPoliticas}
              className="flex items-center gap-1 text-cyan-brand text-xs font-medium"
            >
              <Pencil size={13} /> Editar
            </button>
          )}
        </div>

        {editandoPoliticas ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-white text-sm mb-1 block">
                Tiempo mínimo para reservar o cancelar
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={formPoliticas.horas_anticipacion}
                  onChange={(e) =>
                    setFormPoliticas({
                      ...formPoliticas,
                      horas_anticipacion: e.target.value,
                    })
                  }
                  className="w-20 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                />
                <span className="text-white/40 text-sm">
                  horas antes de la clase
                </span>
              </div>
            </div>
            <div>
              <label className="text-white text-sm mb-1 block">
                Duración por defecto de un plan
              </label>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm">Vence a los</span>
                <input
                  type="number"
                  min="1"
                  value={formPoliticas.dias_renovacion}
                  onChange={(e) =>
                    setFormPoliticas({
                      ...formPoliticas,
                      dias_renovacion: e.target.value,
                    })
                  }
                  className="w-20 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                />
                <span className="text-white/40 text-sm">días</span>
              </div>
              <p className="text-white/30 text-xs mt-1">
                Solo se usa para planes que no tienen duración propia. Lo normal es que cada plan defina su duración en
                Planes.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={guardarPoliticas}
                disabled={guardando}
                className="flex-1 bg-cyan-brand text-ink font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditandoPoliticas(false)}
                className="flex-1 bg-white/10 text-white rounded-lg py-2.5 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-white text-sm">
                Tiempo mínimo para reservar o cancelar
              </p>
              <p className="text-white/40 text-xs">
                {horasAnticipacion} horas antes de la clase
              </p>
            </div>
            <div>
              <p className="text-white text-sm">Duración por defecto de un plan</p>
              <p className="text-white/40 text-xs">
                {diasRenovacion} días (solo para planes sin duración propia). Los pagos y renovaciones se registran en
                Renovaciones.
              </p>
            </div>
          </div>
        )}
      </div>

      <DatosGimnasio />
      <PagoOnline />
      <Respaldo />
    </div>
  );
}
