// app/api/servicios-programables/solicitar/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Contratista from '@/models/Contratista';
import Servicio from '@/models/Servicio';
import User from '@/models/User';
import { uploadMultipleImages } from '@/lib/cloudinary';
import { resolverAreaId } from '@/lib/geo-utils';

// POST: Solicitar un servicio programable
export async function POST(request) {
  try {
    await connectDB();

    const formData = await request.formData();

    // Extraer datos del FormData
    const clienteId = formData.get('clienteId');
    const servicioId = formData.get('servicioId');
    const contratistaId = formData.get('contratistaId');
    const descripcionProblema = formData.get('descripcionProblema');
    const ubicacionStr = formData.get('ubicacionServicio');
    const fechaPreferida = formData.get('fechaPreferida');

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
    if (!clienteId || !servicioId || !contratistaId || !descripcionProblema) {
      return NextResponse.json(
        { error: 'Campos requeridos: clienteId, servicioId, contratistaId, descripcionProblema' },
        { status: 400 }
      );
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

    // Verificar contratista
    const contratista = await Contratista.findById(contratistaId);
    if (!contratista) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    if (!contratista.servicios.includes(servicioId)) {
      return NextResponse.json({ error: 'El contratista no ofrece este servicio' }, { status: 400 });
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
    ubicacionProcesada.zona = await resolverAreaId(ubicacionProcesada.coordenadas);

    // Crear cita
    const nuevaCita = new Cita({
      cliente: clienteId,
      contratista: contratistaId,
      servicio: servicioId,
      descripcionProblema,
      ubicacion: ubicacionProcesada,
      imagenesProblema,
      fechaProgramada: fechaPreferida ? new Date(fechaPreferida) : null,
      estado: 'solicitada'
    });

    await nuevaCita.save();

    await nuevaCita.populate([
      { path: 'cliente', select: 'nombre email telefono' },
      { path: 'contratista', select: 'nombre email telefono' },
      { path: 'servicio', select: 'nombre descripcion categoria' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada. El contratista preparará una cotización.',
      cita: {
        _id: nuevaCita._id,
        estado: nuevaCita.estado,
        cliente: nuevaCita.cliente,
        contratista: nuevaCita.contratista,
        servicio: nuevaCita.servicio,
        fechaProgramada: nuevaCita.fechaProgramada
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
