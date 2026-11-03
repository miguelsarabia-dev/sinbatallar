// lib/rate-limit.js
// Límite de intentos de login respaldado en Mongo (sirve entre instancias serverless).
import LoginIntento from '@/models/LoginIntento';

export const VENTANA_MS = 15 * 60 * 1000;
export const MAX_INTENTOS_IP = 30;      // intentos de login (buenos o malos) por IP en la ventana
export const MAX_FALLOS_CUENTA = 5;     // fallos por cuenta en la ventana

export function ipDeLaPeticion(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'desconocida';
}

async function contar(clave) {
  const doc = await LoginIntento.findOne({ clave, expiraEn: { $gt: new Date() } }).select('intentos').lean();
  return doc?.intentos || 0;
}

/** Suma 1 al contador (la ventana empieza en el primer intento). */
async function sumar(clave) {
  const ahora = new Date();
  const doc = await LoginIntento.findOneAndUpdate(
    { clave, expiraEn: { $gt: ahora } },
    { $inc: { intentos: 1 } },
    { new: true }
  );
  if (doc) return doc.intentos;
  try {
    await LoginIntento.findOneAndUpdate(
      { clave },
      { $set: { intentos: 1, expiraEn: new Date(ahora.getTime() + VENTANA_MS) } },
      { upsert: true }
    );
  } catch (e) {
    if (e?.code !== 11000) throw e;
  }
  return 1;
}

/** ¿Está bloqueado este intento? Devuelve segundos a esperar o 0. */
export async function bloqueadoPor({ ip, cuenta }) {
  const [porIp, porCuenta] = await Promise.all([contar(`ip:${ip}`), cuenta ? contar(`cuenta:${cuenta}`) : 0]);
  return porIp >= MAX_INTENTOS_IP || porCuenta >= MAX_FALLOS_CUENTA ? Math.ceil(VENTANA_MS / 1000) : 0;
}

export const registrarIntento = (ip) => sumar(`ip:${ip}`);
export const registrarFallo = (cuenta) => (cuenta ? sumar(`cuenta:${cuenta}`) : null);
export const limpiarFallos = (cuenta) => (cuenta ? LoginIntento.deleteOne({ clave: `cuenta:${cuenta}` }) : null);
