"use client";
import { useState, useEffect, useCallback } from 'react';
import { api, json, claseBoton } from '../comun';

export default function TecnicosAdmin() {
    const [tecnicos, setTecnicos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    const cargar = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            setTecnicos(await api('/api/tecnicos'));
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, []);
    useEffect(() => { cargar(); }, [cargar]);

    const cambiarActivo = async (t) => {
        try { await api(`/api/tecnicos/${t._id}`, json('PUT', { activo: !t.activo })); cargar(); }
        catch (e) { window.alert(e.message); }
    };

    const cambiarSuspension = async (t) => {
        const suspender = !t.user?.suspendido;
        let motivo;
        if (suspender) {
            motivo = window.prompt('Motivo de la suspensión:');
            if (!motivo?.trim()) return;
        }
        try { await api(`/api/users/${t.user._id}/suspender`, json('PUT', { suspendido: suspender, motivo })); cargar(); }
        catch (e) { window.alert(e.message); }
    };

    const visibles = tecnicos.filter(t => {
        const q = busqueda.trim().toLowerCase();
        return !q || [t.user?.nombre, t.user?.email, t.contratista?.nombre].some(v => v?.toLowerCase().includes(q));
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Técnicos</h2>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar técnico o contratista"
                    className="border rounded-md px-3 py-2 text-sm w-64" />
            </div>
            {loading && <p className="text-gray-500">Cargando...</p>}
            {error && <p className="text-red-600">{error}</p>}
            <div className="overflow-x-auto bg-white border rounded-lg">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                            <th className="p-3">Técnico</th><th className="p-3">Contratista</th><th className="p-3">Disponible</th>
                            <th className="p-3">Cuenta</th><th className="p-3">% ganancia</th><th className="p-3">Calificación</th>
                            <th className="p-3">Citas activas</th><th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibles.map(t => (
                            <tr key={t._id} className="border-t">
                                <td className="p-3">{t.user?.nombre}<br /><span className="text-gray-500">{t.user?.email}</span></td>
                                <td className="p-3">{t.contratista?.nombre}</td>
                                <td className="p-3">{t.disponible ? <span className="text-green-600">Sí</span> : <span className="text-gray-500">No</span>}</td>
                                <td className="p-3">
                                    {t.user?.suspendido
                                        ? <span className="text-red-600">Suspendido</span>
                                        : t.activo ? <span className="text-green-600">Activo</span> : <span className="text-gray-500">Inactivo</span>}
                                </td>
                                <td className="p-3">{t.porcentajeGanancia ?? 0}%</td>
                                <td className="p-3">{t.totalCalificaciones ? `${Number(t.promedioCalificacion).toFixed(1)} ★ (${t.totalCalificaciones})` : '—'}</td>
                                <td className="p-3">{t.citasActivas}</td>
                                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                                    <button onClick={() => cambiarActivo(t)} className={claseBoton.suave}>{t.activo ? 'Desactivar' : 'Activar'}</button>
                                    <button onClick={() => cambiarSuspension(t)} className={t.user?.suspendido ? claseBoton.primario : claseBoton.peligro}>
                                        {t.user?.suspendido ? 'Reactivar' : 'Suspender'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && visibles.length === 0 && <p className="p-4 text-gray-500">Sin técnicos.</p>}
            </div>
        </div>
    );
}
