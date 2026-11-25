// models/Especialista.js
// MODELO INICIAL. El especialista (instructor) atiende servicios y forma a sus aspirantes. Lo da de alta un asociado
// (o el admin). Cobra un sueldo semanal fijo más su comisión por servicio. Cuando aprueba el examen de la empresa,
// el admin lo asciende a contratista (modelo permanente) y este perfil queda inactivo con el registro del ascenso.
// La cuenta de acceso es un User con role 'especialista'; este documento es su perfil.
import mongoose from 'mongoose';

const especialistaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Asociado que lo dio de alta (null si lo dio de alta el admin sin asociado)
  asociado: { type: mongoose.Schema.Types.ObjectId, ref: 'Asociado', default: null },
  // Zonas donde ofrece sus servicios (las asigna el asociado o el admin). Sus aspirantes trabajan en las mismas.
  areasIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Area' }],
    default: [],
    validate: { validator: (v) => v.length <= 5, message: 'Un especialista puede tener máximo 5 zonas' }
  },
  // Servicios (especialidades) que puede atender
  servicios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Servicio' }],
  curp: { type: String, trim: true, uppercase: true },
  direccion: { type: String, trim: true },
  notas: { type: String, trim: true },
  // aprobado: validado por su asociado o el admin; hasta entonces no recibe servicios
  aprobado: { type: Boolean, default: false },
  // activo: perfil vigente. Queda en false si se da de baja o si asciende a contratista.
  activo: { type: Boolean, default: true },
  // disponible: el propio especialista pausa o reanuda la recepción de servicios
  disponible: { type: Boolean, default: true },
  // Sueldo base semanal (MXN), adicional a su comisión por servicio. Lo fija el admin.
  sueldoSemanal: { type: Number, default: 4500, min: 0 },
  informacionPago: {
    banco: { type: String, trim: true },
    numeroCuenta: { type: String, trim: true },
    clabe: { type: String, trim: true },
    nombreTitular: { type: String, trim: true }
  },
  promedioCalificacion: { type: Number, default: 0, min: 0, max: 5 },
  totalCalificaciones: { type: Number, default: 0, min: 0 },
  // Ascenso al modelo permanente (lo registra el admin tras el examen, que se aplica fuera de la app)
  ascenso: {
    fecha: { type: Date },
    contratista: { type: mongoose.Schema.Types.ObjectId, ref: 'Contratista' },
    registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, { timestamps: true });

especialistaSchema.index({ asociado: 1, activo: 1 });
especialistaSchema.index({ areasIds: 1, activo: 1, aprobado: 1 });

export default mongoose.models.Especialista || mongoose.model('Especialista', especialistaSchema);
