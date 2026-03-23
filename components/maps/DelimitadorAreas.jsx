"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  FeatureGroup,
  Polygon,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import "leaflet-draw";
import { 
  FaTimes, 
  FaExclamationTriangle, 
  FaMapMarkerAlt,
  FaUsers,
  FaCheck,
  FaBan
} from "react-icons/fa";

// Fix para íconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapDrawControl = ({ onPoligonoConfirmado }) => {
  const map = useMap();
  const featureGroupRef = useRef(null);

  useEffect(() => {
    const drawnItems = featureGroupRef.current;
    if (!map || !drawnItems) return;

    // Asegurar que leaflet-draw esté completamente cargado
    if (typeof L.Draw === 'undefined') {
      console.error('Leaflet Draw no está cargado correctamente');
      return;
    }

    const drawControl = new L.Control.Draw({
      draw: {
        marker: false,
        circle: false,
        rectangle: false,
        polyline: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: "#10b981", // green-500
            weight: 2,
            fillColor: "#10b981",
            fillOpacity: 0.2,
          },
        },
      },
      edit: {
        featureGroup: drawnItems,
        edit: true,
        remove: true,
      },
    });

    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);

      const coords = layer.getLatLngs()[0].map((latlng) => [latlng.lng, latlng.lat]);
      coords.push(coords[0]); // Cerrar el polígono

      onPoligonoConfirmado({
        polygon: layer.getLatLngs()[0], // Para mostrar en el mapa
        coordinates: [coords], // Para guardar en GeoJSON format
      });
    });

    return () => {
      map.removeControl(drawControl);
    };
  }, [map, onPoligonoConfirmado]);

  return <FeatureGroup ref={featureGroupRef} />;
};

const DelimitadorAreas = ({ onAreaConfirmada, onCancel, areasExistentes = [] }) => {
  const [ubicacion, setUbicacion] = useState([28.634, -106.069]); // Chihuahua por defecto
  const [nombreArea, setNombreArea] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [clasificacion, setClasificacion] = useState("C");
  const [datosArea, setDatosArea] = useState(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  
  // Estados para contratistas
  const [contratistas, setContratistas] = useState([]);
  const [contratistasSeleccionados, setContratistasSeleccionados] = useState([]);
  const [cargandoContratistas, setCargandoContratistas] = useState(true);
  const [serviciosOcupados, setServiciosOcupados] = useState([]);
  const [conflictos, setConflictos] = useState([]);

  useEffect(() => {
    // Obtener ubicación del usuario
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion([pos.coords.latitude, pos.coords.longitude]);
        setCargandoUbicacion(false);
      },
      (error) => {
        console.log("Error obteniendo ubicación:", error);
        setCargandoUbicacion(false); // Usar ubicación por defecto
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Cargar contratistas disponibles
    cargarContratistas();
  }, []);

  const cargarContratistas = async () => {
    try {
      setCargandoContratistas(true);
      const response = await fetch('/api/contratistas');
      if (response.ok) {
        const data = await response.json();
        setContratistas(data.filter(c => c.activo)); // Solo contratistas activos
      }
    } catch (error) {
      console.error('Error cargando contratistas:', error);
    } finally {
      setCargandoContratistas(false);
    }
  };

  // Función para validar conflictos de servicios DENTRO de la misma área
  const validarConflictos = (contratistasSeleccionados) => {
    const serviciosEncontrados = new Map(); // servicio._id -> { contratista, servicio }
    const nuevosConflictos = [];

    contratistasSeleccionados.forEach(contratista => {
      if (contratista.servicios && Array.isArray(contratista.servicios)) {
        contratista.servicios.forEach(servicio => {
          const servicioId = servicio._id || servicio;
          const servicioNombre = servicio.nombre || 'Servicio desconocido';
          
          if (serviciosEncontrados.has(servicioId)) {
            const conflictoExistente = serviciosEncontrados.get(servicioId);
            // Solo agregar el conflicto si no existe ya
            if (!nuevosConflictos.find(c => c.servicio._id === servicioId)) {
              nuevosConflictos.push({
                servicio: { _id: servicioId, nombre: servicioNombre },
                contratistas: [conflictoExistente.contratista, contratista]
              });
            } else {
              // Agregar contratista al conflicto existente
              const conflictoExistente = nuevosConflictos.find(c => c.servicio._id === servicioId);
              if (!conflictoExistente.contratistas.some(c => c._id === contratista._id)) {
                conflictoExistente.contratistas.push(contratista);
              }
            }
          } else {
            serviciosEncontrados.set(servicioId, { contratista, servicio: servicioNombre });
          }
        });
      }
    });

    setConflictos(nuevosConflictos);
    return nuevosConflictos.length === 0;
  };

  // Función para manejar selección/deselección de contratistas
  const toggleContratista = (contratista) => {
    let nuevosSeleccionados;
    
    const yaSeleccionado = contratistasSeleccionados.some(c => c._id === contratista._id);
    
    if (yaSeleccionado) {
      nuevosSeleccionados = contratistasSeleccionados.filter(c => c._id !== contratista._id);
    } else {
      nuevosSeleccionados = [...contratistasSeleccionados, contratista];
    }
    
    setContratistasSeleccionados(nuevosSeleccionados);
    validarConflictos(nuevosSeleccionados);
  };

  const handleConfirmar = () => {
    if (!nombreArea.trim() || !datosArea?.coordinates) {
      return;
    }

    // No permitir guardar si hay conflictos de servicios dentro de la misma área
    if (conflictos.length > 0) {
      return;
    }

    const areaData = {
      nombre: nombreArea.trim(),
      descripcion: descripcion.trim(),
      clasificacion,
      poligono: {
        type: "Polygon",
        coordinates: datosArea.coordinates,
      },
      contratistas: contratistasSeleccionados.map(c => c._id),
    };

    onAreaConfirmada(areaData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Delimitar Nueva Área
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Área *
              </label>
              <input
                type="text"
                placeholder="Ej: Zona Centro, Sector Norte, etc."
                value={nombreArea}
                onChange={(e) => setNombreArea(e.target.value)}
                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clasificación
              </label>
              <select
                value={clasificacion}
                onChange={(e) => setClasificacion(e.target.value)}
                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
              >
                <option value="C">C - Básica</option>
                <option value="B">B - Intermedia</option>
                <option value="A">A - Avanzada</option>
                <option value="AA">AA - Premium</option>
                <option value="AAA">AAA - Élite</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción (opcional)
              </label>
              <input
                type="text"
                placeholder="Descripción breve del área"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
                maxLength={200}
              />
            </div>
          </div>

            {/* Sección de Contratistas */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FaUsers className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Contratistas para esta Área (Opcional)
                  </h3>
                </div>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {contratistasSeleccionados.length} seleccionados
                </span>
              </div>            {cargandoContratistas ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-gray-600">Cargando contratistas...</span>
              </div>
            ) : contratistas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay contratistas activos disponibles</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                {contratistas.map((contratista) => {
                  const isSelected = contratistasSeleccionados.some(c => c._id === contratista._id);
                  const serviciosDelContratista = contratista.servicios || [];
                  
                  // Verificar si este contratista tiene servicios conflictivos
                  const tieneConflictos = conflictos.some(conflicto => 
                    conflicto.contratistas.some(c => c._id === contratista._id)
                  );
                  
                  return (
                    <div 
                      key={contratista._id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        isSelected && tieneConflictos
                          ? 'border-red-500 bg-red-50' 
                          : isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                      onClick={() => toggleContratista(contratista)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleContratista(contratista)}
                              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{contratista.nombre}</h4>
                              <p className="text-sm text-gray-600">{contratista.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  contratista.promedioCalificacion >= 4 ? 'bg-green-100 text-green-800' :
                                  contratista.promedioCalificacion >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  Nivel {contratista.promedioCalificacion}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {serviciosDelContratista.length} servicio(s)
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Mostrar servicios */}
                          {serviciosDelContratista.length > 0 && (
                            <div className="mt-2 ml-7">
                              <p className="text-xs text-gray-600 mb-1">Servicios que ofrece:</p>
                              <div className="flex flex-wrap gap-1">
                                {serviciosDelContratista.slice(0, 3).map((servicio, index) => {
                                  const servicioId = servicio._id || servicio;
                                  const servicioNombre = servicio.nombre || servicio.title || servicio.serviceName || `Servicio ${index + 1}`;
                                  
                                  // Verificar si este servicio está en conflicto
                                  const servicioEnConflicto = isSelected && conflictos.some(conflicto => 
                                    conflicto.servicio._id === servicioId
                                  );
                                  
                                  return (
                                    <span
                                      key={servicioId || index}
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
                                        servicioEnConflicto
                                          ? 'bg-red-100 text-red-800 border border-red-300'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                      title={servicioEnConflicto ? `Conflicto: ${servicioNombre}` : servicioNombre}
                                    >
                                      {servicioEnConflicto && <FaBan className="w-3 h-3" />}
                                      {servicioNombre}
                                    </span>
                                  );
                                })}
                                {serviciosDelContratista.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{serviciosDelContratista.length - 3} más
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mostrar conflictos si existen */}
            {conflictos.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                  <h4 className="font-semibold text-red-800">Conflictos de Servicios Detectados</h4>
                </div>
                <div className="space-y-2">
                  {conflictos.map((conflicto, index) => (
                    <div key={index} className="text-sm text-red-700">
                      <strong>{conflicto.servicio.nombre}:</strong> Ya está asignado a{' '}
                      {conflicto.contratistas.map(c => c.nombre).join(' y ')}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-red-600 mt-2 flex items-start gap-1">
                  <FaBan className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Debes resolver estos conflictos antes de poder crear el área. Dentro de la misma área solo puede haber un contratista por cada tipo de servicio.
                </p>
                <p className="text-xs text-red-500 mt-1 font-medium flex items-start gap-1">
                  <FaCheck className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Para resolver: Desmarca uno de los contratistas que ofrece el mismo servicio en esta área.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <FaMapMarkerAlt className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Instrucciones:</p>
                <p>Haz clic en el botón de polígono en la esquina superior izquierda del mapa y dibuja el área que deseas delimitar. Puedes crear el área sin contratistas y asignarlos después, o seleccionar contratistas ahora (sin duplicar servicios dentro de la misma área).</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          {cargandoUbicacion && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Obteniendo ubicación...</p>
              </div>
            </div>
          )}

          <div className="h-full w-full">
            <MapContainer 
              center={ubicacion} 
              zoom={13} 
              style={{ height: "100%", width: "100%", minHeight: "400px" }}
              className="rounded-none"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© OpenStreetMap contributors'
              />
              <MapDrawControl onPoligonoConfirmado={setDatosArea} />

              {/* Mostrar el área actualmente dibujada */}
              {datosArea?.polygon && (
                <Polygon 
                  positions={datosArea.polygon} 
                  pathOptions={{ 
                    color: "#10b981", 
                    weight: 2,
                    fillColor: "#10b981",
                    fillOpacity: 0.2,
                  }} 
                >
                  <Tooltip direction="top" permanent>
                    {nombreArea || "Nueva Área"}
                  </Tooltip>
                </Polygon>
              )}

              {/* Mostrar áreas existentes */}
              {areasExistentes.map((area, index) => {
                if (!area.poligono?.coordinates?.[0]) return null;
                
                const positions = area.poligono.coordinates[0].map(coord => [coord[1], coord[0]]); // [lat, lng]
                
                return (
                  <Polygon
                    key={`area-existente-${area._id || index}`}
                    positions={positions}
                    pathOptions={{ 
                      color: "#6b7280", // gray-500
                      weight: 2, 
                      dashArray: "5, 5",
                      fillColor: "#6b7280",
                      fillOpacity: 0.1,
                    }}
                  >
                    <Tooltip direction="top" sticky>
                      <div className="text-center">
                        <div className="font-semibold">{area.nombre}</div>
                        <div className="text-xs">Clasificación: {area.clasificacion}</div>
                        <div className="text-xs text-gray-600">(Existente)</div>
                      </div>
                    </Tooltip>
                  </Polygon>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <div className="space-y-1">
                {datosArea ? (
                  <div className="flex items-center gap-1 text-green-600 font-medium">
                    <FaCheck className="w-4 h-4" />
                    <span>Área delimitada correctamente</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <FaMapMarkerAlt className="w-4 h-4 text-gray-400" />
                    <span>Dibuja un polígono en el mapa para delimitar el área</span>
                  </div>
                )}
                
                {contratistasSeleccionados.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <FaUsers className="w-4 h-4 text-blue-500" />
                      <span>{contratistasSeleccionados.length} contratista(s) seleccionados</span>
                    </div>
                    {conflictos.length > 0 && (
                      <div className="flex items-center gap-1 text-red-600 font-medium">
                        <FaBan className="w-4 h-4" />
                        <span>{conflictos.length} conflicto(s) - No se puede crear</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!nombreArea.trim() || !datosArea?.coordinates || conflictos.length > 0}
                onClick={handleConfirmar}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  (!nombreArea.trim() || !datosArea?.coordinates || conflictos.length > 0)
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {conflictos.length > 0 ? 'Resolver Conflictos en esta Área' : 'Crear Área'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DelimitadorAreas;
