// models/Ferretero.js
import mongoose from 'mongoose';

const ferreteroSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  nombreNegocio: { type: String, required: true, trim: true },
  telefono: { type: String, trim: true },
  direccion: { type: String, trim: true },
  // Ubicación del negocio para buscar materiales por cercanía (GeoJSON Point [lng, lat])
  ubicacion: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined
    }
  },
  activo: { type: Boolean, default: true },
  catalogoActivo: { type: Boolean, default: true },
  pendienteAprobacion: { type: Boolean, default: false }
}, {
  timestamps: true
});

ferreteroSchema.index({ activo: 1 });
ferreteroSchema.index({ ubicacion: '2dsphere' });

export default mongoose.models.Ferretero || mongoose.model('Ferretero', ferreteroSchema);
