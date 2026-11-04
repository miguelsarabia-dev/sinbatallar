// lib/transiciones.js
// Tabla de transiciones de estado de la cita (pura, para poder probarla contra el enum del modelo).
// Estados que el modelo (models/Cita.js) no define NO deben aparecer aquí: la prueba lo verifica.
export const TRANSICIONES = {
  'solicitada':        ['aceptada', 'rechazada', 'cancelada'],
  'aceptada':          ['cotizada', 'en_progreso', 'cancelada'],
  'cotizada':          ['verificando_pago', 'en_progreso', 'cancelada'],
  'verificando_pago':  ['en_progreso', 'cancelada'],
  'atendida':          ['cotizada', 'cancelada'],
  'en_progreso':       ['completada', 'cancelada'],
  // Terminales: no se reabren
  'completada':        [],
  'cancelada':         [],
  'rechazada':         []
};
