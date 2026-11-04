// models/DemandaFueraZona.js
// Búsquedas de clientes en lugares sin cobertura, agregadas por celda de ~1 km (lat/lng a 0.01°).
import mongoose from 'mongoose';

const demandaSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  total: { type: Number, default: 0 },
  ultimaVez: { type: Date, default: Date.now },
  municipio: { type: String, trim: true }
});

demandaSchema.index({ lat: 1, lng: 1 }, { unique: true });
demandaSchema.index({ total: -1 });

export default mongoose.models.DemandaFueraZona || mongoose.model('DemandaFueraZona', demandaSchema);
