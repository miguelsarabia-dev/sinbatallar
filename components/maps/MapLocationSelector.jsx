'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Importar componentes de Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

// Importar useMapEvents dinámicamente
const DynamicMapClickHandler = dynamic(
  () => import('react-leaflet').then(mod => {
    const { useMapEvents, Marker, Popup } = mod;
    
    // Componente que maneja los clics en el mapa
    function MapClickHandler({ onLocationSelect, selectedLocation }) {
      useMapEvents({
        click: (e) => {
          const { lat, lng } = e.latlng;
          onLocationSelect({ lat, lng });
        }
      });

      return selectedLocation ? (
        <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold">Ubicación seleccionada</p>
              <p className="text-sm">
                Lat: {selectedLocation.lat.toFixed(6)}<br/>
                Lng: {selectedLocation.lng.toFixed(6)}
              </p>
              {selectedLocation.cityInfo && (
                <div className="mt-2 text-xs text-gray-600">
                  <p><strong>{selectedLocation.cityInfo.ciudad}</strong></p>
                  <p>{selectedLocation.cityInfo.estado}</p>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ) : null;
    }
    
    return MapClickHandler;
  }),
  { ssr: false }
);

const MapLocationSelector = ({ 
  isOpen, 
  onClose, 
  onLocationSelect,
  initialLocation = null,
  title = "Selecciona la ubicación en el mapa"
}) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [mapCenter, setMapCenter] = useState([28.6353, -106.0889]); // Chihuahua por defecto
  const [loadingCurrentLocation, setLoadingCurrentLocation] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [clickIndicator, setClickIndicator] = useState(null); // Para mostrar feedback visual
  const mapRef = useRef(null);

  // Asegurar que estamos en el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      if (initialLocation) {
        setSelectedLocation(initialLocation);
        setMapCenter([initialLocation.lat, initialLocation.lng]);
      } else {
        setSelectedLocation(null);
        setClickIndicator(null);
      }
    }
  }, [isOpen]);

  // Función para obtener información completa de la dirección usando reverse geocoding
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SinBatallar-App/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};
        
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
                 // Fallback: extraer de display_name si es necesario
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
        
        return {
          success: true,
          addressData: {
            // Información básica de ubicación
            ciudad: address.city || address.town || address.village || address.municipality || 'Chihuahua',
            estado: address.state || 'Chihuahua',
            pais: address.country || 'México',
            codigoPostal: address.postcode || '',
            
            // Información detallada de la dirección
            calle: address.road || address.street || '',
            numeroCasa: address.house_number || '',
            colonia: colonia,
            municipio: address.city || address.town || address.municipality || 'Chihuahua',
            
            // Información completa para mostrar
            direccionCompleta: data.display_name || '',
            
            // Coordenadas
            lat,
            lng
          }
        };
      }
    } catch (error) {
      console.warn('Error obteniendo información de la dirección:', error);
    }
    
    return {
      success: false,
      addressData: {
        ciudad: 'Chihuahua',
        estado: 'Chihuahua', 
        pais: 'México',
        codigoPostal: '',
        calle: '',
        numeroCasa: '',
        colonia: '',
        municipio: 'Chihuahua',
        direccionCompleta: '',
        lat,
        lng
      }
    };
  };

  // Obtener ubicación actual del usuario
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no disponible en tu navegador');
      return;
    }

    setLoadingCurrentLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      const newCenter = [latitude, longitude];
      setMapCenter(newCenter);
      
      // Obtener información completa de la dirección
      const addressResult = await getAddressFromCoordinates(latitude, longitude);
      
      setSelectedLocation({ 
        lat: latitude, 
        lng: longitude,
        addressData: addressResult.addressData,
        cityInfo: {
          ciudad: addressResult.addressData.ciudad,
          estado: addressResult.addressData.estado,
          codigoPostal: addressResult.addressData.codigoPostal
        }
      });
      
      // Centrar el mapa en la nueva ubicación
      if (mapRef.current) {
        mapRef.current.setView(newCenter, 16);
      }
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      alert('No se pudo obtener tu ubicación actual. Por favor selecciona manualmente en el mapa.');
    } finally {
      setLoadingCurrentLocation(false);
    }
  };

  // Manejar selección de ubicación en el mapa
  const handleLocationSelect = async (location) => {
    // Mostrar indicador visual inmediato
    setClickIndicator({ lat: location.lat, lng: location.lng });
    
    // Obtener información completa de la dirección para la ubicación seleccionada
    const addressResult = await getAddressFromCoordinates(location.lat, location.lng);
    
    setSelectedLocation({
      ...location,
      addressData: addressResult.addressData,
      cityInfo: {
        ciudad: addressResult.addressData.ciudad,
        estado: addressResult.addressData.estado,
        codigoPostal: addressResult.addressData.codigoPostal
      }
    });
    
    // Quitar indicador después de un momento
    setTimeout(() => setClickIndicator(null), 1500);
  };

  // Confirmar selección
  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  if (!isOpen || !isClient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Botones */}
        <div className="p-3 sm:p-4 bg-gray-50 border-b flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={getCurrentLocation}
              disabled={loadingCurrentLocation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingCurrentLocation ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Obteniendo...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Usar mi ubicación actual
                </>
              )}
            </button>
            
            {selectedLocation && (
              <div className="bg-green-100 text-green-800 px-3 py-2 rounded-md text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Ubicación seleccionada
              </div>
            )}
          </div>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative min-h-0">
          {MapContainer && TileLayer && (
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <DynamicMapClickHandler 
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
              />
            </MapContainer>
          )}
        </div>

        {/* Footer con información de dirección y botones */}
        <div className="p-3 sm:p-4 border-t bg-gray-50 flex-shrink-0">
          {selectedLocation && selectedLocation.addressData && (
            <div className="mb-3 p-2 sm:p-3 bg-white border rounded-md">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Ubicación seleccionada:</p>
              
              <div className="mb-2">
                <p className="font-medium text-sm text-gray-900">
                  {selectedLocation.addressData.ciudad}, {selectedLocation.addressData.estado}
                </p>
                {selectedLocation.addressData.codigoPostal && (
                  <p className="text-xs text-gray-600">
                    CP: {selectedLocation.addressData.codigoPostal}
                  </p>
                )}
              </div>
              
              {/* Mostrar información de la dirección si está disponible */}
              {(selectedLocation.addressData.calle || selectedLocation.addressData.colonia) && (
                <div className="mb-2 text-sm">
                  {selectedLocation.addressData.calle && (
                    <p className="text-gray-700">
                      <span className="font-medium">Calle:</span> {selectedLocation.addressData.calle}
                      {selectedLocation.addressData.numeroCasa && ` ${selectedLocation.addressData.numeroCasa}`}
                    </p>
                  )}
                  {selectedLocation.addressData.colonia && (
                    <p className="text-gray-700">
                      <span className="font-medium">Colonia:</span> {selectedLocation.addressData.colonia}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors order-2 sm:order-1"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
            >
              Usar esta ubicación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapLocationSelector;