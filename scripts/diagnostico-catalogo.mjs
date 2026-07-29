// scripts/diagnostico-catalogo.mjs
// Diagnóstico: por qué GET /api/materiales?ferreteroUserId=<id> devuelve []
// Uso: MONGODB_URI="..." node scripts/diagnostico-catalogo.mjs <idQueMandaLaApp>
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI;
if (!URI) { console.error('Falta MONGODB_URI'); process.exit(1); }

const idApp = process.argv[2] || '6a027b075296a4829513985f';
await mongoose.connect(URI);
const db = mongoose.connection.db;

let oid = null;
try { oid = new mongoose.Types.ObjectId(idApp); } catch { console.log('id no es un ObjectId válido'); }

console.log(`\n=== Id que manda la app: ${idApp} ===\n`);

// 1) ¿Ese id es un DOCUMENTO Ferretero (_id)?
const ferrPorId = oid && await db.collection('ferreteros').findOne({ _id: oid });
if (ferrPorId) {
  console.log(`El id es el _id del documento Ferretero: "${ferrPorId.nombreNegocio}"`);
  console.log(`   → su user real es: ${ferrPorId.user}`);
  console.log(`   ⚠️  Los materiales se ligan por user, NO por _id. La app debe mandar el user.\n`);
}

// 2) ¿Ese id es un User que es ferretero?
const ferrPorUser = oid && await db.collection('ferreteros').findOne({ user: oid });
if (ferrPorUser) {
  console.log(`El id ES el user de la ferretería "${ferrPorUser.nombreNegocio}" (correcto)\n`);
}

// 3) Materiales que coinciden con lo que hace el endpoint: { ferretero: idApp, activo: true }
const matchEndpoint = oid ? await db.collection('materials').countDocuments({ ferretero: oid, activo: true }) : 0;
console.log(`Materiales con { ferretero: ${idApp}, activo:true } (lo que devuelve el endpoint): ${matchEndpoint}`);

// 4) Si tenemos el user real, contar materiales por ese user
const userReal = ferrPorId?.user || (ferrPorUser ? oid : null);
if (userReal) {
  const porUser = await db.collection('materials').countDocuments({ ferretero: userReal, activo: true });
  console.log(`Materiales activos ligados al user real (${userReal}): ${porUser}`);
  if (porUser > 0 && matchEndpoint === 0) {
    console.log(`\n🎯 CAUSA: la app manda el _id del Ferretero, pero debe mandar el user (${userReal}).`);
  }
}

await mongoose.disconnect();
