// models/PagoSueldo.js
// MODELO INICIAL. Sueldo base semanal de un especialista (adicional a su comisión por servicio). Uno por especialista
// y semana: el admin genera la semana (quedan 'pendiente' con el sueldo vigente de cada especialista) y marca cada
// pago como 'pagado' cuando lo transfiere.
import mongoose from 'mongoose';

const pagoSueldoSchema = new mongoose.Schema({
  especialista: { type: mongoose.Schema.Types.ObjectId, ref: 'Especialista', required: true },
  // Lunes de la semana, 'YYYY-MM-DD'. El mes del cierre es el del lunes.
  semana: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  monto: { type: Number, required: true, min: 0 },
  estado: { type: String, enum: ['pendiente', 'pagado', 'cancelado'], default: 'pendiente' },
  fechaPago: { type: Date },
  referencia: { type: String, trim: true },   // folio de la transferencia u observación
  registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

pagoSueldoSchema.index({ especialista: 1, semana: 1 }, { unique: true });
pagoSueldoSchema.index({ semana: 1, estado: 1 });

export default mongoose.models.PagoSueldo || mongoose.model('PagoSueldo', pagoSueldoSchema);
