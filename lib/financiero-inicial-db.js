// lib/financiero-inicial-db.js
// Configuración del modelo financiero inicial en la base (Configuracion clave 'financiera-inicial').
// El servidor SIEMPRE lee los porcentajes por aquí: nunca fijos en el código.
import Configuracion from '@/models/Configuracion';
import { FINANCIERO_INICIAL, normalizarConfigInicial } from '@/lib/financiero-inicial';

export const CLAVE_FINANCIERA_INICIAL = 'financiera-inicial';

export async function getConfigInicial() {
  try {
    const doc = await Configuracion.findOne({ clave: CLAVE_FINANCIERA_INICIAL }).lean();
    if (doc?.valor) return normalizarConfigInicial(doc.valor);
  } catch (error) {
    console.error('Error leyendo la configuración financiera inicial, usando defaults:', error);
  }
  return { ...FINANCIERO_INICIAL };
}

/** Guarda un override (lanza Error si es inválido). Aplica a servicios NUEVOS: los cerrados conservan su snapshot. */
export async function setConfigInicial(valor, userId) {
  const normalizado = normalizarConfigInicial(valor);
  await Configuracion.findOneAndUpdate(
    { clave: CLAVE_FINANCIERA_INICIAL },
    { $set: { valor: normalizado, actualizadoPor: userId || undefined } },
    { upsert: true }
  );
  return normalizado;
}
