// lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Sube una imagen a Cloudinary desde un buffer o archivo
 * @param {Buffer|File} file - Archivo o buffer de la imagen
 * @param {Object} options - Opciones adicionales
 * @param {string} options.folder - Carpeta en Cloudinary (ej: 'servicios', 'citas')
 * @param {string} options.publicId - ID público personalizado
 * @param {number} options.quality - Calidad de la imagen (1-100, default: auto)
 * @param {Object} options.transformation - Transformaciones adicionales
 * @returns {Promise<Object>} Resultado con URL y datos de la imagen
 */
export async function uploadImage(file, options = {}) {
  try {
    const {
      folder = 'sinbatallar',
      publicId,
      quality = 'auto',
      transformation = {}
    } = options;

    let uploadData;

    // Si es un File/Blob de FormData
    if (file.arrayBuffer) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const dataUri = `data:${file.type || 'image/jpeg'};base64,${base64}`;
      
      uploadData = await cloudinary.uploader.upload(dataUri, {
        folder,
        public_id: publicId,
        quality,
        ...transformation,
        resource_type: 'auto'
      });
    } 
    // Si es un Buffer directo
    else if (Buffer.isBuffer(file)) {
      const base64 = file.toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64}`;
      
      uploadData = await cloudinary.uploader.upload(dataUri, {
        folder,
        public_id: publicId,
        quality,
        ...transformation,
        resource_type: 'auto'
      });
    }
    // Si ya es una cadena base64
    else if (typeof file === 'string' && file.startsWith('data:')) {
      uploadData = await cloudinary.uploader.upload(file, {
        folder,
        public_id: publicId,
        quality,
        ...transformation,
        resource_type: 'auto'
      });
    }
    else {
      throw new Error('Formato de archivo no soportado');
    }

    return {
      success: true,
      url: uploadData.secure_url,
      publicId: uploadData.public_id,
      width: uploadData.width,
      height: uploadData.height,
      format: uploadData.format,
      bytes: uploadData.bytes
    };

  } catch (error) {
    console.error('Error subiendo imagen a Cloudinary:', error);
    throw new Error(`Error al subir imagen: ${error.message}`);
  }
}

/**
 * Sube múltiples imágenes a Cloudinary
 * @param {Array<Buffer|File>} files - Array de archivos o buffers
 * @param {Object} options - Opciones para todas las imágenes
 * @returns {Promise<Array>} Array de resultados
 */
export async function uploadMultipleImages(files, options = {}) {
  try {
    const uploadPromises = files.map((file, index) => 
      uploadImage(file, {
        ...options,
        publicId: options.publicId ? `${options.publicId}_${index}` : undefined
      })
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error subiendo múltiples imágenes:', error);
    throw error;
  }
}

/**
 * Elimina una imagen de Cloudinary
 * @param {string} publicId - ID público de la imagen en Cloudinary
 * @returns {Promise<Object>} Resultado de la eliminación
 */
export async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Error eliminando imagen de Cloudinary:', error);
    throw new Error(`Error al eliminar imagen: ${error.message}`);
  }
}

/**
 * Elimina múltiples imágenes de Cloudinary
 * @param {Array<string>} publicIds - Array de IDs públicos
 * @returns {Promise<Array>} Array de resultados
 */
export async function deleteMultipleImages(publicIds) {
  try {
    const deletePromises = publicIds.map(publicId => deleteImage(publicId));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error('Error eliminando múltiples imágenes:', error);
    throw error;
  }
}

/**
 * Obtiene una URL optimizada de una imagen de Cloudinary
 * @param {string} publicId - ID público de la imagen
 * @param {Object} options - Opciones de transformación
 * @returns {string} URL optimizada
 */
export function getOptimizedImageUrl(publicId, options = {}) {
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto'
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    fetch_format: format,
    secure: true
  });
}

/**
 * Extrae el publicId de una URL de Cloudinary
 * @param {string} url - URL completa de Cloudinary
 * @returns {string|null} Public ID o null si no es válida
 */
export function extractPublicId(url) {
  try {
    if (!url || typeof url !== 'string') return null;
    
    // Ejemplo: https://res.cloudinary.com/*clave*/image/upload/v1234567890/sinbatallar/servicios/imagen.jpg
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extrayendo publicId:', error);
    return null;
  }
}

export default cloudinary;
