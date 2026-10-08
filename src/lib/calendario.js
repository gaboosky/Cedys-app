// Crea archivos de calendario (.ics) para agregar clases al calendario del celular
// (Google Calendar, Calendario de iPhone, Outlook...).

const DURACION_MIN = 60;

function pad(n) {
  return String(n).padStart(2, '0');
}

// "2026-10-08" + "18:30" -> "20261008T183000" (hora local de Chile)
function fechaHoraIcs(fecha, hora, minutosExtra = 0) {
  const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
  const d = new Date(`${fecha}T00:00:00`);
  d.setHours(h, m + minutosExtra, 0, 0);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(
    d.getMinutes()
  )}00`;
}

function limpiar(texto) {
  return String(texto || '').replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
}

// eventos: [{ id, fecha, hora, titulo, descripcion, lugar }]
export function crearIcs(eventos) {
  const ahora = new Date();
  const stamp = `${ahora.getUTCFullYear()}${pad(ahora.getUTCMonth() + 1)}${pad(ahora.getUTCDate())}T${pad(
    ahora.getUTCHours()
  )}${pad(ahora.getUTCMinutes())}00Z`;
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CEDyS//Mr. Ced&s//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const ev of eventos) {
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@cedys.cl`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Santiago:${fechaHoraIcs(ev.fecha, ev.hora)}`,
      `DTEND;TZID=America/Santiago:${fechaHoraIcs(ev.fecha, ev.hora, DURACION_MIN)}`,
      `SUMMARY:${limpiar(ev.titulo)}`,
      ev.descripcion ? `DESCRIPTION:${limpiar(ev.descripcion)}` : null,
      ev.lugar ? `LOCATION:${limpiar(ev.lugar)}` : null,
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Clase en CED&S',
      'END:VALARM',
      'END:VEVENT'
    );
  }
  lineas.push('END:VCALENDAR');
  return lineas.filter(Boolean).join('\r\n');
}

export function descargarIcs(eventos, nombreArchivo = 'clases-cedys.ics') {
  const contenido = crearIcs(eventos);
  const blob = new Blob([contenido], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Evento de calendario a partir de una reserva
export function eventoDeReserva(reserva, horario, lugar) {
  return {
    id: reserva.id,
    fecha: reserva.fecha,
    hora: horario.hora,
    titulo: 'Clase CED&S',
    descripcion: horario.coach_nombre ? `Coach: ${horario.coach_nombre}` : '',
    lugar: lugar || '',
  };
}
