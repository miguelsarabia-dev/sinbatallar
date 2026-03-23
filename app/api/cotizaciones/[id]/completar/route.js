// app/api/cotizaciones/[id]/completar/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/mongoose';
import Cotizacion from '../../../../../models/Cotizacion';
import Cita from '../../../../../models/Cita';
import Contratista from '../../../../../models/Contratista';
import Comision from '../../../../../models/Comision';
import Area from '../../../../../models/Area';
import { enviarEmailsCitaCompletada } from '@/lib/email-service';

export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const { contratistaId } = await request.json();

    if (!contratistaId) {
      return NextResponse.json({
        error: 'ID del contratista requerido'
      }, { status: 400 });
    }

    // Verificar que el contratista existe
    const contratista = await Contratista.findById(contratistaId);
    if (!contratista) {
      return NextResponse.json({
        error: 'Contratista no encontrado'
      }, { status: 404 });
    }

    // Buscar la cotización
    const cotizacion = await Cotizacion.findById(id).populate('cita');

    if (!cotizacion) {
      return NextResponse.json({
        error: 'Cotización no encontrada'
      }, { status: 404 });
    }

    // Verificar que la cotización pertenece al contratista
    if (cotizacion.contratista.toString() !== contratistaId) {
      return NextResponse.json({
        error: 'No tienes permisos para completar esta cotización'
      }, { status: 403 });
    }

    // Verificar que la cotización está aceptada
    if (cotizacion.estado !== 'aceptada') {
      return NextResponse.json({
        error: 'Solo se pueden completar cotizaciones aceptadas'
      }, { status: 400 });
    }

    // NO cambiar el estado de la cotización (se mantiene como 'aceptada')
    // Solo actualizar la fecha de completado si existe el campo
    if (cotizacion.schema.paths.fechaCompletado) {
      cotizacion.fechaCompletado = new Date();
      await cotizacion.save();
    }

    // Actualizar el estado de la cita relacionada
    if (cotizacion.cita) {
      const cita = await Cita.findById(cotizacion.cita._id);
      if (cita) {
        cita.estado = 'completada';
        // Usar formato HH:MM para horaFin
        const now = new Date();
        cita.horaFin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        cita.historial.push({
          estado: 'completada',
          comentario: 'Trabajo completado por el contratista',
          fecha: new Date()
        });
        await cita.save();

        // Crear la Comisión (solo si no existe ya una para esta cita)
        const comisionExistente = await Comision.findOne({ cita: cita._id });
        if (!comisionExistente) {
          const costoMateriales = cotizacion.costoMateriales || cotizacion.materiales?.reduce((total, mat) => {
            return total + (Number(mat.total) || (Number(mat.cantidad) * Number(mat.precio)) || 0);
          }, 0) || 0;

          let areaId = cita.ubicacion?.zona;
          let area = null;
          if (areaId) {
            area = await Area.findById(areaId);
          }

          const distribucion = {
            plataforma: { porcentaje: 15 },
            contratista: {
              id: cotizacion.contratista,
              porcentaje: 85
            }
          };

          if (area && area.aperturador) {
            distribucion.aperturador = { id: area.aperturador, porcentaje: 2 };
          }

          if (contratista && contratista.incorporador) {
            distribucion.incorporador = { id: contratista.incorporador, porcentaje: 3 };
          }

          try {
            const comision = new Comision({
              cita: cita._id,
              cotizacion: cotizacion._id,
              totalServicio: cotizacion.total,
              subtotal: cotizacion.subtotal || (cotizacion.manoDeObra + costoMateriales),
              iva: cotizacion.iva || Math.round(((cotizacion.manoDeObra + costoMateriales) * 16) / 100),
              costoMateriales: costoMateriales,
              manoDeObra: cotizacion.manoDeObra || 0,
              distribucion: distribucion,
              estadoPago: 'disponible'
            });

            await comision.save();
            console.log('Comision creada exitosamente durante completar:', comision._id);
          } catch (error) {
            console.error('Error creando comision en completar:', error);
          }
        } else {
          console.log('Comision ya existe para cita:', cita._id);
        }
      }
    }

    // Cargar la cotización actualizada con datos poblados
    const cotizacionActualizada = await Cotizacion.findById(id)
      .populate('contratista', 'nombre email telefono direccion')
      .populate({
        path: 'cita',
        populate: [
          { path: 'cliente', select: 'nombre email telefono' },
          { path: 'servicio', select: 'nombre descripcion' }
        ]
      });

    // Enviar emails de servicio completado (no bloqueante)
    if (cotizacionActualizada?.cita?.cliente && cotizacionActualizada?.contratista) {
      enviarEmailsCitaCompletada({
        cita: cotizacionActualizada.cita,
        cliente: cotizacionActualizada.cita.cliente,
        contratista: cotizacionActualizada.contratista,
        servicio: cotizacionActualizada.cita.servicio,
        cotizacion: cotizacionActualizada
      }).catch(err => console.error('Error enviando emails cita completada:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Trabajo marcado como completado exitosamente',
      cotizacion: cotizacionActualizada
    });

  } catch (error) {
    console.error('Error al completar trabajo:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
