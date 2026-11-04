// app/api/citas/[id]/confirmar-cliente/route.js
// El cliente dueño (por token) confirma que el trabajo quedó bien.
// Pago total con pagoUnico verificado -> cierra la cita (pagado) y crea la comisión.
// Con anticipo, el cierre ocurre al verificar el saldo.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import { requireSession } from '@/lib/session';
import { cerrarServicioSiCorresponde } from '@/lib/comisiones';

async function confirmar(request, params) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['cliente']);
    if (error) return error;

    const { id } = await params;
    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    if (cita.cliente.toString() !== session.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    if (cita.estado !== 'completada') {
      return NextResponse.json(
        { error: `El técnico aún no termina el trabajo (estado: ${cita.estado})` },
        { status: 400 }
      );
    }

    if (!cita.clienteConfirmo) {
      cita.clienteConfirmo = true;
      cita.fechaClienteConfirmo = new Date();
      cita.historial.push({
        estado: 'completada',
        comentario: 'Cliente confirmó el trabajo completado',
        fecha: new Date(),
        usuario: session.id
      });
      await cita.save({ validateModifiedOnly: true });
    }

    const { cerrada, comision } = await cerrarServicioSiCorresponde(cita._id);
    const actualizada = await Cita.findById(id);

    return NextResponse.json({
      success: true,
      message: cerrada ? 'Trabajo confirmado. Servicio cerrado.' : 'Trabajo confirmado.',
      cita: actualizada,
      citaCerrada: cerrada,
      comisionCreada: !!comision
    });
  } catch (error) {
    console.error('Error al confirmar trabajo (cliente):', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  return confirmar(request, params);
}

export async function POST(request, { params }) {
  return confirmar(request, params);
}
