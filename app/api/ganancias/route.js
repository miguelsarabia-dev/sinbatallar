// app/api/ganancias/route.js
// Ganancias del usuario autenticado. El rol y el id salen del TOKEN (userId/role de la query
// se ignoran). Solo cuenta comisiones, que existen únicamente con el pago verificado y el
// servicio cerrado; el anticipo/pago verificado sin cierre se reporta aparte como `pendiente`.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Comision from '@/models/Comision';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import Tecnico from '@/models/Tecnico';
import Area from '@/models/Area';
import Contratista from '@/models/Contratista';
import { requireSession } from '@/lib/session';
import { perfilIdDe } from '@/lib/perfiles';
import { getFinancialConfig, gananciaDeCita } from '@/lib/comisiones';

const ROLES = ['contratista', 'tecnico', 'admin', 'aperturador', 'incorporador'];

// Campo de la distribución que corresponde a cada rol
const CAMPO_MONTO = {
  contratista: 'distribucion.contratista.montoTotal',
  tecnico: 'distribucion.tecnico.monto',
  aperturador: 'distribucion.aperturador.monto',
  incorporador: 'distribucion.incorporador.monto',
  admin: 'distribucion.plataforma.monto'
};

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

function fechaInicioPeriodo(periodo) {
  const ahora = new Date();
  const inicio = new Date(ahora);
  switch (periodo) {
    case 'dia': inicio.setHours(0, 0, 0, 0); break;
    case 'semana': inicio.setDate(ahora.getDate() - 7); break;
    case 'año': inicio.setFullYear(ahora.getFullYear() - 1); break;
    case 'mes':
    default: inicio.setMonth(ahora.getMonth() - 1);
  }
  return inicio;
}

export async function GET(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ROLES);
    if (error) return error;

    const role = session.role;
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || 'mes';
    const ahora = new Date();
    const fechaInicio = fechaInicioPeriodo(periodo);

    // Identidad del usuario en las comisiones (aperturador/incorporador: id del perfil y, por zonas antiguas, del usuario)
    const idsPerfilYUsuario = ['aperturador', 'incorporador'].includes(role)
      ? [...new Set([await perfilIdDe(session), session.id].filter(Boolean))]
      : [];
    const filtros = { estadoPago: { $ne: 'cancelada' }, createdAt: { $gte: fechaInicio } };
    let tecnicoId = null;
    if (role === 'contratista') {
      filtros['distribucion.contratista.id'] = session.id;
    } else if (role === 'tecnico') {
      const tecnico = await Tecnico.findOne({ user: session.id }).select('_id');
      if (!tecnico) return NextResponse.json({ error: 'Perfil de técnico no encontrado' }, { status: 404 });
      tecnicoId = tecnico._id;
      filtros['distribucion.tecnico.id'] = tecnicoId;
    } else if (role === 'aperturador') {
      filtros['distribucion.aperturador.id'] = { $in: idsPerfilYUsuario };   // zonas antiguas guardan el id de usuario
    } else if (role === 'incorporador') {
      filtros['distribucion.incorporador.id'] = { $in: idsPerfilYUsuario };
    }

    const campo = CAMPO_MONTO[role];
    const comisiones = await Comision.find(filtros)
      .populate({
        path: 'cita',
        populate: [
          { path: 'cliente', select: 'nombre email' },
          { path: 'servicio', select: 'nombre categoria' }
        ]
      })
      .sort({ createdAt: -1 });

    const montoDe = (com) => Number(get(com, campo)) || 0;
    const sum = (arr, fn) => arr.reduce((t, x) => t + (Number(fn(x)) || 0), 0);

    const ganado = sum(comisiones, montoDe);
    const totalServicios = comisiones.length;

    // Ganancia del técnico por liberar / liberada (la libera el contratista)
    const conTecnico = comisiones.filter(c => c.distribucion?.tecnico?.monto > 0);
    const liberado = sum(conTecnico.filter(c => c.liberacionTecnico?.estado === 'liberada'), c => c.distribucion.tecnico.monto);
    const porLiberar = sum(conTecnico.filter(c => c.liberacionTecnico?.estado !== 'liberada'), c => c.distribucion.tecnico.monto);

    // Pendiente: pago verificado (anticipo o pago único) pero servicio aún sin cerrar/comisionar.
    let pendiente = 0;
    if (['contratista', 'tecnico', 'admin', 'aperturador', 'incorporador'].includes(role)) {
      const filtroCot = {
        estado: 'aceptada',
        $or: [{ 'anticipo.verificado': true }, { 'pagoUnico.verificado': true }]
      };
      if (role === 'contratista') filtroCot.contratista = session.id;
      if (role === 'tecnico') {
        const ids = await Cita.find({ tecnico: tecnicoId }).distinct('_id');
        filtroCot.cita = { $in: ids };
      }
      if (role === 'aperturador') {
        // servicios en las zonas del aperturador
        const zonas = await Area.find({ aperturador: { $in: idsPerfilYUsuario } }).distinct('_id');
        filtroCot.cita = { $in: await Cita.find({ 'ubicacion.zona': { $in: zonas } }).distinct('_id') };
      }
      if (role === 'incorporador') {
        // servicios de los contratistas que incorporó
        filtroCot.contratista = { $in: await Contratista.find({ incorporador: { $in: idsPerfilYUsuario } }).distinct('_id') };
      }
      const cotizaciones = await Cotizacion.find(filtroCot);
      const conComision = new Set(
        (await Comision.find({ cita: { $in: cotizaciones.map(c => c.cita) } }).select('cita')).map(c => String(c.cita))
      );
      const abiertas = cotizaciones.filter(c => !conComision.has(String(c.cita)));
      const citas = await Cita.find({ _id: { $in: abiertas.map(c => c.cita) }, estado: { $ne: 'cancelada' } });
      const citaPorId = Object.fromEntries(citas.map(c => [String(c._id), c]));
      const config = await getFinancialConfig();
      const cache = {};
      for (const cot of abiertas) {
        const cita = citaPorId[String(cot.cita)];
        if (!cita) continue;
        const g = await gananciaDeCita(cita, { cotizacion: cot, config, cache });
        if (!g) continue;
        pendiente += role === 'contratista' ? g.gananciaContratista
          : role === 'tecnico' ? g.gananciaTecnico
          : role === 'aperturador' ? g.comisionAperturador
          : role === 'incorporador' ? g.comisionIncorporador
          : g.comisionPlataforma;
      }
    }

    // Por categoría
    const gananciasPorCategoria = {};
    comisiones.forEach(com => {
      const categoria = com.cita?.servicio?.categoria || 'Sin categoría';
      const datos = gananciasPorCategoria[categoria] ||= { total: 0, servicios: 0, promedio: 0 };
      datos.total += montoDe(com);
      datos.servicios += 1;
    });
    Object.values(gananciasPorCategoria).forEach(d => { d.promedio = d.servicios > 0 ? d.total / d.servicios : 0; });

    // Desglose para contratistas
    let desgloseCostos = null;
    if (role === 'contratista') {
      const plataforma = sum(comisiones, c => c.distribucion?.plataforma?.monto);
      const otros = sum(comisiones, c => (c.distribucion?.aperturador?.monto || 0) + (c.distribucion?.incorporador?.monto || 0));
      const tecnico = sum(comisiones, c => c.distribucion?.tecnico?.monto);
      const materiales = sum(comisiones, c => c.costoMateriales);
      const manoDeObra = sum(comisiones, c => c.manoDeObra);
      desgloseCostos = {
        ingresosBrutos: { materiales, manoDeObra, total: materiales + manoDeObra },
        deducciones: { plataforma, otros, tecnico, total: plataforma + otros + tecnico },
        gananciaNeta: ganado
      };
    }

    // Nombres de la zona y del contratista de cada servicio (útiles para el aperturador y el incorporador)
    const zonaIds = [...new Set(comisiones.map(c => c.cita?.ubicacion?.zona).filter(Boolean).map(String))];
    const contratistaIds = [...new Set(comisiones.map(c => c.distribucion?.contratista?.id).filter(Boolean).map(String))];
    const [zonasDocs, contratistasDocs] = await Promise.all([
      Area.find({ _id: { $in: zonaIds } }).select('nombre').lean(),
      Contratista.find({ _id: { $in: contratistaIds } }).select('nombre').lean()
    ]);
    const nombreZona = Object.fromEntries(zonasDocs.map(z => [String(z._id), z.nombre]));
    const nombreContratista = Object.fromEntries(contratistasDocs.map(c => [String(c._id), c.nombre]));

    return NextResponse.json({
      success: true,
      periodo,
      rol: role,
      resumen: {
        ganado,
        totalGanancias: ganado, // alias histórico
        pendiente,
        liberado,
        porLiberar,
        totalServicios,
        gananciaPromedio: totalServicios > 0 ? ganado / totalServicios : 0,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: ahora.toISOString()
      },
      desgloseCostos,
      gananciasPorCategoria,
      transacciones: comisiones.map(com => ({
        _id: com._id,
        citaId: com.cita?._id,
        cliente: com.cita?.cliente?.nombre || 'Cliente no especificado',
        servicio: com.cita?.servicio?.nombre || 'Servicio no especificado',
        ganancia: montoDe(com),
        fecha: com.createdAt,
        total: com.totalServicio,          // cobrado al cliente (con IVA)
        base: com.subtotal,                // sin IVA
        iva: com.iva,
        manoDeObra: com.manoDeObra,
        materiales: com.costoMateriales,
        comisionPlataforma: com.distribucion?.plataforma?.monto || 0,
        zona: nombreZona[String(com.cita?.ubicacion?.zona)] || null,
        contratista: nombreContratista[String(com.distribucion?.contratista?.id)] || null,
        gananciaTecnico: com.distribucion?.tecnico?.monto || 0,
        estadoLiberacion: com.liberacionTecnico?.estado || 'pendiente',
        estado: com.cita?.estado || 'completada'
      }))
    });

  } catch (error) {
    console.error('Error al obtener ganancias:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
