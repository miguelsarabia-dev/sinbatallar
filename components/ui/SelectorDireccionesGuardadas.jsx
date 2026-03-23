'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { FaMapMarkerAlt, FaSpinner, FaTimes, FaLocationArrow } from 'react-icons/fa';

const SelectorDireccionesGuardadas = ({ 
  isOpen, 
  onClose, 
  onDireccionSelect,
  title = "Selecciona una ubicación" 
}) => {
  const { data: session } = useSession();
  const [direcciones, setDirecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      cargarDirecciones();
    }
  }, [isOpen, session?.user?.id]);

  const cargarDirecciones = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/direcciones?userId=${session.user.id}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar direcciones');
      }
      
      const data = await response.json();
      // El API devuelve { success: true, direcciones: [...] }
      const direccionesArray = data.direcciones || [];
      
      // Formatear direcciones para incluir información de display
      const direccionesFormateadas = direccionesArray.map((dir, index) => ({
        ...dir,
        _id: dir._id || `dir-${index}`,
        alias: `Dirección ${index + 1}`,
        esPrincipal: index === 0,
        direccionCompleta: `${dir.calle || ''} ${dir.numeroCasa || ''}, ${dir.colonia || ''}, ${dir.municipio || ''}, ${dir.estado || ''}`.replace(/\s+/g, ' ').trim()
      }));
      
      setDirecciones(direccionesFormateadas);
    } catch (err) {
      console.error('Error cargando direcciones:', err);
      setError('No se pudieron cargar tus direcciones guardadas');
    } finally {
      setLoading(false);
    }
  };

  const handleDireccionClick = (direccion) => {
    // Verificar que la dirección tenga coordenadas
    if (!direccion.coordenadas?.lat || !direccion.coordenadas?.lng) {
      setError('Esta dirección no tiene coordenadas válidas');
      return;
    }

    // Llamar al callback con la dirección seleccionada
    onDireccionSelect({
      direccion,
      coordenadas: direccion.coordenadas,
      area: direccion.area || null
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <FaSpinner className="animate-spin mr-2 text-blue-600" />
              <span className="text-gray-600 text-sm sm:text-base">Cargando direcciones...</span>
            </div>
          ) : error ? (
            <div className="text-center py-6 sm:py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                <p className="text-red-700 text-sm">{error}</p>
                <button 
                  onClick={cargarDirecciones}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : direcciones.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <FaMapMarkerAlt className="mx-auto mb-3 sm:mb-4 text-gray-400" size={28} />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                No tienes direcciones guardadas
              </h3>
              <p className="text-gray-500 text-sm mb-3 sm:mb-4 px-2">
                Guarda una dirección en tu perfil para poder seleccionarla aquí
              </p>
              <button
                onClick={onClose}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
              <div className="mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-gray-600 px-1">
                  Selecciona una de tus direcciones guardadas para ver servicios disponibles en esa zona:
                </p>
              </div>
              
              {direcciones.map((direccion, index) => (
                <button
                  key={direccion._id || index}
                  onClick={() => handleDireccionClick(direccion)}
                  className="w-full p-2 sm:p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
                  disabled={!direccion.coordenadas?.lat || !direccion.coordenadas?.lng}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                      <FaMapMarkerAlt 
                        className={`text-sm sm:text-lg ${
                          direccion.coordenadas?.lat && direccion.coordenadas?.lng
                            ? 'text-blue-600 group-hover:text-blue-700' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </div>
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">{/* min-w-0 para truncate */}
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {direccion.alias || 'Dirección'}
                        </h3>
                        {direccion.esPrincipal && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        {direccion.direccionCompleta || 'Dirección no disponible'}
                      </p>
                      {(!direccion.coordenadas?.lat || !direccion.coordenadas?.lng) && (
                        <p className="text-xs text-red-500 mt-1">
                          Sin coordenadas - No disponible
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-3 sm:p-4">
          <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500">
            <FaLocationArrow className="text-xs" />
            <span className="text-xs leading-relaxed">
              Tip: Puedes agregar más direcciones desde tu perfil de usuario
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectorDireccionesGuardadas;