// lib/migrar-asociado.js
// Plan (puro, sin BD) de la migración "incorporador" -> "asociado". Lo aplica scripts/migrar-asociado.mjs.
//
// Va en DOS partes porque la app móvil instalada todavía decide sus pantallas con el rol 'incorporador':
//   datos -> colección y campos (incorporadors -> asociados, Contratista.incorporador -> asociado,
//            Comision.distribucion.incorporador -> asociado, Configuracion financiera INCORPORATOR -> ASOCIADO).
//            Se corre JUSTO al publicar la web nueva: el código nuevo ya lee los nombres nuevos.
//   roles -> User.role 'incorporador' -> 'asociado'. Se corre DESPUÉS de publicar la app móvil que entiende 'asociado'.
//            Antes de eso la app instalada mandaría a esos usuarios a las pantallas de cliente.

export const PARTES = ['datos', 'roles'];

/**
 * @param {object} estado conteos actuales de la base
 * @param {number} estado.perfilesIncorporador docs en la colección `incorporadors`
 * @param {number} estado.perfilesAsociado docs en la colección `asociados`
 * @param {number} [estado.perfilesSolapados] usuarios con perfil en las dos colecciones
 * @param {number} estado.contratistasConCampoAnterior contratistas con `incorporador` y sin `asociado`
 * @param {number} estado.contratistasConAmbos contratistas con los dos campos (conflicto)
 * @param {number} estado.comisionesConCampoAnterior comisiones con `distribucion.incorporador`
 * @param {boolean} estado.configConClaveAnterior la configuración financiera tiene INCORPORATOR
 * @param {number} estado.usuariosConRolAnterior usuarios con role 'incorporador'
 * @param {string[]} partes partes a correr
 * @returns {{ok:boolean, pasos:Array<{parte:string, accion:string, cantidad:number}>, bloqueos:string[]}}
 */
export function planMigracionAsociado(estado, partes = PARTES) {
  const pasos = [];
  const bloqueos = [];

  if (partes.includes('datos')) {
    if (estado.perfilesIncorporador > 0 && estado.perfilesAsociado > 0) {
      // Ya hay asociados nuevos (dados de alta con el código nuevo): se juntan si no hay el mismo usuario en ambas
      if (estado.perfilesSolapados > 0) {
        bloqueos.push(`${estado.perfilesSolapados} usuario(s) tienen perfil en incorporadors y en asociados: revísalos a mano antes de migrar`);
      } else {
        pasos.push({ parte: 'datos', accion: 'fusionar incorporadors en asociados (la anterior queda como incorporadors_respaldo)', cantidad: estado.perfilesIncorporador });
      }
    } else if (estado.perfilesIncorporador > 0) {
      pasos.push({ parte: 'datos', accion: 'renombrar colección incorporadors -> asociados', cantidad: estado.perfilesIncorporador });
    }
    if (estado.contratistasConAmbos > 0) {
      bloqueos.push(`${estado.contratistasConAmbos} contratista(s) tienen los campos incorporador y asociado a la vez`);
    }
    if (estado.contratistasConCampoAnterior > 0) {
      pasos.push({ parte: 'datos', accion: 'Contratista.incorporador -> asociado', cantidad: estado.contratistasConCampoAnterior });
    }
    if (estado.comisionesConCampoAnterior > 0) {
      pasos.push({ parte: 'datos', accion: 'Comision.distribucion.incorporador -> distribucion.asociado', cantidad: estado.comisionesConCampoAnterior });
    }
    if (estado.configConClaveAnterior) {
      pasos.push({ parte: 'datos', accion: 'Configuracion financiera INCORPORATOR -> ASOCIADO', cantidad: 1 });
    }
  }

  if (partes.includes('roles') && estado.usuariosConRolAnterior > 0) {
    pasos.push({ parte: 'roles', accion: "User.role 'incorporador' -> 'asociado'", cantidad: estado.usuariosConRolAnterior });
  }

  return { ok: bloqueos.length === 0, pasos, bloqueos };
}
