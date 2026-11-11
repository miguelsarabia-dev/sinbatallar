// scripts/diagnostico-zona.mjs — SOLO LECTURA. ¿Por qué a un cliente le sale "zona no cubierta"?
// Uso: MONGODB_URI="mongodb://..." node scripts/diagnostico-zona.mjs <lat> <lng>
// Revisa: zona activa que contiene el punto, contratistas ligados a ella (por Area.contratistas y por su propio perfil),
// y por qué cada uno cuenta o no (aprobado, disponible, servicios). Nunca escribe ni crea índices.
import mongoose from 'mongoose';
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const { default: Area } = await import('../models/Area.js');
const { default: Contratista } = await import('../models/Contratista.js');
await import('../models/Servicio.js');

const [lat, lng] = [parseFloat(process.argv[2]), parseFloat(process.argv[3])];
if (!process.env.MONGODB_URI || !lat || !lng) { console.error('Uso: MONGODB_URI=... node scripts/diagnostico-zona.mjs <lat> <lng>'); process.exit(1); }
await mongoose.connect(process.env.MONGODB_URI);
console.log(`Base: ${mongoose.connection.name} · punto lat=${lat} lng=${lng}\n`);

const punto = { $geoIntersects: { $geometry: { type: 'Point', coordinates: [lng, lat] } } };
const todas = await Area.find({ poligono: punto }).select('nombre activo contratistas');
if (!todas.length) {
  console.log('✗ NINGUNA zona (activa o no) contiene ese punto: el cliente verá "fuera de zona". Revisa el polígono o las coordenadas de su dirección.');
} else {
  for (const a of todas) {
    console.log(`Zona "${a.nombre}" · ${a.activo ? 'ACTIVA' : '✗ INACTIVA (el cliente la ve como fuera de zona)'} · en Area.contratistas: ${a.contratistas?.length || 0}`);
    const lista = await Contratista.find({ $or: [{ _id: { $in: a.contratistas || [] } }, { areasIds: a._id }, { areaId: a._id }] })
      .select('nombre email aprobado activo servicios areaId areasIds');
    if (!lista.length) console.log('  ✗ ningún contratista ligado a esta zona');
    for (const c of lista) {
      const enArreglo = (a.contratistas || []).some(x => String(x) === String(c._id));
      const motivos = [];
      if (!c.aprobado) motivos.push('no aprobado');
      if (!c.activo) motivos.push('no disponible (activo:false)');
      if (!c.servicios?.length) motivos.push('SIN servicios');
      if (!enArreglo) motivos.push('no estaba en Area.contratistas (la ruta nueva ya lo considera)');
      console.log(`  - ${c.nombre} <${c.email}> ${motivos.length ? '✗ ' + motivos.join('; ') : '✓ cuenta para la cobertura'}`);
    }
  }
}
await mongoose.disconnect();
