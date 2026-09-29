// lib/legal-config.js
// Fuente única de fechas, correos y datos de la entidad para las páginas legales
// (Políticas de Privacidad y Términos y Condiciones). Evita que la fecha o el
// correo de contacto queden distintos en cada página o desincronizados del footer.
//
// NOTA: RFC, domicilio fiscal y la plaza (estado/ciudad) para la cláusula de
// tribunales competentes aún no fueron proporcionados por el negocio. Se dejan
// como null a propósito — ver PLAN-terminos-y-privacidad.md §6 — para que las
// páginas rendericen un placeholder visible en vez de un dato inventado.

export const LEGAL_CONFIG = {
  empresa: {
    nombreLegal: 'Sin Batallar',
    // Pendiente: razón social completa (S.A. de C.V. u otra), si es distinta del nombre comercial.
    rfc: null,
    domicilioFiscal: null,
  },

  jurisdiccion: {
    pais: 'México',
    // Pendiente: estado/ciudad para la cláusula de tribunales competentes.
    plaza: null,
  },

  contacto: {
    privacidad: 'privacidad@sinbatallar.com',
    legal: 'legal@sinbatallar.com',
  },

  documentos: {
    privacidad: {
      version: '1.1',
      fecha: '28 de septiembre de 2026',
    },
    terminos: {
      version: '1.0',
      fecha: '28 de septiembre de 2026',
    },
  },

  copyrightYear: 2025,
};

/**
 * Texto de "Última actualización" listo para renderizar en el header de una página legal.
 * @param {'privacidad'|'terminos'} doc
 */
export function ultimaActualizacion(doc) {
  return `Última actualización: ${LEGAL_CONFIG.documentos[doc].fecha}`;
}
