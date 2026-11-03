// lib/upload.js
// Validación común de subidas de imágenes (tipo y tamaño) para /api/upload/*.
import { NextResponse } from 'next/server';

export const MAX_BYTES = 8 * 1024 * 1024; // por imagen
export const MAX_IMAGENES = 10;
const MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

/** Devuelve un mensaje de error si el archivo no es una imagen válida; si es válido, null. */
export function errorDeImagen(file) {
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function' || !file.size) {
    return 'Archivo de imagen inválido';
  }
  const ext = (file.name || '').split('.').pop()?.toLowerCase();
  const ok = file.type ? MIME.includes(file.type.toLowerCase()) : EXT.includes(ext);
  if (!ok) return 'Formato no permitido. Usa JPG, PNG, WEBP o HEIC';
  if (file.size > MAX_BYTES) return 'La imagen excede el máximo de 8 MB';
  return null;
}

/** Lee imagen_0, imagen_1... del formData. @returns {{imagenes?: File[], error?: NextResponse}} */
export function leerImagenes(formData) {
  const imagenes = [];
  for (let i = 0; i < MAX_IMAGENES + 1 && formData.has(`imagen_${i}`); i++) {
    imagenes.push(formData.get(`imagen_${i}`));
  }
  if (imagenes.length === 0) return { error: NextResponse.json({ error: 'No se enviaron imagenes' }, { status: 400 }) };
  if (imagenes.length > MAX_IMAGENES) {
    return { error: NextResponse.json({ error: `Máximo ${MAX_IMAGENES} imágenes` }, { status: 400 }) };
  }
  for (const img of imagenes) {
    const err = errorDeImagen(img);
    if (err) return { error: NextResponse.json({ error: err }, { status: 400 }) };
  }
  return { imagenes };
}
