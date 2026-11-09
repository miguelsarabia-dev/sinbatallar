// scripts/auditar-contrasenas.mjs
// SOLO LECTURA. Lista los contratistas cuya contraseña es, en realidad, un dato personal suyo (su CURP, su teléfono
// o su correo). Hasta ahora POST /contratistas (alta por el incorporador) guardaba el CURP como contraseña.
// Nunca escribe, nunca imprime contraseñas ni hashes.
//
// Uso:  MONGODB_URI="mongodb://..." node scripts/auditar-contrasenas.mjs
//
// Cómo corregir una cuenta de la lista: el administrador le asigna una contraseña nueva con
// PUT /api/contratistas/:id { "password": "..." } (mín. 6) y se la entrega; o el propio contratista la cambia.
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Sin esto, compilar los modelos crearía índices al conectar (una escritura)
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const { default: Contratista } = await import('../models/Contratista.js');

const URI = process.env.MONGODB_URI;
if (!URI) { console.error('Falta MONGODB_URI'); process.exit(1); }
if (process.argv.some(a => a === '--aplicar')) { console.error('Este script es de SOLO LECTURA: no admite --aplicar'); process.exit(1); }

await mongoose.connect(URI);
console.log(`Base: ${mongoose.connection.name} (${mongoose.connection.host})  modo: SOLO LECTURA`);

const contratistas = await Contratista.find({}).select('nombre email telefono curp password').lean();
console.log(`Revisando ${contratistas.length} contratista(s)... (cada comprobación tarda unos 0.2 s)`);

const debiles = [];
for (const c of contratistas) {
  if (!c.password) continue;
  const candidatos = [
    ['CURP', c.curp && String(c.curp).toUpperCase()],
    ['teléfono', c.telefono && String(c.telefono).trim()],
    ['correo', c.email && String(c.email).toLowerCase()],
  ].filter(([, v]) => v);
  for (const [motivo, valor] of candidatos) {
    if (await bcrypt.compare(valor, c.password)) { debiles.push({ _id: String(c._id), nombre: c.nombre, email: c.email, motivo }); break; }
  }
}

if (!debiles.length) {
  console.log('\nNingún contratista usa un dato personal como contraseña.');
} else {
  console.log(`\n${debiles.length} contratista(s) con la contraseña igual a un dato personal suyo:`);
  for (const d of debiles) console.log(`  - ${d._id}  ${d.nombre}  <${d.email}>  contraseña = su ${d.motivo}`);
  console.log('\nAsígnales una contraseña nueva: PUT /api/contratistas/:id { "password": "..." } con sesión de administrador.');
}
await mongoose.disconnect();
