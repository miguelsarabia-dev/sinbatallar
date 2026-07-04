// app/api/citas/[id]/tomar/route.js
// POST /api/citas/[id]/tomar
// El contratista se auto-asigna una cita del pool de pendientes.
// Valida que la cita siga disponible (sin contratista) antes de asignar.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Contratista from '@/models/Contratista';
import Servicio from '@/models/Servicio';
import User from '@/models/User';
import { enviarNotificacionCambioEstado } from '@/lib/email-service';

export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const { contratistaId } = await request.json();

    if (!contratistaId) {
      return NextResponse.json(
        { error: 'contratistaId requerido' },
        { status: 400 }
      );
    }

    const contratista = await Contratista.findById(contratistaId);
    if (!contratista || !contratista.activo) {
      return NextResponse.json(
        { error: 'Contratista no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Usar findOneAndUpdate atómico para evitar condición de carrera:
    // solo asigna si la cita sigue sin contratista
    const cita = await Cita.findOneAndUpdate(
      {
        _id: id,
        estado: 'solicitada',
        contratista: null
      },
      {
        contratista: contratistaId,
        estado: 'atendida',
        $push: {
          historial: {
            estado: 'atendida',
            fecha: new Date(),
            comentario: `Cita tomada por contratista ${contratista.nombre}`
          }
        }
      },
      { new: true }
    )
      .populate('cliente', 'nombre email telefono')
      .populate('servicio', 'nombre descripcion categoria')
      .populate('contratista', 'nombre email telefono');

    if (!cita) {
      return NextResponse.json(
        { error: 'La cita no está disponible. Puede que otro contratista ya la tomó.' },
        { status: 409 }
      );
    }

    // Notificar al cliente por email (no bloqueante)
    enviarNotificacionCambioEstado({
      nuevoEstado: 'atendida',
      cita,
      cliente: cita.cliente,
      contratista: cita.contratista,
      servicio: cita.servicio
    }).catch(err => console.error('Error enviando email al tomar cita:', err));

    return NextResponse.json({
      message: 'Cita tomada exitosamente',
      cita
    });

  } catch (error) {
    console.error('Error en POST /api/citas/[id]/tomar:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
