// models/Tecnico.js
import mongoose from 'mongoose';

const tecnicoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  contratista: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contratista',
    required: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  especialidades: [{ type: String, trim: true }],
  estadisticas: {
    serviciosRealizados: { type: Number, default: 0 },
    calificacionPromedio: { type: Number, default: 0, min: 0, max: 5 }
  }
}, {
  timestamps: true
});

tecnicoSchema.index({ contratista: 1, activo: 1 });

export default mongoose.models.Tecnico || mongoose.model('Tecnico', tecnicoSchema);
