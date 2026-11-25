// GET /api/inicial/ganancias?mes=YYYY-MM — MODELO INICIAL: lo que lleva ganado en el mes
//   especialista: su comisión por servicio (12%) + sus sueldos base de las semanas del mes
//   aspirante:    su parte por servicio (12% entre los que fueron)
// Solo servicios cerrados (ComisionInicial no cancelada). Default: mes actual.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import ComisionInicial from '@/models/ComisionInicial';
import PagoSueldo from '@/models/PagoSueldo';
import Servicio from '@/models/Servicio'; // registrado para el populate
import { requireSession } from '@/lib/session';
import { perfilIdDe } from '@/lib/perfiles';
import { esMes, rangoMes, lunesDelMes } from '@/lib/periodos';
import { centavos } from '@/lib/financiero-inicial';

export async function GET(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['especialista', 'aspirante']);
    if (error) return error;

    const param = new URL(request.url).searchParams.get('mes');
    const mes = esMes(param) ? param : new Date().toISOString().slice(0, 7);
    const { inicio, fin } = rangoMes(mes);
    const perfilId = await perfilIdDe(session);
    if (!perfilId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const filtro = {
      fechaServicio: { $gte: inicio, $lt: fin },
      estado: { $ne: 'cancelada' },
      ...(session.role === 'especialista' ? { especialista: perfilId } : { aspirantes: perfilId })
    };
    const comisiones = await ComisionInicial.find(filtro)
      .populate({ path: 'servicio', select: 'nombre', model: Servicio })
      .sort({ fechaServicio: -1 })
      .lean();

    const servicios = comisiones.map(c => ({
      cita: c.cita,
      servicio: c.servicio?.nombre || 'Servicio',
      fecha: c.fechaServicio,
      manoDeObra: c.manoDeObra,
      monto: session.role === 'especialista' ? c.distribucion?.especialista?.monto || 0 : c.distribucion?.aspirantes?.porAspirante?.monto || 0,
      estado: c.estado
    }));
    const porServicios = centavos(servicios.reduce((s, x) => s + x.monto, 0));

    let sueldos = null;
    if (session.role === 'especialista') {
      const pagos = await PagoSueldo.find({ especialista: perfilId, semana: { $in: lunesDelMes(mes) }, estado: { $ne: 'cancelado' } })
        .sort({ semana: 1 }).lean();
      sueldos = {
        semanas: pagos.map(p => ({ semana: p.semana, monto: p.monto, estado: p.estado, fechaPago: p.fechaPago })),
        total: centavos(pagos.reduce((s, p) => s + p.monto, 0)),
        pagado: centavos(pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0))
      };
    }

    return NextResponse.json({
      mes,
      servicios,
      porServicios,
      sueldos,
      total: centavos(porServicios + (sueldos?.total || 0))
    });
  } catch (error) {
    console.error('Error en GET /inicial/ganancias:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
