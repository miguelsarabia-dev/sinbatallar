// GET /api/areas/demanda (aperturador y admin): celdas sin cobertura con más búsquedas.
//   [{lat, lng, total, ultimaVez, municipio?}] — top 50 por total.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import DemandaFueraZona from '@/models/DemandaFueraZona';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['aperturador', 'admin']);
    if (error) return error;

    const celdas = await DemandaFueraZona.find().sort({ total: -1 }).limit(50).lean();
    return NextResponse.json(celdas.map(c => ({
      lat: c.lat, lng: c.lng, total: c.total, ultimaVez: c.ultimaVez, ...(c.municipio ? { municipio: c.municipio } : {})
    })));
  } catch (error) {
    console.error('Error en GET /api/areas/demanda:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
