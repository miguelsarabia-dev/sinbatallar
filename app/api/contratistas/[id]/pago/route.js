// app/api/contratistas/[id]/pago/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import Cita from '@/models/Cita';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { getCuentaEmpresa } from '@/lib/cuenta-empresa';

// GET - Obtener información de pago del contratista
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });

    // Datos bancarios: el propio contratista, admin, o un cliente que tenga una cita con él.
    const esPropio = session.role === 'contratista' && session.id === id;
    if (!esPropio && session.role !== 'admin') {
      const relacionado = session.role === 'cliente' && await Cita.exists({ cliente: session.id, contratista: id });
      if (!relacionado) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Todos los pagos entran a Sin Batallar: se devuelve la cuenta de la empresa (el contratista ya no tiene datos de depósito)
    if (!(await Contratista.exists({ _id: id }))) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ informacionPago: await getCuentaEmpresa() });

  } catch (error) {
    console.error('Error al obtener información de pago:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// PUT - Ya no existe: los contratistas no capturan datos de depósito, todo el dinero entra a Sin Batallar
export async function PUT(request) {
  await connectDB();
  const { error } = await requireSession(request, ['contratista', 'admin']);
  if (error) return error;
  return NextResponse.json(
    { error: 'Los pagos los recibe Sin Batallar; el contratista no captura datos de depósito' },
    { status: 410 }
  );
}
