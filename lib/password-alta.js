// lib/password-alta.js
// Validación de la contraseña que se asigna al DAR DE ALTA una cuenta en nombre de otra persona
// (p. ej. el incorporador registra a un contratista y le pone una contraseña temporal).
// La contraseña NUNCA se deriva de datos personales (CURP, teléfono, correo): son fáciles de adivinar.

export const PASSWORD_MIN = 6;
// bcrypt solo considera los primeros 72 bytes: más largo se truncaría en silencio
export const PASSWORD_MAX_BYTES = 72;

/** @returns {string|null} mensaje de error, o null si la contraseña es válida */
export function errorPasswordAlta(password) {
  if (password === undefined || password === null || password === '') {
    return 'La contraseña es obligatoria';
  }
  if (typeof password !== 'string') return 'Contraseña inválida';
  if (password.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return `La contraseña es demasiado larga (máximo ${PASSWORD_MAX_BYTES} bytes)`;
  return null;
}

/** ¿La contraseña coincide con un dato personal de la cuenta (CURP, teléfono, correo)? Se rechaza. */
export function passwordEsDatoPersonal(password, { curp, telefono, email } = {}) {
  if (typeof password !== 'string') return false;
  const p = password.trim().toLowerCase();
  return [curp, telefono, email].some(v => typeof v === 'string' && v.trim() && v.trim().toLowerCase() === p);
}
