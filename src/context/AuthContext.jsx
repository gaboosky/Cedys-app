import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, crearClienteTemporal } from '../lib/supabase';
import { reservaBloqueada, esCancelacionTardia } from '../lib/horarioUtils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [error, setError] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [planes, setPlanes] = useState({});
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);
  const [vistaComo, setVistaComo] = useState(null);
  const [horasAnticipacion, setHorasAnticipacion] = useState(4);
  const [diasRenovacion, setDiasRenovacion] = useState(30);
  const [noticias, setNoticias] = useState([]);
  const [fotosGym, setFotosGym] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [usuarioRutinas, setUsuarioRutinas] = useState([]);
  const [horariosCancelados, setHorariosCancelados] = useState([]);
  const [congelaciones, setCongelaciones] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [listaEspera, setListaEspera] = useState([]);
  const [notasCoach, setNotasCoach] = useState([]);

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
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      await cargarDatos(sessionData.session.user.id);
    } else {
      setCargando(false);
    }
  }

  async function cargarDatos(authUserId) {
    setCargando(true);
    const [
      resUsuarios,
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
      resConfigApp,
      resListaEspera,
      resNotasCoach,
    ] = await Promise.all([
      supabase.from('usuarios').select('*'),
      supabase.from('horarios').select('*'),
      supabase.from('planes').select('*'),
      supabase.from('reservas').select('*').eq('estado', 'confirmada'),
      supabase
        .from('noticias')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('fotos_gym')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('rutinas').select('*'),
      supabase
        .from('usuario_rutina')
        .select('*')
        .order('fecha_asignacion', { ascending: false }),
      supabase.from('horarios_cancelados').select('*'),
      supabase.from('congelaciones').select('*'),
      supabase
        .from('notificaciones')
        .select('*')
        .order('creado_en', { ascending: false }),
      supabase
        .from('configuracion_app')
        .select('*')
        .eq('id', 'global')
        .single(),
      supabase
        .from('lista_espera')
        .select('*')
        .order('creado_en', { ascending: true }),
      supabase
        .from('notas_coach')
        .select('*')
        .order('creado_en', { ascending: false }),
    ]);
    if (resNoticias.data) setNoticias(resNoticias.data);
    if (resFotos.data) setFotosGym(resFotos.data);
    if (resRutinas.data) setRutinas(resRutinas.data);
    if (resUsuarioRutinas.data) setUsuarioRutinas(resUsuarioRutinas.data);
    if (resHorariosCancelados.data)
      setHorariosCancelados(resHorariosCancelados.data);
    if (resCongelaciones.data) setCongelaciones(resCongelaciones.data);
    if (resNotificaciones.data) setNotificaciones(resNotificaciones.data);
    if (resConfigApp.data) {
      setLogoUrl(resConfigApp.data.logo_url);
      setHorasAnticipacion(resConfigApp.data.horas_anticipacion ?? 4);
      setDiasRenovacion(resConfigApp.data.dias_renovacion ?? 30);
    }
    if (resListaEspera.data) setListaEspera(resListaEspera.data);
    if (resNotasCoach.data) setNotasCoach(resNotasCoach.data);

    if (resUsuarios.data) setUsuarios(resUsuarios.data);
    if (resHorarios.data) setHorarios(resHorarios.data);
    if (resReservas.data) setReservas(resReservas.data);
    if (resPlanes.data) {
      const planesObj = {};
      resPlanes.data.forEach((p) => {
        planesObj[p.id] = p;
      });
      setPlanes(planesObj);
    }

    // Restaurar sesión si había una guardada
    let encontrado = null;
    if (authUserId && resUsuarios.data) {
      encontrado =
        resUsuarios.data.find((u) => u.auth_user_id === authUserId) || null;
      if (encontrado && encontrado.estado === 'activo') {
        setUsuarioActual(encontrado);
      }
    }

    setCargando(false);
    return encontrado;
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

  async function login(correo, password) {
    const { data, error: errorAuth } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password,
    });

    if (errorAuth) {
      setError('Correo o contraseña incorrectos.');
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
    const { error } = await supabase.auth.resetPasswordForEmail(correo.trim());
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
  const rolEfectivo =
    usuarioActual?.rol === 'head_coach'
      ? vistaComo || 'head_coach'
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

  async function reservarClase(horarioId, fecha) {
    if (usuarioActual.estado !== 'activo') {
      return {
        ok: false,
        mensaje:
          'Tu cuenta está desactivada. Contacta al gimnasio para más información.',
      };
    }

    const horario = horarios.find((h) => h.id === horarioId);
    if (!horario) return { ok: false, mensaje: 'Horario no encontrado.' };

    if (reservaBloqueada(fecha, horario.hora, horasAnticipacion)) {
      return {
        ok: false,
        mensaje:
          'Ya no puedes reservar este horario (falta menos de 4 horas para que empiece).',
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

    const nuevasSesiones = usuarioActual.sesiones_usadas + 1;
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

    return { ok: true, mensaje: 'Reserva confirmada.' };
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
    }

    return { tardia };
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
    const yaExiste = usuarios.some(
      (u) => u.correo.toLowerCase() === datos.correo.trim().toLowerCase()
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

    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        ...datos,
        auth_user_id: authData.user.id,
        rol: 'usuario',
        estado: 'pendiente',
        sesiones_usadas: 0,
      })
      .select()
      .single();

    if (error)
      return { ok: false, mensaje: 'Error al registrar: ' + error.message };

    setUsuarios((prev) => [...prev, data]);
    await supabase.auth.signOut();
    return {
      ok: true,
      mensaje: 'Solicitud enviada. Espera la aprobación del administrador.',
    };
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
    await supabase
      .from('usuarios')
      .update({ estado: 'inactivo' })
      .eq('id', usuarioId);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, estado: 'inactivo' } : u))
    );
  }

  async function reactivarUsuario(usuarioId) {
    await supabase
      .from('usuarios')
      .update({ estado: 'activo' })
      .eq('id', usuarioId);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, estado: 'activo' } : u))
    );
  }

  // --- Notificaciones ---

  async function crearNotificacion(usuarioId, mensaje) {
    const { data, error } = await supabase
      .from('notificaciones')
      .insert({ usuario_id: usuarioId, mensaje })
      .select()
      .single();
    if (!error) setNotificaciones((prev) => [data, ...prev]);

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
    return {
      ok: true,
      mensaje: 'Solicitud enviada. Espera la aprobación del administrador.',
    };
  }

  async function aprobarCongelacion(congelacionId, dias) {
    const congelacion = congelaciones.find((c) => c.id === congelacionId);
    if (!congelacion) return;

    const fechaInicio = new Date().toISOString().slice(0, 10);
    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + Number(dias));
    const fechaFinISO = fechaFin.toISOString().slice(0, 10);

    await supabase
      .from('congelaciones')
      .update({
        estado: 'aprobada',
        dias: Number(dias),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFinISO,
      })
      .eq('id', congelacionId);

    setCongelaciones((prev) =>
      prev.map((c) =>
        c.id === congelacionId
          ? {
              ...c,
              estado: 'aprobada',
              dias: Number(dias),
              fecha_inicio: fechaInicio,
              fecha_fin: fechaFinISO,
            }
          : c
      )
    );

    await crearNotificacion(
      congelacion.usuario_id,
      `Tu membresía fue congelada hasta el ${fechaFinISO}.`
    );
  }

  async function rechazarCongelacion(congelacionId) {
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
    const hoy = new Date().toISOString().slice(0, 10);
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
    const hoy = new Date().toISOString().slice(0, 10);

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

  async function confirmarRenovacion(usuarioId) {
    const hoy = new Date().toISOString().slice(0, 10);
    await supabase
      .from('usuarios')
      .update({ sesiones_usadas: 0, fecha_ultima_renovacion: hoy })
      .eq('id', usuarioId);
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuarioId
          ? { ...u, sesiones_usadas: 0, fecha_ultima_renovacion: hoy }
          : u
      )
    );
    await crearNotificacion(
      usuarioId,
      'Tu plan fue renovado. ¡Ya tienes tus sesiones disponibles de nuevo!'
    );
  }

  async function asignarPlan(usuarioId, planId) {
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
    await supabase.from('horarios').update(datos).eq('id', horarioId);
    setHorarios((prev) =>
      prev.map((h) => (h.id === horarioId ? { ...h, ...datos } : h))
    );
  }

  function horarioEstaCancelado(horarioId, fecha) {
    return horariosCancelados.some(
      (hc) => hc.horario_id === horarioId && hc.fecha === fecha
    );
  }

  function mensajeCancelacionDe(horarioId, fecha) {
    const hc = horariosCancelados.find(
      (h) => h.horario_id === horarioId && h.fecha === fecha
    );
    return hc?.mensaje || null;
  }

  async function cancelarHorarioFecha(horarioId, fecha, mensaje) {
    await supabase
      .from('horarios_cancelados')
      .insert({ horario_id: horarioId, fecha, mensaje });
    setHorariosCancelados((prev) => [
      ...prev,
      { horario_id: horarioId, fecha, mensaje },
    ]);

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
    return { ok: true, mensaje: 'Clase creada correctamente.' };
  }

  async function eliminarClase(horarioId) {
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
        reservas,
        cargando,
        reservarClase,
        cancelarReserva,
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
        eliminarProgreso,
        logoUrl,
        actualizarLogo,
        rolEfectivo,
        cambiarVista,
        horasAnticipacion,
        diasRenovacion,
        actualizarPoliticas,
        listaEspera,
        estaEnListaEspera,
        listaEsperaDe,
        anotarseListaEspera,
        quitarseListaEspera,
        notasCoach,
        crearNotaCoach,
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
