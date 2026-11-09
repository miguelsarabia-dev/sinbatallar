'use client';
// Total de ventas surtidas del ferretero (solicitudes de material en estado 'surtida'), por periodo.
import { useState, useEffect } from 'react';

const peso = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;
const DIAS = { dia: 1, semana: 7, mes: 30, año: 365 };
const PERIODOS = [['dia', 'Hoy'], ['semana', '7 días'], ['mes', '30 días'], ['año', '1 año']];

export default function VentasSurtidasFerretero() {
  const [periodo, setPeriodo] = useState('mes');
  const [solicitudes, setSolicitudes] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/solicitudes-materiales?estado=surtida')
      .then(async r => { const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.error || `Error ${r.status}`); return d; })
      .then(setSolicitudes)
      .catch(e => setError(e.message));
  }, []);

  const desde = Date.now() - DIAS[periodo] * 86400000;
  // La fecha en que se surtió está en el historial; si no, la de la última actualización
  const surtidas = (solicitudes || []).filter(s => {
    const f = s.historial?.filter(h => h.estado === 'surtida').pop()?.fecha || s.updatedAt;
    return new Date(f).getTime() >= desde;
  });
  const total = surtidas.reduce((t, s) => t + (Number(s.total) || 0), 0);

  return (
    <div className="bg-gradient-to-br from-green-600 to-green-500 rounded-xl p-4 text-white">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm opacity-90">Ventas surtidas</span>
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="text-xs text-gray-800 rounded px-1 py-0.5">
          {PERIODOS.map(([v, e]) => <option key={v} value={v}>{e}</option>)}
        </select>
      </div>
      {error ? <div className="text-sm">{error}</div> : (
        <>
          <div className="text-3xl font-bold">{solicitudes ? peso(total) : '...'}</div>
          <div className="text-xs opacity-90">{surtidas.length} solicitud(es) surtida(s)</div>
        </>
      )}
    </div>
  );
}
