"use client";
import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaSearch, FaFileInvoiceDollar, FaChartLine, FaPercentage, FaMoneyBillWave, FaUsers } from 'react-icons/fa';
import { formatDate } from '../../../../lib/date-utils';

export default function FinanzasDashboard() {
    const [startDate, setStartDate] = useState('');
    const [search, setSearch] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState(null);

    // Establecer fechas por defecto (mes actual)
    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
    }, []);

    const loadReport = async () => {
        if (!startDate || !endDate) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/admin/finanzas?startDate=${startDate}&endDate=${endDate}&search=${search}`);

            if (!response.ok) {
                throw new Error('Error al cargar reporte');
            }

            const data = await response.json();
            setReportData(data);
        } catch (err) {
            console.error(err);
            setError('No se pudo cargar el reporte financiero. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    // Cargar reporte inicial cuando las fechas estén listas
    useEffect(() => {
        if (startDate && endDate && !reportData) {
            loadReport();
        }
    }, [startDate, endDate]);

    const StatCard = ({ title, value, icon, color, subtext }) => (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
                <div className={`p-3 rounded-full ${color}`}>
                    {icon}
                </div>
            </div>
            <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-900">
                    ${value?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                {subtext && <span className="text-xs text-gray-400 mt-1">{subtext}</span>}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header y Filtros */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FaFileInvoiceDollar className="text-green-600" />
                    Reporte Financiero
                </h2>

                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-2 rounded-lg w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0">
                        <input
                            type="text"
                            placeholder="Buscar (Cliente, Contratista...)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadReport()}
                            className="pl-8 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500 w-full"
                        />
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>

                    <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-400" />
                        <span className="text-sm text-gray-600">Desde:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Hasta:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <button
                        onClick={loadReport}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                        {loading ? '...' : 'Filtrar'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Ingresos Totales (Servicios)"
                    value={reportData?.summary?.totalServiceValue}
                    icon={<FaMoneyBillWave className="text-blue-600" />}
                    color="bg-blue-50"
                    subtext="Valor total de servicios completados"
                />
                <StatCard
                    title="Comisión Plataforma"
                    value={reportData?.summary?.totalPlatformCommission}
                    icon={<FaChartLine className="text-green-600" />}
                    color="bg-green-50"
                    subtext="Ingreso neto para la empresa"
                />
                <StatCard
                    title="Pago a Contratistas"
                    value={reportData?.summary?.totalContractorPayout}
                    icon={<FaUsers className="text-orange-600" />}
                    color="bg-orange-50"
                    subtext="Materiales + Mano de Obra"
                />
                <StatCard
                    title="Pago a Técnicos"
                    value={reportData?.summary?.totalTechnicianPayout}
                    icon={<FaPercentage className="text-purple-600" />}
                    color="bg-purple-50"
                />
            </div>

            {/* Tabla de Desglose */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Desglose de Comisiones</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio / Cita</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contratista</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Servicio</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estatus Pago Contratista</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportData?.commissions?.length > 0 ? (
                                reportData.commissions.map((item) => (
                                    <tr key={item._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(item.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.cita?._id ? `#${item.cita._id.slice(-6).toUpperCase()}` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {item.clienteData?.nombre || item.cita?.cliente?.nombre || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {item.distribucion?.contratista?.id?.nombre || 'Desconocido'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                                            ${item.totalServicio?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.cita?.estado === 'completada' ? 'bg-blue-100 text-blue-800' :
                                                item.cita?.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {item.cita?.estado || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.estadoPago === 'pagado' ? 'bg-green-100 text-green-800' :
                                                item.estadoPago === 'disponible' ? 'bg-blue-100 text-blue-800' :
                                                    item.estadoPago === 'retenido' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {item.estadoPago.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No hay registros en este periodo
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
