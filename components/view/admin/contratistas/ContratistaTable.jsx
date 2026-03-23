"use client";
import { FaEdit, FaTrash, FaEye, FaWarehouse, FaPlay, FaPause, FaStar, FaTools, FaUsers } from 'react-icons/fa';

export default function ContratistaTable({ contratistas, onViewDetails, onEdit, onDelete, onToggleStatus, loading }) {
  // Obtener color basado en promedio de calificación (0-5)
  const getCalificacionColor = (promedio) => {
    if (!promedio || promedio === 0) return 'bg-gray-100 text-gray-600';
    if (promedio >= 4) return 'bg-green-100 text-green-800';
    if (promedio >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!contratistas || contratistas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <FaWarehouse className="mx-auto text-4xl mb-3 text-gray-300" />
          <p className="text-lg font-medium">No se encontraron contratistas</p>
          <p className="text-sm mt-1">Intenta con otros criterios de búsqueda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Vista de escritorio */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contratista
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Servicios
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actividad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Calificación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contratistas.map((contratista) => (
              <tr key={contratista._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FaWarehouse className="text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {contratista.nombre || contratista.nombreEmpresa}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {contratista.direccion || 'Sin dirección'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{contratista.telefono}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[180px]">
                    {contratista.email || 'Sin email'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {contratista.servicios && contratista.servicios.length > 0 ? (
                      <>
                        {contratista.servicios.slice(0, 2).map((servicio) => (
                          <span
                            key={servicio._id}
                            className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            title={servicio.nombre}
                          >
                            {servicio.nombre.length > 12 ? `${servicio.nombre.substring(0, 12)}...` : servicio.nombre}
                          </span>
                        ))}
                        {contratista.servicios.length > 2 && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{contratista.servicios.length - 2}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Sin servicios</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center gap-1">
                      <FaTools className="text-gray-400" size={10} />
                      <span>Citas: {contratista.stats?.citas || 0}</span>
                    </div>

                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${getCalificacionColor(contratista.promedioCalificacion)}`}>
                    <FaStar size={12} />
                    {contratista.promedioCalificacion?.toFixed(1) || '0.0'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${contratista.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {contratista.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center gap-2">
                    <button
                      onClick={() => onViewDetails(contratista)}
                      className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50 transition-colors"
                      title="Ver detalles"
                    >
                      <FaEye size={16} />
                    </button>
                    <button
                      onClick={() => onToggleStatus(contratista._id, contratista.activo)}
                      className={`p-2 rounded transition-colors ${contratista.activo
                        ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50'
                        : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                        }`}
                      title={contratista.activo ? 'Desactivar' : 'Activar'}
                    >
                      {contratista.activo ? <FaPause size={16} /> : <FaPlay size={16} />}
                    </button>
                    <button
                      onClick={() => onEdit(contratista)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 transition-colors"
                      title="Editar contratista"
                    >
                      <FaEdit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(contratista._id)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 transition-colors"
                      title="Eliminar contratista"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista móvil */}
      <div className="md:hidden divide-y divide-gray-200">
        {contratistas.map((contratista) => (
          <div key={contratista._id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaWarehouse className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {contratista.nombre || contratista.nombreEmpresa}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{contratista.telefono}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getCalificacionColor(contratista.promedioCalificacion)}`}>
                      <FaStar size={10} />
                      {contratista.promedioCalificacion?.toFixed(1) || '0.0'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${contratista.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {contratista.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="space-y-1">
                <div>Citas: {contratista.stats?.citas || 0}</div>

              </div>
              <div className="text-right">
                <div>Servicios: {contratista.stats?.serviciosCount || 0}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => onViewDetails(contratista)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
              >
                <FaEye size={14} />
                Ver
              </button>
              <button
                onClick={() => onToggleStatus(contratista._id, contratista.activo)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${contratista.activo
                  ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
              >
                {contratista.activo ? <><FaPause size={14} />Desactivar</> : <><FaPlay size={14} />Activar</>}
              </button>
              <button
                onClick={() => onEdit(contratista)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <FaEdit size={14} />
                Editar
              </button>
              <button
                onClick={() => onDelete(contratista._id)}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <FaTrash size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
