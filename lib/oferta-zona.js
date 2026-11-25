// lib/oferta-zona.js
// Servicios que puede pedir un cliente en su zona, juntando los dos modelos (puro, para poder probarlo).
//   inicial    -> servicios de los especialistas de la zona. La solicitud queda ABIERTA y la toma el primer
//                 especialista que acepte; el cliente no elige a la persona.
//   permanente -> servicios de los contratistas de la zona (solo si el admin activó el modelo permanente).
//
// Compatibilidad con la app móvil instalada: toma `item.contratistas[0]._id` y lo manda como contratistaId al
// solicitar. Para los servicios de especialistas, el primer elemento es la entrada SOLICITUD_ABIERTA, que el servidor
// interpreta como "solicitud abierta" (ver esSolicitudAbierta).

export const SOLICITUD_ABIERTA = 'abierta';

/** contratistaId que significa "solicitud abierta" (también 'auto' o vacío, que manda la web). */
export function esSolicitudAbierta(contratistaId) {
  return contratistaId === undefined || contratistaId === null || contratistaId === '' ||
    contratistaId === SOLICITUD_ABIERTA || contratistaId === 'auto';
}

const id = (v) => String(v?._id || v || '');

/**
 * @param {object} p
 * @param {Array} p.contratistas contratistas de la zona con `servicios` poblados
 * @param {Array} p.especialistas especialistas de la zona con `servicios` poblados
 * @param {boolean} p.permanenteActivo
 * @returns {Array<{servicio, contratistas, totalContratistas, especialistas:number, modelos:string[]}>}
 */
export function armarOfertaZona({ contratistas = [], especialistas = [], permanenteActivo = false }) {
  const porServicio = new Map();
  const entrada = (servicio) => {
    const k = id(servicio);
    if (!porServicio.has(k)) porServicio.set(k, { servicio, contratistasReales: [], especialistas: 0 });
    return porServicio.get(k);
  };

  for (const e of especialistas) {
    for (const s of (e.servicios || []).filter(Boolean)) entrada(s).especialistas += 1;
  }
  if (permanenteActivo) {
    for (const c of contratistas) {
      for (const s of (c.servicios || []).filter(Boolean)) {
        entrada(s).contratistasReales.push({
          _id: c._id,
          nombre: c.nombre,
          email: c.email,
          telefono: c.telefono,
          direccion: c.direccion,
          promedioCalificacion: c.promedioCalificacion || 0,
          totalCalificaciones: c.totalCalificaciones || 0,
          ubicacion: c.ubicacion
        });
      }
    }
  }

  return [...porServicio.values()]
    .filter(x => x.especialistas > 0 || x.contratistasReales.length > 0)
    .map(x => {
      const abierta = x.especialistas > 0
        ? [{ _id: SOLICITUD_ABIERTA, nombre: 'Especialista Sin Batallar', abierta: true, promedioCalificacion: 0, totalCalificaciones: 0 }]
        : [];
      const lista = [...abierta, ...x.contratistasReales];
      return {
        servicio: x.servicio,
        contratistas: lista,
        totalContratistas: x.contratistasReales.length,
        especialistas: x.especialistas,
        modelos: [...(x.especialistas > 0 ? ['inicial'] : []), ...(x.contratistasReales.length ? ['permanente'] : [])]
      };
    });
}
