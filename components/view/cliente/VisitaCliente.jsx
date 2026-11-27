'use client';
// MODELO INICIAL: la visita para cotizar vista por el cliente. Muestra en qué va (propuesta del especialista,
// esperando confirmación, acordada, en camino, llegó, cotizando) y le deja aceptar la fecha o proponer otra.
// Reglas en lib/inicial-visita.js; la ruta es POST /api/citas/[id]/visita.
import { useState } from 'react';
import { FaCalendarAlt, FaCar, FaCheckCircle, FaHourglassHalf, FaHome, FaFileInvoiceDollar } from 'react-icons/fa';
import { etapaVisitaCliente } from '@/lib/inicial-visita';

const ICONO = { responder: FaCalendarAlt, esperando: FaHourglassHalf, acordada: FaCheckCircle, en_camino: FaCar, en_sitio: FaHome, cotizando: FaFileInvoiceDollar };
const COLOR = {
  responder: 'bg-amber-50 border-amber-300 text-amber-900',
  esperando: 'bg-slate-50 border-slate-200 text-slate-700',
  acordada: 'bg-green-50 border-green-200 text-green-900',
  en_camino: 'bg-sky-50 border-sky-300 text-sky-900',
  en_sitio: 'bg-sky-50 border-sky-300 text-sky-900',
  cotizando: 'bg-sky-50 border-sky-300 text-sky-900',
};
const hoyISO = () => new Date().toLocaleDateString('en-CA');
const cuando = (c) => `${new Date(c.fechaVisita).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}${c.horaVisita ? ` a las ${c.horaVisita}` : ''}`;

export default function VisitaCliente({ cita, onCambio, showSuccess, showError }) {
  const [proponer, setProponer] = useState(false);
  const [form, setForm] = useState({ fecha: '', hora: '' });
  const [enviando, setEnviando] = useState(false);
  const etapa = etapaVisitaCliente(cita);

  // Fuera del acuerdo (cita abierta o ya cotizada) solo se muestra la fecha
  if (!etapa) {
    if (!cita.fechaVisita) return null;
    return (
      <div className="bg-sky-50 rounded-lg p-2.5 sm:p-3 border border-sky-200 text-xs sm:text-sm flex items-center gap-2">
        <FaCalendarAlt className="text-sky-600 flex-shrink-0" />
        <span><span className="text-slate-600">{cita.estado === 'solicitada' ? 'Día que pediste para la visita:' : 'Visita para cotizar:'}</span>{' '}
          <span className="font-bold text-foreground">{new Date(cita.fechaVisita).toLocaleDateString('es-MX')}{cita.horaVisita ? ` · ${cita.horaVisita}` : ''}</span></span>
      </div>
    );
  }

  const enviar = async (body) => {
    setEnviando(true);
    try {
      const res = await fetch(`/api/citas/${cita._id}/visita`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      showSuccess?.(body.aceptar ? 'El especialista ya sabe que aceptaste el día.' : 'El especialista revisará el día que propones.', body.aceptar ? 'Visita acordada' : 'Propuesta enviada');
      setProponer(false);
      onCambio?.();
    } catch (err) {
      showError?.(err.message);
    } finally { setEnviando(false); }
  };

  const Icono = ICONO[etapa.clave] || FaCalendarAlt;
  const puedeProponer = ['responder', 'esperando', 'acordada', 'en_camino'].includes(etapa.clave);

  return (
    <div className={`rounded-lg p-3 border text-sm ${COLOR[etapa.clave] || COLOR.esperando}`}>
      <p className="font-bold flex items-center gap-2"><Icono className="flex-shrink-0" />{etapa.texto}</p>
      {cita.fechaVisita && (
        <p className="mt-1">
          {etapa.clave === 'responder' ? 'Propone: ' : etapa.clave === 'esperando' ? 'Propusiste: ' : 'Visita: '}
          <strong className="capitalize">{cuando(cita)}</strong>
        </p>
      )}

      {etapa.clave === 'responder' && !proponer && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" disabled={enviando} onClick={() => enviar({ aceptar: true })}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50">Acepto ese día</button>
          <button type="button" disabled={enviando} onClick={() => setProponer(true)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white font-semibold text-gray-700 hover:bg-gray-50">Proponer otro día</button>
        </div>
      )}
      {etapa.clave !== 'responder' && puedeProponer && !proponer && (
        <button type="button" onClick={() => setProponer(true)} className="mt-2 text-xs font-semibold underline">
          {etapa.clave === 'esperando' ? 'Cambiar el día que propuse' : 'Pedir otro día'}
        </button>
      )}

      {proponer && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <label className="text-xs text-gray-700">Día
            <input type="date" min={hoyISO()} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900" />
          </label>
          <label className="text-xs text-gray-700">Hora (opcional)
            <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={enviando || !form.fecha} onClick={() => enviar({ fechaVisita: form.fecha, ...(form.hora ? { horaVisita: form.hora } : {}) })}
              className="flex-1 px-3 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">Enviar</button>
            <button type="button" onClick={() => setProponer(false)} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
