// models/Area.js
import mongoose from 'mongoose';

const areaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  descripcion: {
    type: String,
    trim: true,
  },
  aperturador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Aperturador',
    default: null,
  },
  poligono: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
    },
    coordinates: {
      type: [[[Number]]],
      required: true,
    },
  },
  clasificacion: {
    type: String,
    enum: ['C', 'B', 'A', 'AA', 'AAA'],
    required: true,
    default: 'C',
  },
  contratistas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contratista',
  }],
  activo: { type: Boolean, default: true },
  estadisticas: {
    viviendas: { type: Number, default: 0 },
    negocios: { type: Number, default: 0 },
    edificios: { type: Number, default: 0 },
    serviciosRealizados: { type: Number, default: 0 }
  },
}, {
  timestamps: true
});

// Índices
areaSchema.index({ poligono: '2dsphere' });
areaSchema.index({ aperturador: 1 });
areaSchema.index({ activo: 1 });

export default mongoose.models.Area || mongoose.model('Area', areaSchema);
