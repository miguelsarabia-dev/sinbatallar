// lib/calificaciones.js
import Calificacion from '@/models/Calificacion';
import Contratista from '@/models/Contratista';
import Tecnico from '@/models/Tecnico';

/** Recalcula promedio y total de un contratista o técnico ignorando las reseñas ocultas. */
export async function recalcularPromedio(tipoCalificado, calificadoId) {
  const lista = await Calificacion.find({ calificado: calificadoId, tipoCalificado, oculta: { $ne: true } }).select('puntaje');
  const total = lista.length;
  const promedio = total ? lista.reduce((t, c) => t + c.puntaje, 0) / total : 0;
  if (tipoCalificado === 'Contratista') {
    await Contratista.updateOne({ _id: calificadoId }, { promedioCalificacion: promedio, totalCalificaciones: total });
  } else {
    await Tecnico.updateOne({ _id: calificadoId }, { promedioCalificacion: promedio, totalCalificaciones: total, 'estadisticas.calificacionPromedio': promedio });
  }
  return { promedio, total };
}
