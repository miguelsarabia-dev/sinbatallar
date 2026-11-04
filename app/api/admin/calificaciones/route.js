// GET /api/admin/calificaciones?tipo=Contratista|Tecnico&oculta=true|false&minimo=&maximo= — solo admin.
// Incluye reseñas ocultas, con el nombre de quien califica y de quien es calificado.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Calificacion from '@/models/Calificacion';
import Contratista from '@/models/Contratista';
import Tecnico from '@/models/Tecnico';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const filtro = {};
    if (['Contratista', 'Tecnico'].includes(searchParams.get('tipo'))) filtro.tipoCalificado = searchParams.get('tipo');
    if (searchParams.get('oculta') === 'true') filtro.oculta = true;
    if (searchParams.get('oculta') === 'false') filtro.oculta = { $ne: true };
    const min = Number(searchParams.get('minimo')), max = Number(searchParams.get('maximo'));
    if (Number.isFinite(min) || Number.isFinite(max)) {
      filtro.puntaje = {};
      if (Number.isFinite(min) && searchParams.get('minimo')) filtro.puntaje.$gte = min;
      if (Number.isFinite(max) && searchParams.get('maximo')) filtro.puntaje.$lte = max;
      if (!Object.keys(filtro.puntaje).length) delete filtro.puntaje;
    }

    const lista = await Calificacion.find(filtro)
      .sort({ createdAt: -1 })
      .limit(300)
      .populate('cliente', 'nombre')
      .populate({ path: 'cita', select: 'servicio', populate: { path: 'servicio', select: 'nombre' } })
      .lean();

    const idsContratistas = lista.filter(c => c.tipoCalificado === 'Contratista').map(c => c.calificado);
    const idsTecnicos = lista.filter(c => c.tipoCalificado === 'Tecnico').map(c => c.calificado);
    const [contratistas, tecnicos] = await Promise.all([
      Contratista.find({ _id: { $in: idsContratistas } }).select('nombre').lean(),
      Tecnico.find({ _id: { $in: idsTecnicos } }).select('user').populate('user', 'nombre').lean()
    ]);
    const nombres = {
      ...Object.fromEntries(contratistas.map(c => [String(c._id), c.nombre])),
      ...Object.fromEntries(tecnicos.map(t => [String(t._id), t.user?.nombre]))
    };

    return NextResponse.json(lista.map(c => ({
      _id: c._id,
      tipoCalificado: c.tipoCalificado,
      calificado: { _id: c.calificado, nombre: nombres[String(c.calificado)] || '—' },
      cliente: c.cliente ? { _id: c.cliente._id, nombre: c.cliente.nombre } : null,
      servicio: c.cita?.servicio?.nombre || null,
      puntaje: c.puntaje,
      comentario: c.comentario,
      oculta: !!c.oculta,
      motivoOculta: c.motivoOculta || null,
      createdAt: c.createdAt
    })));
  } catch (error) {
    console.error('Error en GET /api/admin/calificaciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
