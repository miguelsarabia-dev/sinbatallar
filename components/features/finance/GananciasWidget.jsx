import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaChartLine, FaArrowUp, FaCalendarAlt, FaWrench, FaBox, FaUserTie, FaServer, FaHandshake, FaCoins, FaClipboard } from 'react-icons/fa';

const GananciasWidget = ({ userId, role = 'contratista', refreshTrigger = 0, compact = false }) => {
    const [ganancias, setGanancias] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState('mes');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userId) {
            fetchGanancias();
        } else {
            setLoading(false);
        }
    }, [userId, periodo, refreshTrigger]);

    const fetchGanancias = async () => {
        try {
            console.log('Fetching ganancias for:', { userId, role, periodo });
            setLoading(true);
            const response = await fetch(`/api/ganancias?userId=${userId}&role=${role}&periodo=${periodo}`);

            if (response.ok) {
                const data = await response.json();
                console.log('Ganancias data:', data);
                setGanancias(data);
                setError(null);
            } else {
                const errorData = await response.json();
                console.error('Error fetching ganancias:', errorData);
                setError(errorData.error || 'Error al cargar ganancias');
            }
        } catch (error) {
            console.error('Error fetching ganancias:', error);
            setError('Error de conexión');
        } finally {
            console.log('Finished fetching ganancias');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-lg md:rounded-2xl shadow-lg p-4 animate-pulse ${compact ? 'h-full' : ''}`}>
                <div className="h-6 bg-neutral-200 rounded mb-3"></div>
                <div className="h-8 bg-neutral-200 rounded mb-2"></div>
                <div className="h-4 bg-neutral-200 rounded"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg md:rounded-2xl shadow-lg p-4">
                <div className="flex items-center text-red-500">
                    <FaMoneyBillWave className="mr-2 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            </div>
        );
    }

    if (!ganancias || !ganancias.success) {
        return (
            <div className="bg-white rounded-lg md:rounded-2xl shadow-lg p-4">
                <div className="flex items-center text-gray-500">
                    <FaMoneyBillWave className="mr-2 flex-shrink-0" />
                    <span className="text-sm">Sin datos de ganancias</span>
                </div>
            </div>
        );
    }

    const { resumen, desgloseCostos, gananciasPorCategoria } = ganancias;

    // Renderizado Compacto (Sidebar)
    if (compact) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FaMoneyBillWave className="text-green-600" />
                        Ganancias
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {getPeriodoLabel(periodo)}
                    </span>
                </div>

                <div className="flex-1 flex flex-col justify-center text-center space-y-4">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Tu Ganancia Total</p>
                        <p className="text-2xl font-bold text-green-600">
                            ${(desgloseCostos?.gananciaNeta || resumen.totalGanancias).toLocaleString()}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-blue-50 p-2 rounded">
                            <p className="text-blue-600 font-semibold">
                                ${(desgloseCostos?.ingresosBrutos?.materiales || 0).toLocaleString()}
                            </p>
                            <p className="text-gray-500">Materiales</p>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded">
                            <p className="text-indigo-600 font-semibold">
                                ${(desgloseCostos?.ingresosBrutos?.manoDeObra || 0).toLocaleString()}
                            </p>
                            <p className="text-gray-500">Mano Obra</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Renderizado Detallado (Main Dashboard)
    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FaChartLine className="text-blue-600" />
                        Reporte Financiero Detallado
                    </h3>
                    <p className="text-sm text-gray-500">
                        Desglose de ingresos, deducciones y ganancias netas
                    </p>
                </div>

                <select
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="dia">Hoy</option>
                    <option value="semana">Esta Semana</option>
                    <option value="mes">Este Mes</option>
                    <option value="año">Este Año</option>
                </select>
            </div>

            {role === 'contratista' && desgloseCostos ? (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Columna 1: Ingresos Brutos */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
                            Ingresos Brutos
                        </h4>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <FaBox className="text-blue-500" />
                                    <span>Materiales</span>
                                </div>
                                <span className="font-semibold">${desgloseCostos.ingresosBrutos.materiales.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <FaWrench className="text-indigo-500" />
                                    <span>Mano de Obra</span>
                                </div>
                                <span className="font-semibold">${desgloseCostos.ingresosBrutos.manoDeObra.toLocaleString()}</span>
                            </div>
                            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-lg font-bold text-gray-900">
                                <span>Total Bruto</span>
                                <span>${desgloseCostos.ingresosBrutos.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Columna 2: Deducciones */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
                            Deducciones
                        </h4>
                        <div className="bg-red-50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <FaServer className="text-red-400" />
                                    <span>Plataforma (10%)</span>
                                </div>
                                <span className="font-medium text-red-600">-${desgloseCostos.deducciones.plataforma.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <FaHandshake className="text-red-400" />
                                    <span>Comisiones (5%)</span>
                                </div>
                                <span className="font-medium text-red-600">-${desgloseCostos.deducciones.otros.toLocaleString()}</span>
                            </div>
                            <div className="pt-2 border-t border-red-200 flex justify-between items-center font-bold text-red-700">
                                <span>Total Deducciones</span>
                                <span>-${desgloseCostos.deducciones.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Columna 3: Ganancia Neta */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
                            Tu Ganancia Total
                        </h4>
                        <div className="bg-green-50 rounded-xl p-6 flex flex-col items-center justify-center h-48 text-center space-y-2 border-2 border-green-100">
                            <div className="p-3 bg-green-100 rounded-full text-green-600 mb-2">
                                <FaCoins size={32} />
                            </div>
                            <p className="text-sm text-green-700 font-medium">Ganancia Neta Disponible</p>
                            <p className="text-4xl font-extrabold text-green-700">
                                ${desgloseCostos.gananciaNeta.toLocaleString()}
                            </p>
                            <p className="text-xs text-green-600">
                                Ingresos sin deducciones
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                // Vista sin desglose (fallback)
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-50 p-6 rounded-xl text-center">
                        <h4 className="text-green-800 font-semibold mb-2">Total Ganado</h4>
                        <p className="text-3xl font-bold text-green-600">${resumen.totalGanancias.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-xl text-center">
                        <h4 className="text-blue-800 font-semibold mb-2">Servicios Realizados</h4>
                        <p className="text-3xl font-bold text-blue-600">{resumen.totalServicios}</p>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-xl text-center">
                        <h4 className="text-purple-800 font-semibold mb-2">Promedio por Servicio</h4>
                        <p className="text-3xl font-bold text-purple-600">${resumen.gananciaPromedio.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Historial de Transacciones */}
            <div className="mt-8 pt-8 border-t border-gray-100">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FaClipboard className="text-blue-600" />
                    Historial de Transacciones
                </h4>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Servicio</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total Servicio</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tu Ganancia</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {ganancias.transacciones && ganancias.transacciones.length > 0 ? (
                                    ganancias.transacciones.map((transaccion) => (
                                        <tr key={transaccion._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(transaccion.fecha).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {transaccion.servicio}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {transaccion.cliente}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                ${(transaccion.total || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                                                ${(transaccion.ganancia || 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <FaMoneyBillWave className="text-gray-300 text-4xl mb-2" />
                                                <p>No hay transacciones en este período</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getPeriodoLabel = (periodo) => {
    switch (periodo) {
        case 'dia': return 'Hoy';
        case 'semana': return 'Esta Semana';
        case 'mes': return 'Este Mes';
        case 'año': return 'Este Año';
        default: return 'Período';
    }
};

export default GananciasWidget;
