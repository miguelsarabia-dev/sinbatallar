// scripts/migrar-asociado.mjs
// Migración "incorporador" -> "asociado" en la base (el plan y sus reglas están en lib/migrar-asociado.js).
//
//   --parte=datos  colección y campos. Correrla JUSTO al publicar la web nueva.
//   --parte=roles  User.role. Correrla DESPUÉS de publicar la app móvil que ya entiende 'asociado'.
//   (sin --parte: ambas)
//
// Uso:
//   MONGODB_URI="mongodb://..." node scripts/migrar-asociado.mjs --parte=datos                          # dry-run
//   MONGODB_URI="mongodb://..." node scripts/migrar-asociado.mjs --parte=datos --aplicar --base=NOMBRE  # escribe
//
// Por defecto NO escribe nada: solo muestra lo que haría. --aplicar exige --base=<nombre de la base> igual al de la
// conexión, para no escribir en una base equivocada. Es idempotente: se puede correr varias veces.
import mongoose from 'mongoose';
import { planMigracionAsociado, PARTES } from '../lib/migrar-asociado.js';

const URI = process.env.MONGODB_URI;
const argv = process.argv;
const aplicar = argv.includes('--aplicar');
const baseConfirmada = (argv.find(a => a.startsWith('--base=')) || '').slice('--base='.length);
const parteArg = (argv.find(a => a.startsWith('--parte=')) || '').slice('--parte='.length);
const partes = parteArg ? [parteArg] : PARTES;

if (!URI) { console.error('Falta MONGODB_URI'); process.exit(1); }
if (parteArg && !PARTES.includes(parteArg)) { console.error(`--parte debe ser ${PARTES.join(' o ')}`); process.exit(1); }

await mongoose.connect(URI, { autoIndex: false, autoCreate: false });
const db = mongoose.connection.db;
const nombreBase = mongoose.connection.name;
console.log(`Base: ${nombreBase} (${mongoose.connection.host})  partes: ${partes.join(', ')}  modo: ${aplicar ? 'APLICAR' : 'dry-run (no escribe)'}`);

if (aplicar && baseConfirmada !== nombreBase) {
  console.error(`Para aplicar confirma la base: --base=${nombreBase}`);
  await mongoose.disconnect();
  process.exit(1);
}

const existe = async (nombre) => (await db.listCollections({ name: nombre }).toArray()).length > 0;
const contar = async (coleccion, filtro = {}) => ((await existe(coleccion)) ? db.collection(coleccion).countDocuments(filtro) : 0);

const config = (await existe('configuracions'))
  ? await db.collection('configuracions').findOne({ clave: 'financiera' })
  : null;

const usuariosDe = async (c) => ((await existe(c)) ? (await db.collection(c).find({}, { projection: { user: 1 } }).toArray()).map(d => String(d.user)) : []);
const usuariosNuevos = new Set(await usuariosDe('asociados'));
const estado = {
  perfilesIncorporador: await contar('incorporadors'),
  perfilesAsociado: await contar('asociados'),
  perfilesSolapados: (await usuariosDe('incorporadors')).filter(u => usuariosNuevos.has(u)).length,
  contratistasConCampoAnterior: await contar('contratistas', { incorporador: { $exists: true }, asociado: { $exists: false } }),
  contratistasConAmbos: await contar('contratistas', { incorporador: { $exists: true }, asociado: { $exists: true } }),
  comisionesConCampoAnterior: await contar('comisions', { 'distribucion.incorporador': { $exists: true } }),
  configConClaveAnterior: !!(config?.valor && config.valor.INCORPORATOR !== undefined),
  usuariosConRolAnterior: await contar('users', { role: 'incorporador' })
};
console.log('\nEstado actual:', estado);

const plan = planMigracionAsociado(estado, partes);
if (!plan.ok) {
  console.error('\nNo se puede migrar:');
  plan.bloqueos.forEach(b => console.error(`  • ${b}`));
  await mongoose.disconnect();
  process.exit(1);
}
if (!plan.pasos.length) {
  console.log('\nNada que migrar: la base ya usa los nombres nuevos.');
  await mongoose.disconnect();
  process.exit(0);
}

console.log('\nPasos:');
plan.pasos.forEach(p => console.log(`  [${p.parte}] ${p.accion}: ${p.cantidad}`));

if (!aplicar) {
  console.log('\nDry-run: no se escribió nada. Agrega --aplicar --base=' + nombreBase + ' para aplicar.');
  await mongoose.disconnect();
  process.exit(0);
}

for (const paso of plan.pasos) {
  let r;
  if (paso.accion.startsWith('fusionar')) {
    const anteriores = await db.collection('incorporadors').find({}).toArray();
    if (anteriores.length) await db.collection('asociados').insertMany(anteriores, { ordered: false });
    await db.collection('incorporadors').rename('incorporadors_respaldo');
    r = anteriores.length;
  } else if (paso.accion.startsWith('renombrar colección')) {
    await db.collection('incorporadors').rename('asociados');
    r = 'ok';
  } else if (paso.accion.startsWith('Contratista.')) {
    r = (await db.collection('contratistas').updateMany(
      { incorporador: { $exists: true }, asociado: { $exists: false } },
      { $rename: { incorporador: 'asociado' } }
    )).modifiedCount;
  } else if (paso.accion.startsWith('Comision.')) {
    r = (await db.collection('comisions').updateMany(
      { 'distribucion.incorporador': { $exists: true } },
      { $rename: { 'distribucion.incorporador': 'distribucion.asociado' } }
    )).modifiedCount;
  } else if (paso.accion.startsWith('Configuracion')) {
    const valor = { ...config.valor };
    if (valor.ASOCIADO === undefined) valor.ASOCIADO = valor.INCORPORATOR;
    delete valor.INCORPORATOR;
    r = (await db.collection('configuracions').updateOne({ _id: config._id }, { $set: { valor } })).modifiedCount;
  } else if (paso.accion.startsWith('User.role')) {
    r = (await db.collection('users').updateMany({ role: 'incorporador' }, { $set: { role: 'asociado' } })).modifiedCount;
  }
  console.log(`  ✓ [${paso.parte}] ${paso.accion}: ${r}`);
}

console.log('\nListo.');
await mongoose.disconnect();
