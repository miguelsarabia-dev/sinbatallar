"use client";
import { useState, useEffect, useCallback } from 'react';
import { api, peso } from '../comun';
import { formatDateTime } from '../../../../lib/date-utils';

const ESTADOS = ['pendiente', 'confirmada', 'surtida', 'cancelada'];
const COLOR = { pendiente: 'text-amber-600', confirmada: 'text-blue-600', surtida: 'text-green-600', cancelada: 'text-red-600' };

export default function SolicitudesMaterialAdmin() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [ferreterias, setFerreterias] = useState([]);
    const [estado, setEstado] = useState('');
    const [ferreteria, setFerreteria] = useState('');
    const [abierta, setAbierta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => { api('/api/ferreteros').then(setFerreterias).catch(() => {}); }, []);

    const cargar = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const q = new URLSearchParams();
            if (estado) q.set('estado', estado);
            if (ferreteria) q.set('ferreteriaId', ferreteria);
            setSolicitudes(await api(`/api/solicitudes-materiales?${q}`));
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, [estado, ferreteria]);
    useEffect(() => { cargar(); }, [cargar]);

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Solicitudes de material</h2>
            <div className="flex flex-wrap gap-3">
                <select value={estado} onChange={e => setEstado(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                    <option value="">Todos los estados</option>
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select value={ferreteria} onChange={e => setFerreteria(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                    <option value="">Todas las ferreterías</option>
                    {ferreterias.map(f => <option key={f._id} value={f._id}>{f.nombreNegocio}</option>)}
                </select>
            </div>
            {loading && <p className="text-gray-500">Cargando...</p>}
            {error && <p className="text-red-600">{error}</p>}
            {!loading && solicitudes.length === 0 && <p className="text-gray-500">Sin solicitudes.</p>}
            <div className="space-y-3">
                {solicitudes.map(s => (
                    <div key={s._id} className="bg-white border rounded-lg p-4">
                        <button className="w-full text-left" onClick={() => setAbierta(abierta === s._id ? null : s._id)}>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="font-semibold">{s.ferreteria?.nombreNegocio} · {s.cita?.servicio?.nombre || 'Servicio'}</span>
                                <span className={`font-medium ${COLOR[s.estado]}`}>{s.estado}</span>
                            </div>
                            <p className="text-sm text-gray-500">{s.items?.length} material(es) · {peso(s.total)} · {formatDateTime(s.createdAt)} · {s.modoEntrega}</p>
                        </button>
                        {abierta === s._id && (
                            <div className="mt-3 text-sm text-gray-700 space-y-1 border-t pt-3">
                                <p>Contratista: {s.contratista?.nombre} {s.contratista?.telefono && `(${s.contratista.telefono})`}</p>
                                {s.tecnico && <p>Técnico: {s.tecnico.nombre} {s.tecnico.telefono && `(${s.tecnico.telefono})`}</p>}
                                {s.fechaRequerida && <p>Requerida: {formatDateTime(s.fechaRequerida)}</p>}
                                <ul className="list-disc pl-5">
                                    {s.items?.map((i, idx) => <li key={idx}>{i.cantidad} {i.unidad} · {i.nombre} · {peso(i.precio)}</li>)}
                                </ul>
                                {s.notas && <p>Notas: {s.notas}</p>}
                                {s.notasFerretero && <p>Notas del ferretero: {s.notasFerretero}</p>}
                                {s.estado === 'cancelada' && <p className="text-red-600">Motivo de cancelación: {s.motivoCancelacion || '—'}</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
