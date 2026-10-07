// Genera el Excel de una rutina (con los pesos actuales) en el mismo formato
// que se usa para importarla: una hoja por semana y cada día en un bloque de columnas.

const ANCHO_BLOQUE = 8; // 7 columnas de datos + 1 de separación

function esMetodo(ej) {
  return /\(método\)\s*$/i.test(ej.ejercicio || '') || ej.notas === 'Tiempo de trabajo / descanso del método';
}

function bloqueDia(dia) {
  const filas = [];
  const por = (sec) => (dia.ejercicios || []).filter((e) => e.seccion === sec);

  filas.push([dia.nombre || 'Día']);

  filas.push(['Calentamiento']);
  filas.push(['Ejercicio', 'Series', 'Reps', 'RIR', 'Peso', 'Descanso', 'Link']);
  for (const e of por('calentamiento')) {
    filas.push([e.ejercicio, e.series, e.repeticiones, e.rir, e.peso_referencia, e.descanso, e.referencia_url]);
  }
  filas.push([]);

  filas.push(['Trabajo']);
  filas.push(['Ejercicio', 'Series', 'Reps', 'RIR', 'Peso', 'Descanso', 'Link']);
  for (const e of por('trabajo')) {
    filas.push([e.ejercicio, e.series, e.repeticiones, e.rir, e.peso_referencia, e.descanso, e.referencia_url]);
  }
  filas.push([]);

  const cierre = por('cierre');
  if (cierre.length > 0) {
    const metodo = cierre.find(esMetodo);
    const resto = cierre.filter((e) => !esMetodo(e));
    filas.push(['Cierre']);
    filas.push(['Método', 'Series', 'Trabajo', 'RIR', 'Descanso']);
    filas.push(
      metodo
        ? [String(metodo.ejercicio).replace(/\s*\(método\)\s*$/i, ''), metodo.series, metodo.repeticiones, metodo.rir, metodo.descanso]
        : ['']
    );
    filas.push(['Ejercicios', 'Peso', 'Notas']);
    for (const e of resto) filas.push([e.ejercicio, e.peso_referencia, e.notas]);
  }
  return filas;
}

export function crearLibroRutina(XLSX, semanas) {
  const libro = XLSX.utils.book_new();

  for (const semana of semanas) {
    const bloques = (semana.dias || []).map(bloqueDia);
    const alto = Math.max(1, ...bloques.map((b) => b.length));
    const grilla = Array.from({ length: alto }, () => []);
    bloques.forEach((bloque, i) => {
      const c0 = i * ANCHO_BLOQUE;
      bloque.forEach((fila, r) => {
        fila.forEach((valor, c) => {
          grilla[r][c0 + c] = valor === null || valor === undefined ? '' : valor;
        });
      });
    });
    const hoja = XLSX.utils.aoa_to_sheet(grilla);
    hoja['!cols'] = bloques.flatMap(() => [{ wch: 32 }, { wch: 8 }, { wch: 9 }, { wch: 6 }, { wch: 9 }, { wch: 10 }, { wch: 14 }, { wch: 3 }]);
    XLSX.utils.book_append_sheet(libro, hoja, `Semana ${semana.numero}`.slice(0, 31));
  }
  return libro;
}

export async function descargarRutinaExcel(nombreRutina, semanas) {
  const XLSX = await import('xlsx');
  const libro = crearLibroRutina(XLSX, semanas);
  const nombreArchivo = `${(nombreRutina || 'rutina').replace(/[\\/:*?"<>|]/g, '').trim()}.xlsx`;
  XLSX.writeFile(libro, nombreArchivo);
}
