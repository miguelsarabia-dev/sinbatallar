// lib/reparar-perfiles.js
// Plan (puro, sin base de datos) para reparar cuentas con rol aperturador/incorporador que no tienen su perfil,
// y zonas cuyo `aperturador` apunta a un USUARIO en lugar de a su perfil Aperturador. Lo usa scripts/reparar-perfiles.mjs.

/**
 * @param {object} d
 * @param {Array<{_id, role}>} d.usuarios usuarios con rol aperturador o incorporador
 * @param {Array<{_id, user}>} d.perfilesAperturador
 * @param {Array<{_id, user}>} d.perfilesIncorporador
 * @param {Array<{_id, aperturador}>} d.areas zonas con `aperturador` distinto de null
 */
export function planificarReparacion({ usuarios, perfilesAperturador, perfilesIncorporador, areas }) {
  const conPerfilAperturador = new Set(perfilesAperturador.map(p => String(p.user)));
  const conPerfilIncorporador = new Set(perfilesIncorporador.map(p => String(p.user)));
  const idsPerfilAperturador = new Set(perfilesAperturador.map(p => String(p._id)));
  const perfilDeUsuario = Object.fromEntries(perfilesAperturador.map(p => [String(p.user), String(p._id)]));
  const aperturadores = usuarios.filter(u => u.role === 'aperturador');

  const crearAperturador = aperturadores.filter(u => !conPerfilAperturador.has(String(u._id))).map(u => String(u._id));
  const crearIncorporador = usuarios.filter(u => u.role === 'incorporador' && !conPerfilIncorporador.has(String(u._id))).map(u => String(u._id));

  // Zonas antiguas: aperturador = id de usuario (con rol aperturador) y no id de un perfil
  const idsUsuarioAperturador = new Set(aperturadores.map(u => String(u._id)));
  const reasignarAreas = areas
    .filter(a => a.aperturador && !idsPerfilAperturador.has(String(a.aperturador)) && idsUsuarioAperturador.has(String(a.aperturador)))
    .map(a => ({
      areaId: String(a._id),
      deUserId: String(a.aperturador),
      // null = el perfil aún no existe (se crea al aplicar y entonces se reasigna)
      aPerfilId: perfilDeUsuario[String(a.aperturador)] || null
    }));

  // Zonas cuyo aperturador no es perfil ni usuario aperturador: no se tocan, se reportan
  const huerfanas = areas
    .filter(a => a.aperturador && !idsPerfilAperturador.has(String(a.aperturador)) && !idsUsuarioAperturador.has(String(a.aperturador)))
    .map(a => String(a._id));

  return { crearAperturador, crearIncorporador, reasignarAreas, huerfanas };
}
