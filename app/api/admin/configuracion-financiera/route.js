// GET/PUT /api/admin/configuracion-financiera — solo admin.
// Porcentajes del reparto (sobre mano de obra). Aplica a comisiones NUEVAS; las ya creadas
// conservan su snapshot.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Configuracion from '@/models/Configuracion';
import { requireSession } from '@/lib/session';
import { getFinancialConfig } from '@/lib/comisiones';
import { FINANCIAL_CONFIG, normalizarDistribucion } from '@/lib/financial-config';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    return NextResponse.json({
      distribucion: await getFinancialConfig(),
      defaults: FINANCIAL_CONFIG.DISTRIBUTION,
      iva: FINANCIAL_CONFIG.TAX.VAT_RATE
    });
  } catch (error) {
    console.error('Error en GET configuracion-financiera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;

    const body = await request.json();
    let distribucion;
    try {
      distribucion = normalizarDistribucion(body.distribucion || body);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    await Configuracion.findOneAndUpdate(
      { clave: 'financiera' },
      { valor: distribucion, actualizadoPor: session.id },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, distribucion });
  } catch (error) {
    console.error('Error en PUT configuracion-financiera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
