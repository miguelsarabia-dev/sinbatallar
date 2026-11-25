// Login sin selector de rol (puro, sin BD): decide con qué cuenta entra una persona.
// Hay dos colecciones con credenciales: User (cliente, admin, técnico, ferretero, especialista, …) y Contratista.
// El login busca en ambas con el mismo correo/teléfono y se queda con la que coincide la contraseña.

/**
 * ¿El login debe detectar la cuenta? Solo si no viene `userType` (clientes nuevos).
 * Con `userType` se respeta el comportamiento anterior, para no romper la app instalada.
 */
export const detectarCuenta = (userType) => userType === undefined || userType === null || userType === '' || userType === 'auto';

export const ETIQUETA_CUENTA = { usuario: 'Cliente / mi cuenta', contratista: 'Contratista' };

/**
 * @param {object} p
 * @param {boolean} p.usuarioValida     la contraseña coincide con la cuenta User
 * @param {boolean} p.contratistaValida la contraseña coincide con la cuenta Contratista
 * @param {boolean} [p.usuarioAscendido] la cuenta User es de un especialista/aspirante que ya ascendió a contratista
 * @param {string}  [p.elegida]          'usuario' | 'contratista' cuando la persona ya eligió (tiene ambas)
 * @returns {{cuenta:'usuario'|'contratista'} | {elegir:('usuario'|'contratista')[]} | null}
 *   null = credenciales inválidas; elegir = tiene las dos cuentas con la misma contraseña y debe escoger.
 */
export function resolverCuentaLogin({ usuarioValida, contratistaValida, usuarioAscendido = false, elegida }) {
  if (!usuarioValida && !contratistaValida) return null;
  if (usuarioValida && !contratistaValida) return { cuenta: 'usuario' };
  if (!usuarioValida && contratistaValida) return { cuenta: 'contratista' };
  // Ambas coinciden
  if (usuarioAscendido) return { cuenta: 'contratista' }; // su cuenta vigente es la de contratista
  if (elegida === 'usuario' || elegida === 'contratista') return { cuenta: elegida };
  return { elegir: ['usuario', 'contratista'] };
}
