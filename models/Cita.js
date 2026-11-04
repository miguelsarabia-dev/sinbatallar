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

  // Servicio urgente (se prioriza y alerta si nadie lo atiende)
  esExpress: { type: Boolean, default: false },

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

  // Técnico asignado por el contratista
  tecnico: { type: mongoose.Schema.Types.ObjectId, ref: 'Tecnico', default: null },

  // Avance del técnico dentro del servicio (lo marca el técnico asignado; se limpia al completar/cancelar)
  subestadoTecnico: { type: String, enum: ['cotizando', 'en_camino', 'en_sitio', 'trabajando', null], default: null },
  fechaSubestadoTecnico: { type: Date, default: null },

  // Confirmaciones de cierre
  tecnicoMarcoCompletado: { type: Boolean, default: false },
  fechaTecnicoCompletado: { type: Date, default: null },
  clienteConfirmo: { type: Boolean, default: false },
  fechaClienteConfirmo: { type: Date, default: null },

  // Reembolso pendiente cuando se cancela una cita con pago ya verificado
  reembolso: {
    estado: { type: String, enum: ['pendiente', 'resuelto'] },
    monto: { type: Number, min: 0 },
    motivo: { type: String, trim: true },
    canceladoPor: { type: String, trim: true }, // 'contratista' | 'admin' | 'cliente'
    fecha: { type: Date },
    nota: { type: String, trim: true },
    fechaResolucion: { type: Date },
    resueltoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Flags de calificación
  calificadoContratista: { type: Boolean, default: false },
  calificadoTecnico: { type: Boolean, default: false },

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
