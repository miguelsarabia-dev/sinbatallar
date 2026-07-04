// models/Contratista.js
import mongoose from 'mongoose';

const contratistaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  direccion: { type: String, required: true, trim: true },
  telefono: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  password: { type: String, required: true },
  servicios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Servicio' }],
  incorporador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incorporador',
    default: null
  },
  ubicacion: {
    lat: { type: Number },
    lng: { type: Number },
    direccion: { type: String, trim: true }
  },
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    default: null
  },
  activo: { type: Boolean, default: false },
  estatus: {
    type: String,
    enum: ['pendiente', 'activo', 'rechazado', 'suspendido'],
    default: 'pendiente'
  },
  informacionPago: {
    banco: { type: String, trim: true },
    numeroCuenta: { type: String, trim: true },
    clabe: { type: String, trim: true },
    nombreTitular: { type: String, trim: true }
  },
  promedioCalificacion: { type: Number, default: 0, min: 0, max: 5 },
  totalCalificaciones: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Índices (email ya tiene índice por unique: true)
contratistaSchema.index({ activo: 1 });
contratistaSchema.index({ estatus: 1 });
contratistaSchema.index({ incorporador: 1 });

export default mongoose.models.Contratista || mongoose.model('Contratista', contratistaSchema);
