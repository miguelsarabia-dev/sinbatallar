// GET /api/cotizador — catálogo del cotizador por especialidad para quien cotiza (especialista, contratista, técnico).
// Devuelve las tarifas vigentes (las del catálogo o las que autorizó el admin). Reglas en lib/cotizador.js.
// Query opcional: ?servicio=<id> → incluye la especialidad sugerida para ese servicio.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import Servicio from '@/models/Servicio';
import { getCatalogoCotizador } from '@/lib/cotizador-db';
import { ESPECIALIDADES_COTIZADOR, FACTORES_DIFICULTAD, MAX_CONCEPTOS, VERSION_CATALOGO, especialidadSugerida } from '@/lib/cotizador';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['especialista', 'contratista', 'tecnico', 'admin']);
    if (error) return error;
    const servicioId = new URL(request.url).searchParams.get('servicio');
    let sugerida = null;
    if (servicioId && esObjectId(servicioId)) {
      sugerida = especialidadSugerida(await Servicio.findById(servicioId).select('nombre categoria').lean());
    }
    return NextResponse.json({
      version: VERSION_CATALOGO,
      especialidades: ESPECIALIDADES_COTIZADOR,
      factores: FACTORES_DIFICULTAD,
      maxConceptos: MAX_CONCEPTOS,
      especialidadSugerida: sugerida,
      catalogo: (await getCatalogoCotizador()).map(({ id, especialidad, grupo, concepto, unidad, tarifa, minimo, disponible }) =>
        ({ id, especialidad, grupo, concepto, unidad, tarifa, minimo, disponible }))
    });
  } catch (error) {
    console.error('Error en GET /cotizador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
