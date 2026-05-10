import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imagen = formData.get('imagen');
    const materialId = formData.get('materialId') || `material_${Date.now()}`;

    if (!imagen) {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
    }

    const uploadResult = await uploadImage(imagen, {
      folder: 'sinbatallar/ferreteria/materiales',
      publicId: materialId,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
