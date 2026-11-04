// models/SolicitudMaterial.js
// Pedido de material de un contratista/técnico a una ferretería, ligado a una cita.
import mongoose from 'mongoose';

const solicitudMaterialSchema = new mongoose.Schema({
  // User del ferretero (igual que Material.ferretero)
  ferretero: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ferreteria: { type: mongoose.Schema.Types.ObjectId, ref: 'Ferretero' },
  cita: { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true },
  contratista: { type: mongoose.Schema.Types.ObjectId, ref: 'Contratista', required: true },
  tecnico: { type: mongoose.Schema.Types.ObjectId, ref: 'Tecnico', default: null },
  items: [{
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
    nombre: { type: String, required: true },
    unidad: { type: String },
    precio: { type: Number, min: 0 },
    cantidad: { type: Number, required: true, min: 0.01 },
    stockDescontado: { type: Boolean, default: false }
  }],
  modoEntrega: { type: String, enum: ['recoger', 'entregar'], default: 'recoger' },
  fechaRequerida: { type: Date, default: null },
  total: { type: Number, default: 0, min: 0 },
  origen: { type: String, enum: ['manual', 'automatica'], default: 'manual' },
  motivoCancelacion: { type: String, trim: true },
  notas: { type: String, trim: true },
  estado: { type: String, enum: ['pendiente', 'confirmada', 'surtida', 'cancelada'], default: 'pendiente' },
  notasFerretero: { type: String, trim: true },
  historial: [{
    estado: String,
    notas: String,
    fecha: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

solicitudMaterialSchema.index({ ferretero: 1, estado: 1, createdAt: -1 });
solicitudMaterialSchema.index({ contratista: 1, createdAt: -1 });
solicitudMaterialSchema.index({ cita: 1 });

export default mongoose.models.SolicitudMaterial || mongoose.model('SolicitudMaterial', solicitudMaterialSchema);
