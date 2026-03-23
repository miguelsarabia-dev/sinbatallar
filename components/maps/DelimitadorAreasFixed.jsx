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
import booleanIntersects from "@turf/boolean-intersects";
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

const DelimitadorAreasFixed = ({ onAreaConfirmada, onCancel, areasExistentes = [], hideContratistas = false, aperturadorId = null }) => {
  const [ubicacion, setUbicacion] = useState([28.634, -106.069]); // Chihuahua por defecto
  const [nombreArea, setNombreArea] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [clasificacion, setClasificacion] = useState("C");
  const [datosArea, setDatosArea] = useState(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  
  // Estados para estadísticas aproximadas
  const [viviendasAprox, setViviendasAprox] = useState(0);
  const [negociosAprox, setNegociosAprox] = useState(0);
  const [edificiosAprox, setEdificiosAprox] = useState(0);
  
  // Estados para contratistas
  const [contratistas, setContratistas] = useState([]);
  const [contratistasSeleccionados, setContratistasSeleccionados] = useState([]);
  const [cargandoContratistas, setCargandoContratistas] = useState(true);
  const [conflictos, setConflictos] = useState([]);
  
  // Estados para validación de sobreposición
  const [overlapError, setOverlapError] = useState(null);
  const [areasSuperpuestas, setAreasSuperpuestas] = useState([]);
  
  // Estados para todas las zonas de la BD
  const [todasLasZonas, setTodasLasZonas] = useState([]);
  const [cargandoZonas, setCargandoZonas] = useState(true);

  useEffect(() => {
    // Obtener ubicación del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUbicacion([pos.coords.latitude, pos.coords.longitude]);
          setCargandoUbicacion(false);
        },
        (error) => {
          console.log("Error obteniendo ubicación:", error);
          setCargandoUbicacion(false); // Usar ubicación por defecto
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      setCargandoUbicacion(false);
    }

    // Cargar contratistas disponibles
    cargarContratistas();
    
    // Cargar todas las zonas de la BD
    cargarTodasLasZonas();
  }, []);

  const cargarTodasLasZonas = async () => {
    try {
      setCargandoZonas(true);
      const response = await fetch('/api/areas');
      if (response.ok) {
        const data = await response.json();
        setTodasLasZonas(data);
      }
    } catch (error) {
      console.error('Error cargando zonas:', error);
    } finally {
      setCargandoZonas(false);
    }
  };

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

  // Función para validar si un nuevo polígono se solapa con áreas existentes
  const validarSobreposicion = (nuevoPoligono) => {
    if (!nuevoPoligono || !nuevoPoligono.coordinates || !todasLasZonas || todasLasZonas.length === 0) {
      setOverlapError(null);
      setAreasSuperpuestas([]);
      return true; // No hay áreas existentes o datos inválidos
    }

    const nuevaArea = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: nuevoPoligono.coordinates
      }
    };

    const areasConSolapamiento = [];

    for (const areaExistente of todasLasZonas) {
      if (!areaExistente.poligono || !areaExistente.poligono.coordinates) continue;

      const areaExistenteGeoJSON = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: areaExistente.poligono.coordinates
        }
      };

      try {
        // Verificar si hay intersección
        if (booleanIntersects(nuevaArea, areaExistenteGeoJSON)) {
          areasConSolapamiento.push({
            area: areaExistente
          });
        }
      } catch (error) {
        console.error("Error al validar sobreposición:", error);
      }
    }

    if (areasConSolapamiento.length > 0) {
      setOverlapError(`Esta zona se solapa con ${areasConSolapamiento.length} área(s) existente(s)`);
      setAreasSuperpuestas(areasConSolapamiento);
      return false;
    } else {
      setOverlapError(null);
      setAreasSuperpuestas([]);
      return true;
    }
  };

  // Función para manejar cuando se dibuja un nuevo polígono
  const handlePoligonoConfirmado = (datosPoligono) => {
    setDatosArea(datosPoligono);
    // Validar sobreposición inmediatamente
    validarSobreposicion(datosPoligono);
  };

  const handleConfirmar = () => {
    if (!nombreArea.trim() || !datosArea?.coordinates) {
      return;
    }

    // Validar sobreposición con áreas existentes
    if (!validarSobreposicion(datosArea)) {
      return; // No permitir guardar si hay sobreposición
    }

    // No permitir guardar si hay conflictos de servicios dentro de la misma área
    if (!hideContratistas && conflictos.length > 0) {
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
      estadisticas: {
        viviendas: viviendasAprox || 0,
        negocios: negociosAprox || 0,
        edificios: edificiosAprox || 0,
        ultimaActualizacion: new Date()
      }
    };

    onAreaConfirmada(areaData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
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

          {/* Formulario básico */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Área *
              </label>
              <input
                type="text"
                placeholder="Ej: Zona Centro"
                value={nombreArea}
                onChange={(e) => setNombreArea(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clasificación
              </label>
              <select
                value={clasificacion}
                onChange={(e) => setClasificacion(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
              >
                <option value="C">C - Básica</option>
                <option value="B">B - Intermedia</option>
                <option value="A">A - Avanzada</option>
                <option value="AA">AA - Premium</option>
                <option value="AAA">AAA - Élite</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <input
                type="text"
                placeholder="Descripción breve"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
                maxLength={200}
              />
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-1 mb-1">
                  <FaUsers className="w-4 h-4" />
                  <span>{contratistasSeleccionados.length} contratistas</span>
                </div>
                {conflictos.length > 0 && (
                  <div className="flex items-center gap-1 text-red-600 text-xs">
                    <FaBan className="w-3 h-3" />
                    <span>{conflictos.length} conflictos</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Estadísticas Aproximadas */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Estadísticas Aproximadas del Área</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  Viviendas Aproximadas
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={viviendasAprox || ''}
                  onChange={(e) => setViviendasAprox(e.target.value === '' ? 0 : parseInt(e.target.value))}
                  className="w-full border border-blue-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  Negocios Aproximados
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={negociosAprox || ''}
                  onChange={(e) => setNegociosAprox(e.target.value === '' ? 0 : parseInt(e.target.value))}
                  className="w-full border border-blue-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  Edificios Aproximados
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={edificiosAprox || ''}
                  onChange={(e) => setEdificiosAprox(e.target.value === '' ? 0 : parseInt(e.target.value))}
                  className="w-full border border-blue-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Ingresa valores aproximados para tener un estimado del potencial del área
            </p>
          </div>

          {/* Alerta de sobreposición */}
          {overlapError && (
            <div className="mt-3 p-3 bg-red-50 border-2 border-red-500 rounded-lg">
              <div className="flex items-start gap-2">
                <FaExclamationTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    {overlapError}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    La zona que estás dibujando se traslapa con:
                  </p>
                  <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                    {areasSuperpuestas.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.area.nombre}</strong> ({item.area.clasificacion})
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-700 mt-2 font-medium">
                    Por favor, ajusta el área para que no se solape con zonas existentes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instrucciones */}
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <FaMapMarkerAlt className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <strong>Instrucciones:</strong> Usa el botón de polígono en el mapa para dibujar el área.{!hideContratistas && ' Luego selecciona contratistas en la lista de abajo.'}
              </p>
            </div>
          </div>

          {/* Leyenda de colores */}
          {!cargandoZonas && todasLasZonas.length > 0 && (
            <div className="mt-3 p-2 bg-gray-50 border border-gray-300 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 mb-2">Leyenda del mapa:</p>
              <div className="space-y-1">
                {aperturadorId && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 border-2 border-green-600 bg-green-600 opacity-30 rounded"></div>
                    <span className="text-gray-700">Tus zonas (verde)</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 border-2 border-red-500 bg-red-500 opacity-30 rounded"></div>
                  <span className="text-gray-700">Zonas de otros aperturadores (rojo)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 border-2 border-red-600 bg-red-600 opacity-50 rounded"></div>
                  <span className="text-gray-700 font-semibold">Zona superpuesta - NO permitida (rojo intenso)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contenido principal: Mapa y contratistas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Mapa */}
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
                style={{ height: "100%", width: "100%" }}
                className="h-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© OpenStreetMap contributors'
                />
                <MapDrawControl onPoligonoConfirmado={handlePoligonoConfirmado} />

                {/* Mostrar el área actualmente dibujada */}
                {datosArea?.polygon && (
                  <Polygon 
                    positions={datosArea.polygon} 
                    pathOptions={{ 
                      color: overlapError ? "#ef4444" : "#10b981", // Rojo si hay overlap, verde si no
                      weight: overlapError ? 3 : 2,
                      fillColor: overlapError ? "#ef4444" : "#10b981",
                      fillOpacity: overlapError ? 0.3 : 0.2,
                    }} 
                  >
                    <Tooltip direction="top" permanent>
                      <div className="text-center">
                        <div>{nombreArea || "Nueva Área"}</div>
                        {overlapError && (
                          <div className="text-xs text-red-600 font-bold mt-1">⚠️ SOLAPADA</div>
                        )}
                      </div>
                    </Tooltip>
                  </Polygon>
                )}

                {/* Mostrar TODAS las zonas de la BD */}
                {todasLasZonas.map((area, index) => {
                  if (!area.poligono?.coordinates?.[0]) return null;
                  
                  const positions = area.poligono.coordinates[0].map(coord => [coord[1], coord[0]]); // [lat, lng]
                  
                  // Verificar si esta área está en conflicto
                  const estaSuperpuesta = areasSuperpuestas.some(item => item.area._id === area._id);
                  
                  // Verificar si el área pertenece al aperturador actual (convertir a string para comparación segura)
                  const areaAperturadorId = area.aperturador?._id?.toString() || area.aperturador?.toString() || '';
                  const currentAperturadorId = aperturadorId ? aperturadorId.toString() : '';
                  const esDelAperturador = aperturadorId && areaAperturadorId === currentAperturadorId;
                  
                  // Determinar color: rojo si superpuesta, verde si es del aperturador, rojo si no es del aperturador
                  let color, fillColor, dashArray, weight, fillOpacity;
                  
                  if (estaSuperpuesta) {
                    // Zona superpuesta - ROJO INTENSO
                    color = "#dc2626"; // red-600
                    fillColor = "#dc2626";
                    weight = 3;
                    dashArray = "";
                    fillOpacity = 0.4;
                  } else if (esDelAperturador) {
                    // Zona del aperturador - VERDE
                    color = "#16a34a"; // green-600
                    fillColor = "#16a34a";
                    weight = 2;
                    dashArray = "5, 5";
                    fillOpacity = 0.15;
                  } else {
                    // Zona de otros - ROJO
                    color = "#ef4444"; // red-500
                    fillColor = "#ef4444";
                    weight = 2;
                    dashArray = "5, 5";
                    fillOpacity = 0.15;
                  }
                  
                  return (
                    <Polygon
                      key={`area-existente-${area._id || index}`}
                      positions={positions}
                      pathOptions={{ 
                        color,
                        weight, 
                        dashArray,
                        fillColor,
                        fillOpacity,
                      }}
                    >
                      <Tooltip direction="top" sticky>
                        <div className="text-center">
                          <div className="font-semibold">{area.nombre}</div>
                          <div className="text-xs">Clasificación: {area.clasificacion}</div>
                          {estaSuperpuesta ? (
                            <div className="text-xs text-red-600 font-bold">⚠️ SUPERPUESTA!</div>
                          ) : esDelAperturador ? (
                            <div className="text-xs text-green-600 font-medium">✓ Tu zona</div>
                          ) : (
                            <div className="text-xs text-red-600">● Zona de otro aperturador</div>
                          )}
                        </div>
                      </Tooltip>
                    </Polygon>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* Panel de contratistas */}
          {!hideContratistas && (
          <div className="w-80 border-l border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <FaUsers className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Contratistas
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Selecciona los contratistas que trabajarán en esta área (opcional)
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cargandoContratistas ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-gray-600">Cargando...</span>
                </div>
              ) : contratistas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay contratistas disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
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
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleContratista(contratista)}
                            className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-gray-900 truncate">{contratista.nombre}</h4>
                              <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                                contratista.promedioCalificacion >= 4 ? 'bg-green-100 text-green-800' :
                                contratista.promedioCalificacion >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {contratista.promedioCalificacion}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate">{contratista.email}</p>
                            <p className="text-xs text-gray-500">{serviciosDelContratista.length} servicios</p>
                            
                            {/* Mostrar conflictos si los hay */}
                            {tieneConflictos && isSelected && (
                              <div className="mt-1 flex items-center gap-1 text-red-600">
                                <FaBan className="w-3 h-3" />
                                <span className="text-xs">Tiene conflictos</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mostrar conflictos si existen */}
            {conflictos.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                    <h4 className="font-semibold text-red-800 text-sm">Conflictos Detectados</h4>
                  </div>
                  <div className="space-y-1">
                    {conflictos.map((conflicto, index) => (
                      <div key={index} className="text-xs text-red-700">
                        <strong>{conflicto.servicio.nombre}</strong> duplicado en {conflicto.contratistas.length} contratistas
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-red-600 mt-2">
                    Desmarca uno de los contratistas con servicios duplicados.
                  </p>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 flex items-center gap-4">
              {datosArea ? (
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <FaCheck className="w-4 h-4" />
                  <span>Área delimitada</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-600">
                  <FaMapMarkerAlt className="w-4 h-4" />
                  <span>Dibuja el área en el mapa</span>
                </div>
              )}
              
              {!hideContratistas && contratistasSeleccionados.length > 0 && (
                <div className="flex items-center gap-1">
                  <FaUsers className="w-4 h-4 text-blue-500" />
                  <span>{contratistasSeleccionados.length} contratistas seleccionados</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!nombreArea.trim() || !datosArea?.coordinates || overlapError || (!hideContratistas && conflictos.length > 0)}
                onClick={handleConfirmar}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  (!nombreArea.trim() || !datosArea?.coordinates || overlapError || (!hideContratistas && conflictos.length > 0))
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {overlapError ? 'Zona Superpuesta' : (!hideContratistas && conflictos.length > 0 ? 'Resolver Conflictos' : 'Crear Área')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DelimitadorAreasFixed;
