// app/api/citas/[id]/finalizar/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Cotizacion from '@/models/Cotizacion';
import Comision from '@/models/Comision';
import Contratista from '@/models/Contratista';
import Area from '@/models/Area';
import { enviarEmailsCitaCompletada } from '@/lib/email-service';

export async function PUT(request, { params }) {
  try {



    await connectDB();

    const { id } = await params;
    const { comentario } = await request.json();

    // Verificar que es un técnico autorizado


    // Buscar la cita
    const cita = await Cita.findById(id).populate('cotizacion');

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // Verificar que la cita pertenece al técnico


    // Verificar que la cita está en progreso
    if (cita.estado !== 'en_progreso') {
      return NextResponse.json({ error: 'Solo se pueden finalizar citas en progreso' }, { status: 400 });
    }

    // Actualizar el estado de la cita
    cita.estado = 'completada';

    // Usar formato HH:MM para horaFin
    const now = new Date();
    cita.horaFin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Agregar entrada al historial
    const entradaHistorial = {
      estado: 'completada',
      comentario: comentario || 'Servicio completado por el técnico',
      fecha: new Date()
    };



    cita.historial.push(entradaHistorial);
    await cita.save();

    // Si hay una cotización asociada, NO cambiar su estado (se mantiene como 'aceptada')
    // La cotización ya completó su ciclo al ser aceptada

    // Calculate commission if quote exists
    if (cita.cotizacionAceptada) {
      const cotizacion = await Cotizacion.findById(cita.cotizacionAceptada);
      if (cotizacion) {
        // Verificar que no exista ya una comision para esta cita
        const comisionExistente = await Comision.findOne({ cita: cita._id });
        if (!comisionExistente) {
          const costoMateriales = cotizacion.costoMateriales || cotizacion.materiales?.reduce((total, mat) => {
            return total + (Number(mat.total) || (Number(mat.cantidad) * Number(mat.precio)) || 0);
          }, 0) || 0;

          // Obtener el contratista para ver su incorporador
          const contratista = await Contratista.findById(cotizacion.contratista);

          // Obtener el area para ver su aperturador
          let areaId = cita.ubicacion?.zona;
          let area = null;
          if (areaId) {
            area = await Area.findById(areaId);
          }

          // Preparar el objeto de distribucion
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
            console.log('Comision creada exitosamente durante finalizacion:', comision._id);
          } catch (error) {
            console.error('Error creando comision en finalizar:', error);
          }
        } else {
          console.log('Comision ya existe para cita:', cita._id);
        }
      }
    }

    // Cargar la cita actualizada con datos poblados
    const citaActualizada = await Cita.findById(id)
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono')
      .populate('servicio', 'nombre descripcion')
      .populate('cotizacionAceptada');

    // Enviar emails de servicio completado (no bloqueante)
    enviarEmailsCitaCompletada({
      cita: citaActualizada,
      cliente: citaActualizada.cliente,
      contratista: citaActualizada.contratista,
      servicio: citaActualizada.servicio,
      cotizacion: citaActualizada.cotizacionAceptada
    }).catch(err => console.error('Error enviando emails cita completada:', err));

    return NextResponse.json({
      success: true,
      message: 'Servicio finalizado exitosamente',
      cita: citaActualizada
    });

  } catch (error) {
    console.error('Error al finalizar servicio:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
