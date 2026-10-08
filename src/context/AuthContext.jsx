import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, crearClienteTemporal } from '../lib/supabase';
import { validarCorreo } from '../lib/validarCorreo';

// Desde esta fecha una clase solo cuenta como realizada si se finalizó
// (coach con asistencia + comentario, o registrada por el admin).
const FINALIZACION_DESDE = '2026-10-07';
import {
  reservaBloqueada,
  esCancelacionTardia,
  horaAFecha,
} from '../lib/horarioUtils';
import { fechaVenceDe } from '../lib/ingresos';

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fechaLarga(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
  });
}

// Supabase entrega como máximo 1000 filas por consulta. Esto trae todas,
// pidiendo de a 1000 (varias páginas a la vez para que sea rápido).
async function traerTodo(crearConsulta, tam = 1000) {
  const primera = await crearConsulta().range(0, tam - 1);
  if (primera.error || !primera.data || primera.data.length < tam) return primera;
  let datos = [...primera.data];
  let desde = tam;
  for (;;) {
    const paginas = await Promise.all(
      [0, 1, 2, 3].map((i) => crearConsulta().range(desde + i * tam, desde + (i + 1) * tam - 1))
    );
    let fin = false;
    for (const r of paginas) {
      if (r.error || !r.data) return { data: datos };
      datos = datos.concat(r.data);
      if (r.data.length < tam) {
        fin = true;
        break;
      }
    }
    if (fin) return { data: datos };
    desde += 4 * tam;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [error, setError] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [planes, setPlanes] = useState({});
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  // true solo mientras se revisa si había una sesión guardada al abrir la app
  const [iniciando, setIniciando] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);
  const [vistaComo, setVistaComo] = useState(null);
  const [horasAnticipacion, setHorasAnticipacion] = useState(4);
  const [diasRenovacion, setDiasRenovacion] = useState(30);
  // Datos del gimnasio que ve el alumno (dirección, WhatsApp, horario, reglamento)
  const [infoGimnasio, setInfoGimnasio] = useState({});
  const [noticias, setNoticias] = useState([]);
  const [fotosGym, setFotosGym] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [usuarioRutinas, setUsuarioRutinas] = useState([]);
  const [horariosCancelados, setHorariosCancelados] = useState([]);
  const [congelaciones, setCongelaciones] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [listaEspera, setListaEspera] = useState([]);
  const [notasCoach, setNotasCoach] = useState([]);
  const [solicitudesFueraPlazo, setSolicitudesFueraPlazo] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [registrosPeso, setRegistrosPeso] = useState([]);
  const [clasesFinalizadas, setClasesFinalizadas] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [ausenciasCoach, setAusenciasCoach] = useState([]);
  const [reemplazos, setReemplazos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [tarifasCoach, setTarifasCoach] = useState({});
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [solicitudesPrueba, setSolicitudesPrueba] = useState([]);

  useEffect(() => {
    iniciar();
  }, []);

  useEffect(() => {
    if (!usuarioActual) return;

    const canal = supabase
      .channel('cambios-app')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        (payload) => {
          if (
            payload.eventType === 'INSERT' &&
            payload.new.estado === 'confirmada'
          ) {
            setReservas((prev) =>
              prev.some((r) => r.id === payload.new.id)
                ? prev
                : [...prev, payload.new]
            );
          } else if (payload.eventType === 'UPDATE') {
            setReservas((prev) => {
              if (payload.new.estado !== 'confirmada')
                return prev.filter((r) => r.id !== payload.new.id);
              return prev.map((r) =>
                r.id === payload.new.id ? payload.new : r
              );
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ausencias_coach' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setAusenciasCoach((prev) => prev.filter((a) => a.id !== payload.old.id));
          } else {
            setAusenciasCoach((prev) => [payload.new, ...prev.filter((a) => a.id !== payload.new.id)]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reemplazos_clase' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setReemplazos((prev) => prev.filter((r) => r.id !== payload.old.id));
          } else {
            setReemplazos((prev) => [payload.new, ...prev.filter((r) => r.id !== payload.new.id)]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clases_finalizadas' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setClasesFinalizadas((prev) => prev.filter((c) => c.id !== payload.old.id));
          } else {
            setClasesFinalizadas((prev) => [
              payload.new,
              ...prev.filter((c) => c.id !== payload.new.id),
            ]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registros_peso' },
        (payload) => {
          setRegistrosPeso((prev) =>
            prev.some((r) => r.id === payload.new.id) ? prev : [payload.new, ...prev]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pagos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPagos((prev) =>
              prev.some((p) => p.id === payload.new.id)
                ? prev
                : [payload.new, ...prev]
            );
          } else if (payload.eventType === 'UPDATE') {
            setPagos((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPagos((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'solicitudes_prueba' },
        (payload) => {
          setSolicitudesPrueba((prev) =>
            prev.some((x) => x.id === payload.new.id) ? prev : [payload.new, ...prev]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes_fuera_plazo' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSolicitudesFueraPlazo((prev) =>
              prev.some((s) => s.id === payload.new.id)
                ? prev
                : [payload.new, ...prev]
            );
          } else if (payload.eventType === 'UPDATE') {
            setSolicitudesFueraPlazo((prev) =>
              prev.map((s) => (s.id === payload.new.id ? payload.new : s))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'horarios_cancelados' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setHorariosCancelados((prev) =>
              prev.some((hc) => hc.id === payload.new.id)
                ? prev
                : [...prev, payload.new]
            );
          } else if (payload.eventType === 'DELETE') {
            setHorariosCancelados((prev) =>
              prev.filter((hc) => hc.id !== payload.old.id)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          if (payload.new.usuario_id === usuarioActual.id) {
            setNotificaciones((prev) =>
              prev.some((n) => n.id === payload.new.id)
                ? prev
                : [payload.new, ...prev]
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'horarios' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setHorarios((prev) =>
              prev.some((h) => h.id === payload.new.id)
                ? prev
                : [...prev, payload.new]
            );
          } else if (payload.eventType === 'UPDATE') {
            setHorarios((prev) =>
              prev.map((h) => (h.id === payload.new.id ? payload.new : h))
            );
          } else if (payload.eventType === 'DELETE') {
            setHorarios((prev) => prev.filter((h) => h.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuarioActual?.id]);

  async function iniciar() {
    // Si al entrar la persona desmarcó "Mantener sesión iniciada", la sesión
    // se cierra cuando vuelve a abrir la app (después de haberla cerrado).
    try {
      if (localStorage.getItem('cedys_no_mantener') === '1' && !sessionStorage.getItem('cedys_sesion_viva')) {
        await supabase.auth.signOut();
        localStorage.removeItem('cedys_no_mantener');
      }
    } catch (e) {
      // sin almacenamiento disponible: se mantiene la sesión
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        await cargarDatos(sessionData.session.user.id);
      } else {
        setCargando(false);
      }
    } finally {
      setIniciando(false);
    }
  }

  // Carga los datos de la app. Para que sea rápido:
  // 1) primero se busca solo la ficha de quien entra (para saber su rol),
  // 2) después todo lo demás en paralelo y solo lo necesario
  //    (por ejemplo, las reservas recientes y no todo el historial del gimnasio).
  async function cargarDatos(authUserId) {
    setCargando(true);
    try {
      return await cargarDatosInterno(authUserId);
    } finally {
      setCargando(false);
    }
  }

  async function cargarDatosInterno(authUserId) {
    let yo = null;
    if (authUserId) {
      const resYo = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      yo = resYo.data || null;
    }

    // Configuración general (logo, políticas, datos del gimnasio)
    const resConfigApp = await supabase.from('configuracion_app').select('*').eq('id', 'global').maybeSingle();
    if (resConfigApp.data) {
      setLogoUrl(resConfigApp.data.logo_url);
      setHorasAnticipacion(resConfigApp.data.horas_anticipacion ?? 4);
      setDiasRenovacion(resConfigApp.data.dias_renovacion ?? 30);
      setInfoGimnasio({
        nombre: resConfigApp.data.gimnasio_nombre || 'CED&S',
        direccion: resConfigApp.data.direccion || '',
        whatsapp: resConfigApp.data.whatsapp || '',
        instagram: resConfigApp.data.instagram || '',
        horario_atencion: resConfigApp.data.horario_atencion || '',
        reglamento: resConfigApp.data.reglamento || '',
        recordatorio_horas: resConfigApp.data.recordatorio_horas ?? 3,
        pago_online_activo: !!resConfigApp.data.pago_online_activo,
      });
    }

    // Si no tiene ficha o no está activo, no se carga nada más (el login le explica por qué).
    if (!yo || yo.estado !== 'activo') return yo;

    const esStaff = yo.rol === 'coach' || yo.rol === 'head_coach';
    const esAdmin = yo.rol === 'head_coach';
    const hoy = new Date();
    const haceDias = (n) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() - n);
      return isoLocal(d);
    };
    const hoyISO = isoLocal(hoy);
    // Staff: un año de historia para reportes y pagos. Alumno: las clases de hoy en adelante
    // de todos (para ver cupos y quién va) + todo su propio historial.
    const desdeReservas = esStaff ? haceDias(400) : haceDias(1);
    const sinError = (p) => p.then((r) => r, () => ({ data: null }));

    const consultaReservas = () => {
      const q = supabase.from('reservas').select('*').eq('estado', 'confirmada').order('id');
      return esStaff ? q.gte('fecha', desdeReservas) : q.or(`fecha.gte.${desdeReservas},usuario_id.eq.${yo.id}`);
    };

    const [
      resUsuarios,
      resPublico,
      resHorarios,
      resPlanes,
      resReservas,
      resNoticias,
      resFotos,
      resRutinas,
      resUsuarioRutinas,
      resHorariosCancelados,
      resCongelaciones,
      resNotificaciones,
      resListaEspera,
      resNotasCoach,
      resSolicitudes,
      resPagos,
      resRegistrosPeso,
      resFinalizadas,
      resObs,
      resAus,
      resReemp,
      resGastos,
      resTarifas,
      resEvaluaciones,
      resPruebas,
    ] = await Promise.all(
      [
        esStaff ? traerTodo(() => supabase.from('usuarios').select('*').order('id')) : Promise.resolve({ data: [yo] }),
        esStaff ? Promise.resolve({ data: [] }) : traerTodo(() => supabase.from('usuarios_publico').select('*').order('id')),
        supabase.from('horarios').select('*'),
        supabase.from('planes').select('*'),
        traerTodo(consultaReservas),
        supabase.from('noticias').select('*').order('created_at', { ascending: false }).limit(40),
        supabase.from('fotos_gym').select('*').order('created_at', { ascending: false }),
        supabase.from('rutinas').select('*'),
        supabase.from('usuario_rutina').select('*').order('fecha_asignacion', { ascending: false }),
        traerTodo(() => supabase.from('horarios_cancelados').select('*').gte('fecha', haceDias(400)).order('id')),
        supabase.from('congelaciones').select('*'),
        supabase
          .from('notificaciones')
          .select('*')
          .eq('usuario_id', yo.id)
          .order('creado_en', { ascending: false })
          .limit(60),
        supabase.from('lista_espera').select('*').gte('fecha', hoyISO).order('creado_en', { ascending: true }),
        esStaff
          ? supabase.from('notas_coach').select('*').order('creado_en', { ascending: false }).limit(300)
          : Promise.resolve({ data: [] }),
        supabase
          .from('solicitudes_fuera_plazo')
          .select('*')
          .gte('creado_en', haceDias(30))
          .order('creado_en', { ascending: false }),
        esAdmin
          ? traerTodo(() => supabase.from('pagos').select('*').gte('fecha', haceDias(550)).order('fecha', { ascending: false }).order('id'))
          : supabase.from('pagos').select('*').eq('usuario_id', yo.id).order('fecha', { ascending: false }),
        esStaff
          ? traerTodo(() => supabase.from('registros_peso').select('*').order('creado_en', { ascending: false }).order('id'))
          : traerTodo(() => supabase.from('registros_peso').select('*').eq('usuario_id', yo.id).order('creado_en', { ascending: false }).order('id')),
        traerTodo(() =>
          supabase
            .from('clases_finalizadas')
            .select('*')
            .gte('fecha', haceDias(400))
            .order('finalizada_en', { ascending: false })
            .order('id')
        ),
        esStaff ? traerTodo(() => supabase.from('observaciones_alumno').select('*').order('usuario_id')) : Promise.resolve({ data: [] }),
        supabase.from('ausencias_coach').select('*').gte('fecha', haceDias(60)).order('creado_en', { ascending: false }),
        traerTodo(() => supabase.from('reemplazos_clase').select('*').gte('fecha', haceDias(400)).order('id')),
        esAdmin ? supabase.from('gastos').select('*').order('fecha', { ascending: false }) : Promise.resolve({ data: [] }),
        esAdmin ? supabase.from('tarifas_coach').select('*') : Promise.resolve({ data: [] }),
        esStaff
          ? traerTodo(() => supabase.from('evaluaciones_clase').select('*').gte('fecha', haceDias(400)).order('id'))
          : supabase.from('evaluaciones_clase').select('*').eq('usuario_id', yo.id),
        esAdmin
          ? supabase.from('solicitudes_prueba').select('*').order('creado_en', { ascending: false }).limit(200)
          : Promise.resolve({ data: [] }),
      ].map(sinError)
    );

    if (resNoticias.data) setNoticias(resNoticias.data);
    if (resFotos.data) setFotosGym(resFotos.data);
    if (resRutinas.data) setRutinas(resRutinas.data);
    if (resUsuarioRutinas.data) setUsuarioRutinas(resUsuarioRutinas.data);
    if (resHorariosCancelados.data) setHorariosCancelados(resHorariosCancelados.data);
    if (resCongelaciones.data) setCongelaciones(resCongelaciones.data);
    if (resNotificaciones.data) setNotificaciones(resNotificaciones.data);
    if (resListaEspera.data) setListaEspera(resListaEspera.data);
    if (resNotasCoach.data) setNotasCoach(resNotasCoach.data);
    if (resSolicitudes.data) setSolicitudesFueraPlazo(resSolicitudes.data);
    if (resPagos.data) setPagos(resPagos.data);
    if (resRegistrosPeso.data) setRegistrosPeso(resRegistrosPeso.data);
    if (resFinalizadas.data) setClasesFinalizadas(resFinalizadas.data);
    if (resObs.data) setObservaciones(resObs.data);
    if (resAus.data) setAusenciasCoach(resAus.data);
    if (resReemp.data) setReemplazos(resReemp.data);
    if (resGastos.data) setGastos(resGastos.data);
    if (resTarifas.data) {
      setTarifasCoach(Object.fromEntries(resTarifas.data.map((t) => [t.coach_id, Number(t.valor_clase) || 0])));
    }
    if (resEvaluaciones.data) setEvaluaciones(resEvaluaciones.data);
    if (resPruebas.data) setSolicitudesPrueba(resPruebas.data);

    // El alumno ve su ficha completa; del resto solo nombre/rol/foto (vista usuarios_publico),
    // para ver quién va a cada clase.
    let lista = resUsuarios.data || [yo];
    if (!lista.some((u) => u.id === yo.id)) lista = [yo, ...lista];
    if (resPublico.data) {
      const ids = new Set(lista.map((u) => u.id));
      lista = [...lista, ...resPublico.data.filter((u) => !ids.has(u.id))];
    }
    setUsuarios(lista);
    if (resHorarios.data) setHorarios(resHorarios.data);
    if (resReservas.data) setReservas(resReservas.data);
    if (resPlanes.data) {
      const planesObj = {};
      resPlanes.data.forEach((p) => {
        planesObj[p.id] = p;
      });
      setPlanes(planesObj);
    }

    setUsuarioActual(yo);
    return yo;
  }

  async function actualizarLogo(dataUrl) {
    await supabase
      .from('configuracion_app')
      .update({ logo_url: dataUrl })
      .eq('id', 'global');
    setLogoUrl(dataUrl);
  }

  async function actualizarPoliticas(datos) {
    await supabase.from('configuracion_app').update(datos).eq('id', 'global');
    if (datos.horas_anticipacion !== undefined)
      setHorasAnticipacion(datos.horas_anticipacion);
    if (datos.dias_renovacion !== undefined)
      setDiasRenovacion(datos.dias_renovacion);
  }

  async function actualizarInfoGimnasio(datos) {
    const { error } = await supabase.from('configuracion_app').update(datos).eq('id', 'global');
    if (error) return { ok: false, mensaje: 'No se pudo guardar: ' + error.message };
    setInfoGimnasio((prev) => ({ ...prev, ...datos, nombre: datos.gimnasio_nombre ?? prev.nombre }));
    return { ok: true, mensaje: 'Datos del gimnasio guardados.' };
  }

  // El alumno cambia su contraseña estando dentro de la app.
  async function cambiarContrasena(actual, nueva) {
    if (!nueva || nueva.length < 6)
      return { ok: false, mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    // Se verifica la contraseña actual volviendo a iniciar sesión.
    const { error: errorActual } = await supabase.auth.signInWithPassword({
      email: usuarioActual.correo,
      password: actual,
    });
    if (errorActual) return { ok: false, mensaje: 'La contraseña actual no es correcta.' };
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) {
      if ((error.message || '').toLowerCase().includes('different from the old'))
        return { ok: false, mensaje: 'La nueva contraseña debe ser distinta a la actual.' };
      return { ok: false, mensaje: 'No se pudo cambiar: ' + error.message };
    }
    return { ok: true, mensaje: 'Contraseña actualizada.' };
  }

  async function login(correo, password, mantener = true) {
    try {
      if (mantener) localStorage.removeItem('cedys_no_mantener');
      else {
        localStorage.setItem('cedys_no_mantener', '1');
        sessionStorage.setItem('cedys_sesion_viva', '1');
      }
    } catch (e) {
      // sin almacenamiento disponible
    }
    const { data, error: errorAuth } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password,
    });

    if (errorAuth) {
      const texto = (errorAuth.message || '').toLowerCase();
      if (texto.includes('not confirmed')) {
        setError(
          'Tu correo todavía no está confirmado. Revisa tu bandeja (y spam) o pide al gimnasio que confirme tu cuenta.'
        );
      } else if (texto.includes('invalid login') || texto.includes('invalid credentials')) {
        setError(
          'Correo o contraseña incorrectos. Si no la recuerdas, usa "Olvidé mi contraseña".'
        );
      } else if (texto.includes('rate limit') || texto.includes('too many')) {
        setError('Demasiados intentos. Espera unos minutos y vuelve a intentar.');
      } else {
        setError('No se pudo iniciar sesión: ' + errorAuth.message);
      }
      return false;
    }

    const encontrado = await cargarDatos(data.user.id);

    if (!encontrado) {
      setError('No encontramos tu perfil. Contacta al administrador.');
      await supabase.auth.signOut();
      return false;
    }
    if (encontrado.estado === 'pendiente') {
      setError('Tu cuenta está pendiente de aprobación por el administrador.');
      await supabase.auth.signOut();
      return false;
    }
    if (encontrado.estado === 'inactivo') {
      setError(
        'Tu cuenta está desactivada. Contacta al gimnasio para más información.'
      );
      await supabase.auth.signOut();
      return false;
    }

    setError('');
    return true;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUsuarioActual(null);
    setVistaComo(null);
  }

  async function solicitarRecuperacion(correo) {
    // El link del correo lleva a la pantalla para escribir la contraseña nueva.
    const { error } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/nueva-contrasena`,
    });
    if (error)
      return {
        ok: false,
        mensaje: 'No pudimos procesar la solicitud: ' + error.message,
      };
    return {
      ok: true,
      mensaje:
        'Si ese correo existe, te enviamos un link para restablecer tu contraseña.',
    };
  }

  // El admin también es coach y usuario en la vida real. Esto le permite
  // "verse a sí mismo" como coach o usuario sin cambiar su rol real en la base de datos.
  // Los coaches también entrenan, así que pueden alternar entre vista Coach y Usuario.
  const rolEfectivo =
    usuarioActual?.rol === 'head_coach'
      ? vistaComo || 'head_coach'
      : usuarioActual?.rol === 'coach'
      ? vistaComo === 'usuario'
        ? 'usuario'
        : 'coach'
      : usuarioActual?.rol;

  function cambiarVista(nuevaVista) {
    setVistaComo(nuevaVista);
  }

  function sesionesRestantes(usuario) {
    if (!usuario) return null;
    const plan = usuario.plan_id ? planes[usuario.plan_id] : null;
    const total =
      usuario.plan_sesiones_personalizado || plan?.cantidad_sesiones || null;
    if (total === null) return null;
    const extra = usuario.sesiones_extra || 0;
    return total + extra - usuario.sesiones_usadas;
  }

  function syncUsuario(usuarioActualizado) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioActualizado.id ? usuarioActualizado : u))
    );
    if (usuarioActual?.id === usuarioActualizado.id)
      setUsuarioActual(usuarioActualizado);
  }

  // Revisa si el alumno puede tomar una clase en esa fecha (plan, vencimiento,
  // congelamiento, clase cancelada). Devuelve el motivo si NO puede, o null.
  function motivoNoPuedeReservar(usuario, horarioId, fecha) {
    if (!usuario) return 'Debes iniciar sesión.';
    if (usuario.estado !== 'activo')
      return 'Tu cuenta está desactivada. Contacta al gimnasio para más información.';
    if (horarioEstaCancelado(horarioId, fecha)) return 'Esta clase fue cancelada.';
    // El staff (coach/admin) puede tomar clases sin plan.
    if (usuario.rol === 'usuario') {
      if (!usuario.plan_id)
        return 'No tienes un plan asignado. Habla con el gimnasio para activarlo.';
      const vence = fechaVenceDe(usuario, planes, diasRenovacion);
      if (vence && fecha >= vence)
        return `Tu plan vence el ${fechaLarga(vence)}. Renuévalo para reservar clases desde esa fecha.`;
      const congelado = congelaciones.find(
        (c) =>
          c.usuario_id === usuario.id &&
          c.estado === 'aprobada' &&
          c.fecha_inicio <= fecha &&
          c.fecha_fin >= fecha
      );
      if (congelado)
        return `Tu membresía está congelada hasta el ${fechaLarga(congelado.fecha_fin)}.`;
    }
    return null;
  }

  async function reservarClase(horarioId, fecha) {
    const horario = horarios.find((h) => h.id === horarioId);
    if (!horario) return { ok: false, mensaje: 'Horario no encontrado.' };

    const motivo = motivoNoPuedeReservar(usuarioActual, horarioId, fecha);
    if (motivo) return { ok: false, mensaje: motivo };

    if (reservaBloqueada(fecha, horario.hora, horasAnticipacion)) {
      return {
        ok: false,
        mensaje: `Ya no puedes reservar este horario (falta menos de ${horasAnticipacion} horas para que empiece).`,
      };
    }

    const inscritosActuales = reservas.filter(
      (r) =>
        r.horario_id === horarioId &&
        r.fecha === fecha &&
        r.estado === 'confirmada'
    ).length;

    if (inscritosActuales >= horario.cupo_max) {
      return { ok: false, mensaje: 'No quedan cupos en este horario.' };
    }

    const yaReservada = reservas.some(
      (r) =>
        r.horario_id === horarioId &&
        r.fecha === fecha &&
        r.usuario_id === usuarioActual.id &&
        r.estado === 'confirmada'
    );
    if (yaReservada)
      return { ok: false, mensaje: 'Ya tienes una reserva en este horario.' };

    const restantes = sesionesRestantes(usuarioActual);
    if (restantes !== null && restantes <= 0) {
      return {
        ok: false,
        mensaje: 'No te quedan sesiones disponibles en tu plan.',
      };
    }

    const { data: nuevaReserva, error: errorReserva } = await supabase
      .from('reservas')
      .insert({
        horario_id: horarioId,
        usuario_id: usuarioActual.id,
        fecha,
        estado: 'confirmada',
      })
      .select()
      .single();

    if (errorReserva)
      return {
        ok: false,
        mensaje: 'Error al reservar: ' + errorReserva.message,
      };

    const nuevasSesiones = (usuarioActual.sesiones_usadas || 0) + 1;
    const { error: errorUsuario } = await supabase
      .from('usuarios')
      .update({ sesiones_usadas: nuevasSesiones })
      .eq('id', usuarioActual.id);

    if (errorUsuario)
      return {
        ok: false,
        mensaje: 'Error al actualizar sesiones: ' + errorUsuario.message,
      };

    setReservas((prev) =>
      prev.some((r) => r.id === nuevaReserva.id)
        ? prev
        : [...prev, nuevaReserva]
    );
    syncUsuario({ ...usuarioActual, sesiones_usadas: nuevasSesiones });
    avisarCoachReserva(
      horario,
      fecha,
      `${usuarioActual.nombre} reservó tu clase de las ${horario.hora} del ${fechaLarga(fecha)} (${inscritosActuales + 1}/${horario.cupo_max}).`
    );

    return { ok: true, mensaje: 'Reserva confirmada.' };
  }

  // Reserva el mismo horario fijo en varias fechas (reserva recurrente).
  // Se salta las fechas donde no se puede y devuelve el detalle de cada una.
  async function reservarVarias(horarioId, fechas) {
    const horario = horarios.find((h) => h.id === horarioId);
    if (!horario) return { ok: false, mensaje: 'Horario no encontrado.', detalle: [] };

    let usadas = usuarioActual.sesiones_usadas || 0;
    const restantesInicial = sesionesRestantes(usuarioActual);
    let disponibles = restantesInicial;
    const detalle = [];
    const nuevas = [];

    for (const fecha of fechas) {
      const motivo = motivoNoPuedeReservar(usuarioActual, horarioId, fecha);
      if (motivo) {
        detalle.push({ fecha, ok: false, motivo });
        continue;
      }
      if (reservaBloqueada(fecha, horario.hora, horasAnticipacion)) {
        detalle.push({ fecha, ok: false, motivo: 'Ya cerraron las reservas' });
        continue;
      }
      const ya = reservas.some(
        (r) =>
          r.horario_id === horarioId &&
          r.fecha === fecha &&
          r.usuario_id === usuarioActual.id &&
          r.estado === 'confirmada'
      );
      if (ya) {
        detalle.push({ fecha, ok: true, motivo: 'Ya la tenías' });
        continue;
      }
      const inscritos = reservas.filter(
        (r) => r.horario_id === horarioId && r.fecha === fecha && r.estado === 'confirmada'
      ).length;
      if (inscritos >= horario.cupo_max) {
        detalle.push({ fecha, ok: false, motivo: 'Clase llena' });
        continue;
      }
      if (disponibles !== null && disponibles <= 0) {
        detalle.push({ fecha, ok: false, motivo: 'Sin sesiones disponibles' });
        continue;
      }
      const { data, error } = await supabase
        .from('reservas')
        .insert({ horario_id: horarioId, usuario_id: usuarioActual.id, fecha, estado: 'confirmada' })
        .select()
        .single();
      if (error) {
        detalle.push({ fecha, ok: false, motivo: 'Error al reservar' });
        continue;
      }
      nuevas.push(data);
      usadas += 1;
      if (disponibles !== null) disponibles -= 1;
      detalle.push({ fecha, ok: true, motivo: 'Reservada' });
    }

    if (nuevas.length > 0) {
      await supabase.from('usuarios').update({ sesiones_usadas: usadas }).eq('id', usuarioActual.id);
      setReservas((prev) => [...prev, ...nuevas.filter((n) => !prev.some((r) => r.id === n.id))]);
      syncUsuario({ ...usuarioActual, sesiones_usadas: usadas });
    }
    if (nuevas.length > 0) {
      avisarCoachReserva(
        horario,
        nuevas[0].fecha,
        `${usuarioActual.nombre} reservó ${nuevas.length} clase${nuevas.length !== 1 ? 's' : ''} de las ${horario.hora} (desde el ${fechaLarga(nuevas[0].fecha)}).`
      );
    }
    return { ok: nuevas.length > 0, reservadas: nuevas.length, detalle };
  }

  // --- Solicitudes de hora fuera de plazo ---
  // El alumno pide entrar a una clase del mismo día que ya cerró reservas;
  // el admin la aprueba (se crea la reserva) o la rechaza.

  function solicitudFueraPlazoDe(horarioId, fecha) {
    if (!usuarioActual) return null;
    return (
      solicitudesFueraPlazo.find(
        (s) =>
          s.horario_id === horarioId &&
          s.fecha === fecha &&
          s.usuario_id === usuarioActual.id
      ) || null
    );
  }

  async function solicitarFueraDePlazo(horarioId, fecha) {
    const motivo = motivoNoPuedeReservar(usuarioActual, horarioId, fecha);
    if (motivo) return { ok: false, mensaje: motivo };
    const horario = horarios.find((h) => h.id === horarioId);
    if (!horario) return { ok: false, mensaje: 'Horario no encontrado.' };

    const yaReservada = reservas.some(
      (r) =>
        r.horario_id === horarioId &&
        r.fecha === fecha &&
        r.usuario_id === usuarioActual.id &&
        r.estado === 'confirmada'
    );
    if (yaReservada)
      return { ok: false, mensaje: 'Ya tienes una reserva en este horario.' };

    const previa = solicitudFueraPlazoDe(horarioId, fecha);
    if (previa && previa.estado === 'pendiente') {
      return {
        ok: false,
        mensaje:
          'Ya enviaste una solicitud para esta clase. Está a espera de aprobación.',
      };
    }

    const restantes = sesionesRestantes(usuarioActual);
    if (restantes !== null && restantes <= 0) {
      return {
        ok: false,
        mensaje: 'No te quedan sesiones disponibles en tu plan.',
      };
    }

    const { data, error } = await supabase
      .from('solicitudes_fuera_plazo')
      .insert({
        horario_id: horarioId,
        usuario_id: usuarioActual.id,
        fecha,
        estado: 'pendiente',
      })
      .select()
      .single();

    if (error)
      return {
        ok: false,
        mensaje: 'No se pudo enviar la solicitud: ' + error.message,
      };

    setSolicitudesFueraPlazo((prev) =>
      prev.some((s) => s.id === data.id) ? prev : [data, ...prev]
    );

    const admins = usuarios.filter((u) => u.rol === 'head_coach');
    for (const admin of admins) {
      await crearNotificacion(
        admin.id,
        `${usuarioActual.nombre} solicita hora fuera de plazo para la clase de las ${horario.hora} (${fecha}). Revísala en Usuarios.`
      );
    }

    return {
      ok: true,
      mensaje: 'Solicitud enviada. A espera de aprobación del administrador.',
    };
  }

  async function aprobarSolicitudFueraPlazo(solicitudId) {
    const sol = solicitudesFueraPlazo.find((s) => s.id === solicitudId);
    if (!sol) return { ok: false, mensaje: 'Solicitud no encontrada.' };

    const horario = horarios.find((h) => h.id === sol.horario_id);
    const alumno = usuarios.find((u) => u.id === sol.usuario_id);

    const yaReservada = reservas.some(
      (r) =>
        r.horario_id === sol.horario_id &&
        r.fecha === sol.fecha &&
        r.usuario_id === sol.usuario_id &&
        r.estado === 'confirmada'
    );

    if (!yaReservada) {
      const { data: nuevaReserva, error: errorReserva } = await supabase
        .from('reservas')
        .insert({
          horario_id: sol.horario_id,
          usuario_id: sol.usuario_id,
          fecha: sol.fecha,
          estado: 'confirmada',
        })
        .select()
        .single();
      if (errorReserva)
        return {
          ok: false,
          mensaje: 'No se pudo crear la reserva: ' + errorReserva.message,
        };
      setReservas((prev) =>
        prev.some((r) => r.id === nuevaReserva.id)
          ? prev
          : [...prev, nuevaReserva]
      );

      if (alumno) {
        const nuevasSesiones = (alumno.sesiones_usadas || 0) + 1;
        await supabase
          .from('usuarios')
          .update({ sesiones_usadas: nuevasSesiones })
          .eq('id', alumno.id);
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === alumno.id ? { ...u, sesiones_usadas: nuevasSesiones } : u
          )
        );
        if (usuarioActual?.id === alumno.id) {
          setUsuarioActual((prev) => ({
            ...prev,
            sesiones_usadas: nuevasSesiones,
          }));
        }
      }
    }

    const { error } = await supabase
      .from('solicitudes_fuera_plazo')
      .update({ estado: 'aprobada' })
      .eq('id', solicitudId);
    if (error)
      return {
        ok: false,
        mensaje: 'No se pudo actualizar la solicitud: ' + error.message,
      };
    setSolicitudesFueraPlazo((prev) =>
      prev.map((s) => (s.id === solicitudId ? { ...s, estado: 'aprobada' } : s))
    );

    if (alumno) {
      await crearNotificacion(
        alumno.id,
        `¡Tu solicitud fue aprobada! Quedaste inscrito en la clase de las ${
          horario?.hora || ''
        } (${sol.fecha}).`
      );
    }
    return { ok: true, mensaje: 'Solicitud aprobada.' };
  }

  async function rechazarSolicitudFueraPlazo(solicitudId) {
    const sol = solicitudesFueraPlazo.find((s) => s.id === solicitudId);
    if (!sol) return { ok: false, mensaje: 'Solicitud no encontrada.' };
    const horario = horarios.find((h) => h.id === sol.horario_id);

    const { error } = await supabase
      .from('solicitudes_fuera_plazo')
      .update({ estado: 'rechazada' })
      .eq('id', solicitudId);
    if (error)
      return {
        ok: false,
        mensaje: 'No se pudo actualizar la solicitud: ' + error.message,
      };
    setSolicitudesFueraPlazo((prev) =>
      prev.map((s) =>
        s.id === solicitudId ? { ...s, estado: 'rechazada' } : s
      )
    );

    await crearNotificacion(
      sol.usuario_id,
      `Tu solicitud para la clase de las ${horario?.hora || ''} (${
        sol.fecha
      }) no fue aprobada.`
    );
    return { ok: true, mensaje: 'Solicitud rechazada.' };
  }

  async function cancelarReserva(reservaId) {
    const reserva = reservas.find((r) => r.id === reservaId);
    if (!reserva) return;

    const horario = horarios.find((h) => h.id === reserva.horario_id);
    const tardia = horario
      ? esCancelacionTardia(reserva.fecha, horario.hora, horasAnticipacion)
      : false;

    await supabase
      .from('reservas')
      .update({
        estado: 'cancelada',
        cancelado_en: new Date().toISOString(),
        penalizada: tardia,
      })
      .eq('id', reservaId);

    setReservas((prev) => prev.filter((r) => r.id !== reservaId));

    if (usuarioActual && !tardia) {
      const nuevasSesiones = Math.max(0, usuarioActual.sesiones_usadas - 1);
      await supabase
        .from('usuarios')
        .update({ sesiones_usadas: nuevasSesiones })
        .eq('id', usuarioActual.id);
      syncUsuario({ ...usuarioActual, sesiones_usadas: nuevasSesiones });
    }

    if (horario) {
      await avisarPrimeroEnListaEspera(horario.id, reserva.fecha);
      avisarCoachReserva(
        horario,
        reserva.fecha,
        `${usuarioActual?.nombre || 'Un alumno'} canceló su reserva de las ${horario.hora} del ${fechaLarga(reserva.fecha)}.`
      );
    }

    return { tardia };
  }

  // Cancela la reserva de un alumno específico desde la vista de admin (Clases).
  // No penaliza al alumno (fue el gimnasio quien lo sacó) y le avisa por notificación.
  async function cancelarReservaAdmin(reservaId) {
    const reserva = reservas.find((r) => r.id === reservaId);
    if (!reserva) return { ok: false, mensaje: 'Reserva no encontrada.' };

    const horario = horarios.find((h) => h.id === reserva.horario_id);

    await supabase
      .from('reservas')
      .update({
        estado: 'cancelada',
        cancelado_en: new Date().toISOString(),
        penalizada: false,
      })
      .eq('id', reservaId);

    setReservas((prev) => prev.filter((r) => r.id !== reservaId));

    const usuarioAfectado = usuarios.find((u) => u.id === reserva.usuario_id);
    if (usuarioAfectado) {
      const nuevasSesiones = Math.max(0, usuarioAfectado.sesiones_usadas - 1);
      await supabase
        .from('usuarios')
        .update({ sesiones_usadas: nuevasSesiones })
        .eq('id', usuarioAfectado.id);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuarioAfectado.id
            ? { ...u, sesiones_usadas: nuevasSesiones }
            : u
        )
      );
      if (usuarioActual?.id === usuarioAfectado.id) {
        setUsuarioActual((prev) => ({
          ...prev,
          sesiones_usadas: nuevasSesiones,
        }));
      }
      await crearNotificacion(
        usuarioAfectado.id,
        `Fuiste retirado/a de la clase de las ${horario?.hora || ''} del ${
          reserva.fecha
        }. No se descontó la sesión.`
      );
    }

    if (horario) {
      await avisarPrimeroEnListaEspera(horario.id, reserva.fecha);
    }

    return { ok: true };
  }

  // --- Lista de espera ---

  function estaEnListaEspera(horarioId, fecha) {
    return listaEspera.some(
      (l) =>
        l.horario_id === horarioId &&
        l.fecha === fecha &&
        l.usuario_id === usuarioActual.id
    );
  }

  function listaEsperaDe(horarioId, fecha) {
    return listaEspera.filter(
      (l) => l.horario_id === horarioId && l.fecha === fecha
    );
  }

  async function anotarseListaEspera(horarioId, fecha) {
    const { data, error } = await supabase
      .from('lista_espera')
      .insert({ horario_id: horarioId, fecha, usuario_id: usuarioActual.id })
      .select()
      .single();
    if (error)
      return { ok: false, mensaje: 'No se pudo anotar en la lista de espera.' };
    setListaEspera((prev) => [...prev, data]);
    return {
      ok: true,
      mensaje:
        'Quedaste en la lista de espera. Te avisaremos si se libera un cupo.',
    };
  }

  async function quitarseListaEspera(entradaId) {
    await supabase.from('lista_espera').delete().eq('id', entradaId);
    setListaEspera((prev) => prev.filter((l) => l.id !== entradaId));
  }

  async function avisarPrimeroEnListaEspera(horarioId, fecha) {
    const enEspera = listaEspera
      .filter((l) => l.horario_id === horarioId && l.fecha === fecha)
      .sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en));
    const primero = enEspera[0];
    if (!primero) return;

    const horario = horarios.find((h) => h.id === horarioId);
    await crearNotificacion(
      primero.usuario_id,
      `¡Se liberó un cupo en la clase de las ${
        horario?.hora || ''
      } del ${fecha}! Entra a reservar antes de que se ocupe.`
    );
    await supabase.from('lista_espera').delete().eq('id', primero.id);
    setListaEspera((prev) => prev.filter((l) => l.id !== primero.id));
  }

  async function agregarSesionesExtra(usuarioId, cantidad) {
    registrarActividad('Sesiones extra', `${usuarios.find((u) => u.id === usuarioId)?.nombre || ''} · +${cantidad}`);
    const usuario = usuarios.find((u) => u.id === usuarioId);
    if (!usuario) return { ok: false, mensaje: 'Usuario no encontrado.' };

    const nuevoExtra = (usuario.sesiones_extra || 0) + Number(cantidad);
    const { error } = await supabase
      .from('usuarios')
      .update({ sesiones_extra: nuevoExtra })
      .eq('id', usuarioId);
    if (error)
      return { ok: false, mensaje: 'No se pudo agregar las sesiones.' };

    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuarioId ? { ...u, sesiones_extra: nuevoExtra } : u
      )
    );
    if (usuarioActual?.id === usuarioId)
      syncUsuario({ ...usuarioActual, sesiones_extra: nuevoExtra });

    return {
      ok: true,
      mensaje:
        cantidad < 0
          ? `Se restaron ${Math.abs(cantidad)} sesión(es).`
          : `Se agregaron ${cantidad} sesión(es).`,
    };
  }

  // --- Notas de coach ---

  function finalizacionDe(horarioId, fecha) {
    return (
      clasesFinalizadas.find(
        (c) => String(c.horario_id) === String(horarioId) && c.fecha === fecha
      ) || null
    );
  }

  // Cierra la clase: exige asistencia marcada a todos y un comentario.
  // Una clase sin alumnos solo la puede registrar el admin (permitirSinAlumnos).
  async function finalizarClase(horarioId, fecha, comentario, { permitirSinAlumnos = false } = {}) {
    const inscritas = reservasDeClase(horarioId, fecha);
    if (inscritas.length === 0 && !permitirSinAlumnos) {
      return {
        ok: false,
        mensaje: 'Esta clase no tuvo alumnos inscritos, así que no cuenta como realizada. Solo el admin puede registrarla.',
      };
    }
    const sinMarcar = inscritas.filter((r) => r.asistio !== true && r.asistio !== false);
    if (sinMarcar.length > 0) {
      return {
        ok: false,
        mensaje: `Falta marcar la asistencia de ${sinMarcar.length} ${sinMarcar.length === 1 ? 'alumno' : 'alumnos'}.`,
      };
    }
    const texto = (comentario || '').trim();
    if (!texto) return { ok: false, mensaje: 'Escribe un comentario (por ejemplo: Sin novedades).' };

    // La clase se le registra al coach a cargo del horario (aunque la cierre el admin).
    const horario = horarios.find((h) => h.id === horarioId);
    const { data, error } = await supabase
      .from('clases_finalizadas')
      .upsert(
        {
          horario_id: String(horarioId),
          fecha,
          coach_id: coachDeClase(horario, fecha).id || usuarioActual.id,
          coach_nombre: coachDeClase(horario, fecha).nombre || usuarioActual.nombre,
          comentario: texto,
          presentes: inscritas.filter((r) => r.asistio === true).length,
          ausentes: inscritas.filter((r) => r.asistio === false).length,
          registrada_por: usuarioActual.nombre,
          finalizada_en: new Date().toISOString(),
        },
        { onConflict: 'horario_id,fecha' }
      )
      .select()
      .single();
    if (error) return { ok: false, mensaje: 'No se pudo finalizar la clase: ' + error.message };
    setClasesFinalizadas((prev) => [data, ...prev.filter((c) => c.id !== data.id)]);

    // Si el coach deja algo distinto a "Sin novedades", se avisa al admin.
    if (texto.toLowerCase() !== 'sin novedades' && usuarioActual.rol !== 'head_coach') {
      const admins = usuarios.filter((u) => u.rol === 'head_coach');
      for (const admin of admins) {
        await crearNotificacion(
          admin.id,
          `${usuarioActual.nombre} finalizó la clase de las ${horario?.hora || ''} (${fecha}): ${texto}`
        );
      }
    }
    return { ok: true, mensaje: 'Clase finalizada.' };
  }

  // Permite corregir: vuelve a abrir una clase finalizada.
  async function reabrirClase(horarioId, fecha) {
    const fin = finalizacionDe(horarioId, fecha);
    if (!fin) return { ok: true };
    const { error } = await supabase.from('clases_finalizadas').delete().eq('id', fin.id);
    if (error) return { ok: false, mensaje: 'No se pudo reabrir: ' + error.message };
    setClasesFinalizadas((prev) => prev.filter((c) => c.id !== fin.id));
    return { ok: true };
  }

  async function crearNotaCoach(horarioId, fecha, nota) {
    const { data, error } = await supabase
      .from('notas_coach')
      .insert({
        horario_id: horarioId,
        fecha,
        coach_id: usuarioActual.id,
        nota,
      })
      .select()
      .single();

    if (error) return { ok: false, mensaje: 'No se pudo enviar la nota.' };
    setNotasCoach((prev) => [data, ...prev]);

    const horario = horarios.find((h) => h.id === horarioId);
    const admins = usuarios.filter((u) => u.rol === 'head_coach');
    for (const admin of admins) {
      await crearNotificacion(
        admin.id,
        `Nota de ${usuarioActual.nombre} sobre la clase de las ${
          horario?.hora || ''
        } (${fecha}): ${nota}`
      );
    }

    return { ok: true, mensaje: 'Nota enviada al admin.' };
  }

  // --- Registro público de nuevos usuarios ---

  async function registrarUsuario(datos, password) {
    const revision = await validarCorreo(datos.correo);
    if (!revision.ok) return { ok: false, mensaje: revision.mensaje };
    datos = { ...datos, correo: revision.correo };
    const yaExiste = usuarios.some(
      (u) => (u.correo || '').toLowerCase() === datos.correo.trim().toLowerCase()
    );
    if (yaExiste) {
      return { ok: false, mensaje: 'Ya existe una cuenta con ese correo.' };
    }

    const { data: authData, error: errorAuth } = await supabase.auth.signUp({
      email: datos.correo.trim(),
      password,
    });

    if (errorAuth)
      return {
        ok: false,
        mensaje: 'Error al crear la cuenta: ' + errorAuth.message,
      };

    // Sin .select(): con la seguridad activada, quien se registra aún no puede leer fichas.
    const fila = {
      ...datos,
      obs_salud: (datos.obs_salud || '').trim() || null,
      auth_user_id: authData.user.id,
      rol: 'usuario',
      estado: 'pendiente',
      sesiones_usadas: 0,
    };
    if (datos.origen_prueba_id) fila.origen_prueba_id = String(datos.origen_prueba_id);
    else delete fila.origen_prueba_id;
    let { error } = await supabase.from('usuarios').insert(fila);
    // Si alguna columna nueva aún no existe en la base, se registra igual sin ella.
    for (const col of ['obs_salud', 'origen_prueba_id']) {
      if (error && (error.message || '').includes(col) && col in fila) {
        delete fila[col];
        ({ error } = await supabase.from('usuarios').insert(fila));
      }
    }

    if (error)
      return { ok: false, mensaje: 'Error al registrar: ' + error.message };

    await supabase.auth.signOut();
    return {
      ok: true,
      mensaje: 'Solicitud enviada. Espera la aprobación del administrador.',
    };
  }

  // ---- Sesión de prueba (formulario público, sin cuenta) ----
  async function enviarSolicitudPrueba(datos) {
    const nombre = (datos.nombre || '').trim();
    const telefono = (datos.telefono || '').trim();
    if (!nombre || !telefono) return { ok: false, mensaje: 'Escribe tu nombre y teléfono.' };
    if (telefono.replace(/\D/g, '').length < 8) return { ok: false, mensaje: 'Revisa tu número de teléfono.' };
    const correo = (datos.correo || '').trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo))
      return { ok: false, mensaje: 'Revisa tu correo (o déjalo en blanco).' };
    // Sin .select(): quien la envía no tiene cuenta y no puede leer la tabla.
    const { error } = await supabase.from('solicitudes_prueba').insert({
      nombre,
      telefono,
      correo: correo || null,
      preferencia: (datos.preferencia || '').trim() || null,
      comentario: (datos.comentario || '').trim() || null,
      ...(datos.referido_por ? { referido_por: String(datos.referido_por) } : {}),
    });
    if (error) return { ok: false, mensaje: 'No se pudo enviar. Intenta de nuevo o escríbenos por WhatsApp.' };
    return { ok: true, mensaje: '¡Listo! Te contactaremos pronto para agendar tu sesión de prueba.' };
  }

  async function actualizarSolicitudPrueba(id, cambios) {
    const { error } = await supabase.from('solicitudes_prueba').update(cambios).eq('id', id);
    if (error) return { ok: false, mensaje: 'No se pudo guardar: ' + error.message };
    setSolicitudesPrueba((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)));
    return { ok: true };
  }

  async function eliminarSolicitudPrueba(id) {
    const { error } = await supabase.from('solicitudes_prueba').delete().eq('id', id);
    if (error) return { ok: false, mensaje: 'No se pudo eliminar: ' + error.message };
    setSolicitudesPrueba((prev) => prev.filter((s) => s.id !== id));
    return { ok: true };
  }

  // ---- "Trae a un amigo" ----
  // Cuántos amigos pidieron prueba con el link del alumno y cuántos se inscribieron.
  async function misReferidos() {
    const { data, error } = await supabase.rpc('mis_referidos');
    if (error || !data) return { solicitudes: 0, inscritos: 0 };
    return { solicitudes: Number(data.solicitudes) || 0, inscritos: Number(data.inscritos) || 0 };
  }

  // El admin regala sesiones a quien recomendó a un amigo que se inscribió.
  async function regalarSesionReferido(solicitud, cantidad = 1) {
    const referente = usuarios.find((u) => String(u.id) === String(solicitud.referido_por));
    if (!referente) return { ok: false, mensaje: 'No encontré al alumno que lo recomendó.' };
    // Primero se marca el regalo (solo si aún no estaba marcado), así no se regala dos veces.
    const { data: marcada, error } = await supabase
      .from('solicitudes_prueba')
      .update({ regalo_entregado: true })
      .eq('id', solicitud.id)
      .eq('regalo_entregado', false)
      .select('id');
    if (error) return { ok: false, mensaje: 'No se pudo guardar: ' + error.message };
    setSolicitudesPrueba((prev) => prev.map((s) => (s.id === solicitud.id ? { ...s, regalo_entregado: true } : s)));
    if (!marcada || marcada.length === 0) return { ok: false, mensaje: 'Ese regalo ya se había entregado.' };
    const r = await agregarSesionesExtra(referente.id, cantidad);
    if (!r.ok) {
      await supabase.from('solicitudes_prueba').update({ regalo_entregado: false }).eq('id', solicitud.id);
      setSolicitudesPrueba((prev) => prev.map((s) => (s.id === solicitud.id ? { ...s, regalo_entregado: false } : s)));
      return r;
    }
    await crearNotificacion(
      referente.id,
      `🎁 ¡Gracias por recomendarnos! ${solicitud.nombre} se inscribió y te regalamos ${cantidad} sesión${cantidad > 1 ? 'es' : ''} extra.`
    );
    return { ok: true, mensaje: `Se regaló ${cantidad} sesión a ${referente.nombre}.` };
  }

  // ---- Seguimiento de alumnos en riesgo ----
  async function marcarContactadoSeguimiento(usuarioId) {
    const ahora = new Date().toISOString();
    const { error } = await supabase.from('usuarios').update({ ultimo_contacto_seguimiento: ahora }).eq('id', usuarioId);
    if (error) return { ok: false, mensaje: 'No se pudo guardar: ' + error.message };
    setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? { ...u, ultimo_contacto_seguimiento: ahora } : u)));
    return { ok: true };
  }

  // ---- Pago en línea (Mercado Pago) ----
  // Crea el cobro y lleva al alumno a la página de pago de Mercado Pago.
  async function pagarEnLinea() {
    const { data, error } = await supabase.functions.invoke('crear-pago', { body: {} });
    if (error || !data?.ok || !data?.url) {
      let detalle = data?.error || '';
      try {
        if (!detalle && error?.context?.json) detalle = (await error.context.json())?.error || '';
      } catch (e) {
        // sin detalle
      }
      return { ok: false, mensaje: detalle || 'No se pudo iniciar el pago en línea. Intenta más tarde o paga en el gimnasio.' };
    }
    window.location.href = data.url;
    return { ok: true };
  }

  // ---- Evaluación de clases por el alumno ----
  function evaluacionDe(reservaId) {
    return evaluaciones.find((e) => String(e.reserva_id) === String(reservaId)) || null;
  }

  function evaluacionesDeClase(horarioId, fecha) {
    return evaluaciones.filter((e) => e.horario_id === horarioId && e.fecha === fecha);
  }

  async function evaluarClase(reserva, puntaje, comentario) {
    if (!puntaje || puntaje < 1 || puntaje > 5) return { ok: false, mensaje: 'Elige de 1 a 5 estrellas.' };
    const horario = horarios.find((h) => h.id === reserva.horario_id);
    const coach = horario ? coachDeClase(horario, reserva.fecha) : null;
    const fila = {
      reserva_id: String(reserva.id),
      usuario_id: usuarioActual.id,
      horario_id: reserva.horario_id,
      fecha: reserva.fecha,
      coach_id: coach?.id || horario?.coach_id || null,
      puntaje,
      comentario: (comentario || '').trim() || null,
    };
    const { data, error } = await supabase
      .from('evaluaciones_clase')
      .upsert(fila, { onConflict: 'reserva_id' })
      .select()
      .single();
    if (error) return { ok: false, mensaje: 'No se pudo guardar tu evaluación: ' + error.message };
    setEvaluaciones((prev) => [data, ...prev.filter((e) => String(e.reserva_id) !== fila.reserva_id)]);
    return { ok: true, mensaje: '¡Gracias por evaluar la clase!' };
  }

  async function cambiarRol(usuarioId, nuevoRol) {
    await supabase
      .from('usuarios')
      .update({ rol: nuevoRol })
      .eq('id', usuarioId);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, rol: nuevoRol } : u))
    );
  }

  async function aprobarUsuario(usuarioId) {
    registrarActividad('Registro aprobado', usuarios.find((u) => u.id === usuarioId)?.nombre || '');
    await supabase
      .from('usuarios')
      .update({ estado: 'activo' })
      .eq('id', usuarioId);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, estado: 'activo' } : u))
    );
    await crearNotificacion(
      usuarioId,
      'Tu cuenta fue aprobada. ¡Bienvenido a CED&S!'
    );
  }

  async function desactivarUsuario(usuarioId) {
    registrarActividad('Alumno desactivado', usuarios.find((u) => u.id === usuarioId)?.nombre || '');
    await supabase
      .from('usuarios')
      .update({ estado: 'inactivo' })
      .eq('id', usuarioId);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, estado: 'inactivo' } : u))
    );
  }

  async function reactivarUsuario(usuarioId) {
    registrarActividad('Alumno reactivado', usuarios.find((u) => u.id === usuarioId)?.nombre || '');
    await supabase
      .from('usuarios')
      .update({ estado: 'activo' })
      .eq('id', usuarioId);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, estado: 'activo' } : u))
    );
  }

  // --- Notificaciones ---

  // --- Historial de cambios (quién hizo qué) ---
  function registrarActividad(accion, detalle) {
    if (!usuarioActual || usuarioActual.rol === 'usuario') return;
    supabase
      .from('actividad')
      .insert({
        actor_id: usuarioActual.id,
        actor_nombre: usuarioActual.nombre,
        accion,
        detalle: detalle || null,
      })
      .then(() => {});
  }

  async function obtenerActividad(limite = 300) {
    const { data } = await supabase
      .from('actividad')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(limite);
    return data || [];
  }

  // --- Gastos del gimnasio ---
  async function guardarGasto(gasto) {
    const fila = {
      fecha: gasto.fecha,
      monto: Number(gasto.monto) || 0,
      categoria: gasto.categoria || 'otro',
      descripcion: (gasto.descripcion || '').trim() || null,
    };
    if (gasto.id) {
      const { error } = await supabase.from('gastos').update(fila).eq('id', gasto.id);
      if (error) return { ok: false, mensaje: 'No se pudo guardar: ' + error.message };
      setGastos((prev) => prev.map((g) => (g.id === gasto.id ? { ...g, ...fila } : g)));
      registrarActividad('Gasto editado', `${fila.categoria} · $${fila.monto.toLocaleString('es-CL')}`);
      return { ok: true };
    }
    const { data, error } = await supabase.from('gastos').insert(fila).select().single();
    if (error) return { ok: false, mensaje: 'No se pudo guardar: ' + error.message };
    setGastos((prev) => [data, ...prev]);
    registrarActividad('Gasto registrado', `${fila.categoria} · $${fila.monto.toLocaleString('es-CL')}`);
    return { ok: true };
  }

  async function eliminarGasto(gastoId) {
    const g = gastos.find((x) => x.id === gastoId);
    const { error } = await supabase.from('gastos').delete().eq('id', gastoId);
    if (error) return { ok: false, mensaje: 'No se pudo borrar: ' + error.message };
    setGastos((prev) => prev.filter((x) => x.id !== gastoId));
    if (g) registrarActividad('Gasto eliminado', `${g.categoria} · $${Number(g.monto).toLocaleString('es-CL')}`);
    return { ok: true };
  }

  async function guardarTarifaCoach(coachId, valor) {
    const valorClase = Number(valor) || 0;
    const { error } = await supabase
      .from('tarifas_coach')
      .upsert({ coach_id: coachId, valor_clase: valorClase, actualizado_en: new Date().toISOString() }, { onConflict: 'coach_id' });
    if (error) return { ok: false, mensaje: 'No se pudo guardar: ' + error.message };
    setTarifasCoach((prev) => ({ ...prev, [coachId]: valorClase }));
    registrarActividad('Valor por clase', `${usuarios.find((u) => u.id === coachId)?.nombre || ''} · $${valorClase.toLocaleString('es-CL')}`);
    return { ok: true };
  }

  // --- Aviso masivo: notificación en la app + al celular a varias personas ---
  async function enviarAvisoMasivo(usuarioIds, mensaje, titulo) {
    const ids = [...new Set(usuarioIds)].filter(Boolean);
    const texto = (mensaje || '').trim();
    if (!texto) return { ok: false, mensaje: 'Escribe el mensaje.' };
    if (ids.length === 0) return { ok: false, mensaje: 'No hay personas en ese grupo.' };
    const { error } = await supabase
      .from('notificaciones')
      .insert(ids.map((id) => ({ usuario_id: id, mensaje: texto })));
    if (error) return { ok: false, mensaje: 'No se pudo enviar: ' + error.message };
    // Si yo estoy en la lista, se ve al tiro en mi campana
    if (ids.includes(usuarioActual?.id)) {
      setNotificaciones((prev) => [
        { id: 'local-' + Date.now(), usuario_id: usuarioActual.id, mensaje: texto, leida: false, creado_en: new Date().toISOString() },
        ...prev,
      ]);
    }
    const { data } = await supabase.functions
      .invoke('enviar-push', { body: { usuario_ids: ids, mensaje: texto, titulo } })
      .catch(() => ({ data: null }));
    registrarActividad('Aviso masivo', `${ids.length} personas · ${texto.slice(0, 80)}`);
    return {
      ok: true,
      mensaje: `Aviso enviado a ${ids.length} persona${ids.length !== 1 ? 's' : ''}${
        data?.enviadas !== undefined ? ` (${data.enviadas} celulares)` : ''
      }.`,
    };
  }

  async function crearNotificacion(usuarioId, mensaje) {
    if (usuarioId === usuarioActual?.id) {
      const { data, error } = await supabase
        .from('notificaciones')
        .insert({ usuario_id: usuarioId, mensaje })
        .select()
        .single();
      if (!error) setNotificaciones((prev) => [data, ...prev]);
    } else {
      // Aviso para otra persona: no se pide la fila de vuelta (no siempre se puede leer).
      await supabase.from('notificaciones').insert({ usuario_id: usuarioId, mensaje });
    }

    // Además del aviso dentro de la app, intenta mandar la notificación push real
    supabase.functions
      .invoke('enviar-push', { body: { usuario_id: usuarioId, mensaje } })
      .catch(() => {});
  }

  async function marcarNotificacionLeida(notificacionId) {
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', notificacionId);
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === notificacionId ? { ...n, leida: true } : n))
    );
  }

  // --- Congelación de membresía ---

  async function solicitarCongelacion(motivo) {
    const plan = usuarioActual.plan_id ? planes[usuarioActual.plan_id] : null;
    const duracionDias =
      usuarioActual.plan_dias_personalizado || plan?.duracion_dias || 30;
    if (duracionDias < 90) {
      return {
        ok: false,
        mensaje:
          'El congelamiento de membresía solo está disponible para planes de 3 meses (90 días) o más.',
      };
    }

    const yaTienePendiente = congelaciones.some(
      (c) => c.usuario_id === usuarioActual.id && c.estado === 'pendiente'
    );
    if (yaTienePendiente) {
      return {
        ok: false,
        mensaje: 'Ya tienes una solicitud de congelamiento pendiente.',
      };
    }
    const { data, error } = await supabase
      .from('congelaciones')
      .insert({
        usuario_id: usuarioActual.id,
        motivo: motivo || null,
        estado: 'pendiente',
      })
      .select()
      .single();
    if (error)
      return {
        ok: false,
        mensaje: 'Error al enviar la solicitud: ' + error.message,
      };
    setCongelaciones((prev) => [data, ...prev]);
    const admins = usuarios.filter((u) => u.rol === 'head_coach' && u.id !== usuarioActual.id);
    for (const a of admins) {
      await crearNotificacion(
        a.id,
        `${usuarioActual.nombre} pidió congelar su membresía${motivo ? `: ${motivo}` : '.'} Revísalo en Usuarios.`
      );
    }
    return {
      ok: true,
      mensaje: 'Solicitud enviada. Espera la aprobación del administrador.',
    };
  }

  // Al aprobar un congelamiento, el vencimiento del plan se corre los mismos días,
  // para que el alumno no pierda los días congelados.
  async function aprobarCongelacion(congelacionId, dias) {
    const congelacion = congelaciones.find((c) => c.id === congelacionId);
    if (!congelacion) return;
    const nDias = Number(dias) || 0;

    const fechaInicio = hoyLocalISO();
    const fin = new Date(fechaInicio + 'T12:00:00');
    fin.setDate(fin.getDate() + nDias);
    const fechaFinISO = isoLocal(fin);

    await supabase
      .from('congelaciones')
      .update({
        estado: 'aprobada',
        dias: nDias,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFinISO,
      })
      .eq('id', congelacionId);

    setCongelaciones((prev) =>
      prev.map((c) =>
        c.id === congelacionId
          ? { ...c, estado: 'aprobada', dias: nDias, fecha_inicio: fechaInicio, fecha_fin: fechaFinISO }
          : c
      )
    );

    // Correr el vencimiento del plan
    const alumno = usuarios.find((u) => u.id === congelacion.usuario_id);
    let mensajeVence = '';
    if (alumno) {
      const venceActual = fechaVenceDe(alumno, planes, diasRenovacion);
      if (venceActual) {
        const nuevo = new Date(venceActual + 'T12:00:00');
        nuevo.setDate(nuevo.getDate() + nDias);
        const nuevoISO = isoLocal(nuevo);
        const { error } = await supabase
          .from('usuarios')
          .update({ fecha_vencimiento: nuevoISO })
          .eq('id', alumno.id);
        if (!error) {
          syncUsuario({ ...alumno, fecha_vencimiento: nuevoISO });
          mensajeVence = ` Tu plan ahora vence el ${fechaLarga(nuevoISO)}.`;
        }
      }
    }

    await crearNotificacion(
      congelacion.usuario_id,
      `Tu membresía fue congelada hasta el ${fechaLarga(fechaFinISO)}.${mensajeVence}`
    );
    registrarActividad('Congelamiento aprobado', `${alumno?.nombre || ''} · ${nDias} días`);
  }

  async function rechazarCongelacion(congelacionId) {
    registrarActividad('Congelamiento rechazado', '');
    const congelacion = congelaciones.find((c) => c.id === congelacionId);
    if (!congelacion) return;

    await supabase
      .from('congelaciones')
      .update({ estado: 'rechazada' })
      .eq('id', congelacionId);
    setCongelaciones((prev) =>
      prev.map((c) =>
        c.id === congelacionId ? { ...c, estado: 'rechazada' } : c
      )
    );

    await crearNotificacion(
      congelacion.usuario_id,
      'Tu solicitud de congelamiento fue rechazada.'
    );
  }

  function congelacionActivaDe(usuarioId) {
    const hoy = hoyLocalISO();
    return (
      congelaciones.find(
        (c) =>
          c.usuario_id === usuarioId &&
          c.estado === 'aprobada' &&
          c.fecha_fin >= hoy
      ) || null
    );
  }

  async function rechazarUsuario(usuarioId) {
    registrarActividad('Cuenta eliminada o rechazada', usuarios.find((u) => u.id === usuarioId)?.nombre || '');
    await supabase.from('usuarios').delete().eq('id', usuarioId);
    setUsuarios((prev) => prev.filter((u) => u.id !== usuarioId));
  }

  // --- Acciones de administrador ---

  async function marcarAsistencia(reservaId, asistio) {
    await supabase.from('reservas').update({ asistio }).eq('id', reservaId);
    setReservas((prev) =>
      prev.map((r) => (r.id === reservaId ? { ...r, asistio } : r))
    );
  }

  // Marca la misma asistencia a varias reservas de una vez ("Marcar todos presentes")
  async function marcarAsistenciaVarias(reservaIds, asistio) {
    if (!reservaIds.length) return;
    await supabase.from('reservas').update({ asistio }).in('id', reservaIds);
    setReservas((prev) => prev.map((r) => (reservaIds.includes(r.id) ? { ...r, asistio } : r)));
  }

  // --- Coaches: quién hace cada clase, reemplazos, ausencias y observaciones ---

  // Coach que hace la clase ese día (el reemplazo, si hay uno; si no, el del horario)
  function coachDeClase(horario, fecha) {
    if (!horario) return { id: null, nombre: '' };
    const r = reemplazos.find(
      (x) => String(x.horario_id) === String(horario.id) && x.fecha === fecha
    );
    if (r) return { id: r.coach_id, nombre: r.coach_nombre || '', esReemplazo: true };
    return { id: horario.coach_id, nombre: horario.coach_nombre || '', esReemplazo: false };
  }

  function reemplazoDe(horarioId, fecha) {
    return reemplazos.find((x) => String(x.horario_id) === String(horarioId) && x.fecha === fecha) || null;
  }

  // El admin elige quién reemplaza al coach en un día puntual (coachId null = quitar reemplazo)
  async function asignarReemplazo(horarioId, fecha, coachId) {
    registrarActividad('Reemplazo de coach', `${fecha} → ${coachId ? usuarios.find((u) => u.id === coachId)?.nombre || '' : 'sin reemplazo'}`);
    const horario = horarios.find((h) => h.id === horarioId);
    const actual = reemplazoDe(horarioId, fecha);
    if (!coachId) {
      if (actual) {
        await supabase.from('reemplazos_clase').delete().eq('id', actual.id);
        setReemplazos((prev) => prev.filter((r) => r.id !== actual.id));
      }
      return { ok: true };
    }
    const coach = usuarios.find((u) => u.id === coachId);
    const { data, error } = await supabase
      .from('reemplazos_clase')
      .upsert(
        { horario_id: String(horarioId), fecha, coach_id: coachId, coach_nombre: coach?.nombre || '' },
        { onConflict: 'horario_id,fecha' }
      )
      .select()
      .single();
    if (error) return { ok: false, mensaje: 'No se pudo guardar el reemplazo: ' + error.message };
    setReemplazos((prev) => [data, ...prev.filter((r) => r.id !== data.id)]);
    // Avisos: al coach que reemplaza y al coach titular
    if (coachId !== usuarioActual?.id) {
      await crearNotificacion(
        coachId,
        `Te asignaron la clase de las ${horario?.hora || ''} del ${fechaLarga(fecha)} (reemplazo).`
      );
    }
    if (horario?.coach_id && horario.coach_id !== coachId && horario.coach_id !== usuarioActual?.id) {
      await crearNotificacion(
        horario.coach_id,
        `Tu clase de las ${horario.hora} del ${fechaLarga(fecha)} la hará ${coach?.nombre || 'otro coach'}.`
      );
    }
    // Si había un aviso de ausencia para esa clase, queda resuelto
    const pendientes = ausenciasCoach.filter(
      (a) => String(a.horario_id) === String(horarioId) && a.fecha === fecha && a.estado === 'pendiente'
    );
    for (const a of pendientes) await resolverAusencia(a.id);
    return { ok: true };
  }

  async function avisarAusencia(horarioId, fecha, motivo) {
    const horario = horarios.find((h) => h.id === horarioId);
    const { data, error } = await supabase
      .from('ausencias_coach')
      .insert({
        horario_id: String(horarioId),
        fecha,
        coach_id: usuarioActual.id,
        coach_nombre: usuarioActual.nombre,
        motivo: (motivo || '').trim() || null,
      })
      .select()
      .single();
    if (error) return { ok: false, mensaje: 'No se pudo enviar el aviso: ' + error.message };
    setAusenciasCoach((prev) => [data, ...prev]);
    const admins = usuarios.filter((u) => u.rol === 'head_coach' && u.id !== usuarioActual.id);
    for (const a of admins) {
      await crearNotificacion(
        a.id,
        `${usuarioActual.nombre} no puede hacer la clase de las ${horario?.hora || ''} del ${fechaLarga(fecha)}${
          motivo ? `: ${motivo}` : ''
        }. Asigna un reemplazo o cancela la clase en Clases.`
      );
    }
    return { ok: true, mensaje: 'Aviso enviado al admin.' };
  }

  function ausenciaDe(horarioId, fecha) {
    return (
      ausenciasCoach.find(
        (a) => String(a.horario_id) === String(horarioId) && a.fecha === fecha && a.estado === 'pendiente'
      ) || null
    );
  }

  async function resolverAusencia(ausenciaId) {
    await supabase.from('ausencias_coach').update({ estado: 'resuelta' }).eq('id', ausenciaId);
    setAusenciasCoach((prev) => prev.map((a) => (a.id === ausenciaId ? { ...a, estado: 'resuelta' } : a)));
  }

  function observacionDe(usuarioId) {
    return observaciones.find((o) => o.usuario_id === usuarioId)?.texto || '';
  }

  async function guardarObservacion(usuarioId, texto) {
    const fila = {
      usuario_id: usuarioId,
      texto: (texto || '').trim(),
      actualizado_por: usuarioActual.nombre,
      actualizado_en: new Date().toISOString(),
    };
    const { error } = await supabase.from('observaciones_alumno').upsert(fila, { onConflict: 'usuario_id' });
    if (error) return { ok: false, mensaje: 'No se pudo guardar: ' + error.message };
    setObservaciones((prev) => [fila, ...prev.filter((o) => o.usuario_id !== usuarioId)]);
    return { ok: true, mensaje: 'Observación guardada.' };
  }

  // El coach agrega a un alumno que llegó sin reservar: queda presente y se le descuenta la sesión.
  async function agregarAlumnoAClase(horarioId, fecha, usuarioId) {
    const ya = reservas.find(
      (r) => r.horario_id === horarioId && r.fecha === fecha && r.usuario_id === usuarioId && r.estado === 'confirmada'
    );
    if (ya) return { ok: false, mensaje: 'Ese alumno ya está en la clase.' };
    const alumno = usuarios.find((u) => u.id === usuarioId);
    if (!alumno) return { ok: false, mensaje: 'Alumno no encontrado.' };
    const { data, error } = await supabase
      .from('reservas')
      .insert({ horario_id: horarioId, usuario_id: usuarioId, fecha, estado: 'confirmada', asistio: true })
      .select()
      .single();
    if (error) return { ok: false, mensaje: 'No se pudo agregar: ' + error.message };
    setReservas((prev) => [...prev, data]);
    const nuevas = (alumno.sesiones_usadas || 0) + 1;
    await supabase.from('usuarios').update({ sesiones_usadas: nuevas }).eq('id', usuarioId);
    setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? { ...u, sesiones_usadas: nuevas } : u)));
    return { ok: true, mensaje: `${alumno.nombre} agregado a la clase.` };
  }

  // Aviso al coach cuando alguien reserva o cancela en su clase (si lo activó en su perfil)
  async function avisarCoachReserva(horario, fecha, texto) {
    const { id } = coachDeClase(horario, fecha);
    if (!id || id === usuarioActual?.id) return;
    const coach = usuarios.find((u) => u.id === id);
    if (!coach?.avisos_reservas) return;
    await crearNotificacion(id, texto);
  }

  async function crearRutina(nombre, linkGooglesheet) {
    const { data, error } = await supabase
      .from('rutinas')
      .insert({ nombre, link_googlesheet: linkGooglesheet || null })
      .select()
      .single();
    if (!error) setRutinas((prev) => [...prev, data]);
    return data;
  }

  async function importarContenidoRutina(rutinaId, datosSemanas) {
    for (const numero of Object.keys(datosSemanas)) {
      const dias = datosSemanas[numero];
      const { data: semana } = await supabase
        .from('rutina_semanas')
        .insert({ rutina_id: rutinaId, numero: Number(numero) })
        .select()
        .single();

      for (let ordenDia = 0; ordenDia < dias.length; ordenDia++) {
        const dia = dias[ordenDia];
        const { data: diaRow } = await supabase
          .from('rutina_dias')
          .insert({ semana_id: semana.id, nombre: dia.nombre, orden: ordenDia })
          .select()
          .single();

        const filas = [];
        ['calentamiento', 'trabajo', 'cierre'].forEach((seccion) => {
          dia.secciones[seccion].forEach((ej, orden) => {
            filas.push({ dia_id: diaRow.id, seccion, orden, ...ej });
          });
        });
        if (filas.length > 0) {
          await supabase.from('rutina_ejercicios').insert(filas);
        }
      }
    }
  }

  async function asignarRutina(usuarioId, rutinaId) {
    const activaAnterior = usuarioRutinas.find(
      (ur) => ur.usuario_id === usuarioId && ur.activa
    );
    const hoy = hoyLocalISO();

    if (activaAnterior) {
      await supabase
        .from('usuario_rutina')
        .update({ activa: false, fecha_fin: hoy })
        .eq('id', activaAnterior.id);
    }

    const { data: nueva, error } = await supabase
      .from('usuario_rutina')
      .insert({
        usuario_id: usuarioId,
        rutina_id: rutinaId,
        activa: true,
        fecha_asignacion: hoy,
      })
      .select()
      .single();

    if (!error) {
      setUsuarioRutinas((prev) => [
        nueva,
        ...prev.map((ur) =>
          ur.id === activaAnterior?.id
            ? { ...ur, activa: false, fecha_fin: hoy }
            : ur
        ),
      ]);
    }
  }

  function rutinaActivaDe(usuarioId) {
    const asignacion = usuarioRutinas.find(
      (ur) => ur.usuario_id === usuarioId && ur.activa
    );
    if (!asignacion) return null;
    const rutina = rutinas.find((r) => r.id === asignacion.rutina_id);
    return rutina
      ? { ...rutina, fecha_asignacion: asignacion.fecha_asignacion }
      : null;
  }

  function historialRutinasDe(usuarioId) {
    return usuarioRutinas
      .filter((ur) => ur.usuario_id === usuarioId)
      .map((ur) => ({
        ...ur,
        rutina: rutinas.find((r) => r.id === ur.rutina_id),
      }))
      .filter((ur) => ur.rutina)
      .sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion));
  }

  async function obtenerProgreso(usuarioId) {
    const { data } = await supabase
      .from('progreso')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('fecha', { ascending: false });
    return data || [];
  }

  async function agregarProgreso(datos) {
    const { data, error } = await supabase
      .from('progreso')
      .insert({ usuario_id: usuarioActual.id, ...datos })
      .select()
      .single();
    if (error)
      return { ok: false, mensaje: 'Error al guardar: ' + error.message };
    return { ok: true, data };
  }

  async function eliminarProgreso(id) {
    await supabase.from('progreso').delete().eq('id', id);
  }

  // Igual que agregarProgreso, pero para que un admin/coach cargue el peso de OTRO usuario
  // (agregarProgreso siempre usa usuarioActual.id, que no sirve aquí).
  async function agregarProgresoAdmin(usuarioId, datos) {
    const { data, error } = await supabase
      .from('progreso')
      .insert({ usuario_id: usuarioId, ...datos })
      .select()
      .single();
    if (error)
      return { ok: false, mensaje: 'Error al guardar: ' + error.message };
    return { ok: true, data };
  }

  async function obtenerSemanas(rutinaId) {
    const { data } = await supabase
      .from('rutina_semanas')
      .select('*')
      .eq('rutina_id', rutinaId)
      .order('numero');
    return data || [];
  }

  async function obtenerDias(semanaId) {
    const { data } = await supabase
      .from('rutina_dias')
      .select('*')
      .eq('semana_id', semanaId)
      .order('orden');
    return data || [];
  }

  async function obtenerEjercicios(diaId) {
    const { data } = await supabase
      .from('rutina_ejercicios')
      .select('*')
      .eq('dia_id', diaId)
      .order('orden');
    return data || [];
  }

  // Cambia el peso de un ejercicio de la rutina y deja registro del cambio
  // (peso anterior → nuevo), para el mensaje de progreso y los reportes.
  // Semana (número), día (nombre) y orden del día de un ejercicio de la rutina
  async function semanaYDiaDe(ejercicioId) {
    try {
      const { data: ej } = await supabase.from('rutina_ejercicios').select('dia_id').eq('id', ejercicioId).single();
      if (!ej) return null;
      const { data: dia } = await supabase
        .from('rutina_dias')
        .select('nombre, orden, semana_id')
        .eq('id', ej.dia_id)
        .single();
      if (!dia) return null;
      const { data: sem } = await supabase.from('rutina_semanas').select('numero').eq('id', dia.semana_id).single();
      return { semana: sem?.numero ?? null, dia: dia.nombre || null, dia_orden: dia.orden ?? null };
    } catch {
      return null;
    }
  }

  async function registrarPeso({ ejercicioId, rutinaId, ejercicio, peso, pesoAnterior, nota }) {
    const valor = Number(String(peso).replace(',', '.'));
    if (!Number.isFinite(valor) || valor < 0) {
      return { ok: false, mensaje: 'Ingresa un peso válido.' };
    }

    // 1) Actualiza el peso en la rutina
    const pesoTexto = String(valor).replace('.', ',');
    if (ejercicioId) {
      const { data: filasRutina, error: errorRutina } = await supabase
        .from('rutina_ejercicios')
        .update({ peso_referencia: pesoTexto })
        .eq('id', ejercicioId)
        .select('id');
      if (errorRutina) return { ok: false, mensaje: 'No se pudo cambiar el peso: ' + errorRutina.message };
      if (!filasRutina || filasRutina.length === 0) {
        // Supabase no dejó modificar la rutina (permisos). El historial igual guarda el peso nuevo,
        // y la app muestra siempre el último peso registrado.
        console.warn('No se pudo actualizar rutina_ejercicios (revisar permisos en Supabase).');
      }
    }

    // 2) Registro del cambio, a nombre del alumno dueño de la rutina
    const asignacion =
      usuarioRutinas.find((ur) => ur.rutina_id === rutinaId && ur.activa) ||
      usuarioRutinas.find((ur) => ur.rutina_id === rutinaId);
    const fila = {
      usuario_id: asignacion?.usuario_id || usuarioActual.id,
      rutina_id: rutinaId || null,
      ejercicio_id: ejercicioId || null,
      ejercicio,
      peso: valor,
      peso_anterior: pesoAnterior ?? null,
      nota: nota || null,
    };

    // Semana y día de la rutina a los que pertenece el ejercicio (los pesos varían según estos)
    const sesion = ejercicioId ? await semanaYDiaDe(ejercicioId) : null;
    let { data, error } = await supabase
      .from('registros_peso')
      .insert(sesion ? { ...fila, ...sesion } : fila)
      .select()
      .single();
    if (error && sesion && /semana|dia/i.test(error.message || '')) {
      // Si todavía no se agregaron las columnas nuevas en Supabase, se guarda igual sin ellas
      ({ data, error } = await supabase.from('registros_peso').insert(fila).select().single());
    }
    if (error) {
      // El peso de la rutina ya quedó cambiado; solo falló el historial.
      return { ok: true, pesoTexto, registro: null, aviso: 'El peso se cambió, pero no se pudo guardar el historial: ' + error.message };
    }
    setRegistrosPeso((prev) => (prev.some((r) => r.id === data.id) ? prev : [data, ...prev]));
    return { ok: true, pesoTexto, registro: data };
  }

  // Todo el contenido de una rutina (para descargarla en Excel)
  async function obtenerRutinaCompleta(rutinaId) {
    const semanas = await obtenerSemanas(rutinaId);
    const resultado = [];
    for (const semana of semanas) {
      const dias = await obtenerDias(semana.id);
      const diasConEjercicios = [];
      for (const dia of dias) {
        diasConEjercicios.push({ ...dia, ejercicios: await obtenerEjercicios(dia.id) });
      }
      resultado.push({ ...semana, dias: diasConEjercicios });
    }
    return resultado;
  }

  async function actualizarPerfil(usuarioId, datos) {
    const { error } = await supabase
      .from('usuarios')
      .update(datos)
      .eq('id', usuarioId);
    if (error)
      return { ok: false, mensaje: 'Error al guardar: ' + error.message };

    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, ...datos } : u))
    );
    if (usuarioActual?.id === usuarioId) {
      setUsuarioActual((prev) => ({ ...prev, ...datos }));
    }
    return { ok: true, mensaje: 'Perfil actualizado.' };
  }

  async function crearNoticia(datos) {
    const { data, error } = await supabase
      .from('noticias')
      .insert(datos)
      .select()
      .single();
    if (!error) setNoticias((prev) => [data, ...prev]);
  }

  async function actualizarNoticia(noticiaId, datos) {
    const { data, error } = await supabase
      .from('noticias')
      .update(datos)
      .eq('id', noticiaId)
      .select()
      .single();
    if (error)
      return { ok: false, mensaje: 'No se pudo actualizar la noticia.' };
    setNoticias((prev) => prev.map((n) => (n.id === noticiaId ? data : n)));
    return { ok: true, mensaje: 'Noticia actualizada.' };
  }

  async function eliminarNoticia(noticiaId) {
    await supabase.from('noticias').delete().eq('id', noticiaId);
    setNoticias((prev) => prev.filter((n) => n.id !== noticiaId));
  }

  async function subirFotoGym(dataUrl) {
    const { data, error } = await supabase
      .from('fotos_gym')
      .insert({ url: dataUrl })
      .select()
      .single();
    if (!error) setFotosGym((prev) => [data, ...prev]);
  }

  async function eliminarFotoGym(fotoId) {
    await supabase.from('fotos_gym').delete().eq('id', fotoId);
    setFotosGym((prev) => prev.filter((f) => f.id !== fotoId));
  }

  // --- Pagos ---
  // Cada pago queda registrado con fecha, monto y medio de pago.
  // El ingreso de un mes es la suma real de los pagos de ese mes.

  function hoyLocalISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function montoPlanDe(usuario) {
    if (!usuario) return 0;
    const plan = usuario.plan_id ? planes[usuario.plan_id] : null;
    return Number(usuario.plan_monto_personalizado || plan?.valor_con_iva || 0);
  }

  async function registrarPago({ usuarioId, monto, medio, fecha, tipo, nota, planId, vence }) {
    registrarActividad('Pago registrado', `${usuarios.find((u) => u.id === usuarioId)?.nombre || ''} · $${Number(monto || 0).toLocaleString('es-CL')}`);
    const usuario = usuarios.find((u) => u.id === usuarioId);
    const fila = {
      usuario_id: usuarioId,
      plan_id: planId ?? usuario?.plan_id ?? null,
      monto: Number(monto) || 0,
      medio: medio || 'transferencia',
      fecha: fecha || hoyLocalISO(),
      tipo: tipo || 'manual',
      nota: nota || null,
    };
    if (vence) fila.vence = vence;
    const { data, error } = await supabase.from('pagos').insert(fila).select().single();
    if (error) {
      return { ok: false, mensaje: 'No se pudo registrar el pago: ' + error.message };
    }
    setPagos((prev) => (prev.some((p) => p.id === data.id) ? prev : [data, ...prev]));
    return { ok: true, pago: data, mensaje: 'Pago registrado.' };
  }

  // Confirma el pago del plan (primer pago o renovación): registra el pago
  // y reinicia las sesiones del alumno.
  async function confirmarRenovacion(usuarioId, opciones = {}) {
    const usuario = usuarios.find((u) => u.id === usuarioId);
    const fechaPago = opciones.fecha || hoyLocalISO();
    const tipo = usuario?.fecha_ultima_renovacion ? 'renovacion' : 'primer_pago';

    const resultadoPago = await registrarPago({
      usuarioId,
      monto: opciones.monto ?? montoPlanDe(usuario),
      medio: opciones.medio,
      fecha: fechaPago,
      tipo,
      nota: opciones.nota,
      vence: opciones.vence,
    });
    if (!resultadoPago.ok) return resultadoPago;

    const cambiosUsuario = { sesiones_usadas: 0, fecha_ultima_renovacion: fechaPago };
    if (opciones.vence) cambiosUsuario.fecha_vencimiento = opciones.vence;

    const { error } = await supabase
      .from('usuarios')
      .update(cambiosUsuario)
      .eq('id', usuarioId);

    if (error) {
      // Si no se pudo renovar al alumno, deshacemos el pago para no dejarlo a medias.
      await supabase.from('pagos').delete().eq('id', resultadoPago.pago.id);
      setPagos((prev) => prev.filter((p) => p.id !== resultadoPago.pago.id));
      console.error('confirmarRenovacion falló:', error);
      return { ok: false, mensaje: 'No se pudo confirmar el pago: ' + error.message };
    }

    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuarioId
          ? { ...u, ...cambiosUsuario }
          : u
      )
    );
    await crearNotificacion(
      usuarioId,
      'Tu plan fue renovado. ¡Ya tienes tus sesiones disponibles de nuevo!'
    );
    return { ok: true, mensaje: 'Pago confirmado.' };
  }

  async function actualizarPago(pagoId, cambios) {
    { const pg = pagos.find((x) => x.id === pagoId); if (pg) registrarActividad('Pago editado', `${usuarios.find((u) => u.id === pg.usuario_id)?.nombre || ''} · ${pg.fecha}`); }
    const limpio = { ...cambios };
    if (limpio.monto !== undefined) limpio.monto = Number(limpio.monto) || 0;
    const pagoAntes = pagos.find((p) => p.id === pagoId);
    const { error } = await supabase.from('pagos').update(limpio).eq('id', pagoId);
    if (error) return { ok: false, mensaje: 'No se pudo guardar: ' + error.message };
    setPagos((prev) => prev.map((p) => (p.id === pagoId ? { ...p, ...limpio } : p)));

    // Si es el último pago de plan del alumno, su vencimiento y fecha de renovación
    // se actualizan también (así lo que se ve en Alumnos y Renovaciones calza).
    if (pagoAntes && pagoAntes.tipo !== 'manual') {
      const ultimo = pagos
        .filter((p) => p.usuario_id === pagoAntes.usuario_id && p.tipo !== 'manual')
        .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
      const usuario = usuarios.find((u) => u.id === pagoAntes.usuario_id);
      if (ultimo?.id === pagoId && usuario) {
        const cambiosUsuario = {};
        if (limpio.fecha && limpio.fecha !== usuario.fecha_ultima_renovacion)
          cambiosUsuario.fecha_ultima_renovacion = limpio.fecha;
        if (limpio.vence && limpio.vence !== usuario.fecha_vencimiento)
          cambiosUsuario.fecha_vencimiento = limpio.vence;
        if (Object.keys(cambiosUsuario).length > 0) {
          const { error: errorUsuario } = await supabase
            .from('usuarios')
            .update(cambiosUsuario)
            .eq('id', usuario.id);
          if (!errorUsuario) {
            setUsuarios((prev) =>
              prev.map((u) => (u.id === usuario.id ? { ...u, ...cambiosUsuario } : u))
            );
          }
        }
      }
    }
    return { ok: true, mensaje: 'Pago actualizado.' };
  }

  // Borra un pago. Si era el pago que renovó el plan del alumno, su renovación
  // vuelve a la anterior (o queda sin pago), así le reaparece el botón de cobrar.
  async function eliminarPago(pagoId) {
    { const pg = pagos.find((x) => x.id === pagoId); if (pg) registrarActividad('Pago eliminado', `${usuarios.find((u) => u.id === pg.usuario_id)?.nombre || ''} · $${Number(pg.monto).toLocaleString('es-CL')} · ${pg.fecha}`); }
    const pago = pagos.find((p) => p.id === pagoId);
    if (!pago) return { ok: false, mensaje: 'Pago no encontrado.' };

    const { error } = await supabase.from('pagos').delete().eq('id', pagoId);
    if (error) return { ok: false, mensaje: 'No se pudo borrar: ' + error.message };
    setPagos((prev) => prev.filter((p) => p.id !== pagoId));

    const usuario = usuarios.find((u) => u.id === pago.usuario_id);
    if (usuario && pago.tipo !== 'manual' && usuario.fecha_ultima_renovacion === pago.fecha) {
      const anteriores = pagos
        .filter((p) => p.id !== pagoId && p.usuario_id === usuario.id && p.tipo !== 'manual')
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      const restaurar = {
        fecha_ultima_renovacion: anteriores[0]?.fecha || null,
        fecha_vencimiento: anteriores[0]?.vence || null,
      };
      await supabase.from('usuarios').update(restaurar).eq('id', usuario.id);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, ...restaurar } : u))
      );
    }
    return { ok: true, mensaje: 'Pago eliminado.' };
  }

  async function asignarPlan(usuarioId, planId) {
    registrarActividad('Plan cambiado', `${usuarios.find((u) => u.id === usuarioId)?.nombre || ''} → ${planes[planId]?.nombre || 'sin plan'}`);
    await supabase
      .from('usuarios')
      .update({ plan_id: planId || null, sesiones_usadas: 0 })
      .eq('id', usuarioId);
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuarioId
          ? { ...u, plan_id: planId || null, sesiones_usadas: 0 }
          : u
      )
    );
  }

  async function crearUsuario(nuevo) {
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        ...nuevo,
        rol: 'usuario',
        estado: 'activo',
        sesiones_usadas: 0,
      })
      .select()
      .single();
    if (!error) setUsuarios((prev) => [...prev, data]);
  }

  async function crearCoachConPassword(datos, password) {
    const revision = await validarCorreo(datos.correo);
    if (!revision.ok) return { ok: false, mensaje: revision.mensaje };
    datos = { ...datos, correo: revision.correo };
    const clienteTemporal = crearClienteTemporal();
    const { data: authData, error: errorAuth } =
      await clienteTemporal.auth.signUp({
        email: datos.correo.trim(),
        password,
      });

    if (errorAuth)
      return {
        ok: false,
        mensaje: 'Error al crear la cuenta: ' + errorAuth.message,
      };

    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        ...datos,
        auth_user_id: authData.user.id,
        rol: 'coach',
        estado: 'activo',
        sesiones_usadas: 0,
      })
      .select()
      .single();

    if (error)
      return { ok: false, mensaje: 'Error al registrar: ' + error.message };

    setUsuarios((prev) => [...prev, data]);
    return { ok: true, mensaje: 'Coach creado correctamente.' };
  }

  async function crearUsuarioConPassword(datos, password) {
    const revision = await validarCorreo(datos.correo);
    if (!revision.ok) return { ok: false, mensaje: revision.mensaje };
    datos = { ...datos, correo: revision.correo };
    const clienteTemporal = crearClienteTemporal();
    const { data: authData, error: errorAuth } =
      await clienteTemporal.auth.signUp({
        email: datos.correo.trim(),
        password,
      });

    if (errorAuth)
      return {
        ok: false,
        mensaje: 'Error al crear la cuenta: ' + errorAuth.message,
      };

    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        ...datos,
        auth_user_id: authData.user.id,
        rol: 'usuario',
        estado: 'activo',
        sesiones_usadas: 0,
      })
      .select()
      .single();

    if (error)
      return { ok: false, mensaje: 'Error al registrar: ' + error.message };

    setUsuarios((prev) => [...prev, data]);
    return { ok: true, mensaje: 'Usuario creado correctamente.' };
  }

  async function editarClase(horarioId, datos) {
    { const h = horarios.find((x) => x.id === horarioId); registrarActividad('Clase editada', h ? `${h.fecha_unica || h.dia} ${h.hora}` : ''); }
    const antes = horarios.find((h) => h.id === horarioId);
    await supabase.from('horarios').update(datos).eq('id', horarioId);
    setHorarios((prev) =>
      prev.map((h) => (h.id === horarioId ? { ...h, ...datos } : h))
    );
    const despues = { ...antes, ...datos };
    const desc = `${despues.fecha_unica ? fechaLarga(despues.fecha_unica) : `los ${String(despues.dia || '').toLowerCase()}`} a las ${despues.hora}`;
    if (antes && datos.coach_id !== undefined && datos.coach_id !== antes.coach_id) {
      if (datos.coach_id && datos.coach_id !== usuarioActual?.id)
        await crearNotificacion(datos.coach_id, `Te asignaron la clase de ${desc}.`);
      if (antes.coach_id && antes.coach_id !== usuarioActual?.id)
        await crearNotificacion(antes.coach_id, `Ya no estás a cargo de la clase de ${desc}.`);
    } else if (antes?.coach_id && antes.coach_id !== usuarioActual?.id && (datos.hora !== antes.hora || datos.dia !== antes.dia)) {
      await crearNotificacion(antes.coach_id, `Tu clase cambió: ahora es ${desc}.`);
    }
  }

  function horarioEstaCancelado(horarioId, fecha) {
    return horariosCancelados.some(
      (hc) => hc.horario_id === horarioId && hc.fecha === fecha
    );
  }

  // Expande los horarios (fijos y puntuales) a las clases que realmente ocurrieron
  // dentro de un rango de fechas [desdeISO, hastaISO] (inclusive), hasta el momento
  // actual, excluyendo las canceladas. Sirve para el Dashboard ("Clases realizadas")
  // y su detalle, con o sin filtro de rango.
  function clasesRealizadasEnRango(desdeISO, hastaISO) {
    const NOMBRES_DIA = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const ahoraMs = Date.now();

    // Se usa el mediodía para recorrer los días: en Chile, el cambio de horario (septiembre)
    // hace que la medianoche "salte" a la 01:00 y el día de hoy quedaba fuera del rango.
    // Por eso las clases de hoy no aparecían para finalizar.
    const desde = new Date(desdeISO + 'T12:00:00');
    const hasta = new Date(hastaISO + 'T12:00:00');

    // "YYYY-MM-DD" en calendario LOCAL, no vía toISOString() (que convierte a UTC
    // y puede saltar al día siguiente en horario de tarde/noche en Chile).
    function soloFechaLocal(fecha) {
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    }

    const ocurrencias = [];
    for (
      let fechaObj = new Date(desde);
      fechaObj <= hasta;
      fechaObj.setDate(fechaObj.getDate() + 1)
    ) {
      const fechaISO = soloFechaLocal(fechaObj);
      const diaNombre = NOMBRES_DIA[fechaObj.getDay()];

      for (const h of horarios) {
        const aplica = h.fecha_unica
          ? h.fecha_unica === fechaISO
          : h.dia === diaNombre;
        if (!aplica) continue;
        if (horarioEstaCancelado(h.id, fechaISO)) continue;
        if (horaAFecha(fechaISO, h.hora).getTime() >= ahoraMs) continue;

        ocurrencias.push({ horario: h, fecha: fechaISO });
      }
    }

    return ocurrencias.sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        b.horario.hora.localeCompare(a.horario.hora)
    );
  }

  // Compatibilidad: clases realizadas desde el día 1 del mes en curso hasta hoy.
  function clasesRealizadasDelMes() {
    const ahora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const desdeISO = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-01`;
    const hastaISO = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(
      ahora.getDate()
    )}`;
    return clasesRealizadasEnRango(desdeISO, hastaISO);
  }

  // Reservas confirmadas de una clase, solo de alumnos que todavía existen
  // (si se borró un usuario, su reserva vieja no debe bloquear el cierre de la clase).
  function reservasDeClase(horarioId, fecha) {
    return reservas.filter(
      (r) =>
        String(r.horario_id) === String(horarioId) &&
        r.fecha === fecha &&
        r.estado === 'confirmada' &&
        usuarios.some((u) => u.id === r.usuario_id)
    );
  }

  function tuvoAlumnos(horarioId, fecha) {
    return reservasDeClase(horarioId, fecha).length > 0;
  }

  // Clases que cuentan como REALIZADAS:
  // - las finalizadas (por el coach, o registradas por el admin aunque no tengan alumnos);
  // - las anteriores a FINALIZACION_DESDE que tuvieron alumnos (antes no existía "finalizar").
  function clasesRealizadasConAlumnosEnRango(desdeISO, hastaISO) {
    return clasesRealizadasEnRango(desdeISO, hastaISO).filter((o) => {
      if (finalizacionDe(o.horario.id, o.fecha)) return true;
      return o.fecha < FINALIZACION_DESDE && tuvoAlumnos(o.horario.id, o.fecha);
    });
  }

  // Ya pasaron, tuvieron alumnos y el coach todavía no las finaliza.
  function clasesPorFinalizarEnRango(desdeISO, hastaISO) {
    return clasesRealizadasEnRango(desdeISO, hastaISO).filter(
      (o) =>
        o.fecha >= FINALIZACION_DESDE &&
        !finalizacionDe(o.horario.id, o.fecha) &&
        tuvoAlumnos(o.horario.id, o.fecha)
    );
  }

  // Ya pasaron y nadie se inscribió (no cuentan, salvo que el admin las registre).
  function clasesSinAlumnosEnRango(desdeISO, hastaISO) {
    return clasesRealizadasEnRango(desdeISO, hastaISO).filter(
      (o) => !finalizacionDe(o.horario.id, o.fecha) && !tuvoAlumnos(o.horario.id, o.fecha)
    );
  }

  function mensajeCancelacionDe(horarioId, fecha) {
    const hc = horariosCancelados.find(
      (h) => h.horario_id === horarioId && h.fecha === fecha
    );
    return hc?.mensaje || null;
  }

  async function cancelarHorarioFecha(horarioId, fecha, mensaje) {
    { const h = horarios.find((x) => x.id === horarioId); registrarActividad('Clase cancelada', `${fecha} ${h?.hora || ''}${mensaje ? ' · ' + mensaje : ''}`); }
    await supabase
      .from('horarios_cancelados')
      .insert({ horario_id: horarioId, fecha, mensaje });
    setHorariosCancelados((prev) => [
      ...prev,
      { horario_id: horarioId, fecha, mensaje },
    ]);

    // Aviso al coach que tenía la clase
    const horarioCancelado = horarios.find((h) => h.id === horarioId);
    const coachClase = coachDeClase(horarioCancelado, fecha);
    if (coachClase.id && coachClase.id !== usuarioActual?.id) {
      await crearNotificacion(
        coachClase.id,
        `Se canceló tu clase de las ${horarioCancelado?.hora || ''} del ${fechaLarga(fecha)}.${mensaje ? ' ' + mensaje : ''}`
      );
    }

    const afectadas = reservas.filter(
      (r) => r.horario_id === horarioId && r.fecha === fecha
    );

    for (const r of afectadas) {
      await supabase
        .from('reservas')
        .update({
          estado: 'cancelada',
          cancelado_en: new Date().toISOString(),
          penalizada: false,
        })
        .eq('id', r.id);

      const usuarioAfectado = usuarios.find((u) => u.id === r.usuario_id);
      if (usuarioAfectado) {
        const nuevasSesiones = Math.max(0, usuarioAfectado.sesiones_usadas - 1);
        await supabase
          .from('usuarios')
          .update({ sesiones_usadas: nuevasSesiones })
          .eq('id', usuarioAfectado.id);
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === usuarioAfectado.id
              ? { ...u, sesiones_usadas: nuevasSesiones }
              : u
          )
        );
        if (usuarioActual?.id === usuarioAfectado.id) {
          setUsuarioActual((prev) => ({
            ...prev,
            sesiones_usadas: nuevasSesiones,
          }));
        }
        await crearNotificacion(
          usuarioAfectado.id,
          `Tu clase del ${fecha} fue cancelada.${mensaje ? ' ' + mensaje : ''}`
        );
      }
    }

    setReservas((prev) =>
      prev.filter((r) => !(r.horario_id === horarioId && r.fecha === fecha))
    );
  }

  async function reactivarHorarioFecha(horarioId, fecha) {
    await supabase
      .from('horarios_cancelados')
      .delete()
      .eq('horario_id', horarioId)
      .eq('fecha', fecha);
    setHorariosCancelados((prev) =>
      prev.filter((hc) => !(hc.horario_id === horarioId && hc.fecha === fecha))
    );
  }

  async function crearClase(nueva) {
    registrarActividad('Clase creada', `${nueva.fecha_unica || nueva.dia} ${nueva.hora}`);
    const { data, error } = await supabase
      .from('horarios')
      .insert(nueva)
      .select()
      .single();
    if (error)
      return {
        ok: false,
        mensaje: 'No se pudo crear la clase: ' + error.message,
      };
    setHorarios((prev) => [...prev, data]);
    if (data.coach_id && data.coach_id !== usuarioActual?.id) {
      await crearNotificacion(
        data.coach_id,
        `Te asignaron una clase nueva: ${data.fecha_unica ? fechaLarga(data.fecha_unica) : `los ${String(data.dia).toLowerCase()}`} a las ${data.hora}.`
      );
    }
    return { ok: true, mensaje: 'Clase creada correctamente.' };
  }

  async function eliminarClase(horarioId) {
    { const h = horarios.find((x) => x.id === horarioId); registrarActividad('Clase eliminada', h ? `${h.fecha_unica || h.dia} ${h.hora}` : ''); }
    await supabase.from('horarios').delete().eq('id', horarioId);
    setHorarios((prev) => prev.filter((h) => h.id !== horarioId));
  }

  async function crearPlan(datos) {
    const id = 'plan_' + Date.now();
    const { data, error } = await supabase
      .from('planes')
      .insert({ id, ...datos })
      .select()
      .single();
    if (!error) setPlanes((prev) => ({ ...prev, [id]: data }));
    return data;
  }

  async function eliminarPlan(planId) {
    const conPlan = usuarios.filter((u) => u.plan_id === planId);
    if (conPlan.length > 0) {
      return {
        ok: false,
        mensaje: `No se puede eliminar: ${conPlan.length} ${conPlan.length === 1 ? 'alumno tiene' : 'alumnos tienen'} este plan. Cámbiales el plan primero.`,
      };
    }
    const { error } = await supabase.from('planes').delete().eq('id', planId);
    if (error) return { ok: false, mensaje: 'No se pudo eliminar el plan: ' + error.message };
    setPlanes((prev) => {
      const copia = { ...prev };
      delete copia[planId];
      return copia;
    });
    return { ok: true };
  }

  async function guardarPlan(planId, datos) {
    await supabase.from('planes').update(datos).eq('id', planId);
    setPlanes((prev) => ({ ...prev, [planId]: { ...prev[planId], ...datos } }));
  }

  return (
    <AuthContext.Provider
      value={{
        usuarioActual,
        login,
        logout,
        error,
        setError,
        usuarios,
        clases: horarios,
        horarios,
        planes,
        eliminarPlan,
        reservas,
        cargando,
        reservarClase,
        cancelarReserva,
        cancelarReservaAdmin,
        sesionesRestantes,
        asignarPlan,
        confirmarRenovacion,
        crearUsuario,
        crearUsuarioConPassword,
        crearCoachConPassword,
        crearClase,
        eliminarClase,
        editarClase,
        horariosCancelados,
        horarioEstaCancelado,
        clasesRealizadasDelMes,
        clasesRealizadasEnRango,
        clasesRealizadasConAlumnosEnRango,
        clasesPorFinalizarEnRango,
        clasesSinAlumnosEnRango,
        finalizacionDesde: FINALIZACION_DESDE,
        mensajeCancelacionDe,
        cancelarHorarioFecha,
        reactivarHorarioFecha,
        guardarPlan,
        crearPlan,
        actualizarPerfil,
        marcarAsistencia,
        noticias,
        fotosGym,
        crearNoticia,
        eliminarNoticia,
        subirFotoGym,
        eliminarFotoGym,
        rutinas,
        usuarioRutinas,
        crearRutina,
        importarContenidoRutina,
        asignarRutina,
        rutinaActivaDe,
        historialRutinasDe,
        obtenerSemanas,
        obtenerDias,
        obtenerEjercicios,
        obtenerProgreso,
        agregarProgreso,
        agregarProgresoAdmin,
        eliminarProgreso,
        logoUrl,
        actualizarLogo,
        rolEfectivo,
        cambiarVista,
        horasAnticipacion,
        diasRenovacion,
        infoGimnasio,
        actualizarInfoGimnasio,
        cambiarContrasena,
        actualizarPoliticas,
        listaEspera,
        estaEnListaEspera,
        listaEsperaDe,
        anotarseListaEspera,
        quitarseListaEspera,
        notasCoach,
        crearNotaCoach,
        solicitudesFueraPlazo,
        pagos,
        registrosPeso,
        clasesFinalizadas,
        finalizacionDe,
        registrarActividad,
        obtenerActividad,
        gastos,
        tarifasCoach,
        evaluaciones,
        iniciando,
        evaluacionDe,
        evaluacionesDeClase,
        evaluarClase,
        solicitudesPrueba,
        enviarSolicitudPrueba,
        actualizarSolicitudPrueba,
        eliminarSolicitudPrueba,
        misReferidos,
        regalarSesionReferido,
        marcarContactadoSeguimiento,
        pagarEnLinea,
        guardarTarifaCoach,
        guardarGasto,
        eliminarGasto,
        enviarAvisoMasivo,
        marcarAsistenciaVarias,
        coachDeClase,
        reemplazoDe,
        asignarReemplazo,
        avisarAusencia,
        ausenciaDe,
        ausenciasCoach,
        resolverAusencia,
        observacionDe,
        guardarObservacion,
        agregarAlumnoAClase,
        finalizarClase,
        reabrirClase,
        registrarPeso,
        obtenerRutinaCompleta,
        registrarPago,
        actualizarPago,
        eliminarPago,
        montoPlanDe,
        motivoNoPuedeReservar,
        reservarVarias,
        solicitudFueraPlazoDe,
        solicitarFueraDePlazo,
        aprobarSolicitudFueraPlazo,
        rechazarSolicitudFueraPlazo,
        agregarSesionesExtra,
        actualizarNoticia,
        desactivarUsuario,
        reactivarUsuario,
        registrarUsuario,
        aprobarUsuario,
        rechazarUsuario,
        solicitarRecuperacion,
        cambiarRol,
        congelaciones,
        solicitarCongelacion,
        aprobarCongelacion,
        rechazarCongelacion,
        congelacionActivaDe,
        notificaciones,
        marcarNotificacionLeida,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
