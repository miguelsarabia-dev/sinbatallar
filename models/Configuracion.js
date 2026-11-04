// models/Configuracion.js
// Pares clave/valor editables por el admin. Clave 'financiera' = DISTRIBUTION de lib/financial-config.js
import mongoose from 'mongoose';

const configuracionSchema = new mongoose.Schema({
  clave: { type: String, required: true, unique: true, trim: true },
  valor: { type: mongoose.Schema.Types.Mixed, default: {} },
  actualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.models.Configuracion || mongoose.model('Configuracion', configuracionSchema);
