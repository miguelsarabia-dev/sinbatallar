// GET /api/incorporaciones/:id (id = _id del contratista): detalle de una incorporación. Incorporador dueño o admin.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import DocumentoIncorporacion from '@/models/DocumentoIncorporacion';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { estadoIncorporacion, contratistaGestionable, DOCUMENTOS_REQUERIDOS } from '@/lib/incorporaciones';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['incorporador', 'admin']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Incorporación no encontrada' }, { status: 404 });
    const contratista = await contratistaGestionable(session, id);
    if (!contratista) return NextResponse.json({ error: 'Incorporación no encontrada' }, { status: 404 });

    const tipos = [...new Set((await DocumentoIncorporacion.find({ contratista: id }).select('tipo')).map(d => d.tipo))];
    return NextResponse.json({
      _id: contratista._id,
      estado: estadoIncorporacion(contratista, tipos),
      contratista: { _id: contratista._id, nombre: contratista.nombre, email: contratista.email, aprobado: !!contratista.aprobado },
      documentos: { requeridos: DOCUMENTOS_REQUERIDOS, presentes: tipos },
      createdAt: contratista.createdAt
    });
  } catch (error) {
    console.error('Error en GET /api/incorporaciones/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
