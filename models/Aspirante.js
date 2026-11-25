// models/Aspirante.js
// MODELO INICIAL. El aspirante es aprendiz de un especialista: toma sus clases y lo acompaña a los servicios
// (máximo 2 aspirantes por servicio) para aprender en la práctica. Lo da de alta su especialista (o el admin) y
// tiene acceso a la app. Cuando aprueba el examen de la empresa, el admin lo asciende a contratista.
// La cuenta de acceso es un User con role 'aspirante'; este documento es su perfil.
import mongoose from 'mongoose';

const aspiranteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  especialista: { type: mongoose.Schema.Types.ObjectId, ref: 'Especialista', required: true },
  // Servicios que está aprendiendo (subconjunto de los de su especialista)
  especialidades: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Servicio' }],
  // activo: perfil vigente. Queda en false si su especialista lo da de baja o si asciende a contratista.
  activo: { type: Boolean, default: true },
  notas: { type: String, trim: true },
  promedioCalificacion: { type: Number, default: 0, min: 0, max: 5 },
  totalCalificaciones: { type: Number, default: 0, min: 0 },
  ascenso: {
    fecha: { type: Date },
    contratista: { type: mongoose.Schema.Types.ObjectId, ref: 'Contratista' },
    registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, { timestamps: true });

aspiranteSchema.index({ especialista: 1, activo: 1 });

export default mongoose.models.Aspirante || mongoose.model('Aspirante', aspiranteSchema);
