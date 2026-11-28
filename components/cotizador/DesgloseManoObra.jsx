'use client';
// Cotizador por especialidad: desglosa la MANO DE OBRA en conceptos del catálogo homologado (GET /api/cotizador).
// Quien cotiza elige especialidad → concepto, captura cantidad (m², pieza, metro lineal…), factor de dificultad (con
// justificación) y medidas. La tarifa es FIJA (catálogo o la que autorizó el admin) y el servidor recalcula todo.
// Lo usan el especialista y el contratista. Reglas en lib/cotizador.js.
//
// Props: servicioId (para sugerir la especialidad), lineas [{ conceptoId, cantidad, factor, justificacion, nota }],
//        onChange(lineas, totalManoDeObra)
import { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { importeConcepto } from '@/lib/cotizador';

const peso = (n) => `$${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary';
const NUEVA = { conceptoId: '', cantidad: '', factor: 1, justificacion: '', nota: '' };

/** Total de la mano de obra de unas líneas con el catálogo (mismo cálculo que el servidor). */
export function totalDesglose(lineas, catalogo) {
  const porId = new Map((catalogo || []).map(c => [c.id, c]));
  return Math.round((lineas || []).reduce((s, l) => {
    const c = porId.get(l.conceptoId);
    return c?.tarifa && Number(l.cantidad) > 0 ? s + importeConcepto({ cantidad: l.cantidad, tarifa: c.tarifa, factor: l.factor || 1, minimo: c.minimo }) : s;
  }, 0) * 100) / 100;
}

/** Líneas editables a partir del desglose guardado de una cotización. */
export const lineasDeCotizacion = (cot) => (cot?.desgloseManoObra || []).map(c => ({
  conceptoId: c.conceptoId, cantidad: c.cantidad, factor: c.factor || 1, justificacion: c.justificacion || '', nota: c.nota || ''
}));

export default function DesgloseManoObra({ servicioId, lineas, onChange }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [especialidad, setEspecialidad] = useState('');
  const [nueva, setNueva] = useState(NUEVA);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/cotizador${servicioId ? `?servicio=${servicioId}` : ''}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar el catálogo'))))
      .then(d => { if (!vivo) return; setDatos(d); setEspecialidad(e => e || d.especialidadSugerida || d.especialidades[0]); })
      .catch(e => vivo && setError(e.message));
    return () => { vivo = false; };
  }, [servicioId]);

  const porId = useMemo(() => new Map((datos?.catalogo || []).map(c => [c.id, c])), [datos]);
  const conceptos = (datos?.catalogo || []).filter(c => c.especialidad === especialidad);
  const elegido = porId.get(nueva.conceptoId);
  const total = totalDesglose(lineas, datos?.catalogo);
  const avisar = (ls) => onChange(ls, totalDesglose(ls, datos?.catalogo));

  const agregar = () => {
    if (!elegido || !(Number(nueva.cantidad) > 0)) return;
    if (Number(nueva.factor) > 1 && !nueva.justificacion.trim()) return;
    avisar([...lineas, { ...nueva, cantidad: Number(nueva.cantidad), factor: Number(nueva.factor) }]);
    setNueva(NUEVA);
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!datos) return <p className="text-sm text-gray-500">Cargando catálogo…</p>;

  return (
    <div className="border border-primary/40 bg-amber-50/40 rounded-lg p-3 space-y-3">
      {lineas.length > 0 && (
        <ul className="divide-y divide-gray-200 bg-white rounded-md border border-gray-200">
          {lineas.map((l, i) => {
            const c = porId.get(l.conceptoId);
            const importe = c?.tarifa ? importeConcepto({ cantidad: l.cantidad, tarifa: c.tarifa, factor: l.factor || 1, minimo: c.minimo }) : 0;
            return (
              <li key={i} className="flex items-start gap-2 p-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{c?.concepto || l.conceptoId} <span className="text-xs text-gray-500">· {c?.especialidad}</span></p>
                  <p className="text-xs text-gray-600 tabular-nums">
                    {l.cantidad} {c?.unidad} × {peso(c?.tarifa)}{Number(l.factor) > 1 ? ` × ${l.factor}` : ''}{c?.minimo ? ` (mínimo ${peso(c.minimo)})` : ''}
                    {l.nota ? ` · ${l.nota}` : ''}
                  </p>
                  {Number(l.factor) > 1 && <p className="text-xs text-amber-800">Dificultad: {l.justificacion}</p>}
                </div>
                <span className="font-semibold tabular-nums">{peso(importe)}</span>
                <button type="button" aria-label="Quitar concepto" className="text-red-500 p-1" onClick={() => avisar(lineas.filter((_, j) => j !== i))}><FaTrash /></button>
              </li>
            );
          })}
          <li className="flex justify-between p-2 text-sm font-semibold bg-gray-50"><span>Mano de obra</span><span className="tabular-nums">{peso(total)}</span></li>
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-xs text-gray-700">Especialidad
          <select className={`${input} mt-1`} value={especialidad} onChange={e => { setEspecialidad(e.target.value); setNueva(NUEVA); }}>
            {datos.especialidades.map(e => <option key={e} value={e}>{e}{e === datos.especialidadSugerida ? ' (sugerida)' : ''}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-700">Concepto
          <select className={`${input} mt-1`} value={nueva.conceptoId} onChange={e => setNueva(n => ({ ...n, conceptoId: e.target.value }))}>
            <option value="">Elige el trabajo…</option>
            {conceptos.map(c => (
              <option key={c.id} value={c.id} disabled={!c.disponible}>
                {c.concepto} · {c.disponible ? `${peso(c.tarifa)}/${c.unidad}` : 'sin tarifa autorizada'}
              </option>
            ))}
          </select>
        </label>
      </div>
      {elegido && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
          <label className="text-xs text-gray-700">Cantidad ({elegido.unidad})
            <input type="number" min="0.01" step="0.01" className={`${input} mt-1`} value={nueva.cantidad} onChange={e => setNueva(n => ({ ...n, cantidad: e.target.value }))} />
          </label>
          <label className="text-xs text-gray-700">Dificultad
            <select className={`${input} mt-1`} value={nueva.factor} onChange={e => setNueva(n => ({ ...n, factor: Number(e.target.value) }))}>
              {datos.factores.map(f => <option key={f} value={f}>{f === 1 ? 'Normal' : `+${Math.round((f - 1) * 100)}%`}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-700 col-span-2">Medidas / nota (opcional)
            <input className={`${input} mt-1`} maxLength={200} placeholder="Ej. Sala 4×5 m" value={nueva.nota} onChange={e => setNueva(n => ({ ...n, nota: e.target.value }))} />
          </label>
          {Number(nueva.factor) > 1 && (
            <label className="text-xs text-gray-700 col-span-2 sm:col-span-4">¿Por qué es más difícil? *
              <input className={`${input} mt-1`} maxLength={200} placeholder="Ej. Muro a doble altura, requiere andamio" value={nueva.justificacion} onChange={e => setNueva(n => ({ ...n, justificacion: e.target.value }))} />
            </label>
          )}
          <div className="col-span-2 sm:col-span-4 flex items-center justify-between gap-2">
            <span className="text-sm text-gray-700 tabular-nums">
              {Number(nueva.cantidad) > 0 ? <>Importe: <strong>{peso(importeConcepto({ cantidad: nueva.cantidad, tarifa: elegido.tarifa, factor: nueva.factor, minimo: elegido.minimo }))}</strong></> : `Tarifa fija: ${peso(elegido.tarifa)} por ${elegido.unidad}`}
            </span>
            <button type="button" onClick={agregar}
              disabled={!(Number(nueva.cantidad) > 0) || (Number(nueva.factor) > 1 && !nueva.justificacion.trim()) || lineas.length >= datos.maxConceptos}
              className="px-3 py-2 rounded-lg bg-secondary text-white text-sm font-semibold disabled:opacity-40"><FaPlus className="inline mr-1" />Agregar</button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500">Tarifas fijas del catálogo de Sin Batallar. El cliente ve cada trabajo con su cantidad e importe, no la tarifa.</p>
    </div>
  );
}
