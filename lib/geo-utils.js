// lib/geo-utils.js
// Utilidades geográficas compartidas para resolver la zona (Area) de una ubicación.
import Area from '@/models/Area';

/**
 * Determina el Area que contiene unas coordenadas usando el índice 2dsphere.
 * @param {{lat: number, lng: number}} coordenadas
 * @returns {Promise<import('mongoose').Types.ObjectId|null>} _id del Area o null si cae fuera de toda zona
 */
export async function resolverAreaId(coordenadas) {
  const lat = Number(coordenadas?.lat);
  const lng = Number(coordenadas?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const area = await Area.findOne({
    poligono: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat] // MongoDB usa [lng, lat]
        }
      }
    }
  }).select('_id');

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
