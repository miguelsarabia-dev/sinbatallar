// lib/cotizacion-documento.js
// Documento de la cotización DESGLOSADA en HTML imprimible (puro). Lo sirve /api/cotizaciones/[id]/documento:
// en la web se abre y se guarda como PDF desde el navegador; la app lo convierte a PDF en el teléfono.
// Muestra lo mismo que ve el cliente (lib/cotizador.js → desgloseParaCliente): cada trabajo con su cantidad e
// importe, agrupado por especialidad, y los materiales a su precio. Nunca tarifas internas, factores ni mínimos.
import { desgloseParaCliente } from './cotizador.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dinero = (n) => `$${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cantidad = (n) => (Number.isInteger(Number(n)) ? String(n) : Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 }));
const fechaLarga = (f) => (f ? new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' }) : '');

/**
 * @param {{cotizacion:object, cita?:object, servicio?:string, cliente?:{nombre}, quienCotiza?:{nombre, rol}, direccion?:string,
 *          emitido?:Date, conBoton?:boolean}} p
 * @returns {string} documento HTML completo
 */
export function documentoCotizacionHtml({ cotizacion, servicio, cliente, quienCotiza, direccion, emitido = new Date(), conBoton = true }) {
  const d = desgloseParaCliente(cotizacion);
  const folio = String(cotizacion?._id || '').slice(-8).toUpperCase();
  const anticipo = cotizacion?.modalidadPago === 'total' ? null : (cotizacion?.anticipo?.monto ?? d.total / 2);

  const filasMO = d.desglosada
    ? d.manoDeObra.grupos.map(g => `
        <tr class="grupo"><td colspan="3">${esc(g.especialidad)}</td></tr>
        ${g.conceptos.map(c => `
          <tr>
            <td>${esc(c.concepto)}${c.nota ? `<div class="nota">${esc(c.nota)}</div>` : ''}</td>
            <td class="num">${cantidad(c.cantidad)} ${esc(c.unidad)}</td>
            <td class="num">${dinero(c.importe)}</td>
          </tr>`).join('')}
        <tr class="sub"><td colspan="2">Subtotal ${esc(g.especialidad)}</td><td class="num">${dinero(g.importe)}</td></tr>`).join('')
    : `<tr><td>${esc(cotizacion?.descripcionTrabajo || 'Mano de obra')}</td><td class="num">—</td><td class="num">${dinero(d.manoDeObra.total)}</td></tr>`;

  const filasMat = d.materiales.lineas.length
    ? d.materiales.lineas.map(m => `
        <tr>
          <td>${esc(m.nombre)}${m.descripcion ? `<div class="nota">${esc(m.descripcion)}</div>` : ''}</td>
          <td class="num">${cantidad(m.cantidad)}</td>
          <td class="num">${dinero(m.precioPorUnidad)}</td>
          <td class="num">${dinero(m.subtotal)}</td>
          <td class="num">${dinero(m.total)}</td>
        </tr>`).join('')
    : '<tr><td colspan="5" class="vacio">Sin materiales</td></tr>';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cotización ${esc(folio)} · Sin Batallar</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;margin:0;padding:24px;font-size:13px;background:#fff}
  .doc{max-width:780px;margin:0 auto}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #f1af45;padding-bottom:12px;margin-bottom:16px;gap:12px}
  .marca{font-size:22px;font-weight:800;color:#522e5d} .marca span{color:#f1af45}
  .meta{text-align:right;color:#4b5563;font-size:12px} .meta strong{color:#111827;font-size:14px}
  .datos{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:16px}
  .datos div span{display:block;color:#6b7280;font-size:11px}
  h2{font-size:14px;color:#522e5d;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.03em}
  table{width:100%;border-collapse:collapse} th{text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #d1d5db;padding:6px 4px}
  td{padding:6px 4px;border-bottom:1px solid #f3f4f6;vertical-align:top} .num{text-align:right;white-space:nowrap}
  tr.grupo td{background:#fdf3e1;color:#522e5d;font-weight:700;border-bottom:none}
  tr.sub td{font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb}
  .nota{color:#6b7280;font-size:11px;margin-top:2px} .vacio{color:#9ca3af;text-align:center}
  .totales{margin-top:16px;margin-left:auto;width:300px} .totales div{display:flex;justify-content:space-between;padding:4px 0}
  .totales .total{border-top:2px solid #522e5d;margin-top:4px;padding-top:8px;font-size:16px;font-weight:800;color:#522e5d}
  .pago{margin-top:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;font-size:12px}
  .pie{margin-top:20px;color:#6b7280;font-size:11px;border-top:1px solid #e5e7eb;padding-top:8px}
  .acciones{text-align:center;margin:0 0 16px} .acciones button{background:#f1af45;color:#2b1a30;border:0;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer}
  @media print{body{padding:0}.acciones{display:none}}
</style></head>
<body><div class="doc">
${conBoton ? '<div class="acciones"><button onclick="window.print()">Descargar PDF</button></div>' : ''}
<header>
  <div><div class="marca">Sin<span>Batallar</span></div><div style="color:#6b7280;font-size:12px">Cotización desglosada</div></div>
  <div class="meta"><strong>Folio ${esc(folio)}</strong><br>Emitida: ${esc(fechaLarga(cotizacion?.createdAt || emitido))}</div>
</header>
<div class="datos">
  <div><span>Cliente</span>${esc(cliente?.nombre || '—')}</div>
  <div><span>Servicio</span>${esc(servicio || '—')}</div>
  <div><span>Cotiza</span>${esc(quienCotiza?.nombre || '—')}${quienCotiza?.rol ? ` (${esc(quienCotiza.rol)})` : ''}</div>
  <div><span>Domicilio</span>${esc(direccion || '—')}</div>
  ${cotizacion?.fechaInicioPropuesta ? `<div><span>Inicio del trabajo</span>${esc(fechaLarga(cotizacion.fechaInicioPropuesta))}${cotizacion.horaInicioPropuesta ? ` a las ${esc(cotizacion.horaInicioPropuesta)}` : ''}</div>` : ''}
</div>
${cotizacion?.descripcionTrabajo && d.desglosada ? `<p style="margin:0 0 8px">${esc(cotizacion.descripcionTrabajo)}</p>` : ''}

<h2>Mano de obra</h2>
<table><thead><tr><th>Trabajo</th><th class="num">Cantidad</th><th class="num">Importe</th></tr></thead><tbody>${filasMO}</tbody></table>

<h2>Materiales</h2>
<table><thead><tr><th>Material</th><th class="num">Cantidad</th><th class="num">Precio unitario</th><th class="num">Subtotal</th><th class="num">Total con IVA</th></tr></thead><tbody>${filasMat}</tbody></table>

<div class="totales">
  <div><span>Mano de obra</span><span>${dinero(d.manoDeObra.total)}</span></div>
  <div><span>Materiales</span><span>${dinero(d.materiales.total)}</span></div>
  <div><span>Subtotal</span><span>${dinero(d.subtotal)}</span></div>
  <div><span>IVA ${esc(d.porcentajeIva)}%</span><span>${dinero(d.iva)}</span></div>
  <div class="total"><span>Total</span><span>${dinero(d.total)}</span></div>
</div>
${anticipo !== null ? `<div class="pago">Forma de pago: anticipo de <strong>${dinero(anticipo)}</strong> (50%) para iniciar y el resto al terminar. Todos los pagos se hacen a la cuenta de Sin Batallar.</div>` : '<div class="pago">Forma de pago: pago total al aceptar. Todos los pagos se hacen a la cuenta de Sin Batallar.</div>'}
<div class="pie">Precios en pesos mexicanos. La mano de obra se calcula con el catálogo homologado de Sin Batallar; los materiales se cobran a su precio. Documento generado el ${esc(fechaLarga(emitido))}.</div>
</div></body></html>`;
}
