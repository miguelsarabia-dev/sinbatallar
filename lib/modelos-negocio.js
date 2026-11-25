// lib/modelos-negocio.js
// Qué modelos de negocio están operando (puro). Se guarda en Configuracion con clave 'modelos' y lo cambia el admin.
//   inicial    -> especialistas y aspirantes (siempre activo: es la fase con la que arranca la operación)
//   permanente -> contratistas y técnicos. Arranca APAGADO: mientras lo esté, las citas nuevas solo les llegan a los
//                 especialistas. Apagarlo no borra ni suspende a nadie; las citas ya tomadas siguen su curso.

export const CLAVE_MODELOS = 'modelos';

export const MODELOS_DEFAULT = Object.freeze({ permanenteActivo: false });

/** Normaliza lo guardado (o lo que manda el admin) a la forma vigente. */
export function normalizarModelos(valor = {}) {
  return {
    permanenteActivo: typeof valor?.permanenteActivo === 'boolean' ? valor.permanenteActivo : MODELOS_DEFAULT.permanenteActivo
  };
}
