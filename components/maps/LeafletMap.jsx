
"use client";

import { MapContainer, TileLayer, Marker, Polyline, useMapEvent } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Corrige íconos default de Leaflet para entornos como Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickHandler({ onSelect }) {
  useMapEvent('click', (e) => {
    const { lat, lng } = e.latlng;
    if (onSelect) onSelect([lat, lng]);
  });
  return null;
}

const LeafletMap = ({ 
  onSelect, 
  markerLocation, 
  markerLabel, 
  userLocation, 
  center, 
  zoom = 13, 
  markers = [],
  route = null
}) => {
  // Usar center si está disponible, sino userLocation
  const mapCenter = center || userLocation;
  
  if (!mapCenter) {
    return (
      <div style={{
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#aaa', 
        fontSize: 16
      }}>
        Obteniendo ubicación...
      </div>
    );
  }

  // Convertir coordenadas de la ruta si existe
  let routeCoordinates = [];
  if (route) {
    if (Array.isArray(route)) {
      // Si route es un array de coordenadas directamente
      routeCoordinates = route;
    } else if (route.geometry && route.geometry.coordinates) {
      // Si route es un objeto GeoJSON
      routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    }
  }

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ width: '100%', height: '100%', borderRadius: '8px', zIndex: 0 }}
      attributionControl={false}
    >
      <TileLayer
        attribution='© OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      <ClickHandler onSelect={onSelect} />
      
      {/* Marcador único (backward compatibility) */}
      {markerLocation && (
        <Marker position={markerLocation} title={markerLabel || 'Ubicación'} />
      )}
      
      {/* Múltiples marcadores */}
      {markers.map((marker, index) => (
        <Marker 
          key={index} 
          position={marker.position} 
          title={marker.popup || marker.title || `Marcador ${index + 1}`} 
        />
      ))}
      
      {/* Ruta */}
      {routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates}
          color="#FF4500"
          weight={4}
          opacity={0.8}
        />
      )}
    </MapContainer>
  );
};

export default LeafletMap;
