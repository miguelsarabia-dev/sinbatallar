// app/api/servicios-programables/solicitar/route.js
import { NextResponse } from 'next/server';
import { enviarNotificacionCambioEstado } from '@/lib/email-service';

import { requireSession } from '@/lib/session';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Contratista from '@/models/Contratista';
import Servicio from '@/models/Servicio';
import User from '@/models/User';
import { uploadMultipleImages } from '@/lib/cloudinary';
import { resolverAreaId, areasQueContienen } from '@/lib/geo-utils';
import Especialista from '@/models/Especialista';
import { getModelosConfig } from '@/lib/modelos-config';
import { esSolicitudAbierta } from '@/lib/oferta-zona';
import { esObjectId } from '@/lib/sanitize';
import { citasPorLiquidar } from '@/lib/liquidacion-db';

// POST: Solicitar un servicio programable
export async function POST(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['cliente']);
    if (error) return error;

    // Forzar la liquidación: con un servicio terminado por el técnico sin liquidar no se pide otro
    const porLiquidar = await citasPorLiquidar(session.id);
    if (porLiquidar.length) {
      return NextResponse.json(
        { error: 'Tienes un servicio terminado pendiente de liquidar. Liquídalo para poder solicitar otro.', code: 'LIQUIDACION_PENDIENTE', citaIds: porLiquidar },
        { status: 409 }
      );
    }

    const formData = await request.formData();

    // Extraer datos del FormData
    const clienteId = session.id; // del token; el campo del formulario se ignora
    const servicioId = formData.get('servicioId');
    const contratistaId = formData.get('contratistaId');
    const descripcionProblema = formData.get('descripcionProblema');
    const ubicacionStr = formData.get('ubicacionServicio');
    const fechaPreferida = formData.get('fechaPreferida');
    const fechaProgramadaForm = formData.get('fechaProgramada');
    // La web manda horaPreferida; la app móvil, horaInicio
    const horaInicio = formData.get('horaInicio') || formData.get('horaPreferida');
    // Servicio urgente: la app manda esExpress='true'|'false'
    const esExpress = formData.get('esExpress') === 'true';

    // Procesar ubicación
    let ubicacionProcesada = {};
    if (ubicacionStr) {
      try {
        const ubicacionData = JSON.parse(ubicacionStr);

        // Soportar tanto 'direccionSeleccionada' como 'direccion' para compatibilidad
        const direccionFuente = ubicacionData.direccionSeleccionada || ubicacionData.direccion;

        if (direccionFuente) {
          const dir = direccionFuente;
          ubicacionProcesada = {
            calle: dir.calle || ''.trim(),
            numeroCasa: dir.numeroCasa || '',
            colonia: dir.colonia || '',
            municipio: dir.municipio || '',
            estado: dir.estado || '',
            codigoPostal: dir.codigoPostal || '',
            referencia: dir.referencia || '',
            coordenadas: dir.coordenadas || ubicacionData.coordenadas || {}
          };
        } else if (ubicacionData.nuevaDireccion) {
          const dir = ubicacionData.nuevaDireccion;
          ubicacionProcesada = {
            calle: dir.calle || ''.trim(),
            numeroCasa: dir.numeroCasa || '',
            colonia: dir.colonia || '',
            municipio: dir.municipio || '',
            estado: dir.estado || '',
            codigoPostal: dir.codigoPostal || '',
            referencia: dir.referencia || '',
            coordenadas: dir.coordenadas || {}
          };
        }
      } catch (e) {
        console.error('Error procesando ubicación:', e);
      }
    }

    // Validaciones
    if (!clienteId || !servicioId || !descripcionProblema) {
      return NextResponse.json(
        { error: 'Campos requeridos: servicioId, descripcionProblema' },
        { status: 400 }
      );
    }
    // Solicitud ABIERTA (contratistaId 'abierta' / 'auto' / vacío): la toma el primero que acepte (lib/oferta-zona.js)
    const abierta = esSolicitudAbierta(contratistaId);
    if (!abierta && !esObjectId(contratistaId)) {
      return NextResponse.json({ error: 'contratistaId inválido' }, { status: 400 });
    }

    // Verificar cliente
    const cliente = await User.findById(clienteId);
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Verificar servicio (ya no verificamos tipo porque fue eliminado)
    const servicio = await Servicio.findById(servicioId);
    if (!servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    // Contratista elegido (modelo permanente): solo si el admin activó ese modelo
    let contratista = null;
    if (!abierta) {
      const { permanenteActivo } = await getModelosConfig();
      if (!permanenteActivo) {
        return NextResponse.json({ error: 'Por ahora los servicios los atienden especialistas: envía la solicitud sin elegir contratista' }, { status: 409 });
      }
      contratista = await Contratista.findById(contratistaId);
      if (!contratista) {
        return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
      }
      if (!contratista.servicios.map(String).includes(String(servicioId))) {
        return NextResponse.json({ error: 'El contratista no ofrece este servicio' }, { status: 400 });
      }
    }



    // Procesar imágenes
    const imagenesProblema = [];
    const imagenesArchivos = [];
    let imageIndex = 0;

    while (formData.has(`imagen_${imageIndex}`)) {
      const imagen = formData.get(`imagen_${imageIndex}`);
      if (imagen && imagen.size > 0) {
        imagenesArchivos.push(imagen);
      }
      imageIndex++;
    }

    if (imagenesArchivos.length > 0) {
      try {
        const uploadResults = await uploadMultipleImages(imagenesArchivos, {
          folder: 'sinbatallar/citas/problemas',
          quality: 'auto:good',
          transformation: { width: 1200, height: 1200, crop: 'limit' }
        });
        imagenesProblema.push(...uploadResults.map(r => r.url));
      } catch (error) {
        console.error('Error subiendo imágenes:', error);
      }
    }

    // Resolver la zona (Area) a partir de las coordenadas de la dirección seleccionada
    // (si cae en zonas encimadas, la del contratista elegido)
    if (contratista) {
      ubicacionProcesada.zona = await resolverAreaId(ubicacionProcesada.coordenadas, [
        ...(contratista.areasIds || []),
        contratista.areaId
      ]);
    } else {
      // Solicitud abierta: la zona (si hay varias encimadas, una donde algún especialista ofrezca el servicio)
      const zonas = await areasQueContienen(ubicacionProcesada.coordenadas, { soloActivas: true, select: '_id' });
      if (!zonas.length) {
        return NextResponse.json({ error: 'La dirección está fuera de nuestras zonas de servicio' }, { status: 400 });
      }
      const conEspecialista = await Especialista.findOne({
        activo: true, aprobado: true, disponible: { $ne: false },
        servicios: servicioId, areasIds: { $in: zonas.map(z => z._id) }
      }).select('areasIds').lean();
      if (!conEspecialista) {
        return NextResponse.json({ error: 'Por ahora no hay especialistas que ofrezcan este servicio en tu zona' }, { status: 409 });
      }
      const suyas = new Set((conEspecialista.areasIds || []).map(String));
      ubicacionProcesada.zona = (zonas.find(z => suyas.has(String(z._id))) || zonas[0])._id;
    }

    // fechaProgramada (si la app la manda) tiene prioridad sobre fechaPreferida
    const fechaTexto = fechaProgramadaForm || fechaPreferida;
    const fechaProgramadaValida = fechaTexto && !Number.isNaN(new Date(fechaTexto).getTime()) ? new Date(fechaTexto) : null;

    // Crear cita
    const nuevaCita = new Cita({
      cliente: clienteId,
      contratista: contratista?._id || null,
      servicio: servicioId,
      modelo: contratista ? 'permanente' : null,
      descripcionProblema,
      ubicacion: ubicacionProcesada,
      imagenesProblema,
      // Con contratista elegido (permanente) es la fecha del servicio. En la solicitud abierta (modelo inicial) es el
      // día que el cliente propone para que vayan a COTIZAR; el inicio del trabajo se acuerda después.
      ...(contratista
        ? {
          fechaProgramada: fechaProgramadaValida,
          ...(typeof horaInicio === 'string' && horaInicio.trim() ? { horaInicio: horaInicio.trim().slice(0, 10) } : {})
        }
        : {
          fechaVisita: fechaProgramadaValida,
          ...(typeof horaInicio === 'string' && horaInicio.trim() ? { horaVisita: horaInicio.trim().slice(0, 10) } : {})
        }),
      esExpress,
      estado: 'solicitada'
    });

    await nuevaCita.save();

    await nuevaCita.populate([
      { path: 'cliente', select: 'nombre email telefono' },
      { path: 'contratista', select: 'nombre email telefono' },
      { path: 'servicio', select: 'nombre descripcion categoria' }
    ]);

    // Aviso por email de cita nueva al contratista elegido (la solicitud abierta no tiene a quién avisar todavía)
    if (contratista) enviarNotificacionCambioEstado({
      nuevoEstado: 'solicitada',
      cita: nuevaCita,
      cliente: nuevaCita.cliente,
      contratista: nuevaCita.contratista,
      servicio: nuevaCita.servicio
    }).catch(err => console.error('Error enviando email de cita nueva:', err));

    return NextResponse.json({
      success: true,
      message: contratista
        ? 'Solicitud enviada. El contratista preparará una cotización.'
        : 'Solicitud enviada. Un especialista de tu zona la tomará y te visitará para cotizar sin costo.',
      cita: {
        _id: nuevaCita._id,
        estado: nuevaCita.estado,
        cliente: nuevaCita.cliente,
        contratista: nuevaCita.contratista,
        servicio: nuevaCita.servicio,
        fechaProgramada: nuevaCita.fechaProgramada,
        fechaVisita: nuevaCita.fechaVisita,
        horaVisita: nuevaCita.horaVisita,
        esExpress: nuevaCita.esExpress
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error al solicitar servicio:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: 'Error de validación', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
