// scripts/reparar-perfiles.mjs
// Repara datos antiguos de aperturadores e incorporadores:
//   1. crea el perfil (Aperturador / Incorporador) de cada usuario con ese rol que no lo tenga
//   2. reasigna las zonas cuyo `aperturador` apunta al id de un USUARIO (app móvil antigua) al id de su perfil
//   3. convierte a ObjectId los perfiles cuyo `user` quedó guardado como texto
//   4. (opcional) --asignar-huerfanas-a <email>: asigna a ese aperturador las zonas sin aperturador
//
// Diagnóstico de SOLO LECTURA:
//   --inspeccionar <email|teléfono>: muestra los usuarios con ese dato, sus perfiles (con el tipo BSON de `user`),
//   perfiles huérfanos y las zonas ligadas. Nunca escribe.
//
// Uso:
//   MONGODB_URI="mongodb://..." node scripts/reparar-perfiles.mjs --inspeccionar aperturador@test.com
//   MONGODB_URI="mongodb://..." node scripts/reparar-perfiles.mjs                         # dry-run (no escribe nada)
//   MONGODB_URI="mongodb://..." node scripts/reparar-perfiles.mjs --aplicar --base=NOMBRE # escribe
//
// --aplicar exige --base=<nombre de la base> igual al de la conexión, para no escribir en una base equivocada.
// Es idempotente: se puede correr varias veces. Nunca crea índices (autoIndex apagado), tampoco en dry-run.
import mongoose from 'mongoose';
import { planificarReparacion } from '../lib/reparar-perfiles.js';

// Sin esto, compilar los modelos crearía índices al conectar: una escritura que un dry-run no debe hacer
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const { default: User } = await import('../models/User.js');
const { default: Aperturador } = await import('../models/Aperturador.js');
const { default: Incorporador } = await import('../models/Incorporador.js');
const { default: Area } = await import('../models/Area.js');
const { default: Configuracion } = await import('../models/Configuracion.js');

const URI = process.env.MONGODB_URI;
const argv = process.argv;
const aplicar = argv.includes('--aplicar');
const baseConfirmada = (argv.find(a => a.startsWith('--base=')) || '').slice('--base='.length);

/** Valor de una opción que acepta `--op valor` o `--op=valor` (undefined si no está, null si falta el valor). */
const opcion = (nombre) => {
  const i = argv.findIndex(a => a === nombre || a.startsWith(`${nombre}=`));
  if (i < 0) return undefined;
  const v = argv[i].includes('=') ? argv[i].split('=').slice(1).join('=') : argv[i + 1];
  return v && !v.startsWith('--') ? v : null;
};
const emailHuerfanas = opcion('--asignar-huerfanas-a');
const objetivoInspeccion = opcion('--inspeccionar');

if (!URI) { console.error('Falta MONGODB_URI'); process.exit(1); }
if (emailHuerfanas === null) { console.error('--asignar-huerfanas-a necesita el email del aperturador'); process.exit(1); }
if (objetivoInspeccion === null) { console.error('--inspeccionar necesita un email o teléfono'); process.exit(1); }
if (aplicar && argv.includes('--dry-run')) { console.error('--aplicar y --dry-run son excluyentes'); process.exit(1); }
if (aplicar && objetivoInspeccion) { console.error('--inspeccionar es de solo lectura: no se combina con --aplicar'); process.exit(1); }

await mongoose.connect(URI);
const db = mongoose.connection.db;
const nombreBase = mongoose.connection.name;
const modo = objetivoInspeccion ? 'INSPECCIÓN (solo lectura)' : aplicar ? 'APLICAR' : 'dry-run (no escribe)';
console.log(`Base: ${nombreBase} (${mongoose.connection.host})  modo: ${modo}`);

// Tipo BSON legible de un valor (ObjectId, string, ...)
const tipo = (v) => (v === null ? 'null' : v === undefined ? 'undefined' : (v._bsontype || typeof v));
const comoObjectId = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(String(v)) : null);
const escapar = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ──────────────────────────── --inspeccionar (solo lectura, driver nativo) ────────────────────────────
async function inspeccionar(valor) {
  const esEmail = valor.includes('@');
  const digitos = valor.replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
  const filtroUsuarios = esEmail
    ? { email: { $regex: `^${escapar(valor.trim())}$`, $options: 'i' } }
    : { telefono: { $regex: `^(\\+?52)?[\\s.-]*${digitos.split('').join('[\\s.-]*')}$` } };

  const usuarios = await db.collection('users').find(filtroUsuarios).toArray();
  console.log(`\n── Usuarios con ${esEmail ? 'email' : 'teléfono'} "${valor}": ${usuarios.length}`);
  if (usuarios.length > 1) console.log('   ⚠ HAY VARIOS usuarios con ese dato: el login puede resolver uno distinto al que tiene el perfil');
  usuarios.forEach(u => console.log(`   _id ${u._id} (${tipo(u._id)})  role=${u.role}  suspendido=${!!u.suspendido}  email=${u.email}  tel=${u.telefono}  nombre=${u.nombre}`));

  const idsObj = usuarios.map(u => u._id);
  const idsTxt = idsObj.map(String);
  const perfiles = [];
  for (const [coleccion, etiqueta] of [['aperturadors', 'Aperturador'], ['incorporadors', 'Incorporador']]) {
    const docs = await db.collection(coleccion).find({ $or: [{ user: { $in: idsObj } }, { user: { $in: idsTxt } }] }).toArray();
    console.log(`\n── Perfiles ${etiqueta} cuyo user sea alguno de esos ids (como ObjectId O como texto): ${docs.length}`);
    docs.forEach(d => {
      console.log(`   _id ${d._id}  user=${d.user} (${tipo(d.user)})  activo=${d.activo}  comision=${d.comision?.porcentaje}  zonas=${(d.areasCreadas || []).length}`);
      if (tipo(d.user) !== 'ObjectId') console.log('   ⚠ `user` NO es ObjectId: Aperturador.findOne({user}) con Mongoose no lo encuentra (el código nuevo sí lo tolera)');
      perfiles.push({ ...d, coleccion });
    });
    const usuariosConRol = usuarios.filter(u => u.role === etiqueta.toLowerCase());
    for (const u of usuariosConRol) {
      if (!docs.some(d => String(d.user) === String(u._id))) console.log(`   ✗ El usuario ${u._id} (${u.email}) tiene rol ${u.role} pero NO tiene perfil ${etiqueta}`);
    }
  }

  // Perfiles huérfanos: su `user` no existe en users
  console.log('\n── Perfiles huérfanos (su user no existe)');
  let totalHuerfanos = 0, totalTexto = 0;
  for (const [coleccion, etiqueta] of [['aperturadors', 'Aperturador'], ['incorporadors', 'Incorporador']]) {
    const todos = await db.collection(coleccion).find({}, { projection: { user: 1 } }).toArray();
    totalTexto += todos.filter(d => tipo(d.user) === 'string').length;
    const ids = todos.map(d => comoObjectId(d.user)).filter(Boolean);
    const existentes = new Set((await db.collection('users').find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray()).map(u => String(u._id)));
    const huerfanos = todos.filter(d => !existentes.has(String(d.user)));
    totalHuerfanos += huerfanos.length;
    console.log(`   ${etiqueta}: ${todos.length} perfiles, ${huerfanos.length} huérfanos, ${todos.filter(d => tipo(d.user) === 'string').length} con user guardado como texto`);
    huerfanos.slice(0, 20).forEach(d => console.log(`     perfil ${d._id} -> user ${d.user} (${tipo(d.user)}) NO existe`));
  }

  // Zonas ligadas al usuario o a sus perfiles
  const idsPerfil = perfiles.map(p => p._id);
  const ligados = [...idsObj, ...idsTxt, ...idsPerfil, ...idsPerfil.map(String)];
  const zonas = await db.collection('areas').find({ aperturador: { $in: ligados } }).toArray();
  console.log(`\n── Zonas cuyo aperturador sea el id del usuario o el de su perfil: ${zonas.length}`);
  zonas.forEach(z => {
    const apunta = idsPerfil.some(p => String(p) === String(z.aperturador)) ? 'PERFIL' : 'USUARIO (zona antigua)';
    console.log(`   zona ${z._id} "${z.nombre}" aperturador=${z.aperturador} (${tipo(z.aperturador)}) -> id de ${apunta}  activo=${z.activo}`);
  });

  console.log('\n── Diagnóstico');
  const conRol = usuarios.filter(u => ['aperturador', 'incorporador'].includes(u.role));
  if (usuarios.length === 0) console.log('   • No existe ningún usuario con ese dato.');
  if (usuarios.length > 1) console.log('   • Varios usuarios con el mismo dato (cuenta duplicada).');
  if (conRol.length && !perfiles.length) console.log('   • Tiene rol pero ningún perfil enlazado: lo creará la auto-provisión o el script con --aplicar.');
  if (perfiles.some(p => tipo(p.user) !== 'ObjectId')) console.log('   • Un perfil tiene `user` como texto: el script con --aplicar lo convierte a ObjectId.');
  if (totalHuerfanos) console.log(`   • Hay ${totalHuerfanos} perfil(es) huérfano(s) en la base (apuntan a usuarios que no existen); revisa si alguno era de esta persona.`);
  if (totalTexto === 0 && usuarios.length === 1 && perfiles.length === 1 && tipo(perfiles[0].user) === 'ObjectId') {
    console.log('   • Datos correctos: usuario y perfil enlazados con ObjectId. Si la app sigue fallando, el problema está en el código desplegado, no en los datos.');
  }
}

if (objetivoInspeccion) {
  await inspeccionar(objetivoInspeccion);
  await mongoose.disconnect();
  process.exit(0);
}

if (aplicar && baseConfirmada !== nombreBase) {
  console.error(`Para aplicar confirma la base: --base=${nombreBase}`);
  await mongoose.disconnect();
  process.exit(1);
}

// ──────────────────────────── reparación ────────────────────────────
// Porcentajes por defecto: los de la configuración financiera si existe, si no 2% y 3%
const config = (await Configuracion.findOne({ clave: 'financiera' }).lean())?.valor || {};
const pctAperturador = Number.isFinite(config.OPENER) ? config.OPENER : 2;
const pctIncorporador = Number.isFinite(config.INCORPORATOR) ? config.INCORPORATOR : 3;

// Con el driver nativo para ver también los perfiles cuyo `user` está guardado como texto
const crudos = async (coleccion) => (await db.collection(coleccion).find({}, { projection: { user: 1 } }).toArray());
const aTexto = (docs) => docs.map(d => ({ _id: d._id, user: String(d.user) }));
const perfilesAperturadorCrudos = await crudos('aperturadors');
const perfilesIncorporadorCrudos = await crudos('incorporadors');

const usuarios = await User.find({ role: { $in: ['aperturador', 'incorporador'] } }).select('_id role email nombre').lean();
const plan = planificarReparacion({
  usuarios,
  perfilesAperturador: aTexto(perfilesAperturadorCrudos),
  perfilesIncorporador: aTexto(perfilesIncorporadorCrudos),
  areas: await Area.find({ aperturador: { $ne: null } }).select('_id aperturador nombre').lean()
});
// Perfiles con `user` como texto (se convierten a ObjectId)
const perfilesConTexto = [
  ...perfilesAperturadorCrudos.filter(d => tipo(d.user) === 'string').map(d => ({ coleccion: 'aperturadors', ...d })),
  ...perfilesIncorporadorCrudos.filter(d => tipo(d.user) === 'string').map(d => ({ coleccion: 'incorporadors', ...d }))
];

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
console.log(`Perfiles con user guardado como texto a convertir a ObjectId: ${perfilesConTexto.length}`);
perfilesConTexto.forEach(p => console.log(`  # ${p.coleccion} ${p._id}: user "${p.user}" -> ObjectId`));
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

// --- Aplicar (idempotente) ---
// 1) Normalizar el tipo de `user` primero, para que los upserts de abajo no dupliquen perfiles
let convertidos = 0;
for (const p of perfilesConTexto) {
  const oid = comoObjectId(p.user);
  if (!oid) { console.log(`  ! ${p.coleccion} ${p._id}: user "${p.user}" no es un ObjectId válido, se omite`); continue; }
  const yaHay = await db.collection(p.coleccion).findOne({ user: oid, _id: { $ne: p._id } }, { projection: { _id: 1 } });
  if (yaHay) { console.log(`  ! ${p.coleccion} ${p._id}: ya existe otro perfil (${yaHay._id}) para ese usuario, se omite`); continue; }
  const r = await db.collection(p.coleccion).updateOne({ _id: p._id, user: p.user }, { $set: { user: oid } });
  if (r.modifiedCount) convertidos++;
}

// 2) Crear los perfiles que faltan (upsert sobre `user`)
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

// 3) Reasignar zonas (ahora todos los usuarios aperturador ya tienen perfil)
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

// 4) Zonas sin aperturador -> perfil del aperturador indicado
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

console.log(`\nListo. user convertidos a ObjectId: ${convertidos}. Perfiles creados: ${creados}. Zonas reasignadas: ${reasignadas}.${destinoHuerfanas ? ` Zonas sin aperturador asignadas: ${asignadas}.` : ''}`);
await mongoose.disconnect();
