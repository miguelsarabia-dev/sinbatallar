// scripts/diagnostico-cita.mjs
// Diagnóstico + sanación de una cita con datos inconsistentes (500 al pasar a en_progreso).
// Uso:
//   MONGODB_URI="..." node scripts/diagnostico-cita.mjs <citaId>          # solo diagnostica
//   MONGODB_URI="..." node scripts/diagnostico-cita.mjs <citaId> --fix    # además repara
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI;
if (!URI) { console.error('Falta MONGODB_URI'); process.exit(1); }

const citaId = process.argv[2] || '6a4448c49b9e4c02c4a967ec';
const doFix = process.argv.includes('--fix');

await mongoose.connect(URI);
const db = mongoose.connection.db;
const oid = new mongoose.Types.ObjectId(citaId);

const cita = await db.collection('citas').findOne({ _id: oid });
if (!cita) { console.log('Cita no encontrada'); await mongoose.disconnect(); process.exit(0); }

console.log(`\n=== Cita ${citaId} ===`);
console.log(`estado: ${cita.estado}`);
console.log(`cotizaciones[]: ${(cita.cotizaciones || []).length}`);
console.log(`cotizacionAceptada: ${cita.cotizacionAceptada || 'null'}`);

// Cotizaciones reales de esta cita
const cotis = await db.collection('cotizacions').find({ cita: oid }).toArray();
console.log(`\nCotizaciones en la colección para esta cita: ${cotis.length}`);
for (const c of cotis) console.log(`   - ${c._id}  estado=${c.estado}  total=${c.total}`);

const aceptadas = cotis.filter(c => c.estado === 'aceptada');

// Validar el documento contra el schema de Mongoose para ver el campo que rompe save()
const Cita = (await import('../models/Cita.js')).default;
const doc = new Cita(cita);
const err = doc.validateSync();
if (err) {
  console.log(`\n⚠️  ValidationError (esto es lo que dispara el 500 en save):`);
  for (const k of Object.keys(err.errors)) console.log(`   - ${k}: ${err.errors[k].message}`);
} else {
  console.log(`\n✅ El documento pasa la validación del schema (el 500 vendría de otra parte).`);
}

if (doFix) {
  const update = {};
  // Reponer cotizacionAceptada si falta pero hay una aceptada
  if (!cita.cotizacionAceptada && aceptadas.length >= 1) {
    // Si hay varias aceptadas, quedarnos con la más reciente y rechazar el resto
    aceptadas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const elegida = aceptadas[0];
    update.cotizacionAceptada = elegida._id;
    if (aceptadas.length > 1) {
      const sobrantes = aceptadas.slice(1).map(c => c._id);
      await db.collection('cotizacions').updateMany(
        { _id: { $in: sobrantes } },
        { $set: { estado: 'rechazada' } }
      );
      console.log(`\n🔧 Rechazadas ${sobrantes.length} cotización(es) aceptada(s) duplicada(s).`);
    }
  }
  // Reconstruir el array cotizaciones con todas las de la cita
  update.cotizaciones = cotis.map(c => c._id);

  await db.collection('citas').updateOne({ _id: oid }, { $set: update });
  console.log(`\n🔧 Cita reparada: cotizaciones[]=${update.cotizaciones.length}, cotizacionAceptada=${update.cotizacionAceptada || cita.cotizacionAceptada || 'null'}`);
}

await mongoose.disconnect();
