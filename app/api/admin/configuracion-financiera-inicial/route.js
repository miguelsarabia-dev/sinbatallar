// GET/PUT /api/admin/configuracion-financiera-inicial — solo admin.
// Porcentajes y montos del modelo financiero INICIAL (lib/financiero-inicial.js). Aplican a servicios NUEVOS;
// los ya cerrados conservan su snapshot en ComisionInicial.
// PUT body: { OPERACION_SB?, OPERACION_ASOCIADO?, ESPECIALISTA?, ASPIRANTES?, APERTURADOR?, PARTICIPACION_ASOCIADO?,
//             GARANTIA_APERTURADOR?, SUELDO_SEMANAL?, SEMANAS_POR_MES? }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { getConfigInicial, setConfigInicial } from '@/lib/financiero-inicial-db';
import { FINANCIERO_INICIAL, VERSION_FINANCIERO_INICIAL } from '@/lib/financiero-inicial';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;
    return NextResponse.json({
      config: await getConfigInicial(),
      defaults: FINANCIERO_INICIAL,
      version: VERSION_FINANCIERO_INICIAL
    });
  } catch (error) {
    console.error('Error en GET configuracion-financiera-inicial:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;
    const body = await request.json().catch(() => ({}));
    const actual = await getConfigInicial();
    try {
      const config = await setConfigInicial({ ...actual, ...(body.config || body) }, session.id);
      return NextResponse.json({ config, version: VERSION_FINANCIERO_INICIAL });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en PUT configuracion-financiera-inicial:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
