import { NextResponse } from 'next/server';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imagen = formData.get('foto');
    const userId = formData.get('userId');
    
    if (!imagen || !userId) {
      return NextResponse.json({ 
        error: 'Imagen y userId son requeridos' 
      }, { status: 400 });
    }
    
    const uploadResult = await uploadImage(imagen, {
      folder: 'sinbatallar/usuarios/fotos-perfil',
      publicId: `user_${userId}`,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
