// app/api/cotizaciones/[id]/responder/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';

// PUT - Responder a una cotización (contratista)
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const data = await request.json();

    const {
      descripcionTrabajo,
      materiales,
      manoDeObra,
      contratistaId
    } = data;

    // Buscar la cotización
    const cotizacion = await Cotizacion.findById(id);
    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el contratista sea el correcto
    if (cotizacion.contratista.toString() !== contratistaId) {
      return NextResponse.json(
        { error: 'No autorizado para responder esta cotización' },
        { status: 403 }
      );
    }

    // Verificar que la cotización esté en estado pendiente
    if (cotizacion.estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Esta cotización ya ha sido enviada o procesada' },
        { status: 400 }
      );
    }

    // Verificar que no haya expirado
    if (new Date() > cotizacion.fechaExpiracion) {
      cotizacion.estado = 'expirada';
      await cotizacion.save();
      return NextResponse.json(
        { error: 'Esta cotización ha expirado' },
        { status: 400 }
      );
    }

    // Transformar materiales al formato correcto del modelo OPTIMIZADO
    const materialesFormateados = (materiales || []).map(material => ({
      nombre: material.nombre,
      descripcion: material.descripcion || '',
      cantidad: parseFloat(material.cantidad) || 0,
      precioPorUnidad: parseFloat(material.precio) || 0,
      total: (parseFloat(material.cantidad) || 0) * (parseFloat(material.precio) || 0)
    }));

    // Actualizar la cotización (subtotal, IVA, total y ganancias se calculan automáticamente)
    cotizacion.descripcionTrabajo = descripcionTrabajo;
    cotizacion.materiales = materialesFormateados;
    cotizacion.manoDeObra = parseFloat(manoDeObra) || 0;
    cotizacion.estado = 'enviada';
    cotizacion.fechaEnvio = new Date();

    await cotizacion.save();

    // Poblamos los datos para la respuesta
    await cotizacion.populate('cliente', 'name email telefono');
    await cotizacion.populate('contratista', 'nombre email telefono calificacion');
    await cotizacion.populate('servicio', 'nombre descripcion categoria');

    return NextResponse.json({
      message: 'Cotización enviada exitosamente',
      cotizacion
    });

  } catch (error) {
    console.error('Error al responder cotización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
