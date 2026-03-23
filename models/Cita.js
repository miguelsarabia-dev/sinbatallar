// models/Cita.js
import mongoose from 'mongoose';

const citaSchema = new mongoose.Schema({
  // Referencias principales
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contratista: { type: mongoose.Schema.Types.ObjectId, ref: 'Contratista' },

  // Información del servicio
  servicio: { type: mongoose.Schema.Types.ObjectId, ref: 'Servicio', required: true },
  // Detalles de la solicitud del cliente
  descripcionProblema: { type: String, required: true, trim: true },
  imagenesProblema: [{ type: String }],

  // Programación de la cita
  fechaProgramada: { type: Date },

  // Ubicación del servicio
  ubicacion: {
    calle: { type: String, trim: true },
    numeroCasa: { type: String, trim: true },
    colonia: { type: String, trim: true },
    municipio: { type: String, trim: true },
    estado: { type: String, trim: true },
    codigoPostal: { type: String, trim: true },
    referencia: { type: String, trim: true },
    coordenadas: {
      lat: { type: Number },
      lng: { type: Number }
    },
    zona: { type: mongoose.Schema.Types.ObjectId, ref: 'Area' }
  },

  // Estado de la cita
  estado: {
    type: String,
    enum: ['solicitada', 'atendida', 'cotizada', 'aceptada', 'en_progreso', 'completada', 'cancelada', 'verificando_pago'],
    default: 'solicitada'
  },

  // Historial de cambios de estado
  historial: [{
    estado: { type: String, required: true },
    comentario: { type: String },
    fecha: { type: Date, default: Date.now },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Razón de cancelación
  motivoCancelacion: { type: String, trim: true },

  // Relación con cotización
  cotizaciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cotizacion' }],
  cotizacionAceptada: { type: mongoose.Schema.Types.ObjectId, ref: 'Cotizacion' },

  // Flags de calificación
  calificadoContratista: { type: Boolean, default: false },

  // Información de pago
  pagado: { type: Boolean, default: false },
  metodoPago: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia'] },

  // Fotos y evidencias
  fotosAntes: [{ type: String }],
  fotosDespues: [{ type: String }]

}, {
  timestamps: true
});

// Índices
citaSchema.index({ cliente: 1, estado: 1 });
citaSchema.index({ contratista: 1, estado: 1 });
citaSchema.index({ servicio: 1, estado: 1 });
citaSchema.index({ 'ubicacion.zona': 1, estado: 1 });
citaSchema.index({ fechaProgramada: 1, estado: 1 });
citaSchema.index({ createdAt: -1 });

// Virtual para precio total
citaSchema.virtual('precioTotal').get(function () {
  return this.cotizacionAceptada?.total || 0;
});

citaSchema.set('toJSON', { virtuals: true });
citaSchema.set('toObject', { virtuals: true });

export default mongoose.models.Cita || mongoose.model('Cita', citaSchema);
