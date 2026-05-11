// app/api/cotizaciones/crear/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Contratista from '@/models/Contratista';
import Cita from '@/models/Cita';
import { enviarEmailCitaCotizada } from '@/lib/email-service';

export async function POST(request) {
  try {
    await connectDB();

    const data = await request.json();

    const {
      citaId,
      contratistaId,
      manoDeObra = 0,
      materiales = [],
      descripcion,
      imagenesCotizacion = []
    } = data;

    // Validaciones básicas
    if (!citaId || !contratistaId) {
      return NextResponse.json(
        { error: 'Campos requeridos: citaId, contratistaId' },
        { status: 400 }
      );
    }

    // Verificar que la cita existe
    const cita = await Cita.findById(citaId)
      .populate('cliente')
      .populate('servicio');

    if (!cita) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el contratista existe
    const contratista = await Contratista.findById(contratistaId);
    if (!contratista) {
      return NextResponse.json(
        { error: 'Contratista no encontrado' },
        { status: 404 }
      );
    }

    // Buscar cotización existente (para actualizar)
    let cotizacion = await Cotizacion.findOne({
      cita: citaId,
      contratista: contratistaId
    });

    if (cotizacion) {
      // Actualizar cotización existente
      cotizacion.manoDeObra = parseFloat(manoDeObra) || 0;
      cotizacion.materiales = materiales.map(material => ({
        nombre: material.nombre,
        descripcion: material.descripcion || '',
        cantidad: parseFloat(material.cantidad) || 0,
        precioPorUnidad: parseFloat(material.precio) || 0,
        total: parseFloat(material.total) || 0,
        materialCatalogoId: material.materialCatalogoId || null
      }));
      cotizacion.descripcionTrabajo = descripcion || '';

      if (imagenesCotizacion.length > 0) {
        cotizacion.imagenesCotizacion = imagenesCotizacion;
      }

      await cotizacion.save();

    } else {
      // Crear nueva cotización
      cotizacion = new Cotizacion({
        cita: citaId,
        contratista: contratistaId,
        manoDeObra: parseFloat(manoDeObra) || 0,
        materiales: materiales.map(material => ({
          nombre: material.nombre,
          descripcion: material.descripcion || '',
          cantidad: parseFloat(material.cantidad) || 0,
          precioPorUnidad: parseFloat(material.precio) || 0,
          total: parseFloat(material.total) || 0,
          materialCatalogoId: material.materialCatalogoId || null
        })),
        descripcionTrabajo: descripcion || '',
        imagenesCotizacion,
        estado: 'enviada'
      });

      await cotizacion.save();

      // Agregar cotización al array de la cita
      cita.cotizaciones.push(cotizacion._id);
    }

    // Actualizar estado de la cita
    if (cita.estado === 'solicitada' || cita.estado === 'atendida') {
      cita.estado = 'cotizada';
    }

    await cita.save();

    // Enviar email de cotización al cliente
    enviarEmailCitaCotizada({
      cita,
      cliente: cita.cliente,
      servicio: cita.servicio,
      cotizacion: {
        total: cotizacion.total,
        items: cotizacion.materiales
      }
    }).catch(err => console.error('Error enviando email cotizacion:', err));

    return NextResponse.json({
      message: 'Cotización enviada exitosamente',
      cotizacion: {
        _id: cotizacion._id,
        total: cotizacion.total,
        subtotal: cotizacion.subtotal,
        iva: cotizacion.iva,
        manoDeObra: cotizacion.manoDeObra,
        costoMateriales: cotizacion.costoMateriales,
        descripcionTrabajo: cotizacion.descripcionTrabajo,
        estado: cotizacion.estado,
        materiales: cotizacion.materiales
      },
      citaEstado: 'cotizada'
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear cotización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}