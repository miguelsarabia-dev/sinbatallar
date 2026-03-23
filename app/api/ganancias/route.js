// app/api/ganancias/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Comision from '@/models/Comision';
import Cotizacion from '@/models/Cotizacion';
import Contratista from '@/models/Contratista';

// GET - Obtener resumen de ganancias
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const periodo = searchParams.get('periodo') || 'mes';

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId y role son requeridos' },
        { status: 400 }
      );
    }

    let filtros = {};
    let campoMonto = '';

    // Determinar filtros según el rol
    if (role === 'contratista') {
      filtros['distribucion.contratista.id'] = userId;
      campoMonto = 'distribucion.contratista.montoTotal';
    } else if (role === 'aperturador') {
      filtros['distribucion.aperturador.id'] = userId;
      campoMonto = 'distribucion.aperturador.monto';
    } else if (role === 'incorporador') {
      filtros['distribucion.incorporador.id'] = userId;
      campoMonto = 'distribucion.incorporador.monto';
    } else if (role === 'admin') {
      // Sin filtro para admin, ve todo
      campoMonto = 'distribucion.plataforma.monto';
    }

    // Calcular fechas según el período
    const ahora = new Date();
    let fechaInicio;

    switch (periodo) {
      case 'dia':
        fechaInicio = new Date(ahora);
        fechaInicio.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        fechaInicio = new Date(ahora);
        fechaInicio.setDate(ahora.getDate() - 7);
        break;
      case 'mes':
        fechaInicio = new Date(ahora);
        fechaInicio.setMonth(ahora.getMonth() - 1);
        break;
      case 'año':
        fechaInicio = new Date(ahora);
        fechaInicio.setFullYear(ahora.getFullYear() - 1);
        break;
      default:
        fechaInicio = new Date(ahora);
        fechaInicio.setMonth(ahora.getMonth() - 1);
    }

    filtros.createdAt = { $gte: fechaInicio };

    // Buscar comisiones
    const comisiones = await Comision.find(filtros)
      .populate({
        path: 'cita',
        populate: [
          { path: 'cliente', select: 'nombre email' },
          { path: 'servicio', select: 'nombre categoria' }
        ]
      })
      .sort({ createdAt: -1 });

    // Calcular estadísticas
    let totalGanancias = 0;

    if (role === 'contratista') {
      totalGanancias = comisiones.reduce((sum, com) =>
        sum + (Number(com.distribucion?.contratista?.montoTotal) || 0), 0);
    } else if (role === 'aperturador') {
      totalGanancias = comisiones.reduce((sum, com) =>
        sum + (Number(com.distribucion?.aperturador?.monto) || 0), 0);
    } else if (role === 'incorporador') {
      totalGanancias = comisiones.reduce((sum, com) =>
        sum + (Number(com.distribucion?.incorporador?.monto) || 0), 0);
    } else if (role === 'admin') {
      totalGanancias = comisiones.reduce((sum, com) =>
        sum + (Number(com.distribucion?.plataforma?.monto) || 0), 0);
    }

    const totalServicios = comisiones.length;
    const gananciaPromedio = totalServicios > 0 ? totalGanancias / totalServicios : 0;

    // Ganancias por categoría
    const gananciasPorCategoria = {};
    comisiones.forEach(com => {
      const categoria = com.cita?.servicio?.categoria || 'Sin categoría';
      if (!gananciasPorCategoria[categoria]) {
        gananciasPorCategoria[categoria] = { total: 0, servicios: 0, promedio: 0 };
      }

      let monto = 0;
      if (role === 'contratista') {
        monto = com.distribucion?.contratista?.montoTotal || 0;
      } else if (role === 'aperturador') {
        monto = com.distribucion?.aperturador?.monto || 0;
      } else if (role === 'incorporador') {
        monto = com.distribucion?.incorporador?.monto || 0;
      } else if (role === 'admin') {
        monto = com.distribucion?.plataforma?.monto || 0;
      }

      gananciasPorCategoria[categoria].total += monto;
      gananciasPorCategoria[categoria].servicios += 1;
    });

    Object.keys(gananciasPorCategoria).forEach(categoria => {
      const datos = gananciasPorCategoria[categoria];
      datos.promedio = datos.servicios > 0 ? datos.total / datos.servicios : 0;
    });

    // Desglose para contratistas
    let desgloseCostos = null;
    if (role === 'contratista') {
      const totalMateriales = comisiones.reduce((sum, com) =>
        sum + (Number(com.costoMateriales) || 0), 0);
      const totalManoDeObra = comisiones.reduce((sum, com) =>
        sum + (Number(com.manoDeObra) || 0), 0);

      // Deducciones
      const deduccionPlataforma = comisiones.reduce((sum, com) =>
        sum + (Number(com.distribucion?.plataforma?.monto) || 0), 0);
      const deduccionAperturador = comisiones.reduce((sum, com) =>
        sum + (Number(com.distribucion?.aperturador?.monto) || 0), 0);
      const deduccionIncorporador = comisiones.reduce((sum, com) =>
        sum + (Number(com.distribucion?.incorporador?.monto) || 0), 0);

      // Ganancia Real del Contratista
      const gananciaTotal = comisiones.reduce((sum, com) =>
        sum + (Number(com.distribucion?.contratista?.montoTotal) || 0), 0);

      desgloseCostos = {
        ingresosBrutos: {
          materiales: totalMateriales,
          manoDeObra: totalManoDeObra,
          total: totalMateriales + totalManoDeObra
        },
        deducciones: {
          plataforma: deduccionPlataforma,
          otros: deduccionAperturador + deduccionIncorporador, // Agrupamos aperturador e incorporador
          total: deduccionPlataforma + deduccionAperturador + deduccionIncorporador
        },
        gananciaNeta: gananciaTotal
      };
    }

    return NextResponse.json({
      success: true,
      periodo,
      resumen: {
        totalGanancias,
        totalServicios,
        gananciaPromedio,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: ahora.toISOString()
      },
      desgloseCostos,
      gananciasPorCategoria,
      transacciones: comisiones.map(com => ({
        _id: com._id,
        cliente: com.cita?.cliente?.nombre || 'Cliente no especificado',
        servicio: com.cita?.servicio?.nombre || 'Servicio no especificado',
        ganancia: role === 'contratista' ? com.distribucion?.contratista?.montoTotal :
          role === 'aperturador' ? com.distribucion?.aperturador?.monto :
            role === 'incorporador' ? com.distribucion?.incorporador?.monto :
              com.distribucion?.plataforma?.monto,
        fecha: com.createdAt,
        total: com.totalServicio,
        manoDeObra: com.manoDeObra,
        materiales: com.costoMateriales,
        estado: com.cita?.estado || 'completado'
      }))
    });

  } catch (error) {
    console.error('Error al obtener ganancias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
