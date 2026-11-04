"use client";
import { useState, useEffect, useCallback } from 'react';
import { api, json, claseBoton } from '../comun';
import { formatDateTime } from '../../../../lib/date-utils';

export default function CalificacionesAdmin() {
    const [lista, setLista] = useState([]);
    const [tipo, setTipo] = useState('');
    const [oculta, setOculta] = useState('');
    const [maximo, setMaximo] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const q = new URLSearchParams();
            if (tipo) q.set('tipo', tipo);
            if (oculta) q.set('oculta', oculta);
            if (maximo) q.set('maximo', maximo);
            setLista(await api(`/api/admin/calificaciones?${q}`));
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, [tipo, oculta, maximo]);
    useEffect(() => { cargar(); }, [cargar]);

    const moderar = async (c) => {
        let motivo;
        if (!c.oculta) {
            motivo = window.prompt('Motivo para ocultar la reseña:');
            if (!motivo?.trim()) return;
        }
        try { await api(`/api/calificaciones/${c._id}`, json('PATCH', { oculta: !c.oculta, motivo })); cargar(); }
        catch (e) { window.alert(e.message); }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Calificaciones</h2>
            <div className="flex flex-wrap gap-3">
                <select value={tipo} onChange={e => setTipo(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                    <option value="">Contratistas y técnicos</option>
                    <option value="Contratista">Contratistas</option>
                    <option value="Tecnico">Técnicos</option>
                </select>
                <select value={oculta} onChange={e => setOculta(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                    <option value="">Visibles y ocultas</option>
                    <option value="false">Visibles</option>
                    <option value="true">Ocultas</option>
                </select>
                <select value={maximo} onChange={e => setMaximo(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                    <option value="">Cualquier puntaje</option>
                    <option value="2">2 ★ o menos</option>
                    <option value="3">3 ★ o menos</option>
                </select>
            </div>
            {loading && <p className="text-gray-500">Cargando...</p>}
            {error && <p className="text-red-600">{error}</p>}
            {!loading && lista.length === 0 && <p className="text-gray-500">Sin calificaciones.</p>}
            <div className="space-y-3">
                {lista.map(c => (
                    <div key={c._id} className={`bg-white border rounded-lg p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3 ${c.oculta ? 'opacity-70' : ''}`}>
                        <div className="text-sm text-gray-700">
                            <p className="font-semibold">{'★'.repeat(c.puntaje)}{'☆'.repeat(5 - c.puntaje)} · {c.tipoCalificado}: {c.calificado.nombre}</p>
                            <p className="text-gray-500">De {c.cliente?.nombre || '—'} · {c.servicio || 'Servicio'} · {formatDateTime(c.createdAt)}</p>
                            {c.comentario && <p className="mt-1">“{c.comentario}”</p>}
                            {c.oculta && <p className="text-red-600">Oculta: {c.motivoOculta}</p>}
                        </div>
                        <button onClick={() => moderar(c)} className={c.oculta ? claseBoton.primario : claseBoton.peligro}>
                            {c.oculta ? 'Mostrar' : 'Ocultar'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
