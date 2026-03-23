import { NextResponse } from 'next/server';
import { uploadMultipleImages } from '@/lib/cloudinary';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imagenes = [];
    
    let index = 0;
    while (formData.has(`imagen_${index}`)) {
      imagenes.push(formData.get(`imagen_${index}`));
      index++;
    }
    
    if (imagenes.length === 0) {
      return NextResponse.json({ error: 'No se enviaron imagenes' }, { status: 400 });
    }
    
    const uploadResults = await uploadMultipleImages(imagenes, {
      folder: 'sinbatallar/citas/fotos-despues',
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
    console.error('Error subiendo fotos despues del trabajo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
