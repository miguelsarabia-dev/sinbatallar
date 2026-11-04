// lib/push.js
// Notificaciones push con Expo. Nunca lanza: un fallo de push no debe romper la operación de negocio.
import Dispositivo from '@/models/Dispositivo';

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const LOTE = 100;
export const TOKEN_EXPO = /^(Exponent|Expo)PushToken\[[^\]]+\]$/;

/**
 * @param {Array<string|object>} userIds ids de sesión (Contratista._id o User._id); se ignoran vacíos y repetidos
 * @param {{titulo:string, cuerpo:string, data?:object}} mensaje data lleva {tipo, citaId?...}
 * @returns {Promise<{enviados:number}>}
 */
export async function enviarPush(userIds, { titulo, cuerpo, data = {} }) {
  try {
    const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
    if (ids.length === 0) return { enviados: 0 };

    const dispositivos = await Dispositivo.find({ user: { $in: ids }, activo: true }).select('token').lean();
    const tokens = dispositivos.map(d => d.token).filter(t => TOKEN_EXPO.test(t));
    let enviados = 0;

    for (let i = 0; i < tokens.length; i += LOTE) {
      const lote = tokens.slice(i, i + LOTE);
      try {
        const res = await fetch(EXPO_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(lote.map(to => ({ to, title: titulo, body: cuerpo, data, sound: 'default', priority: data.urgente ? 'high' : 'default' })))
        });
        const json = await res.json().catch(() => null);
        const tickets = Array.isArray(json?.data) ? json.data : [];
        const invalidos = [];
        tickets.forEach((t, idx) => {
          if (t?.status === 'ok') enviados++;
          else if (t?.details?.error === 'DeviceNotRegistered') invalidos.push(lote[idx]);
        });
        if (invalidos.length) await Dispositivo.updateMany({ token: { $in: invalidos } }, { activo: false });
      } catch (error) {
        console.error('Error enviando lote push:', error.message);
      }
    }
    return { enviados };
  } catch (error) {
    console.error('Error en enviarPush:', error.message);
    return { enviados: 0 };
  }
}
