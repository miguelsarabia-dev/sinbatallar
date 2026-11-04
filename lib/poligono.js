// lib/poligono.js
// Validación de polígonos GeoJSON de las zonas (pura).
// Un Polygon cierra su anillo repitiendo el primer punto, así que 4 puntos distintos son 5 coordenadas.

const MIN_PUNTOS_DISTINTOS = 4;

/** @returns {string|null} mensaje de error, o null si es un Polygon válido */
export function validarPoligono(poligono) {
  if (!poligono || typeof poligono !== 'object' || Array.isArray(poligono)) return 'El polígono es requerido';
  if (poligono.type !== 'Polygon') return "El polígono debe ser de tipo 'Polygon'";
  const anillos = poligono.coordinates;
  if (!Array.isArray(anillos) || anillos.length === 0 || !Array.isArray(anillos[0])) {
    return 'El polígono necesita coordinates con al menos un anillo';
  }

  for (const anillo of anillos) {
    if (!Array.isArray(anillo)) return 'Cada anillo del polígono debe ser una lista de coordenadas';
    for (const punto of anillo) {
      if (!Array.isArray(punto) || punto.length < 2 || !Number.isFinite(punto[0]) || !Number.isFinite(punto[1])) {
        return 'Las coordenadas deben ser [lng, lat] numéricas';
      }
      if (Math.abs(punto[0]) > 180 || Math.abs(punto[1]) > 90) return 'Coordenada fuera de rango (lng ±180, lat ±90)';
    }
    const primero = anillo[0];
    const ultimo = anillo[anillo.length - 1];
    if (anillo.length < 2 || primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) {
      return 'El anillo del polígono debe cerrarse repitiendo el primer punto al final';
    }
  }

  const exterior = anillos[0];
  const distintos = new Set(exterior.map(p => `${p[0]},${p[1]}`)).size;
  if (distintos < MIN_PUNTOS_DISTINTOS || exterior.length < MIN_PUNTOS_DISTINTOS + 1) {
    return `El polígono necesita al menos ${MIN_PUNTOS_DISTINTOS} puntos distintos (${MIN_PUNTOS_DISTINTOS + 1} coordenadas con el cierre)`;
  }
  return null;
}
