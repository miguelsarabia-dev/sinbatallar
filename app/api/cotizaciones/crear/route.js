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
      tecnicoId = null,
      manoDeObra = 0,
      materiales = [],
      descripcion,
      imagenesCotizacion = []
    } = data;

    // Si la crea un técnico → pasa primero por revisión del contratista (no visible al cliente).
    // Si la crea el contratista directamente → nace visible al cliente.
    const estadoInicial = tecnicoId ? 'pendiente_contratista' : 'enviada';

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

    const materialesFormateados = materiales.map(material => {
      const cantidad = parseFloat(material.cantidad) || 0;
      // El cliente envía precioPorUnidad; aceptamos material.precio como alias legado.
      const precioPorUnidad = parseFloat(material.precioPorUnidad ?? material.precio) || 0;
      return {
        nombre: material.nombre,
        descripcion: material.descripcion || '',
        cantidad,
        precioPorUnidad,
        // total siempre se calcula en el backend, no se confía en el que envíe el cliente.
        total: cantidad * precioPorUnidad,
        materialCatalogoId: material.materialCatalogoId || null
      };
    });

    if (cotizacion) {
      // Actualizar cotización existente
      cotizacion.manoDeObra = parseFloat(manoDeObra) || 0;
      cotizacion.materiales = materialesFormateados;
      cotizacion.descripcionTrabajo = descripcion || '';
      cotizacion.tecnico = tecnicoId || cotizacion.tecnico;
      cotizacion.estado = estadoInicial;

      if (imagenesCotizacion.length > 0) {
        cotizacion.imagenesCotizacion = imagenesCotizacion;
      }

      await cotizacion.save();

    } else {
      // Crear nueva cotización
      cotizacion = new Cotizacion({
        cita: citaId,
        contratista: contratistaId,
        tecnico: tecnicoId,
        manoDeObra: parseFloat(manoDeObra) || 0,
        materiales: materialesFormateados,
        descripcionTrabajo: descripcion || '',
        imagenesCotizacion,
        estado: estadoInicial
      });

      await cotizacion.save();

      // Agregar cotización al array de la cita
      cita.cotizaciones.push(cotizacion._id);
    }

    // La cita solo avanza a 'cotizada' y se notifica al cliente cuando la cotización
    // es visible para él (estado 'enviada'). Si está en revisión del contratista, no.
    const visibleAlCliente = cotizacion.estado === 'enviada';

    if (visibleAlCliente && (cita.estado === 'solicitada' || cita.estado === 'atendida')) {
      cita.estado = 'cotizada';
    }

    await cita.save();

    if (visibleAlCliente) {
      enviarEmailCitaCotizada({
        cita,
        cliente: cita.cliente,
        servicio: cita.servicio,
        cotizacion: {
          total: cotizacion.total,
          items: cotizacion.materiales
        }
      }).catch(err => console.error('Error enviando email cotizacion:', err));
    }

    return NextResponse.json({
      message: visibleAlCliente
        ? 'Cotización enviada al cliente exitosamente'
        : 'Estimación enviada al contratista para revisión',
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
      citaEstado: cita.estado
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear cotización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}