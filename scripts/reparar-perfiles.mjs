// scripts/reparar-perfiles.mjs
// Repara datos antiguos de aperturadores e incorporadores:
//   1. crea el perfil (Aperturador / Incorporador) de cada usuario con ese rol que no lo tenga
//   2. reasigna las zonas cuyo `aperturador` apunta al id de un USUARIO (app móvil antigua) al id de su perfil
//
//   3. (opcional) --asignar-huerfanas-a <email>: asigna a ese aperturador las zonas que no tienen aperturador
//      (aperturador null), que ningún aperturador puede gestionar por diseño
//
// Uso:
//   MONGODB_URI="mongodb://..." node scripts/reparar-perfiles.mjs                        # dry-run (no escribe nada)
//   MONGODB_URI="mongodb://..." node scripts/reparar-perfiles.mjs --aplicar --base=NOMBRE # escribe
//   ... --asignar-huerfanas-a ap@correo.com [--aplicar --base=NOMBRE]
//
// --aplicar exige --base=<nombre de la base> igual al de la conexión, para no escribir en una base equivocada.
// Es idempotente: se puede correr varias veces.
import mongoose from 'mongoose';
import User from '../models/User.js';
import Aperturador from '../models/Aperturador.js';
import Incorporador from '../models/Incorporador.js';
import Area from '../models/Area.js';
import Configuracion from '../models/Configuracion.js';
import { planificarReparacion } from '../lib/reparar-perfiles.js';

const URI = process.env.MONGODB_URI;
const aplicar = process.argv.includes('--aplicar');
const baseConfirmada = (process.argv.find(a => a.startsWith('--base=')) || '').slice('--base='.length);

const idxHuerfanas = process.argv.findIndex(a => a === '--asignar-huerfanas-a' || a.startsWith('--asignar-huerfanas-a='));
const emailHuerfanas = idxHuerfanas < 0 ? null
  : (process.argv[idxHuerfanas].includes('=') ? process.argv[idxHuerfanas].split('=')[1] : process.argv[idxHuerfanas + 1]);

if (!URI) { console.error('Falta MONGODB_URI'); process.exit(1); }
if (idxHuerfanas >= 0 && (!emailHuerfanas || emailHuerfanas.startsWith('--'))) { console.error('--asignar-huerfanas-a necesita el email del aperturador'); process.exit(1); }
if (aplicar && process.argv.includes('--dry-run')) { console.error('--aplicar y --dry-run son excluyentes'); process.exit(1); }

await mongoose.connect(URI);
const nombreBase = mongoose.connection.name;
console.log(`Base: ${nombreBase} (${mongoose.connection.host})  modo: ${aplicar ? 'APLICAR' : 'dry-run (no escribe)'}`);

if (aplicar && baseConfirmada !== nombreBase) {
  console.error(`Para aplicar confirma la base: --base=${nombreBase}`);
  await mongoose.disconnect();
  process.exit(1);
}

// Porcentajes por defecto: los de la configuración financiera si existe, si no 2% y 3%
const config = (await Configuracion.findOne({ clave: 'financiera' }).lean())?.valor || {};
const pctAperturador = Number.isFinite(config.OPENER) ? config.OPENER : 2;
const pctIncorporador = Number.isFinite(config.INCORPORATOR) ? config.INCORPORATOR : 3;

const usuarios = await User.find({ role: { $in: ['aperturador', 'incorporador'] } }).select('_id role email nombre').lean();
const plan = planificarReparacion({
  usuarios,
  perfilesAperturador: await Aperturador.find().select('_id user').lean(),
  perfilesIncorporador: await Incorporador.find().select('_id user').lean(),
  areas: await Area.find({ aperturador: { $ne: null } }).select('_id aperturador nombre').lean()
});

// Zonas sin aperturador y a quién se asignarían (--asignar-huerfanas-a)
let destinoHuerfanas = null;
let zonasSinAperturador = [];
if (emailHuerfanas) {
  destinoHuerfanas = await User.findOne({ email: emailHuerfanas.toLowerCase().trim() }).select('_id role email nombre').lean();
  if (!destinoHuerfanas || destinoHuerfanas.role !== 'aperturador') {
    console.error(`No hay un usuario con rol aperturador y email ${emailHuerfanas}`);
    await mongoose.disconnect();
    process.exit(1);
  }
  zonasSinAperturador = await Area.find({ aperturador: null }).select('_id nombre').lean();
}

const etiqueta = (id) => { const u = usuarios.find(x => String(x._id) === id); return u ? `${u.nombre || ''} <${u.email || 'sin email'}>` : id; };

console.log(`\nUsuarios con rol aperturador/incorporador: ${usuarios.length}`);
console.log(`Perfiles Aperturador a crear (${pctAperturador}%): ${plan.crearAperturador.length}`);
plan.crearAperturador.forEach(id => console.log(`  + ${etiqueta(id)}`));
console.log(`Perfiles Incorporador a crear (${pctIncorporador}%): ${plan.crearIncorporador.length}`);
plan.crearIncorporador.forEach(id => console.log(`  + ${etiqueta(id)}`));
console.log(`Zonas a reasignar de id de usuario a id de perfil: ${plan.reasignarAreas.length}`);
plan.reasignarAreas.forEach(r => console.log(`  ~ zona ${r.areaId}: ${etiqueta(r.deUserId)} -> ${r.aPerfilId ? `perfil ${r.aPerfilId}` : '(perfil nuevo)'}`));
if (plan.huerfanas.length) {
  console.log(`Zonas con aperturador desconocido (NO se tocan): ${plan.huerfanas.length}`);
  plan.huerfanas.forEach(id => console.log(`  ? zona ${id}`));
}

if (destinoHuerfanas) {
  console.log(`Zonas SIN aperturador a asignar a ${destinoHuerfanas.email}: ${zonasSinAperturador.length}`);
  zonasSinAperturador.forEach(z => console.log(`  > zona ${z._id} (${z.nombre})`));
}

if (!aplicar) {
  console.log('\nDry-run: no se escribió nada. Revisa y vuelve a correr con --aplicar --base=' + nombreBase);
  await mongoose.disconnect();
  process.exit(0);
}

// --- Aplicar (idempotente: upsert sobre el índice único `user`) ---
let creados = 0;
const upsertPerfil = async (Modelo, userId, porcentaje) => {
  const r = await Modelo.updateOne(
    { user: userId },
    { $setOnInsert: { user: userId, 'comision.porcentaje': porcentaje } }, // createdAt/updatedAt los pone mongoose (timestamps)
    { upsert: true }
  );
  if (r.upsertedCount) creados++;
};
for (const id of plan.crearAperturador) await upsertPerfil(Aperturador, id, pctAperturador);
for (const id of plan.crearIncorporador) await upsertPerfil(Incorporador, id, pctIncorporador);

// Reasignar zonas (ahora todos los usuarios aperturador ya tienen perfil)
const perfiles = Object.fromEntries((await Aperturador.find().select('_id user').lean()).map(p => [String(p.user), p._id]));
let reasignadas = 0;
for (const r of plan.reasignarAreas) {
  const perfilId = perfiles[r.deUserId];
  if (!perfilId) continue;
  const res = await Area.updateOne({ _id: r.areaId, aperturador: r.deUserId }, { $set: { aperturador: perfilId } });
  if (res.modifiedCount) {
    reasignadas++;
    await Aperturador.updateOne({ _id: perfilId }, { $addToSet: { areasCreadas: r.areaId } });
  }
}

// Zonas sin aperturador -> perfil del aperturador indicado
let asignadas = 0;
if (destinoHuerfanas) {
  await upsertPerfil(Aperturador, destinoHuerfanas._id, pctAperturador);
  const perfilDestino = (await Aperturador.findOne({ user: destinoHuerfanas._id }).select('_id').lean())._id;
  for (const z of zonasSinAperturador) {
    const res = await Area.updateOne({ _id: z._id, aperturador: null }, { $set: { aperturador: perfilDestino } });
    if (res.modifiedCount) {
      asignadas++;
      await Aperturador.updateOne({ _id: perfilDestino }, { $addToSet: { areasCreadas: z._id } });
    }
  }
}

console.log(`\nListo. Perfiles creados: ${creados}. Zonas reasignadas: ${reasignadas}.${destinoHuerfanas ? ` Zonas sin aperturador asignadas: ${asignadas}.` : ''}`);
await mongoose.disconnect();
