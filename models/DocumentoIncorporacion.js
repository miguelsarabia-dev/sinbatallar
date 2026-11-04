// models/DocumentoIncorporacion.js
// Documentos de identidad/domicilio de un contratista que reúne su incorporador (US-INC-002).
// El archivo vive en Cloudinary como recurso autenticado (URL firmada y temporal).
import mongoose from 'mongoose';

const documentoSchema = new mongoose.Schema({
  contratista: { type: mongoose.Schema.Types.ObjectId, ref: 'Contratista', required: true },
  subidoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo: { type: String, enum: ['ine', 'curp', 'comprobante_domicilio', 'otro'], required: true },
  nombreArchivo: { type: String, trim: true },
  publicId: { type: String, required: true },
  resourceType: { type: String, default: 'image' },
  formato: { type: String },
  bytes: { type: Number }
}, { timestamps: true });

documentoSchema.index({ contratista: 1, tipo: 1 });

export default mongoose.models.DocumentoIncorporacion || mongoose.model('DocumentoIncorporacion', documentoSchema);
