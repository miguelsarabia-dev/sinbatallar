// models/Dispositivo.js
// Token de notificaciones push (Expo) de un dispositivo. `user` es el id de la sesión: el _id del
// Contratista si el rol es contratista, o el _id del User en los demás roles (sin ref a propósito).
import mongoose from 'mongoose';

const dispositivoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  token: { type: String, required: true, unique: true },
  plataforma: { type: String, enum: ['ios', 'android', 'web', 'desconocida'], default: 'desconocida' },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Dispositivo || mongoose.model('Dispositivo', dispositivoSchema);
