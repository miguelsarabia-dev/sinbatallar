"use client";
import { useState, useEffect, useCallback } from 'react';
import { formatDateTime } from '../../../../lib/date-utils';

const peso = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;
const TABS = [
    { key: 'comprobantes', label: 'Comprobantes' },
    { key: 'reembolsos', label: 'Reembolsos' },
    { key: 'comisiones', label: 'Comisiones' },
    { key: 'config', label: 'Porcentajes' }
];

async function api(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
    return data;
}

export default function PagosAdmin() {
    const [tab, setTab] = useState('comprobantes');
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Pagos, reembolsos y comisiones</h2>
            <div className="flex gap-2 border-b border-gray-200">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === 'comprobantes' && <Comprobantes />}
            {tab === 'reembolsos' && <Reembolsos />}
            {tab === 'comisiones' && <Comisiones />}
            {tab === 'config' && <Configuracion />}
        </div>
    );
}

function Estado({ loading, error, vacio }) {
    if (loading) return <p className="text-gray-500">Cargando...</p>;
    if (error) return <p className="text-red-600">{error}</p>;
    if (vacio) return <p className="text-gray-500">Sin registros.</p>;
    return null;
}

function Comprobantes() {
    const [items, setItems] = useState([]);
    const [estado, setEstado] = useState('vigente');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            setItems(await api(`/api/admin/comprobantes?estado=${estado}`));
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, [estado]);
    useEffect(() => { cargar(); }, [cargar]);

    const verificar = async (c, verificado) => {
        let motivo;
        if (!verificado) {
            motivo = window.prompt('Motivo del rechazo (se le muestra al cliente):');
            if (!motivo?.trim()) return;
        }
        try {
            await api(`/api/cotizaciones/${c.cotizacion._id}/verificar-pago`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: c.tipo, verificado, motivo })
            });
            cargar();
        } catch (e) { window.alert(e.message); }
    };

    return (
        <div className="space-y-4">
            <select value={estado} onChange={e => setEstado(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                <option value="vigente">Vigentes</option>
                <option value="rechazado">Rechazados</option>
                <option value="reemplazado">Reemplazados</option>
            </select>
            <Estado loading={loading} error={error} vacio={!loading && items.length === 0} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map(c => (
                    <div key={c._id} className="bg-white border rounded-lg p-4 space-y-2">
                        <a href={c.imagenUrl} target="_blank" rel="noreferrer">
                            <img src={c.imagenUrl} alt="Comprobante" className="w-full h-48 object-cover rounded-md bg-gray-100" />
                        </a>
                        <div className="text-sm text-gray-700">
                            <p className="font-semibold">{c.cita?.servicio?.nombre || 'Servicio'} · {c.tipo} · {peso(c.monto)}</p>
                            <p>Cliente: {c.cita?.cliente?.nombre} ({c.cita?.cliente?.email})</p>
                            <p>Contratista: {c.cotizacion?.contratista?.nombre}</p>
                            <p>Total cotización: {peso(c.cotizacion?.total)} · modalidad {c.cotizacion?.modalidadPago}</p>
                            <p className="text-gray-500">{formatDateTime(c.createdAt)}</p>
                            {c.estado === 'rechazado' && <p className="text-red-600">Rechazado: {c.motivoRechazo}</p>}
                            {c.verificado && <p className="text-green-600">Verificado</p>}
                        </div>
                        {c.estado === 'vigente' && !c.verificado && (
                            <div className="flex gap-2">
                                <button onClick={() => verificar(c, true)} className="flex-1 bg-green-600 text-white rounded-md py-2 text-sm">Verificar</button>
                                <button onClick={() => verificar(c, false)} className="flex-1 bg-red-600 text-white rounded-md py-2 text-sm">Rechazar</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Reembolsos() {
    const [items, setItems] = useState([]);
    const [estado, setEstado] = useState('pendiente');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            setItems(await api(`/api/admin/reembolsos?estado=${estado}`));
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, [estado]);
    useEffect(() => { cargar(); }, [cargar]);

    const resolver = async (cita) => {
        const nota = window.prompt('Nota de resolución (opcional):', '') ?? null;
        if (nota === null) return;
        try {
            await api(`/api/citas/${cita._id}/reembolso`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'resuelto', nota })
            });
            cargar();
        } catch (e) { window.alert(e.message); }
    };

    return (
        <div className="space-y-4">
            <select value={estado} onChange={e => setEstado(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                <option value="pendiente">Pendientes</option>
                <option value="resuelto">Resueltos</option>
            </select>
            <Estado loading={loading} error={error} vacio={!loading && items.length === 0} />
            <div className="space-y-3">
                {items.map(c => (
                    <div key={c._id} className="bg-white border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="text-sm text-gray-700">
                            <p className="font-semibold">{c.servicio?.nombre} · {peso(c.reembolso?.monto)}</p>
                            <p>Cliente: {c.cliente?.nombre} · {c.cliente?.telefono}</p>
                            <p>Contratista: {c.contratista?.nombre}</p>
                            <p>Cancelada por {c.reembolso?.canceladoPor} · {c.reembolso?.fecha && formatDateTime(c.reembolso.fecha)}</p>
                            <p>Motivo: {c.reembolso?.motivo}</p>
                            {c.reembolso?.nota && <p className="text-gray-500">Nota: {c.reembolso.nota}</p>}
                        </div>
                        {c.reembolso?.estado === 'pendiente' && (
                            <button onClick={() => resolver(c)} className="bg-primary text-white rounded-md px-4 py-2 text-sm">Marcar resuelto</button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Comisiones() {
    const [items, setItems] = useState([]);
    const [liberacion, setLiberacion] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true); setError(null);
                setItems(await api(`/api/admin/comisiones${liberacion ? `?liberacion=${liberacion}` : ''}`));
            } catch (e) { setError(e.message); } finally { setLoading(false); }
        })();
    }, [liberacion]);

    return (
        <div className="space-y-4">
            <select value={liberacion} onChange={e => setLiberacion(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                <option value="">Todas</option>
                <option value="pendiente">Técnico por liberar</option>
                <option value="liberada">Técnico liberado</option>
            </select>
            <Estado loading={loading} error={error} vacio={!loading && items.length === 0} />
            <div className="overflow-x-auto bg-white border rounded-lg">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                            <th className="p-3">Fecha</th><th className="p-3">Servicio</th><th className="p-3">Total</th>
                            <th className="p-3">Plataforma</th><th className="p-3">Contratista</th><th className="p-3">Técnico</th><th className="p-3">Liberación</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(c => (
                            <tr key={c._id} className="border-t">
                                <td className="p-3">{formatDateTime(c.createdAt)}</td>
                                <td className="p-3">{c.cita?.servicio?.nombre}<br /><span className="text-gray-500">{c.cita?.cliente?.nombre}</span></td>
                                <td className="p-3">{peso(c.totalServicio)}<br /><span className="text-gray-500">IVA {peso(c.iva)}</span></td>
                                <td className="p-3">{peso(c.distribucion?.plataforma?.monto)} ({c.distribucion?.plataforma?.porcentaje}%)</td>
                                <td className="p-3">{c.distribucion?.contratista?.id?.nombre}<br />{peso(c.distribucion?.contratista?.montoTotal)}</td>
                                <td className="p-3">
                                    {c.distribucion?.tecnico?.monto > 0
                                        ? <>{c.cita?.tecnico?.user?.nombre}<br />{peso(c.distribucion.tecnico.monto)} ({c.distribucion.tecnico.porcentaje}%)</>
                                        : '—'}
                                </td>
                                <td className="p-3">
                                    {c.distribucion?.tecnico?.monto > 0
                                        ? (c.liberacionTecnico?.estado === 'liberada'
                                            ? <span className="text-green-600">Liberada {c.liberacionTecnico.fecha && formatDateTime(c.liberacionTecnico.fecha)}</span>
                                            : <span className="text-amber-600">Pendiente</span>)
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Configuracion() {
    const [form, setForm] = useState(null);
    const [msg, setMsg] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api('/api/admin/configuracion-financiera').then(d => setForm(d.distribucion)).catch(e => setError(e.message));
    }, []);

    const guardar = async (e) => {
        e.preventDefault();
        setMsg(null); setError(null);
        try {
            const d = await api('/api/admin/configuracion-financiera', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ distribucion: form })
            });
            setForm(d.distribucion);
            setMsg('Guardado. Aplica a comisiones nuevas; las existentes conservan su reparto.');
        } catch (err) { setError(err.message); }
    };

    if (!form) return <Estado loading={!error} error={error} />;

    const campos = [
        ['CONTRACTOR', 'Contratista bruto (% de mano de obra, incluye al técnico)'],
        ['TECHNICIAN', 'Técnico (% fijo de mano de obra, sale del contratista)'],
        ['PLATFORM', 'Sin Batallar (% de mano de obra)'],
        ['OPENER', 'Aperturador (% de mano de obra)'],
        ['INCORPORATOR', 'Incorporador (% de mano de obra)']
    ];

    return (
        <form onSubmit={guardar} className="bg-white border rounded-lg p-6 space-y-4 max-w-lg">
            <p className="text-sm text-gray-600">
                Los porcentajes se aplican solo a la mano de obra. Los materiales se reembolsan 100% al contratista y el IVA no se reparte.
                Contratista + plataforma deben sumar 100.
            </p>
            {campos.map(([k, label]) => (
                <label key={k} className="block text-sm text-gray-700">
                    {label}
                    <input
                        type="number" min="0" max="100" step="0.5" value={form[k]}
                        onChange={e => setForm({ ...form, [k]: Number(e.target.value) })}
                        className="mt-1 w-full border rounded-md px-3 py-2"
                    />
                </label>
            ))}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {msg && <p className="text-green-600 text-sm">{msg}</p>}
            <button type="submit" className="bg-primary text-white rounded-md px-4 py-2 text-sm">Guardar</button>
        </form>
    );
}
