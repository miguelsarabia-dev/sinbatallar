// models/Incorporador.js
import mongoose from 'mongoose';

const incorporadorSchema = new mongoose.Schema({
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
  contratistasIncorporados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contratista'
  }],
  estadisticas: {
    totalContratistasIncorporados: { type: Number, default: 0 },
    contratistasActivos: { type: Number, default: 0 },
    serviciosGenerados: { type: Number, default: 0 },
    ingresosGenerados: { type: Number, default: 0 }
  },
  comision: {
    porcentaje: { type: Number, default: 3, min: 0, max: 100 }
  },
  observaciones: { type: String, trim: true }
}, {
  timestamps: true
});

// Índices (user ya tiene índice por unique: true)
incorporadorSchema.index({ activo: 1 });

export default mongoose.models.Incorporador || mongoose.model('Incorporador', incorporadorSchema);
