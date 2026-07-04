// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, minlength: 6 }, // Optional for Google-auth users
  nombre: { type: String, required: true, trim: true },
  telefono: { type: String, trim: true }, // Optional for Google-auth users
  googleId: { type: String, unique: true, sparse: true }, // Google OAuth ID
  role: {
    type: String,
    enum: ['cliente', 'admin', 'aperturador', 'incorporador', 'ferretero', 'tecnico'],
    default: 'cliente'
  },
  fotoUrl: { type: String, trim: true },
  fotoPublicId: { type: String, trim: true },
  identificacion: { type: String, trim: true },
  direcciones: [{
    calle: { type: String, trim: true },
    numeroCasa: { type: String, trim: true },
    colonia: { type: String, trim: true },
    municipio: { type: String, trim: true },
    estado: { type: String, trim: true },
    codigoPostal: { type: String, trim: true },
    referencia: { type: String, trim: true },
    coordenadas: {
      lat: { type: Number },
      lng: { type: Number }
    }
  }]
}, {
  timestamps: true
});

// Índices (email ya tiene índice por unique: true)
userSchema.index({ role: 1 });

// Virtual para dirección formateada (usando la última dirección agregada como "actual")
userSchema.virtual('direccionCompleta').get(function () {
  if (!this.direcciones || this.direcciones.length === 0) return '';
  // Usar la última dirección por defecto
  const d = this.direcciones[this.direcciones.length - 1];
  const partes = [d.calle, d.numeroCasa, d.colonia, d.municipio, d.estado, d.codigoPostal].filter(Boolean);
  return partes.join(', ');
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
