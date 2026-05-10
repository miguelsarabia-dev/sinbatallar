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
  activo: { type: Boolean, default: true },
  catalogoActivo: { type: Boolean, default: true }
}, {
  timestamps: true
});

ferreteroSchema.index({ activo: 1 });

export default mongoose.models.Ferretero || mongoose.model('Ferretero', ferreteroSchema);
