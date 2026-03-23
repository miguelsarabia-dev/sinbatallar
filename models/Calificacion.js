// models/Calificacion.js
import mongoose from 'mongoose';

const calificacionSchema = new mongoose.Schema({
    cita: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cita',
        required: true
    },
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    calificado: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'tipoCalificado'
    },
    tipoCalificado: {
        type: String,
        enum: ['Contratista'],
        required: true
    },
    puntaje: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comentario: {
        type: String,
        trim: true
    },
    imagenes: [{ type: String }]
}, {
    timestamps: true
});

// Índices
calificacionSchema.index({ cita: 1 });
calificacionSchema.index({ calificado: 1, tipoCalificado: 1 });
calificacionSchema.index({ cliente: 1 });

export default mongoose.models.Calificacion || mongoose.model('Calificacion', calificacionSchema);
