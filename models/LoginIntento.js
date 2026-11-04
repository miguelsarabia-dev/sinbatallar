// models/LoginIntento.js
// Contadores de intentos de login (por IP y por cuenta). Se auto-eliminan con un índice TTL.
import mongoose from 'mongoose';

const loginIntentoSchema = new mongoose.Schema({
  clave: { type: String, required: true, unique: true },
  intentos: { type: Number, default: 0 },
  expiraEn: { type: Date, required: true }
});

loginIntentoSchema.index({ expiraEn: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.LoginIntento || mongoose.model('LoginIntento', loginIntentoSchema);
