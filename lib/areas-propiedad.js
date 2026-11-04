// lib/areas-propiedad.js
// ¿A quién pertenece una zona? (puro, sin base de datos)
// `Area.aperturador` debe guardar el _id del perfil Aperturador, pero la app móvil antigua mandaba el _id del
// USUARIO. Para no dejar a nadie sin sus zonas se aceptan ambos ids.

/** @param valor Area.aperturador (ObjectId, string o doc poblado) @param ids ids del dueño: perfil y usuario */
export function aperturadorCoincide(valor, ...ids) {
  if (!valor) return false;
  const actual = String(valor._id || valor);
  return ids.filter(Boolean).some(id => String(id) === actual);
}
