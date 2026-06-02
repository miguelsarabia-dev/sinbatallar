// app/api/citas/pendientes-asignacion/route.js
// GET /api/citas/pendientes-asignacion?contratistaId=xxx
// Devuelve citas en estado 'solicitada' sin contratista asignado,
// filtradas por los servicios que ofrece el contratista y las zonas donde opera.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Contratista from '@/models/Contratista';
import Area from '@/models/Area';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const contratistaId = searchParams.get('contratistaId');

    if (!contratistaId) {
      return NextResponse.json(
        { error: 'contratistaId requerido' },
        { status: 400 }
      );
    }

    const contratista = await Contratista.findById(contratistaId);
    if (!contratista) {
      return NextResponse.json(
        { error: 'Contratista no encontrado' },
        { status: 404 }
      );
    }

    // Buscar áreas donde está asignado el contratista
    const areas = await Area.find({
      contratistas: contratistaId,
      activo: true
    }).select('_id');

    const areaIds = areas.map(a => a._id);

    // Citas sin contratista asignado, en estado solicitada,
    // cuyo servicio coincide con los del contratista y cuya zona es una de las suyas
    const filtro = {
      estado: 'solicitada',
      contratista: null,
      servicio: { $in: contratista.servicios }
    };

    // Si el contratista tiene zonas asignadas, filtrar por ellas
    if (areaIds.length > 0) {
      filtro['ubicacion.zona'] = { $in: areaIds };
    }

    const citas = await Cita.find(filtro)
      .populate('cliente', 'nombre telefono')
      .populate('servicio', 'nombre descripcion categoria imagenUrl')
      .select('-historial -cotizaciones -cotizacionAceptada')
      .sort({ createdAt: 1 }); // Las más antiguas primero

    return NextResponse.json({
      total: citas.length,
      citas
    });

  } catch (error) {
    console.error('Error en GET /api/citas/pendientes-asignacion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
