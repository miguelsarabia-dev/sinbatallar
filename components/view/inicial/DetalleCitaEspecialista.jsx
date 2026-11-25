'use client';
// Detalle de una cita del especialista (modelo inicial) con todas sus acciones: aspirantes, avance, cotización en
// sitio, agenda, iniciar, finalizar y soltar.
import { useEffect, useState } from 'react';
import { FaArrowLeft, FaPlus, FaTrash, FaMapMarkerAlt, FaPhoneAlt, FaUserGraduate } from 'react-icons/fa';
import {
  api, peso, fecha, direccionDe, nombreDe, EstadoCita, SUBESTADO_LABEL, Tarjeta, Boton, Campo, claseInput
} from './comun';
import { ChipsSeleccion } from '@/components/ui/ChipsServicios';

const MATERIAL_VACIO = { nombre: '', cantidad: 1, precioPorUnidad: '' };
const IVA = 0.16;

function Totales({ manoDeObra, materiales }) {
  const mat = materiales.reduce((s, m) => s + (Number(m.cantidad) || 0) * (Number(m.precioPorUnidad) || 0), 0);
  const subtotal = (Number(manoDeObra) || 0) + mat;
  const iva = subtotal * IVA;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-gray-50 rounded-lg p-3">
      <dt className="text-gray-500">Mano de obra</dt><dd className="text-right tabular-nums">{peso(manoDeObra)}</dd>
      <dt className="text-gray-500">Materiales</dt><dd className="text-right tabular-nums">{peso(mat)}</dd>
      <dt className="text-gray-500">IVA 16%</dt><dd className="text-right tabular-nums">{peso(iva)}</dd>
      <dt className="font-semibold">Total al cliente</dt><dd className="text-right font-semibold tabular-nums">{peso(subtotal + iva)}</dd>
      <dt className="text-gray-500">Anticipo (50%)</dt><dd className="text-right tabular-nums">{peso((subtotal + iva) / 2)}</dd>
    </dl>
  );
}

function FormCotizacion({ citaId, onListo, onAviso }) {
  const [descripcionTrabajo, setDescripcion] = useState('');
  const [manoDeObra, setManoDeObra] = useState('');
  const [materiales, setMateriales] = useState([]);
  const [inicio, setInicio] = useState({ fecha: '', hora: '' });
  const [enviando, setEnviando] = useState(false);

  const cambiarMaterial = (i, campo, valor) => setMateriales(ms => ms.map((m, j) => (j === i ? { ...m, [campo]: valor } : m)));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await api(`/api/inicial/citas/${citaId}/cotizar`, {
        method: 'POST',
        body: {
          descripcionTrabajo,
          manoDeObra: Number(manoDeObra),
          materiales: materiales.filter(m => m.nombre.trim()).map(m => ({ ...m, cantidad: Number(m.cantidad), precioPorUnidad: Number(m.precioPorUnidad) })),
          ...(inicio.fecha ? { fechaInicio: inicio.fecha, ...(inicio.hora ? { horaInicio: inicio.hora } : {}) } : {})
        }
      });
      onAviso({ tipo: 'ok', texto: 'Cotización enviada al cliente' });
      onListo();
    } catch (err) {
      onAviso({ tipo: 'error', texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-3">
      <Campo label="Trabajo a realizar">
        <textarea className={claseInput} rows={3} value={descripcionTrabajo} onChange={e => setDescripcion(e.target.value)}
          placeholder="Ej. Pintar sala y comedor, 45 m², dos manos" />
      </Campo>
      <Campo label="Mano de obra (sin IVA)" ayuda="Es la base del reparto. Los materiales van aparte.">
        <input type="number" min="1" step="0.01" required className={claseInput} value={manoDeObra} onChange={e => setManoDeObra(e.target.value)} />
      </Campo>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Materiales</span>
          <Boton variante="secundario" onClick={() => setMateriales(ms => [...ms, { ...MATERIAL_VACIO }])}><FaPlus className="inline mr-1" />Agregar</Boton>
        </div>
        {materiales.length === 0 && <p className="text-xs text-gray-500">Sin materiales (o los pone el cliente).</p>}
        <div className="space-y-2">
          {materiales.map((m, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input aria-label="Material" className={`${claseInput} col-span-6`} placeholder="Material" value={m.nombre} onChange={e => cambiarMaterial(i, 'nombre', e.target.value)} />
              <input aria-label="Cantidad" type="number" min="0.01" step="0.01" className={`${claseInput} col-span-2`} value={m.cantidad} onChange={e => cambiarMaterial(i, 'cantidad', e.target.value)} />
              <input aria-label="Precio por unidad" type="number" min="0" step="0.01" className={`${claseInput} col-span-3`} placeholder="$ c/u" value={m.precioPorUnidad} onChange={e => cambiarMaterial(i, 'precioPorUnidad', e.target.value)} />
              <button type="button" aria-label="Quitar material" className="col-span-1 text-red-500" onClick={() => setMateriales(ms => ms.filter((_, j) => j !== i))}><FaTrash /></button>
            </div>
          ))}
        </div>
      </div>
      <Totales manoDeObra={manoDeObra} materiales={materiales} />
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
        <p className="text-sm font-medium text-gray-800">Día para empezar el trabajo</p>
        <p className="text-xs text-gray-600 mb-2">Acuérdalo con el cliente aquí mismo: lo acepta junto con el precio. Si aún no lo saben, déjalo vacío y agéndalo después.</p>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Día de inicio" type="date" className={claseInput} min={new Date().toISOString().slice(0, 10)} value={inicio.fecha} onChange={e => setInicio(i => ({ ...i, fecha: e.target.value }))} />
          <input aria-label="Hora de inicio" type="time" className={claseInput} value={inicio.hora} onChange={e => setInicio(i => ({ ...i, hora: e.target.value }))} />
        </div>
      </div>
      <Boton type="submit" disabled={enviando || !(Number(manoDeObra) > 0)} className="w-full">{enviando ? 'Enviando…' : 'Enviar cotización al cliente'}</Boton>
    </form>
  );
}

export default function DetalleCitaEspecialista({ cita, aspirantesPropios, onVolver, onRecargar, onAviso }) {
  const [seleccion, setSeleccion] = useState((cita.aspirantes || []).map(a => a._id));
  const [reparto, setReparto] = useState(null);
  const aDia = (f) => (f ? new Date(f).toISOString().slice(0, 10) : '');
  const [visita, setVisita] = useState({ fecha: aDia(cita.fechaVisita), hora: cita.horaVisita || '' });
  const [agenda, setAgenda] = useState({ fecha: cita.fechaProgramada ? new Date(cita.fechaProgramada).toISOString().slice(0, 10) : '', hora: cita.horaInicio || '' });
  const [ocupado, setOcupado] = useState(false);
  const [recotizar, setRecotizar] = useState(false);
  const cot = cita.cotizacionAceptada;
  // Última cotización enviada que el cliente aún no contesta
  const enviada = [...(cita.cotizaciones || [])].filter(c => c.estado === 'enviada').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).at(-1);
  const cerrada = cita.estado === 'completada' && cita.pagado;
  const editable = ['atendida', 'cotizada', 'aceptada', 'verificando_pago', 'en_progreso'].includes(cita.estado);
  const anticipoOk = cot && (cot.modalidadPago === 'total' ? cot.pagoUnico?.verificado : cot.anticipo?.verificado);

  useEffect(() => {
    setVisita({ fecha: aDia(cita.fechaVisita), hora: cita.horaVisita || '' });
    setAgenda({ fecha: aDia(cita.fechaProgramada), hora: cita.horaInicio || '' });
    setSeleccion((cita.aspirantes || []).map(a => a._id));
    if (cot) api(`/api/inicial/citas/${cita._id}/reparto`).then(setReparto).catch(() => setReparto(null));
  }, [cita, cot]);

  const accion = async (fn, ok) => {
    setOcupado(true);
    try { await fn(); if (ok) onAviso({ tipo: 'ok', texto: ok }); await onRecargar(); }
    catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
    finally { setOcupado(false); }
  };

  const opcionesAspirantes = aspirantesPropios.filter(a => a.activo).map(a => ({ key: a._id, label: nombreDe(a) }));
  const cambiarAspirantes = (keys) => setSeleccion(keys.length > 2 ? seleccion : keys);
  const aspirantesCambiaron = JSON.stringify([...seleccion].sort()) !== JSON.stringify((cita.aspirantes || []).map(a => a._id).sort());

  return (
    <div className="space-y-4">
      <button onClick={onVolver} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><FaArrowLeft /> Mis servicios</button>

      <Tarjeta titulo={cita.servicio?.nombre || 'Servicio'} accion={<EstadoCita cita={cita} />}>
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">{cita.descripcionProblema}</p>
          <p className="flex items-start gap-2 text-gray-600"><FaMapMarkerAlt className="mt-0.5 shrink-0" />{direccionDe(cita.ubicacion) || 'Sin dirección'}{cita.ubicacion?.referencia ? ` — ${cita.ubicacion.referencia}` : ''}</p>
          <p className="flex items-center gap-2 text-gray-600"><FaPhoneAlt />{cita.cliente?.nombre} · {cita.cliente?.telefono || 'sin teléfono'}</p>
          <p className="text-gray-600">Visita para cotizar: <strong>{cita.fechaVisita ? fecha(cita.fechaVisita) : 'sin fecha'}</strong>{cita.horaVisita ? ` a las ${cita.horaVisita}` : ''}</p>
          <p className="text-gray-600">Inicio del trabajo: <strong>{cita.fechaProgramada ? fecha(cita.fechaProgramada) : 'por acordar'}</strong>{cita.fechaProgramada && cita.horaInicio ? ` a las ${cita.horaInicio}` : ''}</p>
          {cita.subestadoTecnico && <p className="text-gray-600">Avance: <strong>{SUBESTADO_LABEL[cita.subestadoTecnico]}</strong></p>}
        </div>
      </Tarjeta>

      {editable && (
        <Tarjeta titulo={<span className="flex items-center gap-2"><FaUserGraduate /> Aspirantes que llevas (máx. 2)</span>}
          accion={aspirantesCambiaron && <Boton disabled={ocupado} onClick={() => accion(() => api(`/api/inicial/citas/${cita._id}/aspirantes`, { method: 'PUT', body: { aspirantes: seleccion } }), 'Aspirantes actualizados')}>Guardar</Boton>}>
          <ChipsSeleccion opciones={opcionesAspirantes} seleccion={seleccion} onChange={cambiarAspirantes} vacio="Aún no tienes aspirantes activos." />
          <p className="text-xs text-gray-500 mt-2">El 12% de aspirantes se reparte en partes iguales entre los que vayan. Si no va ninguno, pasa al remanente.</p>
        </Tarjeta>
      )}

      {['atendida', 'cotizada'].includes(cita.estado) && !cot && (
        <Tarjeta titulo="Visita para cotizar">
          <p className="text-xs text-gray-500 mb-2">Es el día que propuso el cliente. Confírmalo o ajústalo con él.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <Campo label="Día"><input type="date" className={claseInput} value={visita.fecha} onChange={e => setVisita(v => ({ ...v, fecha: e.target.value }))} /></Campo>
            <Campo label="Hora"><input type="time" className={claseInput} value={visita.hora} onChange={e => setVisita(v => ({ ...v, hora: e.target.value }))} /></Campo>
            <Boton disabled={ocupado || !visita.fecha} onClick={() => accion(() => api(`/api/inicial/citas/${cita._id}/visita`, {
              method: 'PUT', body: { fechaVisita: visita.fecha, ...(visita.hora ? { horaVisita: visita.hora } : {}) }
            }), 'Visita confirmada')}>Confirmar visita</Boton>
          </div>
        </Tarjeta>
      )}

      {editable && cita.estado !== 'en_progreso' && (
        <Tarjeta titulo="Avance">
          <div className="flex flex-wrap gap-2">
            {['en_camino', 'en_sitio', 'cotizando'].map(s => (
              <Boton key={s} variante={cita.subestadoTecnico === s ? 'primario' : 'secundario'} disabled={ocupado}
                onClick={() => accion(() => api(`/api/inicial/citas/${cita._id}/avance`, { method: 'PATCH', body: { subestado: s } }))}>
                {SUBESTADO_LABEL[s]}
              </Boton>
            ))}
          </div>
        </Tarjeta>
      )}

      {enviada && !cot && !recotizar && (
        <Tarjeta titulo="Cotización enviada · esperando al cliente" accion={<Boton variante="secundario" onClick={() => setRecotizar(true)}>Hacer otra</Boton>}>
          {enviada.descripcionTrabajo && <p className="text-sm text-gray-700 mb-2">{enviada.descripcionTrabajo}</p>}
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-gray-500">Mano de obra</dt><dd className="text-right tabular-nums">{peso(enviada.manoDeObra)}</dd>
            <dt className="text-gray-500">Materiales</dt><dd className="text-right tabular-nums">{peso(enviada.costoMateriales)}</dd>
            <dt className="text-gray-500">IVA</dt><dd className="text-right tabular-nums">{peso(enviada.iva)}</dd>
            <dt className="font-semibold">Total</dt><dd className="text-right font-semibold tabular-nums">{peso(enviada.total)}</dd>
          </dl>
          <p className="text-sm mt-2">Inicio del trabajo propuesto: <strong>{enviada.fechaInicioPropuesta ? `${fecha(enviada.fechaInicioPropuesta)}${enviada.horaInicioPropuesta ? ' a las ' + enviada.horaInicioPropuesta : ''}` : 'por acordar'}</strong></p>
          <p className="text-xs text-gray-500 mt-1">Enviada {fecha(enviada.createdAt, true)}. Cuando el cliente la acepte, el día de inicio queda guardado.</p>
        </Tarjeta>
      )}

      {['atendida', 'cotizada'].includes(cita.estado) && !cot && (!enviada || recotizar) && (
        <Tarjeta titulo={enviada ? 'Nueva cotización (reemplaza la enviada)' : 'Cotizar en sitio'}
          accion={enviada && <Boton variante="secundario" onClick={() => setRecotizar(false)}>Cancelar</Boton>}>
          <FormCotizacion citaId={cita._id} onListo={async () => { setRecotizar(false); await onRecargar(); }} onAviso={onAviso} />
        </Tarjeta>
      )}

      {cot && (
        <Tarjeta titulo="Cotización aceptada">
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-gray-500">Mano de obra</dt><dd className="text-right tabular-nums">{peso(cot.manoDeObra)}</dd>
            <dt className="text-gray-500">Materiales</dt><dd className="text-right tabular-nums">{peso(cot.costoMateriales)}</dd>
            <dt className="text-gray-500">Total</dt><dd className="text-right font-semibold tabular-nums">{peso(cot.total)}</dd>
            <dt className="text-gray-500">Pago</dt>
            <dd className="text-right">{cot.modalidadPago === 'total' ? 'Total' : 'Anticipo 50% + saldo'} · {anticipoOk ? <span className="text-green-700 font-medium">verificado</span> : <span className="text-orange-600 font-medium">por verificar</span>}</dd>
          </dl>
          {reparto?.reparto && (
            <div className="mt-3 border-t pt-3 text-sm">
              <p className="font-medium mb-1">Tu parte {reparto.estimado ? '(estimada)' : ''}</p>
              <p className="tabular-nums">Comisión especialista: <strong>{peso(reparto.reparto.especialista?.monto)}</strong></p>
              {reparto.reparto.aspirantes?.cantidad > 0 && (
                <p className="tabular-nums text-gray-600">Cada aspirante: {peso(reparto.reparto.aspirantes.porAspirante?.monto)}</p>
              )}
            </div>
          )}
        </Tarjeta>
      )}

      {cot && ['aceptada', 'verificando_pago', 'en_progreso'].includes(cita.estado) && (
        <Tarjeta titulo={cita.fechaProgramada ? 'Inicio del trabajo (reprogramar)' : 'Agendar el inicio del trabajo'}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <Campo label="Día"><input type="date" className={claseInput} value={agenda.fecha} onChange={e => setAgenda(a => ({ ...a, fecha: e.target.value }))} /></Campo>
            <Campo label="Hora"><input type="time" className={claseInput} value={agenda.hora} onChange={e => setAgenda(a => ({ ...a, hora: e.target.value }))} /></Campo>
            <Boton disabled={ocupado || !agenda.fecha} onClick={() => accion(() => api(`/api/inicial/citas/${cita._id}/agendar`, {
              method: 'PUT', body: { fechaProgramada: new Date(`${agenda.fecha}T12:00:00`).toISOString(), ...(agenda.hora ? { horaInicio: agenda.hora } : {}) }
            }), 'Inicio del trabajo guardado')}>Guardar fecha</Boton>
          </div>
        </Tarjeta>
      )}

      <div className="flex flex-wrap gap-2">
        {cot && ['aceptada', 'verificando_pago', 'cotizada'].includes(cita.estado) && (
          <Boton disabled={ocupado || !anticipoOk} onClick={() => accion(() => api(`/api/inicial/citas/${cita._id}/iniciar`, { method: 'POST' }), 'Trabajo iniciado')}>
            {anticipoOk ? 'Iniciar trabajo' : 'Iniciar (esperando anticipo verificado)'}
          </Boton>
        )}
        {cita.estado === 'en_progreso' && (
          <Boton disabled={ocupado} onClick={() => accion(() => api(`/api/inicial/citas/${cita._id}/finalizar`, { method: 'POST', body: {} }), 'Trabajo terminado: falta que el cliente confirme y pague el saldo')}>
            Terminar trabajo
          </Boton>
        )}
        {['atendida', 'cotizada'].includes(cita.estado) && !cot && (
          <Boton variante="peligro" disabled={ocupado} onClick={() => {
            if (window.confirm('¿Soltar la cita? Regresará a la bolsa para que la tome otro especialista.')) {
              accion(async () => { await api(`/api/inicial/citas/${cita._id}/soltar`, { method: 'POST', body: {} }); onVolver(); }, 'La cita regresó a la bolsa');
            }
          }}>Soltar cita</Boton>
        )}
      </div>
      {cita.estado === 'completada' && !cerrada && <p className="text-sm text-gray-600">Esperando que el cliente confirme y pague el saldo. Sin Batallar verifica el pago y cierra el servicio.</p>}
    </div>
  );
}
