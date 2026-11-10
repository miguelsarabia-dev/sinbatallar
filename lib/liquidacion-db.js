// lib/liquidacion-db.js
import Cita from '@/models/Cita';
import { resolverCotizacionAceptada } from '@/lib/comisiones';
import { pendienteDeLiquidar } from '@/lib/liquidacion';

/** Citas del cliente que el técnico ya terminó y siguen sin liquidar. */
export async function citasPorLiquidar(clienteId) {
  const candidatas = await Cita.find({
    cliente: clienteId, estado: 'completada', tecnicoMarcoCompletado: true, pagado: { $ne: true }
  }).select('estado tecnicoMarcoCompletado pagado clienteConfirmo cotizacionAceptada');
  const pendientes = [];
  for (const cita of candidatas) {
    const cotizacion = await resolverCotizacionAceptada(cita);
    if (pendienteDeLiquidar(cita, cotizacion)) pendientes.push(cita._id);
  }
  return pendientes;
}
