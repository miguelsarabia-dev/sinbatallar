// lib/geo-utils.js
// Utilidades geográficas compartidas para resolver la zona (Area) de una ubicación.
import Area from '@/models/Area';

/**
 * Todas las Areas que contienen unas coordenadas (las zonas pueden encimarse), activas primero.
 * @param {{lat: number, lng: number}} coordenadas
 * @param {{soloActivas?: boolean, select?: string}} [opciones]
 * @returns {Promise<Array>} [] si las coordenadas no son válidas o caen fuera de toda zona
 */
export async function areasQueContienen(coordenadas, { soloActivas = false, select } = {}) {
  const lat = Number(coordenadas?.lat);
  const lng = Number(coordenadas?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return [];
  }

  const consulta = Area.find({
    ...(soloActivas ? { activo: true } : {}),
    poligono: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat] // MongoDB usa [lng, lat]
        }
      }
    }
  });
  if (select) consulta.select(select);
  const areas = await consulta;
  return areas.sort((a, b) => Number(b.activo !== false) - Number(a.activo !== false));
}

/**
 * Determina el Area que contiene unas coordenadas usando el índice 2dsphere.
 * Si el punto cae en varias zonas encimadas, prefiere una de `preferidas` (p. ej. las zonas del
 * contratista elegido); si no, una activa.
 * @param {{lat: number, lng: number}} coordenadas
 * @param {Array<string|import('mongoose').Types.ObjectId>} [preferidas]
 * @returns {Promise<import('mongoose').Types.ObjectId|null>} _id del Area o null si cae fuera de toda zona
 */
export async function resolverAreaId(coordenadas, preferidas = []) {
  const areas = await areasQueContienen(coordenadas, { select: '_id activo' });
  const pref = new Set(preferidas.filter(Boolean).map(String));
  const area = areas.find(a => pref.has(String(a._id))) || areas[0];
  return area?._id || null;
}

/**
 * Distancia en kilómetros entre dos coordenadas (fórmula de Haversine).
 * @returns {number} distancia en km redondeada a 1 decimal
 */
export function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // radio de la Tierra en km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
