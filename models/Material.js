// models/Material.js
import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, trim: true },
  categoria: { type: String, required: true, trim: true },
  marca: { type: String, trim: true },
  unidad: {
    type: String,
    enum: ['pieza', 'metro', 'metro2', 'metro3', 'litro', 'kg', 'caja', 'rollo', 'bolsa', 'par', 'juego', 'otro'],
    required: true,
    default: 'pieza'
  },
  precio: { type: Number, required: true, min: 0 },
  imagenUrl: { type: String, trim: true },
  imagenPublicId: { type: String, trim: true },
  activo: { type: Boolean, default: true },
  ferretero: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

materialSchema.index({ ferretero: 1, activo: 1 });
materialSchema.index({ categoria: 1 });
materialSchema.index({ nombre: 'text', descripcion: 'text', marca: 'text' });

export default mongoose.models.Material || mongoose.model('Material', materialSchema);
