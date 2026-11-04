'use client';
// Historial de pagos del cliente (GET /api/comprobantes sin cotizacionId).
import { useState, useEffect } from 'react';
import { peso, ETIQUETA_TIPO } from './SubirComprobante';

const ESTADO = (c) => c.estado === 'rechazado' ? ['Rechazado', 'text-red-600']
    : c.estado === 'reemplazado' ? ['Reemplazado', 'text-gray-500']
    : c.verificado ? ['Verificado', 'text-green-600'] : ['En revisión', 'text-amber-600'];

export default function HistorialPagosCliente() {
    const [abierto, setAbierto] = useState(false);
    const [pagos, setPagos] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!abierto || pagos) return;
        fetch('/api/comprobantes')
            .then(async r => { const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.error || 'Error'); return d; })
            .then(setPagos)
            .catch(e => setError(e.message));
    }, [abierto, pagos]);

    return (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
            <button onClick={() => setAbierto(v => !v)} className="w-full flex items-center justify-between font-semibold text-gray-900">
                Historial de pagos <span className="text-gray-400">{abierto ? '−' : '+'}</span>
            </button>
            {abierto && (
                <div className="mt-3 space-y-2 text-sm">
                    {error && <p className="text-red-600">{error}</p>}
                    {!pagos && !error && <p className="text-gray-500">Cargando...</p>}
                    {pagos?.length === 0 && <p className="text-gray-500">Aún no has subido comprobantes.</p>}
                    {pagos?.map(c => {
                        const [texto, color] = ESTADO(c);
                        return (
                            <div key={c._id} className="border rounded-lg p-3 flex gap-3">
                                <a href={c.imagenUrl} target="_blank" rel="noreferrer"><img src={c.imagenUrl} alt="Comprobante" className="w-16 h-16 object-cover rounded border" /></a>
                                <div className="flex-1">
                                    <p className="font-medium">{c.cita?.servicio?.nombre || 'Servicio'} · {ETIQUETA_TIPO[c.tipo]}</p>
                                    <p className="text-gray-600">{peso(c.monto)} de {peso(c.cotizacion?.total)} · {new Date(c.createdAt).toLocaleString('es-MX')}</p>
                                    <p className={color}>{texto}{c.estado === 'rechazado' && c.motivoRechazo ? `: ${c.motivoRechazo}` : ''}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
