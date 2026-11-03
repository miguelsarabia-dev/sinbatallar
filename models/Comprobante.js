// models/Comprobante.js
// Imagen del comprobante de transferencia que sube el cliente (anticipo, saldo o pago total).
import mongoose from 'mongoose';

const comprobanteSchema = new mongoose.Schema({
  cotizacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Cotizacion', required: true },
  cita: { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true },
  subidoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo: { type: String, enum: ['anticipo', 'saldo', 'total'], required: true },
  monto: { type: Number, required: true, min: 0 },
  imagenUrl: { type: String, required: true },
  publicId: { type: String },
  // vigente: el comprobante actual de ese tipo (pendiente de revisión o ya verificado)
  // rechazado: el contratista/admin lo rechazó (ver motivoRechazo)
  // reemplazado: el cliente subió uno nuevo después
  estado: { type: String, enum: ['vigente', 'rechazado', 'reemplazado'], default: 'vigente' },
  verificado: { type: Boolean, default: false },
  fechaVerificacion: { type: Date, default: null },
  motivoRechazo: { type: String, trim: true },
  revisadoPor: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

comprobanteSchema.index({ cotizacion: 1, tipo: 1, estado: 1 });
comprobanteSchema.index({ cita: 1 });

export default mongoose.models.Comprobante || mongoose.model('Comprobante', comprobanteSchema);
