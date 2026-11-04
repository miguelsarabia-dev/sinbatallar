import { NextResponse } from 'next/server';
import { uploadMultipleImages } from '@/lib/cloudinary';
import { requireSession } from '@/lib/session';
import { leerImagenes } from '@/lib/upload';

// POST: sube hasta 10 imágenes (imagen_0, imagen_1...) a Cloudinary. Requiere token (contratista/técnico).
export async function POST(request) {
  try {
    const { error } = await requireSession(request, ['contratista', 'tecnico']);
    if (error) return error;

    const formData = await request.formData();
    const { imagenes, error: errorImagenes } = leerImagenes(formData);
    if (errorImagenes) return errorImagenes;

    const uploadResults = await uploadMultipleImages(imagenes, {
      folder: 'sinbatallar/citas/cotizaciones',
      quality: 'auto:good',
      transformation: {
        width: 1200,
        height: 1200,
        crop: 'limit'
      }
    });

    const urls = uploadResults.map(r => r.url);

    return NextResponse.json({ urls, success: true });
  } catch (error) {
    console.error('Error subiendo imágenes (cotizacion-images):', error);
    return NextResponse.json({ error: 'No se pudieron subir las imágenes' }, { status: 500 });
  }
}
