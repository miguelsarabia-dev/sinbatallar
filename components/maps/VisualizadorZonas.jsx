"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FaHome, FaStore, FaBuilding } from 'react-icons/fa';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(mod => mod.Polygon), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

const VisualizadorZonas = ({ areas = [], aperturadorId = null }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Colores según clasificación (solo si es aperturador y NO está usando el filtro por aperturador)
  const getAreaColor = (area) => {
    // Si hay aperturadorId, colorear según dueño
    if (aperturadorId) {
      // Convertir ambos a string para comparación segura
      const areaAperturadorId = area.aperturador?._id?.toString() || area.aperturador?.toString() || '';
      const currentAperturadorId = aperturadorId.toString();
      const esDelAperturador = areaAperturadorId === currentAperturadorId;
      
      return esDelAperturador ? '#16a34a' : '#ef4444'; // Verde si es suyo, rojo si no
    }
    
    // Si no hay aperturadorId, usar colores por clasificación (Admin)
    switch (area.clasificacion) {
      case 'A': return '#10b981'; // Verde
      case 'B': return '#f59e0b'; // Amarillo
      case 'C': return '#ef4444'; // Rojo
      case 'AA': return '#8b5cf6'; // Púrpura
      case 'AAA': return '#3b82f6'; // Azul
      default: return '#6b7280'; // Gris
    }
  };

  // Calcular centro del mapa
  const getMapCenter = () => {
    if (!areas || areas.length === 0) {
      return [28.634, -106.069]; // Chihuahua por defecto
    }
    let totalLat = 0;
    let totalLng = 0;
    let pointCount = 0;
    areas.forEach(area => {
      if (area.poligono?.coordinates?.[0]) {
        area.poligono.coordinates[0].forEach(coord => {
          totalLat += coord[1]; // lat
          totalLng += coord[0]; // lng
          pointCount++;
        });
      }
    });
    if (pointCount === 0) {
      return [28.634, -106.069];
    }
    return [totalLat / pointCount, totalLng / pointCount];
  };

  if (!isClient) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <MapContainer
        center={getMapCenter()}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {areas?.filter(area => area.poligono?.coordinates).map((area) => {
          // Convertir coordenadas de GeoJSON [lng, lat] a Leaflet [lat, lng]
          const leafletCoords = area.poligono.coordinates[0].map(coord => [coord[1], coord[0]]);
          const color = getAreaColor(area);
          const esDelAperturador = aperturadorId && area.aperturador === aperturadorId;
          
          return (
            <Polygon
              key={area._id}
              positions={leafletCoords}
              color={color}
              fillColor={color}
              fillOpacity={0.4}
              weight={2}
              eventHandlers={{
                mouseover: (e) => {
                  e.target.setStyle({ fillOpacity: 0.7, weight: 3 });
                },
                mouseout: (e) => {
                  e.target.setStyle({ fillOpacity: 0.4, weight: 2 });
                }
              }}
            >
              <Tooltip permanent={false} direction="top" offset={[0, -10]}>
                <div className="min-w-[220px] p-1">
                  <div className="font-bold text-base mb-2 pb-1 border-b border-gray-300">
                    {area.nombre}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Clasificación:</span>
                      <span className="font-semibold text-gray-900">{area.clasificacion}</span>
                    </div>
                    
                    {/* Estadísticas de viviendas y negocios */}
                    {area.estadisticas && (
                      <>
                        <div className="border-t border-gray-200 pt-1.5 mt-1.5 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 flex items-center gap-1.5">
                              <FaHome className="text-blue-500 w-3.5 h-3.5" />
                              Viviendas:
                            </span>
                            <span className="font-semibold text-blue-600">
                              ~{area.estadisticas.viviendas || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 flex items-center gap-1.5">
                              <FaStore className="text-green-500 w-3.5 h-3.5" />
                              Negocios:
                            </span>
                            <span className="font-semibold text-green-600">
                              ~{area.estadisticas.negocios || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 flex items-center gap-1.5">
                              <FaBuilding className="text-gray-500 w-3.5 h-3.5" />
                              Edificios:
                            </span>
                            <span className="font-semibold text-gray-600">
                              ~{area.estadisticas.edificios || 0}
                            </span>
                          </div>
                        </div>
                        {area.estadisticas.ultimaActualizacion && (
                          <div className="text-[10px] text-gray-500 italic mt-1.5 pt-1.5 border-t border-gray-200">
                            Act: {new Date(area.estadisticas.ultimaActualizacion).toLocaleDateString('es-MX', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </div>
                        )}
                      </>
                    )}
                    
                    {area.contratistas && area.contratistas.length > 0 && (
                      <div className="flex items-center justify-between text-sm pt-1.5 border-t border-gray-200">
                        <span className="text-gray-700">Contratistas:</span>
                        <span className="font-semibold text-purple-600">{area.contratistas.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default VisualizadorZonas;
