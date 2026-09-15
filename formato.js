export function formatearRut(valor) {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length === 0) return '';
  if (limpio.length === 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let cuerpoConPuntos = '';
  let contador = 0;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    cuerpoConPuntos = cuerpo[i] + cuerpoConPuntos;
    contador++;
    if (contador % 3 === 0 && i !== 0) {
      cuerpoConPuntos = '.' + cuerpoConPuntos;
    }
  }

  return `${cuerpoConPuntos}-${dv}`;
}

export function formatearTelefono(valor) {
  let limpio = valor.replace(/[^0-9]/g, '');

  // Quita el 56 y/o el 9 inicial si ya vienen escritos, para no duplicarlos
  if (limpio.startsWith('56')) limpio = limpio.slice(2);
  if (limpio.startsWith('9')) limpio = limpio.slice(1);
  limpio = limpio.slice(0, 8);

  if (limpio.length === 0) return '+569 ';

  const parte1 = limpio.slice(0, 4);
  const parte2 = limpio.slice(4, 8);
  return `+569 ${parte1}${parte2 ? ' ' + parte2 : ''}`;
}
