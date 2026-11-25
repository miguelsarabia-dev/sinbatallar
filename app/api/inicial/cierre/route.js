// GET /api/inicial/cierre?mes=YYYY-MM — solo admin. Cierre mensual del MODELO INICIAL (lib/financiero-inicial.js):
//   MO del mes − especialistas − aspirantes − aperturadores (mayor entre comisión y garantía) − costos de operación
//   − sueldos base = resultado; si es positivo, 50% asociado(s) y 50% Sin Batallar.
// Usa los servicios cerrados del mes (ComisionInicial no cancelada, por fechaServicio) y los sueldos REGISTRADOS de
// las semanas cuyo lunes cae en el mes (PagoSueldo no cancelado). También devuelve la proyección de sueldos con
// 52/12 semanas, como en el Excel, para comparar.
// Aperturador: todo aperturador activo tiene garantía mensual; cobra lo MAYOR entre ella y el 3% de todos los
// servicios cerrados en el mes en las zonas que abrió (nunca ambos).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import ComisionInicial from '@/models/ComisionInicial';
import PagoSueldo from '@/models/PagoSueldo';
import Especialista from '@/models/Especialista';
import Aperturador from '@/models/Aperturador';
import Asociado from '@/models/Asociado';
import User from '@/models/User';
import { requireSession } from '@/lib/session';
import { esMes, rangoMes, lunesDelMes } from '@/lib/periodos';
import { getConfigInicial } from '@/lib/financiero-inicial-db';
import { cierreMensualInicial, sueldoMensual, centavos } from '@/lib/financiero-inicial';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    const mes = new URL(request.url).searchParams.get('mes');
    if (!esMes(mes)) return NextResponse.json({ error: 'mes debe ser YYYY-MM' }, { status: 400 });
    const { inicio, fin } = rangoMes(mes);
    const config = await getConfigInicial();

    const comisiones = await ComisionInicial.find({ fechaServicio: { $gte: inicio, $lt: fin }, estado: { $ne: 'cancelada' } }).lean();
    const servicios = comisiones.map(c => ({
      ...c.distribucion,
      manoDeObra: c.manoDeObra,
      aperturadorId: c.aperturador ? String(c.aperturador) : null,
      asociadoId: c.asociado ? String(c.asociado) : null
    }));

    const pagos = await PagoSueldo.find({ semana: { $in: lunesDelMes(mes) }, estado: { $ne: 'cancelado' } }).select('monto estado').lean();
    const sueldosRegistrados = centavos(pagos.reduce((s, p) => s + p.monto, 0));

    // Garantía: TODO aperturador activo la tiene. Su 3% sale de todos los servicios cerrados en las zonas que abrió
    // (ComisionInicial.aperturador = dueño de la zona de la cita); cobra lo mayor de los dos.
    const activos = (await Aperturador.find({ activo: { $ne: false } }).select('_id').lean()).map(a => String(a._id));
    const conGarantia = new Set(activos);
    const especialistas = await Especialista.find({ activo: true, aprobado: true }).select('sueldoSemanal').lean();

    const cierre = cierreMensualInicial({
      servicios,
      sueldos: sueldosRegistrados,
      aperturadores: [...conGarantia].map(id => ({ id, garantia: config.GARANTIA_APERTURADOR })),
      config
    });

    // Nombres para mostrar (aperturadores y asociados)
    const nombres = async (Modelo, ids) => {
      if (!ids.length) return {};
      const docs = await Modelo.find({ _id: { $in: ids } }).select('user').populate({ path: 'user', select: 'nombre email', model: User }).lean();
      return Object.fromEntries(docs.map(d => [String(d._id), d.user?.nombre || d.user?.email || '']));
    };
    const nombreAperturador = await nombres(Aperturador, cierre.pagosAperturadores.map(a => a.id));
    const nombreAsociado = await nombres(Asociado, cierre.porAsociado.map(a => a.id));
    cierre.pagosAperturadores = cierre.pagosAperturadores.map(a => ({ ...a, nombre: nombreAperturador[a.id] || null }));
    cierre.porAsociado = cierre.porAsociado.map(a => ({ ...a, nombre: nombreAsociado[a.id] || null }));

    return NextResponse.json({
      mes,
      config,
      ...cierre,
      sueldos: {
        registrados: sueldosRegistrados,
        semanasRegistradas: pagos.length,
        pendientesDePago: pagos.filter(p => p.estado === 'pendiente').length,
        proyectados: centavos(especialistas.reduce((s, e) => s + sueldoMensual(e.sueldoSemanal, config), 0))
      },
      comisiones: { total: comisiones.length, pendientes: comisiones.filter(c => c.estado === 'pendiente').length }
    });
  } catch (error) {
    console.error('Error en GET /inicial/cierre:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
