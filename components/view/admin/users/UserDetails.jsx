"use client";
import { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaCalendar, FaCar, FaClipboardList, FaTools, FaSpinner } from 'react-icons/fa';

export default function UserDetails({ user, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchUserDetails();
  }, [user._id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${user._id}/details`);
      if (!response.ok) throw new Error('Error al cargar detalles');
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      confirmada: 'bg-blue-100 text-blue-800',
      'en progreso': 'bg-purple-100 text-purple-800',
      completada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800',
      enviada: 'bg-blue-100 text-blue-800',
      aceptada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800'
    };
    return statusConfig[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Detalles del Usuario</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <FaSpinner className="animate-spin text-primary text-4xl" />
            </div>
          ) : (
            <>
              {/* Información básica */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {details?.user?.fotoUrl ? (
                      <img
                        src={details.user.fotoUrl}
                        alt={details.user.nombre}
                        className="h-20 w-20 rounded-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                      />
                    ) : null}
                    {!details?.user?.fotoUrl && <FaUser className="text-gray-500 text-3xl" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{details?.user?.nombre}</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <FaEnvelope className="mr-2" />
                        {details?.user?.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <FaPhone className="mr-2" />
                        {details?.user?.telefono || 'No disponible'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <FaCalendar className="mr-2" />
                        Registro: {formatDate(details?.user?.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${details?.user?.role === 'admin' ? 'bg-red-100 text-red-800' :
                      details?.user?.role === 'contratista' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {details?.user?.role}
                    </span>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <FaCar className="mx-auto text-blue-600 text-2xl mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{details?.stats?.totalCitas || 0}</div>
                    <div className="text-xs text-gray-600">Total Citas</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <FaTools className="mx-auto text-green-600 text-2xl mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{details?.stats?.totalServicios || 0}</div>
                    <div className="text-xs text-gray-600">Servicios</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <FaClipboardList className="mx-auto text-purple-600 text-2xl mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{details?.stats?.totalCotizaciones || 0}</div>
                    <div className="text-xs text-gray-600">Cotizaciones</div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'info'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Información
                  </button>
                  <button
                    onClick={() => setActiveTab('citas')}
                    className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'citas'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Citas ({details?.recentActivity?.citas?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('servicios')}
                    className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'servicios'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Servicios ({details?.recentActivity?.servicios?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('cotizaciones')}
                    className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'cotizaciones'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Cotizaciones ({details?.recentActivity?.cotizaciones?.length || 0})
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Información Adicional</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">ID de Usuario</label>
                        <p className="text-sm text-gray-900 mt-1 font-mono">{details?.user?._id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Fecha de Registro</label>
                        <p className="text-sm text-gray-900 mt-1">{formatDate(details?.user?.createdAt)}</p>
                      </div>
                      {details?.user?.direcciones && details.user.direcciones.length > 0 && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-600">Direcciones Registradas</label>
                          <div className="mt-2 space-y-2">
                            {details.user.direcciones.map((dir, index) => (
                              <div key={index} className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                {dir.calle}, {dir.municipio || dir.ciudad}, {dir.estado}
                                {dir.isPrincipal && <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded">Principal</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'citas' && (
                  <div className="space-y-3">
                    {details?.recentActivity?.citas?.length > 0 ? (
                      details.recentActivity.citas.map((cita) => (
                        <div key={cita._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">
                                {cita.servicio?.nombre || 'Servicio no disponible'}
                              </h5>
                              <p className="text-sm text-gray-600 mt-1">
                                Contratista: {cita.contratista?.nombre || 'No asignado'}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(cita.fecha)} - {cita.hora}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(cita.estado)}`}>
                              {cita.estado}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">No hay citas registradas</p>
                    )}
                  </div>
                )}

                {activeTab === 'servicios' && (
                  <div className="space-y-3">
                    {details?.recentActivity?.servicios?.length > 0 ? (
                      details.recentActivity.servicios.map((servicio) => (
                        <div key={servicio._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{servicio.nombre}</h5>
                              {servicio.descripcion && (
                                <p className="text-sm text-gray-600 mt-1">{servicio.descripcion}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                Solicitado: {formatDate(servicio.createdAt)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(servicio.estado)}`}>
                              {servicio.estado}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">No hay servicios registrados</p>
                    )}
                  </div>
                )}

                {activeTab === 'cotizaciones' && (
                  <div className="space-y-3">
                    {details?.recentActivity?.cotizaciones?.length > 0 ? (
                      details.recentActivity.cotizaciones.map((cotizacion) => (
                        <div key={cotizacion._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">
                                Cotización #{cotizacion._id.slice(-6)}
                              </h5>
                              <p className="text-sm text-gray-600 mt-1">
                                Contratista: {cotizacion.contratista?.nombre || 'No disponible'}
                              </p>
                              {cotizacion.monto && (
                                <p className="text-sm font-semibold text-gray-900 mt-1">
                                  ${cotizacion.monto.toLocaleString('es-MX')}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(cotizacion.createdAt)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(cotizacion.estado)}`}>
                              {cotizacion.estado}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">No hay cotizaciones registradas</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
