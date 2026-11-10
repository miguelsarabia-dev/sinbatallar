// lib/cuenta-empresa-datos.js
// Parte pura (sin base de datos) de la cuenta de la empresa.
export const cuentaVacia = { banco: '', numeroCuenta: '', clabe: '', nombreTitular: '' };

export function cuentaDesdeEnv(env = process.env) {
  return {
    banco: env.EMPRESA_BANCO || '',
    numeroCuenta: env.EMPRESA_CUENTA || '',
    clabe: env.EMPRESA_CLABE || '',
    nombreTitular: env.EMPRESA_TITULAR || ''
  };
}

/** Validación del alta/edición de la cuenta de la empresa. @returns {string|null} error */
export function errorCuentaEmpresa({ banco, numeroCuenta, clabe, nombreTitular } = {}) {
  for (const v of [banco, numeroCuenta, clabe, nombreTitular]) {
    if (typeof v !== 'string') return 'Datos inválidos';
  }
  if (!banco.trim() || !nombreTitular.trim()) return 'Banco y titular son obligatorios';
  if (!/^\d{18}$/.test(clabe.trim())) return 'La CLABE debe tener 18 dígitos numéricos';
  if (numeroCuenta.trim() && !/^\d+$/.test(numeroCuenta.trim())) return 'El número de cuenta debe ser numérico';
  return null;
}

