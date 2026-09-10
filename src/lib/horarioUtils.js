const HORAS_ANTICIPACION_DEFECTO = 4;

export function horaAFecha(fecha, hora) {
  return new Date(`${fecha}T${hora}:00`);
}

export function horasHastaClase(fecha, hora) {
  const inicio = horaAFecha(fecha, hora);
  return (inicio.getTime() - Date.now()) / (1000 * 60 * 60);
}

// true si falta menos de X horas para que empiece (no se puede reservar)
export function reservaBloqueada(
  fecha,
  hora,
  horasAnticipacion = HORAS_ANTICIPACION_DEFECTO
) {
  return horasHastaClase(fecha, hora) < horasAnticipacion;
}

// true si cancelar ahora cuenta como cancelación tardía (se pierde la sesión)
export function esCancelacionTardia(
  fecha,
  hora,
  horasAnticipacion = HORAS_ANTICIPACION_DEFECTO
) {
  return horasHastaClase(fecha, hora) <= horasAnticipacion;
}
