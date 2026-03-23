'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Importar el componente de mapa dinámicamente para evitar problemas de SSR
const MapLocationSelector = dynamic(
  () => import('../maps/MapLocationSelector'),
  { ssr: false }
);

const DireccionFormConMapa = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData = {},
  title = "Agregar Nueva Dirección" 
}) => {
  // Estados para el formulario (solo campos del modelo User)
  const [formData, setFormData] = useState({
    calle: initialData.calle || '',
    numeroCasa: initialData.numeroCasa || '',
    colonia: initialData.colonia || '',
    municipio: initialData.municipio || '',
    estado: initialData.estado || '',
    codigoPostal: initialData.codigoPostal || '',
    referencia: initialData.referencia || '',
    coordenadas: initialData.coordenadas || null
  });

  // Estados para el modal
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autocompletandoDireccion, setAutocompletandoDireccion] = useState(false);
  const [direccionAutocompletada, setDireccionAutocompletada] = useState(false);

  // Resetear formulario cuando se abre/cierra
  useEffect(() => {
    if (isOpen && initialData) {
      // Solo resetear cuando el modal se abre Y hay datos iniciales
      setFormData({
        calle: initialData.calle || '',
        numeroCasa: initialData.numeroCasa || '',
        colonia: initialData.colonia || '',
        municipio: initialData.municipio || '',
        estado: initialData.estado || '',
        codigoPostal: initialData.codigoPostal || '',
        referencia: initialData.referencia || '',
        coordenadas: initialData.coordenadas || null
      });
      setError('');
    } else if (isOpen && !initialData) {
      // Si se abre sin datos iniciales, usar valores por defecto
      setFormData({
        calle: '',
        numeroCasa: '',
        colonia: '',
        municipio: '',
        estado: '',
        codigoPostal: '',
        referencia: '',
        coordenadas: null
      });
      setError('');
    }
  }, [isOpen]); // Solo depender de isOpen

  // Función de reverse geocoding
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SinBatallar-App/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error en la respuesta del servicio de geocoding');
      }

      const data = await response.json();
      
      if (!data || !data.address) {
        throw new Error('No se encontró información de dirección para estas coordenadas');
      }

      const address = data.address;
      
      // Intentar obtener la colonia de múltiples fuentes posibles
      const getColonia = () => {
        return address.neighbourhood || 
               address.suburb || 
               address.village || 
               address.quarter || 
               address.city_district || 
               address.district || 
               address.subdistrict ||
               address.residential ||
               address.locality ||
               '';
      };
      
      // Si no encontramos colonia, intentar extraerla del display_name
      let colonia = getColonia();
      if (!colonia && data.display_name) {
        // Intentar extraer colonia del display_name (formato común: "Calle, Colonia, Ciudad, Estado")
        const parts = data.display_name.split(',').map(part => part.trim());
        if (parts.length >= 3) {
          // Tomar la segunda parte como posible colonia
          const possibleColonia = parts[1];
          // Verificar que no sea una ciudad conocida
          if (possibleColonia && 
              !possibleColonia.toLowerCase().includes('chihuahua') &&
              !possibleColonia.toLowerCase().includes('ciudad') &&
              !possibleColonia.toLowerCase().includes('municipio')) {
            colonia = possibleColonia;
          }
        }
      }
      
      // Extraer información de la dirección
      return {
        success: true,
        data: {
          calle: address.road || address.street || '',
          numeroCasa: address.house_number || '',
          colonia: colonia,
          municipio: address.city || address.town || address.municipality || '',
          estado: address.state || '',
          codigoPostal: address.postcode || '',
          direccionCompleta: data.display_name || ''
        }
      };

    } catch (error) {
      console.error('Error en reverse geocoding:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Manejar cambios en los inputs
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(''); // Limpiar errores al cambiar datos
  };

  // Manejar selección de ubicación del mapa
  const handleLocationSelect = async (location) => {
    // Si la ubicación viene con datos de dirección del mapa, usarlos directamente
    if (location.addressData) {
      setAutocompletandoDireccion(true);
      
      // SIEMPRE usar los datos que vienen del mapa (no solo llenar campos vacíos)
      setFormData(prev => ({
        ...prev,
        coordenadas: { lat: location.lat, lng: location.lng },
        calle: location.addressData.calle || prev.calle,
        numeroCasa: location.addressData.numeroCasa || prev.numeroCasa,
        colonia: location.addressData.colonia || prev.colonia,
        municipio: location.addressData.municipio || prev.municipio,
        estado: location.addressData.estado || prev.estado,
        codigoPostal: location.addressData.codigoPostal || prev.codigoPostal
      }));
      
      setDireccionAutocompletada(true);
      setAutocompletandoDireccion(false);
      
      // Mostrar mensaje de éxito temporal
      setTimeout(() => {
        setDireccionAutocompletada(false);
      }, 4000);
      
    } else {
      // Fallback: si no viene con datos procesados, hacer reverse geocoding (método anterior)
      setFormData(prev => ({
        ...prev,
        coordenadas: location
      }));

      if (location.lat && location.lng) {
        setAutocompletandoDireccion(true);
        setError('');
        
        try {
          const resultado = await reverseGeocode(location.lat, location.lng);
          
          if (resultado.success) {
            setFormData(prev => ({
              ...prev,
              coordenadas: location,
              calle: prev.calle || resultado.data.calle,
              numeroCasa: prev.numeroCasa || resultado.data.numeroCasa,
              colonia: prev.colonia || resultado.data.colonia,
              municipio: prev.municipio || resultado.data.municipio,
              estado: prev.estado || resultado.data.estado,
              codigoPostal: prev.codigoPostal || resultado.data.codigoPostal
            }));
            
            setDireccionAutocompletada(true);
            
            setTimeout(() => {
              setDireccionAutocompletada(false);
            }, 4000);
            
          } else {
            console.warn('No se pudo obtener la dirección automáticamente:', resultado.error);
            setFormData(prev => ({
              ...prev,
              coordenadas: location,
              municipio: prev.municipio || 'Chihuahua',
              estado: prev.estado || 'Chihuahua'
            }));
          }
        } catch (geocodeError) {
          console.error('Error en reverse geocoding:', geocodeError);
          setFormData(prev => ({
            ...prev,
            coordenadas: location,
            municipio: prev.municipio || 'Chihuahua',
            estado: prev.estado || 'Chihuahua'
          }));
        } finally {
          setAutocompletandoDireccion(false);
        }
      }
    }

    // Si la ubicación incluye información de la ciudad (método anterior), usarla como fallback
    if (location.cityInfo && !formData.municipio && !formData.estado) {
      setFormData(prev => ({
        ...prev,
        municipio: prev.municipio || location.cityInfo.ciudad,
        estado: prev.estado || location.cityInfo.estado,
        codigoPostal: prev.codigoPostal || location.cityInfo.codigoPostal || ''
      }));
    }
    
    // Limpiar error de ubicación si existía
    if (error) {
      setError('');
    }
  };

  // Obtener ubicación actual automáticamente
  const obtenerUbicacionActual = async () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en tu navegador');
      return;
    }

    setLoading(true);
    setAutocompletandoDireccion(true);
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      try {
        const resultado = await reverseGeocode(latitude, longitude);
        
        if (resultado.success) {
          // Autocompletar todos los campos disponibles
          setFormData(prev => ({
            ...prev,
            coordenadas: { lat: latitude, lng: longitude },
            calle: prev.calle || resultado.data.calle,
            numeroCasa: prev.numeroCasa || resultado.data.numeroCasa,
            colonia: prev.colonia || resultado.data.colonia,
            municipio: prev.municipio || resultado.data.municipio,
            estado: prev.estado || resultado.data.estado,
            codigoPostal: prev.codigoPostal || resultado.data.codigoPostal
          }));
          
          setDireccionAutocompletada(true);
          
          // Ocultar mensaje de éxito después de 4 segundos
          setTimeout(() => {
            setDireccionAutocompletada(false);
          }, 4000);
          
        } else {
          console.warn('No se pudo obtener la dirección automáticamente:', resultado.error);
          // Solo establecer coordenadas con valores por defecto
          setFormData(prev => ({
            ...prev,
            coordenadas: { lat: latitude, lng: longitude },
            municipio: prev.municipio || 'Chihuahua',
            estado: prev.estado || 'Chihuahua'
          }));
        }
      } catch (geocodeError) {
        console.warn('Error obteniendo información de la dirección:', geocodeError);
        // Solo establecer coordenadas si falla el reverse geocoding
        setFormData(prev => ({
          ...prev,
          coordenadas: { lat: latitude, lng: longitude },
          municipio: prev.municipio || 'Chihuahua',
          estado: prev.estado || 'Chihuahua'
        }));
      }
      
      setError('');
    } catch (err) {
      setError('Error obteniendo ubicación: ' + (err.message || 'Ubicación no disponible'));
    } finally {
      setLoading(false);
      setAutocompletandoDireccion(false);
    }
  };

  // Validar y guardar
  const handleSave = async () => {
    // Validación de campos requeridos
    if (!formData.calle.trim()) {
      setError('La dirección es requerida');
      return;
    }
    if (!formData.numeroCasa.trim()) {
      setError('El número es requerido');
      return;
    }
    if (!formData.colonia.trim()) {
      setError('La colonia es requerida');
      return;
    }
    if (!formData.municipio.trim()) {
      setError('El municipio es requerido');
      return;
    }
    if (!formData.estado.trim()) {
      setError('El estado es requerido');
      return;
    }
    if (!formData.coordenadas?.lat || !formData.coordenadas?.lng) {
      setError('Debe seleccionar la ubicación en el mapa');
      return;
    }

    // Construir dirección completa
    const direccionCompleta = [
      formData.calle,
      formData.numeroCasa,
      formData.colonia,
      formData.municipio,
      formData.estado
    ].filter(Boolean).join(', ');

    const direccionFinal = {
      ...formData,
      direccionCompleta
    };

    try {
      await onSave(direccionFinal);
      onClose();
    } catch (error) {
      console.error('Error guardando dirección:', error);
      setError('Error al guardar la dirección. Inténtalo nuevamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal principal del formulario */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-2 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-2">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Contenido */}
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Notificación de autocompletado */}
            {autocompletandoDireccion && (
              <div className="bg-blue-50 border border-blue-300 text-blue-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Obteniendo dirección automáticamente...
              </div>
            )}

            {direccionAutocompletada && (
              <div className="bg-green-50 border border-green-300 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                ¡Dirección autocompletada! Puedes editarla si necesitas hacer ajustes.
              </div>
            )}

            {/* Selección de ubicación en mapa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ubicación en el mapa *
              </label>
              
              {formData.coordenadas ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <span className="text-sm font-medium text-green-800">Ubicación seleccionada</span>
                        {formData.coordenadas.cityInfo && (
                          <p className="text-xs text-green-700 font-medium">
                            {formData.coordenadas.cityInfo.ciudad}, {formData.coordenadas.cityInfo.estado}
                          </p>
                        )}
                        <p className="text-xs text-green-600 font-mono">
                          {formData.coordenadas.lat.toFixed(6)}, {formData.coordenadas.lng.toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMapSelector(true)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Cambiar ubicación
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 sm:p-6 text-center">
                  <svg className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-400 mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 px-2">
                    Selecciona la ubicación exacta en el mapa
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMapSelector(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                    >
                      Seleccionar en mapa
                    </button>
                    <button
                      type="button"
                      onClick={obtenerUbicacionActual}
                      disabled={loading}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Obteniendo...' : 'Usar ubicación actual'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Datos de la dirección */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calle *
                </label>
                <input
                  type="text"
                  value={formData.calle}
                  onChange={(e) => handleInputChange('calle', e.target.value)}
                  placeholder="Ej: Av. Reforma, Calle 16 de Septiembre"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {autocompletandoDireccion ? 'Autocompletando...' : 'Puedes editar el nombre de la calle'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número *
                </label>
                <input
                  type="text"
                  value={formData.numeroCasa}
                  onChange={(e) => handleInputChange('numeroCasa', e.target.value)}
                  placeholder="Ej: 123, 456-A, S/N"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número de casa, edificio o local
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colonia/Barrio *
              </label>
              <input
                type="text"
                value={formData.colonia}
                onChange={(e) => handleInputChange('colonia', e.target.value)}
                placeholder="Ej: Roma Norte, Centro, Las Américas"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {autocompletandoDireccion ? 'Autocompletando...' : 'Nombre de la colonia o barrio'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia (Opcional)
              </label>
              <input
                type="text"
                value={formData.referencia}
                onChange={(e) => handleInputChange('referencia', e.target.value)}
                placeholder="Ej: Frente al parque, Junto al Oxxo, Esquina con..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ayuda al técnico a encontrar más fácil tu ubicación
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Municipio/Delegación *
                </label>
                <input
                  type="text"
                  value={formData.municipio}
                  onChange={(e) => handleInputChange('municipio', e.target.value)}
                  placeholder="Ej: Chihuahua, Guadalajara, Tijuana"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {autocompletandoDireccion ? 'Autocompletando...' : 'Ciudad o municipio'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado *
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar estado</option>
                  <option value="Aguascalientes">Aguascalientes</option>
                  <option value="Baja California">Baja California</option>
                  <option value="Baja California Sur">Baja California Sur</option>
                  <option value="Campeche">Campeche</option>
                  <option value="Chiapas">Chiapas</option>
                  <option value="Chihuahua">Chihuahua</option>
                  <option value="Ciudad de México">Ciudad de México</option>
                  <option value="Coahuila">Coahuila</option>
                  <option value="Colima">Colima</option>
                  <option value="Durango">Durango</option>
                  <option value="Estado de México">Estado de México</option>
                  <option value="Guanajuato">Guanajuato</option>
                  <option value="Guerrero">Guerrero</option>
                  <option value="Hidalgo">Hidalgo</option>
                  <option value="Jalisco">Jalisco</option>
                  <option value="Michoacán">Michoacán</option>
                  <option value="Morelos">Morelos</option>
                  <option value="Nayarit">Nayarit</option>
                  <option value="Nuevo León">Nuevo León</option>
                  <option value="Oaxaca">Oaxaca</option>
                  <option value="Puebla">Puebla</option>
                  <option value="Querétaro">Querétaro</option>
                  <option value="Quintana Roo">Quintana Roo</option>
                  <option value="San Luis Potosí">San Luis Potosí</option>
                  <option value="Sinaloa">Sinaloa</option>
                  <option value="Sonora">Sonora</option>
                  <option value="Tabasco">Tabasco</option>
                  <option value="Tamaulipas">Tamaulipas</option>
                  <option value="Tlaxcala">Tlaxcala</option>
                  <option value="Veracruz">Veracruz</option>
                  <option value="Yucatán">Yucatán</option>
                  <option value="Zacatecas">Zacatecas</option>
                </select>
              </div>
            </div>

            {/* Campo de código postal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código Postal (Opcional)
              </label>
              <input
                type="text"
                value={formData.codigoPostal}
                onChange={(e) => handleInputChange('codigoPostal', e.target.value)}
                placeholder="Ej: 31000, 44100"
                maxLength="5"
                pattern="[0-9]{5}"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {autocompletandoDireccion ? 'Autocompletando...' : '5 dígitos del código postal'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base order-2 sm:order-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
            >
              {loading ? 'Guardando...' : 'Guardar Dirección'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal del selector de mapa */}
      <MapLocationSelector
        isOpen={showMapSelector}
        onClose={() => setShowMapSelector(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={formData.coordenadas}
        title="Selecciona la ubicación exacta"
      />
    </>
  );
};

export default DireccionFormConMapa;