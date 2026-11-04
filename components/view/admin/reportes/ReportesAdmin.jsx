"use client";
import { useState, useEffect, useCallback } from 'react';
import { api, peso, claseBoton } from '../comun';

const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function Tarjeta({ titulo, valor, detalle }) {
    return (
        <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">{titulo}</p>
            <p className="text-2xl font-bold text-gray-900">{valor}</p>
            {detalle && <p className="text-xs text-gray-500 mt-1">{detalle}</p>}
        </div>
    );
}

export default function ReportesAdmin() {
    const [desde, setDesde] = useState(haceDias(30));
    const [hasta, setHasta] = useState(hoy());
    const [r, setR] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            setR(await api(`/api/admin/reportes?desde=${desde}&hasta=${hasta}`));
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, [desde, hasta]);
    useEffect(() => { cargar(); }, [cargar]);

    const descargarCsv = async () => {
        try {
            const res = await fetch(`/api/admin/reportes?desde=${desde}&hasta=${hasta}&formato=csv`);
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement('a');
            a.href = url; a.download = `reporte_${desde}_${hasta}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch (e) { window.alert(e.message); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3 justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="text-sm text-gray-600">Desde<input type="date" value={desde} max={hasta} onChange={e => setDesde(e.target.value)} className="block border rounded-md px-3 py-2" /></label>
                    <label className="text-sm text-gray-600">Hasta<input type="date" value={hasta} min={desde} onChange={e => setHasta(e.target.value)} className="block border rounded-md px-3 py-2" /></label>
                    <button onClick={descargarCsv} className={claseBoton.primario}>Descargar CSV</button>
                </div>
            </div>
            {loading && <p className="text-gray-500">Cargando...</p>}
            {error && <p className="text-red-600">{error}</p>}
            {r && (
                <>
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <Tarjeta titulo="Servicios solicitados" valor={r.serviciosSolicitados} detalle={`${r.completados} completados · ${r.cancelados} cancelados`} />
                        <Tarjeta titulo="Cobrado" valor={peso(r.ingresos.cobrado)} detalle={`Base ${peso(r.ingresos.base)} · IVA ${peso(r.ingresos.iva)}`} />
                        <Tarjeta titulo="Comisión plataforma" valor={peso(r.comisiones.plataforma)} />
                        <Tarjeta titulo="Contratistas" valor={peso(r.comisiones.contratistas)} detalle={`Técnicos ${peso(r.comisiones.tecnicos)}`} />
                        <Tarjeta titulo="Aperturadores" valor={peso(r.comisiones.aperturadores)} />
                        <Tarjeta titulo="Incorporadores" valor={peso(r.comisiones.incorporadores)} />
                        <Tarjeta titulo="Activos" valor={`${r.contratistasActivos} contr. · ${r.tecnicosActivos} téc.`} detalle={`${r.ferreteriasActivas} ferreterías`} />
                        <Tarjeta titulo="Solicitudes de material"
                            valor={Object.values(r.solicitudesMaterial).reduce((a, b) => a + b, 0)}
                            detalle={Object.entries(r.solicitudesMaterial).map(([k, v]) => `${k} ${v}`).join(' · ')} />
                    </div>
                    <div className="overflow-x-auto bg-white border rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-left text-gray-600">
                                <tr><th className="p-3">Fecha</th><th className="p-3">Solicitados</th><th className="p-3">Completados</th><th className="p-3">Cobrado</th></tr>
                            </thead>
                            <tbody>
                                {r.serie.map(d => (
                                    <tr key={d.fecha} className="border-t">
                                        <td className="p-3">{d.fecha}</td><td className="p-3">{d.solicitados}</td><td className="p-3">{d.completados}</td><td className="p-3">{peso(d.cobrado)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
