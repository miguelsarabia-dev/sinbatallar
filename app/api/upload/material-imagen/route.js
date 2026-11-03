import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';
import { requireSession } from '@/lib/session';
import { errorDeImagen } from '@/lib/upload';

// POST: imagen de un material del catálogo del ferretero autenticado.
export async function POST(request) {
  try {
    const { session, error } = await requireSession(request, ['ferretero']);
    if (error) return error;

    const formData = await request.formData();
    const imagen = formData.get('imagen');

    const errorImagen = errorDeImagen(imagen);
    if (errorImagen) {
      return NextResponse.json({ error: errorImagen }, { status: 400 });
    }

    // El publicId lo decide el servidor (el del cliente permitiría sobrescribir imágenes ajenas)
    const uploadResult = await uploadImage(imagen, {
      folder: 'sinbatallar/ferreteria/materiales',
      publicId: `material_${session.id}_${Date.now()}`,
      quality: 'auto:good',
      transformation: { width: 800, height: 800, crop: 'limit' }
    });

    return NextResponse.json({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      success: true
    });
  } catch (error) {
    console.error('Error subiendo imagen de material:', error);
    return NextResponse.json({ error: 'No se pudo subir la imagen' }, { status: 500 });
  }
}
