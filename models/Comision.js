// models/Comision.js
import mongoose from 'mongoose';

const comisionSchema = new mongoose.Schema({
    cita: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cita',
        required: true,
        unique: true
    },
    cotizacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cotizacion',
        required: true
    },
    totalServicio: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    iva: { type: Number, required: true, min: 0 },
    costoMateriales: { type: Number, default: 0, min: 0 },
    manoDeObra: { type: Number, default: 0, min: 0 },
    distribucion: {
        plataforma: {
            porcentaje: { type: Number, default: 10, min: 0, max: 100 },
            monto: { type: Number, default: 0, min: 0 }
        },
        // Parte de la mano de obra que no se asignó a nadie (hoy 6%): no es de la plataforma
        sinAsignar: {
            porcentaje: { type: Number, default: 0, min: 0, max: 100 },
            monto: { type: Number, default: 0, min: 0 }
        },
        aperturador: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'Aperturador' },
            porcentaje: { type: Number, default: 2, min: 0, max: 100 },
            monto: { type: Number, default: 0, min: 0 }
        },
        incorporador: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'Incorporador' },
            porcentaje: { type: Number, default: 3, min: 0, max: 100 },
            monto: { type: Number, default: 0, min: 0 }
        },
        // Snapshot de la parte del técnico (se resta a la del contratista)
        tecnico: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tecnico' },
            porcentaje: { type: Number, default: 0, min: 0, max: 100 },
            monto: { type: Number, default: 0, min: 0 }
        },
        contratista: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contratista', required: true },
            porcentaje: { type: Number, default: 80, min: 0, max: 100 },
            montoManoDeObraBruto: { type: Number, default: 0, min: 0 },
            montoManoDeObra: { type: Number, default: 0, min: 0 },
            montoMateriales: { type: Number, default: 0, min: 0 },
            montoTotal: { type: Number, default: 0, min: 0 }
        }
    },
    estadoPago: {
        type: String,
        enum: ['pendiente', 'procesando', 'disponible', 'pagado', 'retenido', 'error', 'cancelada'],
        default: 'pendiente'
    },
    // El contratista libera al técnico su ganancia
    liberacionTecnico: {
        estado: { type: String, enum: ['pendiente', 'liberada'], default: 'pendiente' },
        fecha: { type: Date, default: null },
        por: { type: mongoose.Schema.Types.ObjectId, default: null }
    },
    fechaPago: { type: Date },
    notas: { type: String, trim: true }
}, {
    timestamps: true
});

// Índices (cita ya tiene índice por unique: true)
comisionSchema.index({ 'distribucion.contratista.id': 1, estadoPago: 1 });
comisionSchema.index({ createdAt: -1 });

export default mongoose.models.Comision || mongoose.model('Comision', comisionSchema);
