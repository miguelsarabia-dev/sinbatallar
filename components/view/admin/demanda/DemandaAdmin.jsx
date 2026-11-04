"use client";
import { useState, useEffect } from 'react';
import { api } from '../comun';
import { formatDateTime } from '../../../../lib/date-utils';

export default function DemandaAdmin() {
    const [celdas, setCeldas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api('/api/areas/demanda').then(setCeldas).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Demanda fuera de zona</h2>
            <p className="text-sm text-gray-600">Lugares donde clientes buscaron servicio y no hay cobertura (celdas de ~1 km). Útil para decidir dónde abrir nuevas zonas.</p>
            {loading && <p className="text-gray-500">Cargando...</p>}
            {error && <p className="text-red-600">{error}</p>}
            {!loading && celdas.length === 0 && <p className="text-gray-500">Aún no hay búsquedas fuera de cobertura.</p>}
            <div className="overflow-x-auto bg-white border rounded-lg">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                        <tr><th className="p-3">#</th><th className="p-3">Búsquedas</th><th className="p-3">Municipio</th><th className="p-3">Ubicación</th><th className="p-3">Última vez</th></tr>
                    </thead>
                    <tbody>
                        {celdas.map((c, i) => (
                            <tr key={`${c.lat},${c.lng}`} className="border-t">
                                <td className="p-3">{i + 1}</td>
                                <td className="p-3 font-semibold">{c.total}</td>
                                <td className="p-3">{c.municipio || '—'}</td>
                                <td className="p-3">
                                    <a className="text-primary underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=14/${c.lat}/${c.lng}`}>
                                        {c.lat.toFixed(2)}, {c.lng.toFixed(2)}
                                    </a>
                                </td>
                                <td className="p-3">{formatDateTime(c.ultimaVez)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
