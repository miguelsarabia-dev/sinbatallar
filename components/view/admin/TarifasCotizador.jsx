'use client';
// Admin › Tarifas del cotizador: tarifa fija de mano de obra por concepto (catálogo homologado, 106 conceptos en 14
// especialidades). El especialista y el contratista NO pueden cambiarla al cotizar: la fija el admin aquí.
// Tarifa vacía = la del catálogo (Excel de cotizadores). Sin tarifa, el concepto no se puede cotizar.
// Mínimo: importe mínimo de mano de obra del concepto (se cobra el mayor). GET/PUT /api/admin/cotizador.
import { useEffect, useMemo, useState } from 'react';

const peso = (n) => (n || n === 0 ? `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 })}` : '—');
const input = 'w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right tabular-nums';

export default function TarifasCotizador({ showError, showSuccess }) {
  const [datos, setDatos] = useState(null);
  const [cambios, setCambios] = useState({});
  const [filtro, setFiltro] = useState('');
  const [soloSinTarifa, setSoloSinTarifa] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => fetch('/api/admin/cotizador')
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar el cotizador'))))
    .then(d => { setDatos(d); setCambios({}); })
    .catch(e => showError?.(e.message));
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- carga única al abrir

  const valor = (id, campo) => (cambios[id]?.[campo] !== undefined ? cambios[id][campo] : (datos?.ajustes?.[id]?.[campo] ?? ''));
  const cambiar = (id, campo, v) => setCambios(c => ({ ...c, [id]: { ...(c[id] || {}), [campo]: v } }));

  const grupos = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const lista = (datos?.catalogo || []).filter(c =>
      (!q || `${c.concepto} ${c.especialidad} ${c.id}`.toLowerCase().includes(q)) && (!soloSinTarifa || !c.tarifa));
    return lista.reduce((acc, c) => { (acc[c.especialidad] ||= []).push(c); return acc; }, {});
  }, [datos, filtro, soloSinTarifa]);

  const guardar = async () => {
    setGuardando(true);
    try {
      // Ajustes completos: los guardados + los cambios de esta sesión
      const ajustes = { ...(datos.ajustes || {}) };
      for (const [id, c] of Object.entries(cambios)) {
        const actual = { ...(ajustes[id] || {}) };
        if (c.tarifa !== undefined) actual.tarifa = c.tarifa === '' ? null : Number(c.tarifa);
        if (c.minimo !== undefined) actual.minimo = c.minimo === '' ? null : Number(c.minimo);
        if (c.activo === false) actual.activo = false;
        if (c.activo === true) delete actual.activo;
        ajustes[id] = actual;
      }
      const r = await fetch('/api/admin/cotizador', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ajustes }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'No se pudo guardar');
      setDatos(d); setCambios({});
      showSuccess?.('Tarifas guardadas. Aplican a las cotizaciones nuevas.');
    } catch (e) { showError?.(e.message); } finally { setGuardando(false); }
  };

  if (!datos) return <p className="text-gray-500">Cargando cotizador…</p>;
  const sinTarifa = datos.catalogo.filter(c => !c.tarifa).length;
  const hayCambios = Object.keys(cambios).length > 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Tarifas del cotizador</h2>
            <p className="text-sm text-gray-600 max-w-2xl">Tarifa fija de mano de obra por unidad (sin IVA). Quien cotiza solo captura la cantidad.
              Vacía = la del catálogo ({datos.version}). <strong>{sinTarifa}</strong> conceptos no tienen tarifa y no se pueden cotizar hasta que la fijes.</p>
          </div>
          <button type="button" disabled={!hayCambios || guardando} onClick={guardar}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-40">{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <input className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-72" placeholder="Buscar concepto o especialidad…" value={filtro} onChange={e => setFiltro(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={soloSinTarifa} onChange={e => setSoloSinTarifa(e.target.checked)} />Solo sin tarifa</label>
        </div>
      </div>

      {Object.entries(grupos).map(([esp, conceptos]) => (
        <div key={esp} className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <h3 className="px-4 py-2 font-semibold text-gray-900 border-b border-gray-100">{esp}</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 text-left">
              <th className="px-4 py-2">Concepto</th><th className="px-2">Unidad</th><th className="px-2 text-right">Catálogo</th>
              <th className="px-2 text-right">Tarifa fija</th><th className="px-2 text-right">Mínimo</th><th className="px-2 text-center">Activo</th>
            </tr></thead>
            <tbody>
              {conceptos.map(c => {
                const activo = valor(c.id, 'activo') !== false;
                return (
                  <tr key={c.id} className={`border-t border-gray-50 ${!c.tarifa ? 'bg-amber-50/60' : ''}`}>
                    <td className="px-4 py-1.5"><span className="text-gray-900">{c.concepto}</span> <span className="text-xs text-gray-400">{c.id}</span></td>
                    <td className="px-2 text-gray-600">{c.unidad}</td>
                    <td className="px-2 text-right text-gray-500 tabular-nums">{peso(c.tarifaCatalogo)}</td>
                    <td className="px-2 text-right"><input type="number" min="0" step="0.01" className={input} placeholder={c.tarifaCatalogo ?? 'fijar'} aria-label={`Tarifa ${c.concepto}`}
                      value={valor(c.id, 'tarifa')} onChange={e => cambiar(c.id, 'tarifa', e.target.value)} /></td>
                    <td className="px-2 text-right"><input type="number" min="0" step="0.01" className={input} placeholder="0" aria-label={`Mínimo ${c.concepto}`}
                      value={valor(c.id, 'minimo')} onChange={e => cambiar(c.id, 'minimo', e.target.value)} /></td>
                    <td className="px-2 text-center"><input type="checkbox" aria-label={`Activo ${c.concepto}`} checked={activo}
                      onChange={e => cambiar(c.id, 'activo', e.target.checked)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
