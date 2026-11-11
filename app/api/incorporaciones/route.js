// app/api/incorporaciones/route.js
// GET: incorporaciones del incorporador (token), derivadas de sus contratistas. Admin: todas (?incorporadorId=).
//   [{ _id (= id del contratista), estado, contratista:{_id,nombre,email}, datos:{requeridos,presentes,faltantes}, evidencias, createdAt }]
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import DocumentoIncorporacion from '@/models/DocumentoIncorporacion';
import { requireSession } from '@/lib/session';
import { perfilIdDe } from '@/lib/perfiles';
import { esObjectId } from '@/lib/sanitize';
import { estadoIncorporacion, datosIncorporacion } from '@/lib/incorporaciones';

export async function GET(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['incorporador', 'admin']);
    if (error) return error;

    const filtro = {};
    if (session.role === 'incorporador') {
      const miId = await perfilIdDe(session);
      if (!miId) return NextResponse.json([]);
      filtro.incorporador = miId;
    } else {
      const incId = new URL(request.url).searchParams.get('incorporadorId');
      filtro.incorporador = esObjectId(incId) ? incId : { $ne: null };
    }

    const contratistas = await Contratista.find(filtro)
      .select('nombre email telefono curp direccion especialidad servicios areaId areasIds aprobado estatus createdAt')
      .sort({ createdAt: -1 })
      .limit(300);

    // Los documentos son evidencia opcional: solo se cuentan, no condicionan el estado
    const conteo = await DocumentoIncorporacion.aggregate([
      { $match: { contratista: { $in: contratistas.map(c => c._id) } } },
      { $group: { _id: '$contratista', total: { $sum: 1 } } }
    ]);
    const evidencias = Object.fromEntries(conteo.map(c => [String(c._id), c.total]));

    return NextResponse.json(contratistas.map(c => ({
      _id: c._id,
      estado: estadoIncorporacion(c),
      contratista: { _id: c._id, nombre: c.nombre, email: c.email },
      datos: datosIncorporacion(c),
      evidencias: evidencias[String(c._id)] || 0,
      createdAt: c.createdAt
    })));
  } catch (error) {
    console.error('Error en GET /api/incorporaciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
