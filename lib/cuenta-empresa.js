// lib/cuenta-empresa.js
// Cuenta bancaria de Sin Batallar: TODOS los pagos de clientes entran a la empresa y ahí se reparte.
// Se guarda en Configuracion (clave 'cuentaEmpresa', la edita el admin); si no hay, se usan variables de entorno.
import Configuracion from '@/models/Configuracion';
import { cuentaVacia, cuentaDesdeEnv, errorCuentaEmpresa } from '@/lib/cuenta-empresa-datos';

export { errorCuentaEmpresa, cuentaDesdeEnv };

/** @returns {Promise<{banco:string,numeroCuenta:string,clabe:string,nombreTitular:string,configurada:boolean}>} */
export async function getCuentaEmpresa() {
  let cuenta = cuentaVacia;
  try {
    const doc = await Configuracion.findOne({ clave: 'cuentaEmpresa' }).lean();
    if (doc?.valor?.clabe) cuenta = { ...cuentaVacia, ...doc.valor };
  } catch (error) {
    console.error('Error leyendo la cuenta de la empresa:', error);
  }
  if (!cuenta.clabe) cuenta = cuentaDesdeEnv();
  return { ...cuenta, configurada: !!cuenta.clabe };
}
