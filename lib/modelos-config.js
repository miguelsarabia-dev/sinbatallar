// lib/modelos-config.js
// Lectura/escritura del interruptor de modelos en la base (la parte pura está en lib/modelos-negocio.js).
import Configuracion from '@/models/Configuracion';
import { CLAVE_MODELOS, MODELOS_DEFAULT, normalizarModelos } from '@/lib/modelos-negocio';

export async function getModelosConfig() {
  try {
    const doc = await Configuracion.findOne({ clave: CLAVE_MODELOS }).lean();
    return normalizarModelos(doc?.valor);
  } catch (error) {
    console.error('Error leyendo la configuración de modelos, usando defaults:', error);
    return { ...MODELOS_DEFAULT };
  }
}

export async function setModelosConfig(valor, userId) {
  const normalizado = normalizarModelos(valor);
  await Configuracion.findOneAndUpdate(
    { clave: CLAVE_MODELOS },
    { $set: { valor: normalizado, actualizadoPor: userId || undefined } },
    { upsert: true }
  );
  return normalizado;
}
