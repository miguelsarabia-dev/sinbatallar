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
        contratista: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contratista', required: true },
            porcentaje: { type: Number, default: 85, min: 0, max: 100 },
            montoManoDeObra: { type: Number, default: 0, min: 0 },
            montoMateriales: { type: Number, default: 0, min: 0 },
            montoTotal: { type: Number, default: 0, min: 0 }
        }
    },
    estadoPago: {
        type: String,
        enum: ['pendiente', 'procesando', 'disponible', 'pagado', 'retenido', 'error'],
        default: 'pendiente'
    },
    fechaPago: { type: Date },
    notas: { type: String, trim: true }
}, {
    timestamps: true
});

// Índices (cita ya tiene índice por unique: true)
comisionSchema.index({ 'distribucion.contratista.id': 1, estadoPago: 1 });
comisionSchema.index({ createdAt: -1 });

// Método para calcular distribución
// Método para calcular distribución
comisionSchema.methods.calcularDistribucion = function () {
    const manoDeObra = this.manoDeObra;
    const materiales = this.costoMateriales;
    let porcentajePlataforma = 15; // Base si no hay intermediarios

    // Aperturador: % de la mano de obra (si existe)
    if (this.distribucion.aperturador.id) {
        let pAperturador = this.distribucion.aperturador.porcentaje || 2;
        this.distribucion.aperturador.monto = Math.round((manoDeObra * pAperturador) / 100);
        porcentajePlataforma -= pAperturador;
    }

    // Incorporador: % de la mano de obra (si existe)
    if (this.distribucion.incorporador.id) {
        let pIncorporador = this.distribucion.incorporador.porcentaje || 3;
        this.distribucion.incorporador.monto = Math.round((manoDeObra * pIncorporador) / 100);
        porcentajePlataforma -= pIncorporador;
    }

    // Plataforma: % de la mano de obra final
    this.distribucion.plataforma.porcentaje = porcentajePlataforma;
    this.distribucion.plataforma.monto = Math.round((manoDeObra * porcentajePlataforma) / 100);

    // Contratista: Materiales (100% reembolso) + % de Mano de Obra
    this.distribucion.contratista.montoMateriales = materiales;
    this.distribucion.contratista.montoManoDeObra = Math.round((manoDeObra * this.distribucion.contratista.porcentaje) / 100);
    this.distribucion.contratista.montoTotal = this.distribucion.contratista.montoMateriales + this.distribucion.contratista.montoManoDeObra;

    return this;
};

// Middleware pre-save
comisionSchema.pre('save', function (next) {
    if (this.isNew || this.isModified('manoDeObra') || this.isModified('costoMateriales')) {
        this.calcularDistribucion();
    }
    next();
});

export default mongoose.models.Comision || mongoose.model('Comision', comisionSchema);
