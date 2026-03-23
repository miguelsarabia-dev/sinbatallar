import { useState, useEffect } from 'react';
import { FaSync, FaCalendarAlt, FaTools, FaUserTie, FaEye, FaBan, FaTrash, FaCheck, FaTimes, FaMoneyBillWave, FaFileInvoiceDollar } from 'react-icons/fa';
import { formatDate, formatDateTime } from '../../../lib/date-utils';
import { Modal } from "../../ui";

export default function CitasManager({
    showError,
    showSuccess,
    showConfirm
}) {
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedCita, setSelectedCita] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [modalState, setModalState] = useState({ isOpen: false, type: 'info', message: '' });

    useEffect(() => {
        fetchCitas();
    }, []);

    const fetchCitas = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/citas');
            if (response.ok) {
                const data = await response.json();
                setCitas(data);
            } else {
                showError('Error al cargar citas');
            }
        } catch (error) {
            showError('Error de conexión al cargar citas');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelCita = async (citaId) => {
        showConfirm(
            '¿Estás seguro de que deseas cancelar esta cita?',
            async () => {
                try {
                    const response = await fetch(`/api/citas/${citaId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            estado: 'cancelada',
                            motivoCancelacion: 'Cancelada por el administrador',
                            comentario: 'Cancelación administrativa'
                        })
                    });

                    if (response.ok) {
                        showSuccess('Cita cancelada exitosamente');
                        fetchCitas();
                    } else {
                        const error = await response.json();
                        showError(error.error || 'Error al cancelar cita');
                    }
                } catch (error) {
                    showError('Error de conexión');
                }
            },
            'Cancelar Cita'
        );
    };

    const handleDeleteCita = async (citaId) => {
        showConfirm(
            '¿Estás seguro de que deseas eliminar esta cita permanentemente?',
            async () => {
                try {
                    const response = await fetch(`/api/citas/${citaId}`, { method: 'DELETE' });
                    if (response.ok) {
                        showSuccess('Cita eliminada exitosamente');
                        fetchCitas();
                    } else {
                        showError('Error al eliminar cita');
                    }
                } catch (error) {
                    showError('Error de conexión');
                }
            },
            'Eliminar Cita'
        );
    };

    const viewDetails = (cita) => {
        setSelectedCita(cita);
        setShowDetailsModal(true);
    };

    const filteredCitas = filterStatus === 'all'
        ? citas
        : citas.filter(c => c.estado === filterStatus);

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaCalendarAlt className="text-blue-600" />
                    Gestión de Citas y Cotizaciones
                </h2>

                <div className="flex gap-2">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todas las citas</option>
                        <option value="solicitada">Solicitadas</option>
                        <option value="cotizada">Cotizadas</option>
                        <option value="programada">Programadas</option>
                        <option value="en_progreso">En Progreso</option>
                        <option value="completada">Completadas</option>
                        <option value="cancelada">Canceladas</option>
                    </select>

                    <button
                        onClick={fetchCitas}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-2"
                    >
                        <FaSync /> Actualizar
                    </button>
                </div>
            </div>

            {/* Stats Quick View */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Total Citas</p>
                    <p className="text-2xl font-bold text-gray-900">{citas.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Pendientes Cotización</p>
                    <p className="text-2xl font-bold text-yellow-600">
                        {citas.filter(c => c.estado === 'solicitada').length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">En Progreso</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {citas.filter(c => c.estado === 'programada' || c.estado === 'en_progreso').length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Completadas</p>
                    <p className="text-2xl font-bold text-green-600">
                        {citas.filter(c => c.estado === 'completada').length}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio / Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cotización</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-10">Cargando...</td></tr>
                            ) : filteredCitas.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-10 text-gray-500">No se encontraron citas</td></tr>
                            ) : (
                                filteredCitas.map((cita) => (
                                    <tr key={cita._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-mono text-gray-500">#{cita._id.slice(-6)}</div>
                                            <div className="text-sm text-gray-900">
                                                {formatDateTime(cita.fechaProgramada, cita.horaInicio)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{cita.cliente?.nombre || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{cita.cliente?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{cita.servicio?.nombre}</div>
                                            <div className="text-xs text-gray-500">{cita.servicio?.categoria}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${cita.estado === 'completada' ? 'bg-green-100 text-green-800' :
                                                cita.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                                                    cita.estado === 'programada' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {cita.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {cita.cotizacionAceptada ? (
                                                <div className="flex items-center text-green-600 gap-1 text-sm">
                                                    <FaCheck size={12} /> Aceptada
                                                </div>
                                            ) : cita.cotizaciones?.length > 0 ? (
                                                <div className="flex items-center text-yellow-600 gap-1 text-sm">
                                                    <FaFileInvoiceDollar size={12} /> {cita.cotizaciones.length} Enviadas
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => viewDetails(cita)}
                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                title="Ver Detalles"
                                            >
                                                <FaEye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleCancelCita(cita._id)}
                                                className="text-yellow-600 hover:text-yellow-800 p-1"
                                                title="Cancelar"
                                            >
                                                <FaBan size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCita(cita._id)}
                                                className="text-red-600 hover:text-red-800 p-1"
                                                title="Eliminar"
                                            >
                                                <FaTrash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedCita && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">Detalles de Cita #{selectedCita._id.slice(-6)}</h3>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Cliente</h4>
                                    <p>{selectedCita.cliente?.nombre}</p>
                                    <p className="text-sm text-gray-500">{selectedCita.cliente?.email}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Servicio</h4>
                                    <p>{selectedCita.servicio?.nombre}</p>
                                    <p className="text-sm text-gray-500">{selectedCita.servicio?.categoria}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Ubicación</h4>
                                    <p className="text-sm">{selectedCita.ubicacion?.direccion}</p>
                                    <p className="text-xs text-gray-500">{selectedCita.ubicacion?.referencias}</p>
                                </div>

                            </div>

                            {/* Cotizaciones Section */}
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <FaFileInvoiceDollar /> Cotizaciones ({selectedCita.cotizaciones?.length || 0})
                                </h4>
                                {selectedCita.cotizaciones?.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedCita.cotizaciones.map((cot, idx) => (
                                            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-medium">Cotización #{typeof cot === 'object' ? cot._id.slice(-6) : '...'}</span>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${cot.estado === 'aceptada' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                                                        }`}>
                                                        {cot.estado || 'Detalles no cargados'}
                                                    </span>
                                                </div>
                                                {/* Note: In a real implementation we would ensure cotizaciones are populated or fetch them */}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No hay cotizaciones para esta cita.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
