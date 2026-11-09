'use client';
// Resumen de ganancias de cualquier rol (aperturador, incorporador, técnico, contratista) con GET /api/ganancias.
// El servidor toma el rol y el id del token; aquí solo se elige el periodo.
import { useState, useEffect } from 'react';
import { FaMoneyBillWave } from 'react-icons/fa';

const peso = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;
const PERIODOS = [['dia', 'Hoy'], ['semana', '7 días'], ['mes', '30 días'], ['año', '1 año']];

// Qué se muestra de cada transacción según el rol
const DETALLE = {
  aperturador: (t) => `Zona: ${t.zona || '—'} · ${t.servicio}`,
  incorporador: (t) => `Contratista: ${t.contratista || '—'} · ${t.servicio}`,
  tecnico: (t) => `${t.servicio} · ${t.estadoLiberacion === 'liberada' ? 'liberada' : 'por liberar'}`,
  contratista: (t) => `${t.servicio} · ${t.cliente}`
};

function Tarjeta({ titulo, valor, detalle, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      {detalle && <p className="text-xs text-gray-500 mt-1">{detalle}</p>}
    </div>
  );
}

export default function GananciasRol({ role, titulo = 'Mis ganancias' }) {
  const [periodo, setPeriodo] = useState('mes');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    fetch(`/api/ganancias?periodo=${periodo}`)
      .then(async r => { const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.error || `Error ${r.status}`); return d; })
      .then(d => { if (!cancelado) { setDatos(d); setError(null); } })
      .catch(e => { if (!cancelado) setError(e.message); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [periodo]);

  const r = datos?.resumen;
  const transacciones = (datos?.transacciones || []).slice(0, 10);
  const detalle = DETALLE[role] || DETALLE.contratista;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FaMoneyBillWave className="text-green-600" /> {titulo}</h3>
        <div className="flex gap-1">
          {PERIODOS.map(([valor, etiqueta]) => (
            <button key={valor} onClick={() => setPeriodo(valor)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${periodo === valor ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {cargando && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {r && !cargando && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tarjeta titulo="Ganado" valor={peso(r.ganado)} color="text-green-600" detalle="Pago verificado y servicio cerrado" />
            <Tarjeta titulo="Pendiente" valor={peso(r.pendiente)} color="text-amber-600" detalle="Pago verificado, servicio sin cerrar" />
            <Tarjeta titulo="Servicios cerrados" valor={r.totalServicios} />
            <Tarjeta titulo="Promedio" valor={peso(r.gananciaPromedio)} detalle="por servicio" />
          </div>
          {role === 'tecnico' && (
            <div className="grid grid-cols-2 gap-3">
              <Tarjeta titulo="Liberado" valor={peso(r.liberado)} color="text-green-600" />
              <Tarjeta titulo="Por liberar" valor={peso(r.porLiberar)} color="text-amber-600" detalle="Lo libera tu contratista" />
            </div>
          )}

          {transacciones.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay servicios cerrados en este periodo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Detalle</th><th className="py-2 pr-3 text-right">Cobrado</th><th className="py-2 text-right">Tu ganancia</th></tr>
                </thead>
                <tbody>
                  {transacciones.map(t => (
                    <tr key={t._id} className="border-t border-gray-100">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(t.fecha).toLocaleDateString('es-MX')}</td>
                      <td className="py-2 pr-3">{detalle(t)}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">{peso(t.total)}</td>
                      <td className="py-2 text-right font-semibold text-green-600 whitespace-nowrap">{peso(t.ganancia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
