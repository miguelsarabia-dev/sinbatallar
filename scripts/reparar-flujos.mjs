// scripts/reparar-flujos.mjs
// Detecta y repara servicios que quedaron a medias cuando una ruta respondió 500 DESPUÉS de guardar (imports perdidos en
// un merge: confirmar-cliente, asignar-tecnico y la aprobación de estimaciones):
//   1. citas completadas con todo confirmado y el pago verificado, pero sin cerrar (pagado=false) o sin comisión
//      -> se cierran con cerrarServicioSiCorresponde (la misma función de confirmar-cliente y verificar-pago)
//   2. cotizaciones 'enviada' cuya cita sigue en solicitada/atendida/aceptada -> la cita pasa a 'cotizada' con
//      marcarCotizada (misma función que la aprobación), con rastro en el historial
//   3. citas con técnico asignado sin rastro de la asignación en el historial (SOLO se reporta: no se escribe nada)
//
// Uso (reutiliza lib/*.js, por eso se carga el alias '@/'):
//   MONGODB_URI="mongodb://..." node --import ./scripts/registrar-alias.mjs scripts/reparar-flujos.mjs                        # dry-run
//   MONGODB_URI="mongodb://..." node --import ./scripts/registrar-alias.mjs scripts/reparar-flujos.mjs --aplicar --base=NOMBRE # escribe
//
// Dry-run por defecto: no escribe nada ni crea índices (autoIndex apagado). --aplicar exige --base=<nombre exacto de la
// base>. Idempotente: una 2ª corrida no encuentra nada. Al cerrar NO envía emails (son servicios de hace tiempo).
import mongoose from 'mongoose';
import {
  citaConCierrePendiente, cotizacionConCitaSinAvanzar, citaSinHistorialDeAsignacion
} from '../lib/reparar-flujos.js';

mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const { default: Cita } = await import('../models/Cita.js');
const { default: Cotizacion } = await import('../models/Cotizacion.js');
const { default: Comision } = await import('../models/Comision.js');
const { cerrarServicioSiCorresponde, resolverCotizacionAceptada } = await import('../lib/comisiones.js');
const { marcarCotizada } = await import('../lib/citas-estado.js');

const URI = process.env.MONGODB_URI;
const aplicar = process.argv.includes('--aplicar');
const baseConfirmada = (process.argv.find(a => a.startsWith('--base=')) || '').slice('--base='.length);

if (!URI) { console.error('Falta MONGODB_URI'); process.exit(1); }
if (aplicar && process.argv.includes('--dry-run')) { console.error('--aplicar y --dry-run son excluyentes'); process.exit(1); }

await mongoose.connect(URI);
const nombreBase = mongoose.connection.name;
console.log(`Base: ${nombreBase} (${mongoose.connection.host})  modo: ${aplicar ? 'APLICAR' : 'dry-run (no escribe)'}`);

if (aplicar && baseConfirmada !== nombreBase) {
  console.error(`Para aplicar confirma la base: --base=${nombreBase}`);
  await mongoose.disconnect();
  process.exit(1);
}

// ── 1. Cierres pendientes ──
const pendientesCierre = [];
for (const cita of await Cita.find({ estado: 'completada' })) {
  const cotizacion = await resolverCotizacionAceptada(cita);
  const comision = await Comision.exists({ cita: cita._id });
  if (citaConCierrePendiente({ cita, cotizacion, comision })) {
    pendientesCierre.push({ id: String(cita._id), sinPagado: !cita.pagado, sinComision: !comision });
  }
}

// ── 2. Cotizaciones enviadas con la cita sin avanzar ──
const sinAvanzar = [];
for (const cot of await Cotizacion.find({ estado: 'enviada' })) {
  const cita = await Cita.findById(cot.cita);
  if (cotizacionConCitaSinAvanzar(cot, cita)) {
    sinAvanzar.push({ citaId: String(cita._id), cotizacionId: String(cot._id), estadoCita: cita.estado });
  }
}

// ── 3. Técnico sin rastro en el historial (solo reporte) ──
const sinHistorial = (await Cita.find({ tecnico: { $ne: null }, estado: { $nin: ['cancelada', 'rechazada'] } }).select('tecnico historial'))
  .filter(citaSinHistorialDeAsignacion).map(c => String(c._id));

console.log(`\n1) Servicios por cerrar (pago verificado y todo confirmado, sin pagado/comisión): ${pendientesCierre.length}`);
pendientesCierre.forEach(p => console.log(`   cita ${p.id}${p.sinPagado ? '  [pagado=false]' : ''}${p.sinComision ? '  [sin comisión]' : ''}`));
console.log(`2) Cotizaciones enviadas con la cita sin pasar a 'cotizada': ${sinAvanzar.length}`);
sinAvanzar.forEach(s => console.log(`   cita ${s.citaId} (${s.estadoCita})  cotización ${s.cotizacionId}`));
console.log(`3) Citas con técnico sin rastro de asignación en el historial (solo reporte): ${sinHistorial.length}`);
sinHistorial.forEach(id => console.log(`   cita ${id}`));

if (!aplicar) {
  console.log('\nDry-run: no se escribió nada. Revisa y vuelve a correr con --aplicar --base=' + nombreBase);
  await mongoose.disconnect();
  process.exit(0);
}

// ── Aplicar ──
let cerradas = 0, comisiones = 0;
for (const p of pendientesCierre) {
  const antes = await Comision.exists({ cita: p.id });
  const r = await cerrarServicioSiCorresponde(p.id, { notificar: false });
  if (r.cerrada) {
    cerradas++;
    if (!antes && r.comision) comisiones++;
  } else {
    console.log(`   ! cita ${p.id}: no se pudo cerrar`);
  }
}

let avanzadas = 0;
for (const s of sinAvanzar) {
  const cita = await Cita.findById(s.citaId);
  if (cita && marcarCotizada(cita)) {   // vuelve a comprobar el estado: idempotente
    await cita.save({ validateModifiedOnly: true });
    avanzadas++;
  }
}

console.log(`\nListo. Servicios cerrados: ${cerradas} (comisiones creadas: ${comisiones}). Citas llevadas a 'cotizada': ${avanzadas}. Sin cambios en el punto 3 (solo reporte).`);
await mongoose.disconnect();
