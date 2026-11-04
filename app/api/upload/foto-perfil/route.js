import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';
import { requireSession } from '@/lib/session';
import { errorDeImagen } from '@/lib/upload';

// POST: foto de perfil del usuario autenticado (el userId sale del token).
export async function POST(request) {
  try {
    const { session, error } = await requireSession(request);
    if (error) return error;

    const formData = await request.formData();
    const imagen = formData.get('foto');

    const errorImagen = errorDeImagen(imagen);
    if (errorImagen) {
      return NextResponse.json({ error: errorImagen }, { status: 400 });
    }

    const uploadResult = await uploadImage(imagen, {
      folder: 'sinbatallar/usuarios/fotos-perfil',
      publicId: `user_${session.id}`,
      quality: 'auto:good',
      transformation: {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face'
      }
    });

    return NextResponse.json({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      success: true
    });
  } catch (error) {
    console.error('Error subiendo foto de perfil:', error);
    return NextResponse.json({ error: 'No se pudo subir la imagen' }, { status: 500 });
  }
}
