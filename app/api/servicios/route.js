//app/api/servicios/route.js
import { connectDB } from '@/lib/mongoose';
import Servicio from '@/models/Servicio';
import { NextResponse } from 'next/server';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

// PUT: Editar un servicio existente
export async function PUT(request) {
  await connectDB();
  const contentType = request.headers.get('content-type') || '';
  let updateData = {};

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    updateData._id = formData.get('_id');
    updateData.nombre = formData.get('nombre');
    updateData.descripcion = formData.get('descripcion');
    updateData.categoria = formData.get('categoria');
    updateData.tipo = formData.get('tipo');


    // OPTIMIZADO: Subir imagen a Cloudinary en lugar de Buffer
    const imagen = formData.get('imagen');
    if (imagen && typeof imagen.arrayBuffer === 'function' && imagen.size > 0) {
      try {
        // Obtener servicio actual para eliminar imagen anterior si existe
        const servicioActual = await Servicio.findById(updateData._id);
        if (servicioActual?.imagenPublicId) {
          await deleteImage(servicioActual.imagenPublicId).catch(err =>
            console.warn('No se pudo eliminar imagen anterior:', err)
          );
        }

        // Subir nueva imagen
        const uploadResult = await uploadImage(imagen, {
          folder: 'sinbatallar/servicios',
          publicId: `servicio_${updateData._id}`,
          quality: 'auto:good',
          transformation: {
            width: 800,
            height: 600,
            crop: 'limit'
          }
        });

        updateData.imagenUrl = uploadResult.url;
        updateData.imagenPublicId = uploadResult.publicId;
        updateData.imagen = undefined; // Eliminar buffer si existe
      } catch (error) {
        console.error('Error subiendo imagen a Cloudinary:', error);
        return NextResponse.json({
          error: 'Error al subir imagen',
          details: error.message
        }, { status: 500 });
      }
    }
  } else {
    updateData = await request.json();
  }

  try {
    const { _id, ...rest } = updateData;
    const servicio = await Servicio.findByIdAndUpdate(_id, rest, { new: true })
      .select('-imagen'); // No retornar campo imagen antiguo

    if (!servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    return NextResponse.json(servicio);
  } catch (error) {
    return NextResponse.json({
      error: 'Error al actualizar servicio',
      details: error.message
    }, { status: 400 });
  }
}

// DELETE: Eliminar un servicio existente
export async function DELETE(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  try {
    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    // Eliminar imagen de Cloudinary si existe
    if (servicio.imagenPublicId) {
      await deleteImage(servicio.imagenPublicId).catch(err =>
        console.warn('No se pudo eliminar imagen de Cloudinary:', err)
      );
    }

    await Servicio.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Servicio eliminado' });
  } catch (error) {
    return NextResponse.json({
      error: 'Error al eliminar servicio',
      details: error.message
    }, { status: 400 });
  }
}

// GET: Listar todos los servicios o uno por ID (OPTIMIZADO)
export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    // OPTIMIZADO: Si se pide un servicio por ID (JSON)
    if (id) {
      const servicio = await Servicio.findById(id)
        .select('-imagen'); // No enviar buffer de imagen

      if (!servicio) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      }

      return NextResponse.json(servicio);
    }

    // OPTIMIZADO: Listar todos los servicios SIN el campo imagen
    const servicios = await Servicio.find({})
      .select('-imagen') // Excluir buffer de imagen
      .lean(); // Mejor rendimiento

    return NextResponse.json(servicios);
  } catch (error) {
    return NextResponse.json({
      error: 'Error al obtener servicios',
      details: error.message
    }, { status: 500 });
  }
}

// POST: Crear un nuevo servicio
export async function POST(request) {
  await connectDB();
  const contentType = request.headers.get('content-type') || '';
  let data = {};

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    data.nombre = formData.get('nombre');
    data.descripcion = formData.get('descripcion');
    data.categoria = formData.get('categoria');
    data.tipo = formData.get('tipo');


    // OPTIMIZADO: Subir imagen a Cloudinary
    const imagen = formData.get('imagen');
    if (imagen && typeof imagen.arrayBuffer === 'function' && imagen.size > 0) {
      try {
        const uploadResult = await uploadImage(imagen, {
          folder: 'sinbatallar/servicios',
          quality: 'auto:good',
          transformation: {
            width: 800,
            height: 600,
            crop: 'limit'
          }
        });

        data.imagenUrl = uploadResult.url;
        data.imagenPublicId = uploadResult.publicId;
      } catch (error) {
        console.error('Error subiendo imagen a Cloudinary:', error);
        return NextResponse.json({
          error: 'Error al subir imagen',
          details: error.message
        }, { status: 500 });
      }
    }
  } else {
    data = await request.json();
  }

  try {
    const nuevoServicio = await Servicio.create(data);
    // No retornar campo imagen
    const servicioResponse = nuevoServicio.toObject();
    delete servicioResponse.imagen;

    return NextResponse.json(servicioResponse, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      error: 'Error al crear servicio',
      details: error.message
    }, { status: 400 });
  }
}

