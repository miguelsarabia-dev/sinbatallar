// app/api/incorporaciones/[id]/documentos/route.js (id = _id del contratista)
// Evidencia OPCIONAL (el estado de la incorporación depende de los datos escritos, no de estos archivos).
// POST multipart: tipo (ine|curp|comprobante_domicilio|otro) + archivo (campo `archivo`, `documento`, `imagen` o `file`),
//   imagen o PDF ≤ 8 MB. GET: lista con URL firmada temporal (10 min). Solo incorporador dueño o admin.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import DocumentoIncorporacion from '@/models/DocumentoIncorporacion';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { uploadDocumento, urlDocumentoFirmada } from '@/lib/cloudinary';
import { estadoIncorporacion, contratistaGestionable, datosIncorporacion, TIPOS_DOCUMENTO } from '@/lib/incorporaciones';

const MAX_BYTES = 8 * 1024 * 1024;
const MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
const CAMPOS_ARCHIVO = ['archivo', 'documento', 'imagen', 'file'];
const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });

const serializar = (d) => ({
  _id: d._id,
  tipo: d.tipo,
  nombreArchivo: d.nombreArchivo,
  formato: d.formato,
  url: urlDocumentoFirmada({ publicId: d.publicId, resourceType: d.resourceType, format: d.formato }),
  createdAt: d.createdAt
});

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['incorporador', 'admin']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id) || !(await contratistaGestionable(session, id))) return bad('Incorporación no encontrada', 404);

    const docs = await DocumentoIncorporacion.find({ contratista: id }).sort({ createdAt: -1 });
    return NextResponse.json(docs.map(serializar));
  } catch (error) {
    console.error('Error en GET documentos de incorporación:', error);
    return bad('Error interno del servidor', 500);
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['incorporador', 'admin']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return bad('Incorporación no encontrada', 404);
    const contratista = await contratistaGestionable(session, id);
    if (!contratista) return bad('Incorporación no encontrada', 404);

    const formData = await request.formData();
    const tipo = formData.get('tipo');
    if (!TIPOS_DOCUMENTO.includes(tipo)) return bad(`tipo debe ser: ${TIPOS_DOCUMENTO.join(' | ')}`);

    const archivo = CAMPOS_ARCHIVO.map(c => formData.get(c)).find(f => f && typeof f !== 'string');
    if (!archivo || !archivo.size) return bad('Falta el archivo');
    const ext = (archivo.name || '').split('.').pop()?.toLowerCase();
    const tipoOk = archivo.type ? MIME.includes(archivo.type.toLowerCase()) : EXT.includes(ext);
    if (!tipoOk) return bad('Formato no permitido. Usa PDF, JPG, PNG, WEBP o HEIC');
    if (archivo.size > MAX_BYTES) return bad('El archivo excede el máximo de 8 MB');

    const subida = await uploadDocumento(archivo, { folder: `sinbatallar/incorporaciones/${id}` });
    const doc = await DocumentoIncorporacion.create({
      contratista: id,
      subidoPor: session.id,
      tipo,
      nombreArchivo: (archivo.name || '').slice(0, 120),
      publicId: subida.publicId,
      resourceType: subida.resourceType,
      formato: subida.format,
      bytes: subida.bytes
    });

    return NextResponse.json({
      success: true,
      documento: serializar(doc),
      incorporacion: { _id: contratista._id, estado: estadoIncorporacion(contratista), datos: datosIncorporacion(contratista) }
    }, { status: 201 });
  } catch (error) {
    console.error('Error en POST documentos de incorporación:', error);
    return bad('Error interno del servidor', 500);
  }
}
