// GET /api/admin/reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&formato=json|csv — solo admin (middleware).
// Sin fechas: últimos 30 días. csv se descarga como archivo.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Comision from '@/models/Comision';
import Contratista from '@/models/Contratista';
import Tecnico from '@/models/Tecnico';
import Ferretero from '@/models/Ferretero';
import SolicitudMaterial from '@/models/SolicitudMaterial';
import { requireSession } from '@/lib/session';

const aFecha = (valor, finDeDia = false) => {
  if (!valor) return null;
  const d = new Date(`${valor}T${finDeDia ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const suma = (campo) => ({ $sum: { $ifNull: [campo, 0] } });
const redondear = (n) => Math.round((n || 0) * 100) / 100;

const csvCelda = (v) => {
  const t = String(v ?? '');
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const hasta = aFecha(searchParams.get('hasta'), true) ?? new Date();
    const desde = aFecha(searchParams.get('desde')) ?? new Date(hasta.getTime() - 30 * 24 * 3600 * 1000);
    if (desde === undefined || hasta === undefined || (searchParams.get('hasta') && aFecha(searchParams.get('hasta')) === undefined)) {
      return NextResponse.json({ error: 'Fechas inválidas (usa YYYY-MM-DD)' }, { status: 400 });
    }
    const formato = searchParams.get('formato') === 'csv' ? 'csv' : 'json';
    const rango = { $gte: desde, $lte: hasta };

    const [porEstadoCitas, comisionesAgg, contratistasActivos, tecnicosActivos, ferreteriasActivas, solicitudesAgg, serieCitas, serieIngresos] = await Promise.all([
      Cita.aggregate([{ $match: { createdAt: rango } }, { $group: { _id: '$estado', total: { $sum: 1 } } }]),
      Comision.aggregate([
        { $match: { createdAt: rango, estadoPago: { $ne: 'cancelada' } } },
        { $group: {
          _id: null,
          cobrado: suma('$totalServicio'), base: suma('$subtotal'), iva: suma('$iva'),
          plataforma: suma('$distribucion.plataforma.monto'), contratistas: suma('$distribucion.contratista.montoTotal'),
          tecnicos: suma('$distribucion.tecnico.monto'), aperturadores: suma('$distribucion.aperturador.monto'),
          incorporadores: suma('$distribucion.incorporador.monto')
        } }
      ]),
      Contratista.countDocuments({ aprobado: true, activo: true }),
      Tecnico.countDocuments({ activo: true }),
      Ferretero.countDocuments({ activo: true }),
      SolicitudMaterial.aggregate([{ $match: { createdAt: rango } }, { $group: { _id: '$estado', total: { $sum: 1 } } }]),
      Cita.aggregate([
        { $match: { createdAt: rango } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          solicitados: { $sum: 1 },
          completados: { $sum: { $cond: [{ $eq: ['$estado', 'completada'] }, 1, 0] } }
        } }
      ]),
      Comision.aggregate([
        { $match: { createdAt: rango, estadoPago: { $ne: 'cancelada' } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, cobrado: suma('$totalServicio') } }
      ])
    ]);

    const estados = Object.fromEntries(porEstadoCitas.map(e => [e._id, e.total]));
    const c = comisionesAgg[0] || {};
    const solicitudesMaterial = { pendiente: 0, confirmada: 0, surtida: 0, cancelada: 0, ...Object.fromEntries(solicitudesAgg.map(e => [e._id, e.total])) };

    // Serie diaria continua (días sin movimiento en cero)
    const citasPorDia = Object.fromEntries(serieCitas.map(d => [d._id, d]));
    const ingresosPorDia = Object.fromEntries(serieIngresos.map(d => [d._id, d.cobrado]));
    const serie = [];
    for (let t = new Date(desde); t <= hasta && serie.length < 400; t = new Date(t.getTime() + 24 * 3600 * 1000)) {
      const dia = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      serie.push({
        fecha: dia,
        solicitados: citasPorDia[dia]?.solicitados || 0,
        completados: citasPorDia[dia]?.completados || 0,
        cobrado: redondear(ingresosPorDia[dia])
      });
    }

    const reporte = {
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      serviciosSolicitados: porEstadoCitas.reduce((t, e) => t + e.total, 0),
      completados: estados.completada || 0,
      cancelados: estados.cancelada || 0,
      ingresos: { cobrado: redondear(c.cobrado), base: redondear(c.base), iva: redondear(c.iva) },
      comisiones: {
        plataforma: redondear(c.plataforma), contratistas: redondear(c.contratistas), tecnicos: redondear(c.tecnicos),
        aperturadores: redondear(c.aperturadores), incorporadores: redondear(c.incorporadores)
      },
      contratistasActivos,
      tecnicosActivos,
      ferreteriasActivas,
      solicitudesMaterial,
      serie
    };

    if (formato === 'json') return NextResponse.json(reporte);

    const filas = [
      ['seccion', 'concepto', 'valor'],
      ['periodo', 'desde', reporte.desde], ['periodo', 'hasta', reporte.hasta],
      ['servicios', 'solicitados', reporte.serviciosSolicitados], ['servicios', 'completados', reporte.completados], ['servicios', 'cancelados', reporte.cancelados],
      ...Object.entries(reporte.ingresos).map(([k, v]) => ['ingresos', k, v]),
      ...Object.entries(reporte.comisiones).map(([k, v]) => ['comisiones', k, v]),
      ['actividad', 'contratistasActivos', contratistasActivos], ['actividad', 'tecnicosActivos', tecnicosActivos], ['actividad', 'ferreteriasActivas', ferreteriasActivas],
      ...Object.entries(solicitudesMaterial).map(([k, v]) => ['solicitudesMaterial', k, v]),
      [], ['fecha', 'solicitados', 'completados', 'cobrado'],
      ...serie.map(d => [d.fecha, d.solicitados, d.completados, d.cobrado])
    ];
    const csv = '﻿' + filas.map(f => f.map(csvCelda).join(',')).join('\n');
    const nombre = `reporte_${desde.toISOString().slice(0, 10)}_${hasta.toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nombre}"` }
    });
  } catch (error) {
    console.error('Error en GET /api/admin/reportes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
