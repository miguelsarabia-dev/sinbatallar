// lib/ferreterias-publico.js
// Qué datos de una ferretería (y de su catálogo) salen en /api/ferreterias-por-zona. Lista blanca: nada de
// correo, foto, ids de usuario ni campos internos. Puro, para poder probarlo.

export const MAX_ZONAS_CONSULTA = 10;
export const MAX_MATERIALES_PREVIEW = 20;

export function ferreteriaPublica(f, user) {
  return {
    _id: f._id,
    nombreNegocio: f.nombreNegocio,
    telefono: f.telefono || user?.telefono || undefined,
    direccion: f.direccion,
    horario: f.horario,
    ubicacion: f.ubicacion,
    user: user ? { nombre: user.nombre, telefono: user.telefono } : undefined
  };
}

export function materialPublico(m) {
  return {
    _id: m._id,
    nombre: m.nombre,
    descripcion: m.descripcion,
    categoria: m.categoria,
    marca: m.marca,
    unidad: m.unidad,
    precio: m.precio,
    imagenUrl: m.imagenUrl,
    stock: m.stock ?? null
  };
}
