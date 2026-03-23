"use client";
import { useState, useEffect } from 'react';
import { FaTimes, FaWarehouse, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCar, FaClipboardList, FaTools, FaUsers, FaSpinner, FaStar, FaCheckCircle, FaBan, FaMapMarked } from 'react-icons/fa';
import dynamic from 'next/dynamic';

// Importar mapa dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function ContratistaDetails({ contratista, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchContratistaDetails();
  }, [contratista._id]);

  const fetchContratistaDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contratistas/${contratista._id}/details`);
      if (!response.ok) throw new Error('Error al cargar detalles');
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error('Error fetching contratista details:', error);
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

  // Color basado en promedio de calificación (0-5)
  const getCalificacionColor = (promedio) => {
    if (!promedio || promedio === 0) return 'bg-gray-100 text-gray-600';
    if (promedio >= 4) return 'bg-green-100 text-green-800';
    if (promedio >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Detalles del Contratista</h2>
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
                  <div className="flex-shrink-0 h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaWarehouse className="text-blue-600 text-3xl" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {details?.contratista?.nombre || details?.contratista?.nombreEmpresa}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${getCalificacionColor(details?.contratista?.promedioCalificacion)}`}>
                        <FaStar size={12} />
                        {details?.contratista?.promedioCalificacion?.toFixed(1) || '0.0'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${details?.contratista?.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {details?.contratista?.activo ? (
                          <><FaCheckCircle size={12} />Activo</>
                        ) : (
                          <><FaBan size={12} />Inactivo</>
                        )}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <FaEnvelope className="mr-2" />
                        {details?.contratista?.email || 'No disponible'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <FaPhone className="mr-2" />
                        {details?.contratista?.telefono}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <FaMapMarkerAlt className="mr-2" />
                        {details?.contratista?.direccion || 'Sin dirección registrada'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <FaCar className="mx-auto text-blue-600 text-2xl mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{details?.stats?.totalCitas || 0}</div>
                    <div className="text-xs text-gray-600">Total Citas</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <FaClipboardList className="mx-auto text-green-600 text-2xl mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{details?.stats?.totalCotizaciones || 0}</div>
                    <div className="text-xs text-gray-600">Cotizaciones</div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <FaTools className="mx-auto text-yellow-600 text-2xl mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{details?.stats?.serviciosOfrecidos || 0}</div>
                    <div className="text-xs text-gray-600">Servicios</div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                  {[
                    { key: 'info', label: 'Información' },
                    { key: 'ubicacion', label: 'Ubicación', icon: FaMapMarked },
                    { key: 'servicios', label: `Servicios (${details?.contratista?.servicios?.length || 0})` },

                    { key: 'citas', label: `Citas (${details?.recentActivity?.citas?.length || 0})` },
                    { key: 'cotizaciones', label: `Cotizaciones (${details?.recentActivity?.cotizaciones?.length || 0})` }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${activeTab === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      {tab.icon && <tab.icon />}
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Información General</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">ID</label>
                        <p className="text-sm text-gray-900 mt-1 font-mono">{details?.contratista?._id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Fecha de Registro</label>
                        <p className="text-sm text-gray-900 mt-1">{formatDate(details?.contratista?.createdAt)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Calificación Promedio</label>
                        <p className="text-sm text-gray-900 mt-1 flex items-center gap-1">
                          <FaStar className="text-yellow-500" />
                          {details?.contratista?.promedioCalificacion?.toFixed(1) || '0.0'} / 5.0
                          <span className="text-xs text-gray-500">
                            ({details?.contratista?.totalCalificaciones || 0} calificaciones)
                          </span>
                        </p>
                      </div>
                      {details?.contratista?.incorporador && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Incorporado por</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {details.contratista.incorporador.nombre}
                            {details.contratista.incorporador.telefono && (
                              <span className="text-xs text-gray-500 ml-2">
                                ({details.contratista.incorporador.telefono})
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {details?.contratista?.informacionPago && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Información de Pago</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                          <div>
                            <label className="text-xs font-medium text-gray-600">Banco</label>
                            <p className="text-sm text-gray-900">{details.contratista.informacionPago.banco || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Titular</label>
                            <p className="text-sm text-gray-900">{details.contratista.informacionPago.nombreTitular || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Cuenta</label>
                            <p className="text-sm text-gray-900 font-mono">{details.contratista.informacionPago.numeroCuenta || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">CLABE</label>
                            <p className="text-sm text-gray-900 font-mono">{details.contratista.informacionPago.clabe || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'ubicacion' && (
                  <div className="space-y-4">
                    {details?.contratista?.ubicacion && details.contratista.ubicacion.lat !== 0 && details.contratista.ubicacion.lng !== 0 ? (
                      <>
                        {/* Información de la dirección */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FaMapMarkerAlt className="text-primary text-xl mt-1" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-2">Dirección Registrada</h4>
                              <p className="text-sm text-gray-700">{details.contratista.direccion || 'Sin dirección'}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                Coordenadas: {details.contratista.ubicacion.lat.toFixed(6)}, {details.contratista.ubicacion.lng.toFixed(6)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Mapa */}
                        {isClient && (
                          <div className="bg-white rounded-lg overflow-hidden border border-gray-200" style={{ height: '400px' }}>
                            <MapContainer
                              center={[details.contratista.ubicacion.lat, details.contratista.ubicacion.lng]}
                              zoom={15}
                              style={{ height: '100%', width: '100%' }}
                            >
                              <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                              />
                              <Marker position={[details.contratista.ubicacion.lat, details.contratista.ubicacion.lng]}>
                                <Popup>
                                  <div className="text-center p-2">
                                    <p className="font-semibold text-sm">{details.contratista.nombre}</p>
                                    <p className="text-xs text-gray-600 mt-1">{details.contratista.direccion}</p>
                                  </div>
                                </Popup>
                              </Marker>
                            </MapContainer>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FaMapMarkerAlt className="mx-auto text-4xl mb-3 text-gray-300" />
                        <p className="font-medium">Sin ubicación registrada</p>
                        <p className="text-sm mt-1">Este contratista no tiene coordenadas de ubicación configuradas</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'servicios' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {details?.contratista?.servicios && details.contratista.servicios.length > 0 ? (
                      details.contratista.servicios.map((servicio) => (
                        <div key={servicio._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{servicio.nombre}</h5>
                              <p className="text-xs text-gray-500 mt-1">{servicio.categoria}</p>
                              {servicio.descripcion && (
                                <p className="text-sm text-gray-600 mt-2">{servicio.descripcion}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="col-span-2 text-center text-gray-500 py-8">No hay servicios registrados</p>
                    )}
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
                                Cliente: {cita.cliente?.nombre || 'No disponible'}
                              </p>

                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(cita.fecha)} {cita.hora && `- ${cita.hora}`}
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
                                Servicio: {cotizacion.cita?.servicio?.nombre || 'No disponible'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Cliente: {cotizacion.cita?.cliente?.nombre || 'No disponible'}
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
