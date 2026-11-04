// app/api/incorporaciones/route.js
// GET: incorporaciones del incorporador (token), derivadas de sus contratistas. Admin: todas (?incorporadorId=).
//   [{ _id (= id del contratista), estado, contratista:{_id,nombre,email}, documentos:{requeridos,presentes}, createdAt }]
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import DocumentoIncorporacion from '@/models/DocumentoIncorporacion';
import { requireSession } from '@/lib/session';
import { perfilIdDe } from '@/lib/perfiles';
import { esObjectId } from '@/lib/sanitize';
import { estadoIncorporacion, DOCUMENTOS_REQUERIDOS } from '@/lib/incorporaciones';

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
      .select('nombre email aprobado estatus createdAt')
      .sort({ createdAt: -1 })
      .limit(300);

    const docs = await DocumentoIncorporacion.find({ contratista: { $in: contratistas.map(c => c._id) } }).select('contratista tipo');
    const tiposPorContratista = {};
    docs.forEach(d => { (tiposPorContratista[String(d.contratista)] ||= new Set()).add(d.tipo); });

    return NextResponse.json(contratistas.map(c => {
      const tipos = [...(tiposPorContratista[String(c._id)] || [])];
      return {
        _id: c._id,
        estado: estadoIncorporacion(c, tipos),
        contratista: { _id: c._id, nombre: c.nombre, email: c.email },
        documentos: { requeridos: DOCUMENTOS_REQUERIDOS, presentes: tipos },
        createdAt: c.createdAt
      };
    }));
  } catch (error) {
    console.error('Error en GET /api/incorporaciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
