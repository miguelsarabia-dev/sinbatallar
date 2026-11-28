// GET /api/cotizaciones/[id]/documento — cotización desglosada como documento HTML imprimible (para guardarla en PDF).
// La ven el cliente de la cita (solo cotizaciones visibles para él), quien cotizó (contratista, técnico o especialista),
// el aspirante que va en la cita y el admin. Siempre muestra la vista del cliente (lib/cotizacion-documento.js):
// sin tarifas internas. ?app=1 omite el botón "Descargar PDF" (la app genera el PDF en el teléfono).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import User from '@/models/User';
import Servicio from '@/models/Servicio';
import Contratista from '@/models/Contratista';
import { resolverActor } from '@/lib/citas-estado';
import { contactoEspecialista } from '@/lib/inicial-citas-db';
import { documentoCotizacionHtml } from '@/lib/cotizacion-documento';

const OCULTAS_AL_CLIENTE = ['pendiente', 'pendiente_contratista', 'rechazada_contratista'];

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['cliente', 'contratista', 'tecnico', 'especialista', 'aspirante', 'admin']);
    if (error) return error;
    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });

    const cotizacion = await Cotizacion.findById(id).lean();
    const cita = cotizacion && await Cita.findById(cotizacion.cita).lean();
    if (!cotizacion || !cita) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });

    const actor = await resolverActor(session, cita);
    const oculta = session.role === 'cliente' && OCULTAS_AL_CLIENTE.includes(cotizacion.estado);
    if (!actor.autorizado || oculta) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });

    const [cliente, servicio, quien] = await Promise.all([
      User.findById(cita.cliente).select('nombre').lean(),
      Servicio.findById(cita.servicio).select('nombre').lean(),
      cotizacion.especialista
        ? contactoEspecialista(cotizacion.especialista).then(e => e && { nombre: e.nombre, rol: 'Especialista' })
        : Contratista.findById(cotizacion.contratista).select('nombre nombreEmpresa').lean()
          .then(c => c && { nombre: c.nombreEmpresa || c.nombre, rol: 'Contratista' })
    ]);
    const u = cita.ubicacion || {};
    const direccion = [u.calle, u.numeroCasa ? `#${u.numeroCasa}` : '', u.colonia, u.municipio].filter(Boolean).join(', ');

    const html = documentoCotizacionHtml({
      cotizacion, servicio: servicio?.nombre, cliente, quienCotiza: quien, direccion,
      conBoton: new URL(request.url).searchParams.get('app') !== '1'
    });
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error en GET /cotizaciones/[id]/documento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
