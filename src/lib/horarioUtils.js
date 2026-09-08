const HORAS_ANTICIPACION = 4;

export function horaAFecha(fecha, hora) {
  return new Date(`${fecha}T${hora}:00`);
}

export function horasHastaClase(fecha, hora) {
  const inicio = horaAFecha(fecha, hora);
  return (inicio.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function reservaBloqueada(fecha, hora) {
  return horasHastaClase(fecha, hora) < HORAS_ANTICIPACION;
}

export function esCancelacionTardia(fecha, hora) {
  return horasHastaClase(fecha, hora) <= HORAS_ANTICIPACION;
}
