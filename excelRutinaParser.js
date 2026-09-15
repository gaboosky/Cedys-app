import * as XLSX from 'xlsx';

function limpiar(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function normalizar(s) {
  return (s || '').toString().trim().toLowerCase();
}

function parsearDiaBloque(grid, colStart, totalFilas) {
  const dia = {
    nombre: limpiar(grid[0]?.[colStart]) || 'Día',
    secciones: { calentamiento: [], trabajo: [], cierre: [] },
  };

  const marcadores = {};
  for (let r = 0; r < totalFilas; r++) {
    const val = normalizar(grid[r]?.[colStart]);
    if (
      ['calentamiento', 'trabajo', 'cierre'].includes(val) &&
      marcadores[val] === undefined
    ) {
      marcadores[val] = r;
    }
  }

  function filaEjercicio(r, c0) {
    const ejercicio = limpiar(grid[r]?.[c0]);
    if (!ejercicio) return null;
    return {
      ejercicio,
      series: limpiar(grid[r]?.[c0 + 1]),
      repeticiones: limpiar(grid[r]?.[c0 + 2]),
      rir: limpiar(grid[r]?.[c0 + 3]),
      peso_referencia: limpiar(grid[r]?.[c0 + 4]),
      descanso: limpiar(grid[r]?.[c0 + 5]),
      referencia_url: limpiar(grid[r]?.[c0 + 6]),
      notas: null,
    };
  }

  if (marcadores.calentamiento !== undefined) {
    const inicio = marcadores.calentamiento + 2;
    const fin = (marcadores.trabajo ?? totalFilas) - 1;
    for (let r = inicio; r <= fin; r++) {
      const fila = filaEjercicio(r, colStart);
      if (fila) dia.secciones.calentamiento.push(fila);
    }
  }

  if (marcadores.trabajo !== undefined) {
    const inicio = marcadores.trabajo + 2;
    const fin = (marcadores.cierre ?? totalFilas) - 1;
    for (let r = inicio; r <= fin; r++) {
      const fila = filaEjercicio(r, colStart);
      if (fila) dia.secciones.trabajo.push(fila);
    }
  }

  if (marcadores.cierre !== undefined) {
    const filaMetodo = marcadores.cierre + 2;
    const metodo = limpiar(grid[filaMetodo]?.[colStart]);
    if (metodo) {
      dia.secciones.cierre.push({
        ejercicio: `${metodo} (método)`,
        series: limpiar(grid[filaMetodo]?.[colStart + 1]),
        repeticiones: limpiar(grid[filaMetodo]?.[colStart + 2]),
        rir: limpiar(grid[filaMetodo]?.[colStart + 3]),
        peso_referencia: null,
        descanso: limpiar(grid[filaMetodo]?.[colStart + 4]),
        referencia_url: null,
        notas: 'Tiempo de trabajo / descanso del método',
      });
    }
    let filaEjerciciosHeader = null;
    for (let r = filaMetodo + 1; r < totalFilas; r++) {
      if (normalizar(grid[r]?.[colStart]) === 'ejercicios') {
        filaEjerciciosHeader = r;
        break;
      }
    }
    if (filaEjerciciosHeader !== null) {
      for (let r = filaEjerciciosHeader + 1; r < totalFilas; r++) {
        const ejercicio = limpiar(grid[r]?.[colStart]);
        if (!ejercicio) continue;
        dia.secciones.cierre.push({
          ejercicio,
          series: null,
          repeticiones: null,
          rir: null,
          peso_referencia: limpiar(grid[r]?.[colStart + 1]),
          descanso: null,
          referencia_url: null,
          notas: limpiar(grid[r]?.[colStart + 2]),
        });
      }
    }
  }

  return dia;
}

function extraerSemanasDeNombreHoja(nombreHoja) {
  const matches = nombreHoja.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

export function parsearRutinaExcel(workbook) {
  const HOJAS_IGNORADAS = /plan|estrategia|anamnesis/i;
  const resultado = {};

  for (const nombreHoja of workbook.SheetNames) {
    if (!/semana/i.test(nombreHoja) || HOJAS_IGNORADAS.test(nombreHoja))
      continue;

    const semanas = extraerSemanasDeNombreHoja(nombreHoja);
    if (semanas.length === 0) continue;

    const sheet = workbook.Sheets[nombreHoja];
    const grid = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: true,
    });
    const totalFilas = grid.length;

    const bloques = [];
    const filaTitulos = grid[0] || [];
    filaTitulos.forEach((val, c) => {
      if (val && /^d[ií]a\s*\d+/i.test(String(val).trim())) {
        bloques.push({ colStart: c });
      }
    });

    const dias = bloques.map((b) =>
      parsearDiaBloque(grid, b.colStart, totalFilas)
    );

    semanas.forEach((num) => {
      resultado[num] = dias;
    });
  }

  return resultado;
}

export function leerArchivoExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, {
          type: 'array',
          cellDates: true,
        });
        resolve(parsearRutinaExcel(workbook));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
