// models/Cotizacion.js
import mongoose from 'mongoose';

const cotizacionSchema = new mongoose.Schema({
  // Referencias principales
  cita: { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true },
  contratista: { type: mongoose.Schema.Types.ObjectId, ref: 'Contratista', required: true },

  // Descripción del trabajo
  descripcionTrabajo: { type: String, trim: true },

  // Desglose de costos
  materiales: [{
    nombre: { type: String, required: true },
    descripcion: String,
    cantidad: { type: Number, required: true, min: 0 },
    precioPorUnidad: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  }],
  manoDeObra: { type: Number, default: 0, min: 0 },

  // Totales calculados
  costoMateriales: { type: Number, default: 0, min: 0 },
  subtotal: { type: Number, default: 0, min: 0 },
  porcentajeIva: { type: Number, default: 16, min: 0, max: 100 },
  iva: { type: Number, default: 0, min: 0 },
  total: { type: Number, default: 0, min: 0 },

  // Estado de la cotización
  estado: {
    type: String,
    enum: ['pendiente', 'enviada', 'aceptada', 'rechazada'],
    default: 'pendiente'
  },

  // Imágenes de la cotización
  imagenesCotizacion: [{ type: String }]

}, {
  timestamps: true
});

// Índices
cotizacionSchema.index({ cita: 1 });
cotizacionSchema.index({ contratista: 1, estado: 1 });

// Middleware para calcular totales antes de guardar
cotizacionSchema.pre('save', function (next) {
  try {
    // Calcular costo total de materiales
    this.costoMateriales = this.materiales.reduce((total, material) => total + (material.total || 0), 0);

    // Calcular subtotal
    this.subtotal = this.costoMateriales + this.manoDeObra;

    // Calcular IVA
    this.iva = Math.round((this.subtotal * this.porcentajeIva) / 100);

    // Calcular total final
    this.total = this.subtotal + this.iva;

    next();
  } catch (error) {
    next(error);
  }
});

// Método para recalcular
cotizacionSchema.methods.recalcular = function () {
  this.costoMateriales = this.materiales.reduce((total, material) => total + (material.total || 0), 0);
  this.subtotal = this.costoMateriales + this.manoDeObra;
  this.iva = Math.round((this.subtotal * this.porcentajeIva) / 100);
  this.total = this.subtotal + this.iva;
  return this;
};

export default mongoose.models.Cotizacion || mongoose.model('Cotizacion', cotizacionSchema);
