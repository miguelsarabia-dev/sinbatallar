// models/Contratista.js
import mongoose from 'mongoose';

const contratistaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  telefono: { type: String, required: true, trim: true },
  curp: { type: String, trim: true, uppercase: true, minlength: 18, maxlength: 18 },
  especialidad: { type: String, trim: true },
  direccion: { type: String, trim: true },
  notas: { type: String, trim: true },
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
  // aprobado: la cuenta fue validada (admin o su incorporador). Hasta entonces no recibe solicitudes.
  aprobado: { type: Boolean, default: false },
  // estatus de la incorporación (sin default: las cuentas anteriores no lo tienen)
  estatus: { type: String, enum: ['pendiente', 'activo', 'rechazado', 'suspendido'] },
  // activo: DISPONIBILIDAD que maneja el propio contratista (solo si aprobado). Si se pausa, se reactiva sola a las 48 h.
  activo: { type: Boolean, default: false },
  inactivoDesde: { type: Date, default: null },
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

// El password (hash) nunca sale en una respuesta JSON.
contratistaSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; return ret; }
});

export default mongoose.models.Contratista || mongoose.model('Contratista', contratistaSchema);
