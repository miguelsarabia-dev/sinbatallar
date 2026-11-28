// GET/PUT /api/admin/cotizador — solo admin. Tarifas del cotizador por especialidad.
//   GET → { version, catalogo: [{ id, especialidad, concepto, unidad, tarifa, tarifaCatalogo, minimo, fuente, disponible }], ajustes }
//   PUT { ajustes: { [SB-xxxx]: { tarifa?, minimo?, activo? } } } → reemplaza los ajustes. Tarifa vacía = la del catálogo.
// Aplican a cotizaciones NUEVAS: las ya hechas guardan la tarifa que usaron.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { getAjustesCotizador, setAjustesCotizador } from '@/lib/cotizador-db';
import { catalogoEfectivo, VERSION_CATALOGO } from '@/lib/cotizador';
import { CATALOGO_COTIZADOR } from '@/lib/cotizador-catalogo';

const respuesta = (ajustes) => {
  const base = new Map(CATALOGO_COTIZADOR.map(c => [c.id, c.tarifa]));
  return {
    version: VERSION_CATALOGO,
    ajustes,
    catalogo: catalogoEfectivo(ajustes).map(c => ({ ...c, tarifaCatalogo: base.get(c.id) }))
  };
};

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;
    return NextResponse.json(respuesta(await getAjustesCotizador()));
  } catch (error) {
    console.error('Error en GET /admin/cotizador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;
    const body = await request.json().catch(() => ({}));
    try {
      return NextResponse.json(respuesta(await setAjustesCotizador(body.ajustes || {}, session.id)));
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en PUT /admin/cotizador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
