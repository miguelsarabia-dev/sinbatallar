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
    total: { type: Number, required: true, min: 0 },
    materialCatalogoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', default: null }
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
  imagenesCotizacion: [{ type: String }],

  // ── Pago por transferencia (comprobante vía WhatsApp, fuera de la app) ────
  // El pago se divide 50% anticipo + 50% saldo. El cliente NO sube el
  // comprobante aquí: lo envía al contratista por WhatsApp y en la app solo
  // DECLARA que ya pagó. El contratista luego VERIFICA manualmente.
  anticipo: {
    monto: { type: Number, default: 0, min: 0 },
    // declarado: el cliente afirmó que ya pagó (envió el comprobante por WhatsApp).
    declarado: { type: Boolean, default: false },
    fechaDeclaracion: { type: Date, default: null },
    via: { type: String, trim: true, default: null }, // p.ej. 'whatsapp'
    // verificado: el contratista confirmó el comprobante recibido.
    verificado: { type: Boolean, default: false },
    fechaVerificacion: { type: Date, default: null }
  },
  saldo: {
    monto: { type: Number, default: 0, min: 0 },
    declarado: { type: Boolean, default: false },
    fechaDeclaracion: { type: Date, default: null },
    via: { type: String, trim: true, default: null },
    verificado: { type: Boolean, default: false },
    fechaVerificacion: { type: Date, default: null }
  }

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

// Virtuals de pago: exponen flags planos que el frontend consume en los GET.
cotizacionSchema.virtual('anticipoDeclarado').get(function () {
  return !!this.anticipo?.declarado;
});
cotizacionSchema.virtual('anticipoVerificado').get(function () {
  return !!this.anticipo?.verificado;
});
cotizacionSchema.virtual('saldoDeclarado').get(function () {
  return !!this.saldo?.declarado;
});
cotizacionSchema.virtual('saldoVerificado').get(function () {
  return !!this.saldo?.verificado;
});
// El cliente declaró que pagó todo (anticipo + saldo).
cotizacionSchema.virtual('pagadoCompleto').get(function () {
  return !!this.anticipo?.declarado && !!this.saldo?.declarado;
});
// pagado (cierre con certeza): ambas partes verificadas por el contratista.
cotizacionSchema.virtual('pagado').get(function () {
  return !!this.anticipo?.verificado && !!this.saldo?.verificado;
});

cotizacionSchema.set('toJSON', { virtuals: true });
cotizacionSchema.set('toObject', { virtuals: true });

export default mongoose.models.Cotizacion || mongoose.model('Cotizacion', cotizacionSchema);
