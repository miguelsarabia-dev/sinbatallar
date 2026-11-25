// models/ComisionInicial.js
// MODELO INICIAL. Reparto de un servicio cerrado (una por cita), con el snapshot de la configuración y la versión del
// modelo financiero con que se calculó: si después cambian los porcentajes, este registro no cambia.
// Separado de Comision (modelo permanente) para no mezclar fórmulas. El reparto lo calcula
// lib/financiero-inicial.js (distribuirServicioInicial); el remanente se reparte en el cierre mensual.
import mongoose from 'mongoose';

const montoSchema = { porcentaje: { type: Number, default: 0 }, monto: { type: Number, default: 0 } };

const comisionInicialSchema = new mongoose.Schema({
  cita: { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true, unique: true },
  cotizacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Cotizacion' },
  servicio: { type: mongoose.Schema.Types.ObjectId, ref: 'Servicio' },
  especialista: { type: mongoose.Schema.Types.ObjectId, ref: 'Especialista', required: true },
  aspirantes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Aspirante' }],
  asociado: { type: mongoose.Schema.Types.ObjectId, ref: 'Asociado', default: null },
  aperturador: { type: mongoose.Schema.Types.ObjectId, ref: 'Aperturador', default: null },
  area: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', default: null },

  version: { type: String, required: true },       // p. ej. SB-FIN-INI-2026-11-09
  config: { type: mongoose.Schema.Types.Mixed },    // porcentajes vigentes al calcular

  manoDeObra: { type: Number, required: true, min: 0 },   // base del reparto
  costoMateriales: { type: Number, default: 0, min: 0 },  // fuera del reparto (se reembolsa)
  iva: { type: Number, default: 0, min: 0 },              // fuera del reparto

  distribucion: {
    operacionSB: montoSchema,
    operacionAsociado: montoSchema,
    especialista: montoSchema,
    aspirantes: {
      porcentaje: { type: Number, default: 0 },
      cantidad: { type: Number, default: 0 },
      porAspirante: montoSchema,
      monto: { type: Number, default: 0 }
    },
    aperturador: montoSchema,
    remanente: { monto: { type: Number, default: 0 } }
  },

  // pendiente: aún no se liquida · liquidada: entró a un cierre mensual pagado · cancelada: reembolso/cancelación
  estado: { type: String, enum: ['pendiente', 'liquidada', 'cancelada'], default: 'pendiente' },
  fechaServicio: { type: Date, required: true },   // fecha de cierre del servicio: define el mes
  motivoCancelacion: { type: String, trim: true }
}, { timestamps: true });

comisionInicialSchema.index({ fechaServicio: 1, estado: 1 });
comisionInicialSchema.index({ especialista: 1, fechaServicio: -1 });
comisionInicialSchema.index({ aspirantes: 1, fechaServicio: -1 });
comisionInicialSchema.index({ asociado: 1, fechaServicio: -1 });
comisionInicialSchema.index({ aperturador: 1, fechaServicio: -1 });

export default mongoose.models.ComisionInicial || mongoose.model('ComisionInicial', comisionInicialSchema);
