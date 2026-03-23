// models/Aperturador.js
import mongoose from 'mongoose';

const aperturadorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  areasCreadas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area'
  }],
  estadisticas: {
    totalAreasCreadas: { type: Number, default: 0 },
    areasActivas: { type: Number, default: 0 },
    serviciosGenerados: { type: Number, default: 0 },
    ingresosGenerados: { type: Number, default: 0 }
  },
  comision: {
    porcentaje: { type: Number, default: 2, min: 0, max: 100 }
  }
}, {
  timestamps: true
});

// Índices (user ya tiene índice por unique: true)
aperturadorSchema.index({ activo: 1 });

export default mongoose.models.Aperturador || mongoose.model('Aperturador', aperturadorSchema);
