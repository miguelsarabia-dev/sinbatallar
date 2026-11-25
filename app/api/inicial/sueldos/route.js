// /api/inicial/sueldos — MODELO INICIAL: sueldo base semanal de los especialistas.
// GET  especialista: los suyos · admin: todos (?semana=YYYY-MM-DD | ?mes=YYYY-MM, ?especialistaId=, ?estado=)
// POST admin: genera la semana { semana: 'YYYY-MM-DD' (lunes) } con un pago 'pendiente' por cada especialista activo
//      y aprobado, con su sueldo vigente. Idempotente: no duplica los que ya existen.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import PagoSueldo from '@/models/PagoSueldo';
import Especialista from '@/models/Especialista';
import User from '@/models/User'; // registrado para el populate
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { esLunes, esMes, lunesDelMes } from '@/lib/periodos';
import { especialistaDeSesion } from '@/lib/inicial-db';

export async function GET(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['especialista', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const filtro = {};
    if (session.role === 'especialista') {
      const propio = await especialistaDeSesion(session);
      if (!propio) return NextResponse.json([]);
      filtro.especialista = propio._id;
    } else if (esObjectId(searchParams.get('especialistaId'))) {
      filtro.especialista = searchParams.get('especialistaId');
    }
    const semana = searchParams.get('semana');
    const mes = searchParams.get('mes');
    if (esLunes(semana)) filtro.semana = semana;
    else if (esMes(mes)) filtro.semana = { $in: lunesDelMes(mes) };
    const estado = searchParams.get('estado');
    if (['pendiente', 'pagado', 'cancelado'].includes(estado)) filtro.estado = estado;

    const pagos = await PagoSueldo.find(filtro)
      .sort({ semana: -1 })
      .populate({ path: 'especialista', select: 'user sueldoSemanal', populate: { path: 'user', select: 'nombre email', model: User } })
      .lean();
    return NextResponse.json(pagos);
  } catch (error) {
    console.error('Error en GET /inicial/sueldos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    if (!esLunes(body.semana)) {
      return NextResponse.json({ error: 'semana debe ser el lunes de la semana, YYYY-MM-DD' }, { status: 400 });
    }

    const especialistas = await Especialista.find({ activo: true, aprobado: true }).select('_id sueldoSemanal').lean();
    const existentes = new Set(
      (await PagoSueldo.find({ semana: body.semana }).select('especialista').lean()).map(p => String(p.especialista))
    );
    const nuevos = especialistas
      .filter(e => !existentes.has(String(e._id)))
      .map(e => ({ especialista: e._id, semana: body.semana, monto: e.sueldoSemanal, registradoPor: session.id }));

    if (nuevos.length) {
      try {
        await PagoSueldo.insertMany(nuevos, { ordered: false });
      } catch (e) {
        if (e?.code !== 11000 && !e?.writeErrors?.every?.(w => w.code === 11000)) throw e; // carrera: ya existía
      }
    }
    return NextResponse.json({ semana: body.semana, creados: nuevos.length, yaExistian: existentes.size }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /inicial/sueldos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
