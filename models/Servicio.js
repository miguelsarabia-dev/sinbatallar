// models/Servicio.js
import mongoose from 'mongoose';

const servicioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, trim: true },
  categoria: { type: String, required: true, trim: true },
  imagenUrl: { type: String, trim: true },
  imagenPublicId: { type: String, trim: true },
  activo: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Índices
servicioSchema.index({ categoria: 1 });
servicioSchema.index({ activo: 1 });

export default mongoose.models.Servicio || mongoose.model('Servicio', servicioSchema);