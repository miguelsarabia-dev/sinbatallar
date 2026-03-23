"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from '@/contexts/AuthContext';
import {
  FaMapMarkerAlt,
  FaSpinner,
  FaExclamationCircle,
  FaLocationArrow,
  FaCog,
  FaLock,
  FaBan,
  FaCheck,
  FaTimes
} from "react-icons/fa";
import SelectorDireccionesGuardadas from "@/components/ui/SelectorDireccionesGuardadas";

const ServiciosProgramablesNuevo = () => {
  const { data: session, status } = useSession();
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");



  // Estados de ubicación
  const [loadingUbicacion, setLoadingUbicacion] = useState(true);
  const [errorUbicacion, setErrorUbicacion] = useState("");
  const [ubicacion, setUbicacion] = useState(null);
  const [area, setArea] = useState(null);
  const [permisoUbicacion, setPermisoUbicacion] = useState('prompt');
  const [mostrarSolicitudPermiso, setMostrarSolicitudPermiso] = useState(false);
  const [mostrarSelectorDirecciones, setMostrarSelectorDirecciones] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      obtenerUbicacionYServicios();
    }
  }, [status]);

  const obtenerUbicacionYServicios = async () => {
    try {
      setLoadingUbicacion(true);
      setErrorUbicacion("");
      setMostrarSolicitudPermiso(false);

      // Verificar si el navegador soporta geolocalización
      if (!navigator.geolocation) {
        setErrorUbicacion('Tu navegador no soporta geolocalización');
        setPermisoUbicacion('denied');
        setLoadingUbicacion(false);
        setServicios([]);
        setLoading(false);
        return;
      }

      // Intentar obtener ubicación directamente - esto activará el diálogo de permisos si es necesario
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000, // Aumentamos el timeout
            maximumAge: 60000 // Reducimos la edad máxima para ubicaciones más frescas
          }
        );
      });

      const { latitude, longitude } = position.coords;
      setUbicacion({ lat: latitude, lng: longitude });
      setPermisoUbicacion('granted');
      setMostrarSolicitudPermiso(false);

      // Buscar servicios programables en la zona del usuario
      await cargarServiciosPorZona(latitude, longitude);

    } catch (error) {
      console.error('Error obteniendo ubicación:', error);

      // Asegurar que error tenga la estructura esperada
      const errorCode = error?.code;
      const errorMessage = error?.message || 'Error desconocido';

      console.log('Código de error:', errorCode, 'Mensaje:', errorMessage);

      // Manejar diferentes tipos de errores de geolocalización
      if (errorCode === 1) { // PERMISSION_DENIED
        console.log('Permisos de ubicación denegados');
        setErrorUbicacion('Para ver servicios de tu zona, necesitas permitir el acceso a tu ubicación');
        setPermisoUbicacion('denied');
        setMostrarSolicitudPermiso(true);
      } else if (errorCode === 2) { // POSITION_UNAVAILABLE
        console.log('Posición no disponible');
        setErrorUbicacion('No se pudo determinar tu ubicación. Verifica tu conexión GPS o internet');
        setPermisoUbicacion('granted'); // Los permisos están bien, es un problema técnico
      } else if (errorCode === 3) { // TIMEOUT
        console.log('Timeout obteniendo ubicación');
        setErrorUbicacion('La solicitud de ubicación tardó demasiado. Intenta nuevamente');
        setPermisoUbicacion('granted');
      } else {
        console.log('Error desconocido obteniendo ubicación');
        setErrorUbicacion('Error al obtener ubicación. Verifica los permisos en tu navegador');
        setPermisoUbicacion('prompt'); // Estado incierto
        setMostrarSolicitudPermiso(true);
      }

      // NO cargar servicios si no tenemos ubicación - es un servicio basado en zona
      setServicios([]);
      setArea(null);
    } finally {
      setLoadingUbicacion(false);
      setLoading(false);
    }
  };

  const cargarServiciosPorZona = async (lat, lng) => {
    try {
      setLoading(true);
      console.log('🗺️ Cargando servicios para coordenadas:', { lat, lng });

      const res = await fetch(`/api/servicios-por-zona?lat=${lat}&lng=${lng}`);

      if (!res.ok) {
        throw new Error("Error al cargar servicios por zona");
      }

      const data = await res.json();
      console.log('📦 Datos recibidos de la API:', data);
      console.log('🏢 Área detectada:', data.area);

      // La API devuelve servicios con estructura { servicio, contratistas }
      // Necesitamos extraer solo los servicios y agregar info de contratistas
      const serviciosProgramables = (data.servicios || []).map(servicioConContratistas => ({
        ...servicioConContratistas.servicio,
        contratistasDisponibles: servicioConContratistas.totalContratistas || servicioConContratistas.contratistas?.length || 0
      }));

      console.log('✅ Servicios programables procesados:', serviciosProgramables.length);

      setServicios(serviciosProgramables);
      setArea(data.area);
      setError("");

      if (!data.area) {
        console.log('⚠️ No se encontró área para las coordenadas');
        // Coordenadas recibidas pero zona no cubierta - mensaje específico
        setErrorUbicacion('Desafortunadamente, tu zona aún no está cubierta por nuestros servicios. Estamos expandiendo nuestra cobertura constantemente.');
        setArea(null);
      } else {
        console.log('✅ Área establecida:', data.area.nombre, '- Clasificación:', data.area.clasificacion);
        // Si hay área, limpiar cualquier error previo
        setErrorUbicacion('');
      }

    } catch (err) {
      console.error('❌ Error cargando servicios por zona:', err);
      setError("No se pudieron cargar los servicios de tu zona");
    } finally {
      setLoading(false);
    }
  };

  const abrirConfiguracionPermisos = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      alert('Ve a Configuración > Privacidad > Servicios de ubicación y habilita la ubicación para tu navegador');
    } else {
      alert('Haz clic en el ícono de ubicación en la barra de direcciones de tu navegador y selecciona "Permitir"');
    }
  };

  const solicitarPermisoUbicacion = () => {
    obtenerUbicacionYServicios();
  };

  const mostrarOpcionesDireccion = () => {
    setMostrarSelectorDirecciones(true);
  };

  const handleDireccionSeleccionada = async ({ direccion, coordenadas }) => {
    try {
      setLoadingUbicacion(true);
      setErrorUbicacion("");
      setMostrarSelectorDirecciones(false);

      console.log('🏠 Dirección seleccionada:', direccion);
      console.log('📍 Coordenadas de la dirección:', coordenadas);

      // Establecer la ubicación seleccionada
      setUbicacion(coordenadas);

      // Cargar servicios para esa zona
      await cargarServiciosPorZona(coordenadas.lat, coordenadas.lng);

    } catch (error) {
      console.error('❌ Error cargando servicios para dirección seleccionada:', error);
      setErrorUbicacion('Error al cargar servicios para la dirección seleccionada');
      // No cargar servicios sin ubicación válida
      setServicios([]);
      setArea(null);
    } finally {
      setLoadingUbicacion(false);
    }
  };

  const handleServicioClick = (servicio) => {
    const url = `/main/servicios-programables/solicitar?servicioId=${servicio._id}&lat=${ubicacion?.lat || ''}&lng=${ubicacion?.lng || ''}&servicioNombre=${encodeURIComponent(servicio.nombre || 'Servicio')}&areaNombre=${encodeURIComponent(area?.nombre || '')}&contratistaId=auto`;
    window.location.href = url;
  };

  if (status === "loading") {
    return <div className="text-gray-900 text-center mt-10 transition-colors">Cargando servicios...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0 transition-colors">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
            Servicios Programables
          </h2>
          <p className="text-gray-600 mb-6">
            Solicita servicios con cita previa en tu zona
          </p>

          {/* Grid de tarjetas informativas - Responsive */}
          <div className="max-w-5xl mx-auto mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {/* Tarjeta de garantía */}
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl shadow-sm">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <span className="text-xs md:text-sm font-medium text-blue-800 block">
                    Todos nuestros servicios cuentan con garantía de satisfacción del 100%
                  </span>
                </div>
              </div>

              {/* Tarjeta de ubicación/zona */}
              {loadingUbicacion ? (
                <div className="flex items-center justify-center gap-3 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl">
                  <FaSpinner className="animate-spin text-slate-600 text-lg" />
                  <span className="text-xs md:text-sm font-medium text-slate-700">Obteniendo tu ubicación...</span>
                </div>
              ) : area ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl shadow-sm">
                  <FaMapMarkerAlt className="text-emerald-600 text-lg md:text-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs md:text-sm font-medium text-emerald-800 block">
                      Servicios en {area.nombre}
                    </span>
                    <span className="text-xs text-emerald-700">
                      (Zona {area.clasificacion})
                    </span>
                  </div>
                </div>
              ) : errorUbicacion ? (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                  <FaExclamationCircle className="text-red-600 text-lg flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium text-red-800">
                    Ubicación requerida
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
                  <FaMapMarkerAlt className="text-amber-600 text-lg flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium text-amber-800">
                    Esperando ubicación
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mensaje de error de ubicación (si existe) */}
          {errorUbicacion && (
            <div className="mb-4">
              {/* Caso 1: Permisos de ubicación denegados */}
              {permisoUbicacion === 'denied' && mostrarSolicitudPermiso ? (
                <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-lg text-red-800 max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <FaLock className="text-red-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-600">Permisos de ubicación bloqueados</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 mb-3 px-1">
                    Para ver servicios disponibles en tu zona, necesitamos acceder a tu ubicación.
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <button
                      onClick={solicitarPermisoUbicacion}
                      className="inline-flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm px-3 py-2 sm:py-1.5 rounded-md transition-colors"
                    >
                      <FaLocationArrow className="text-xs" />
                      <span>Activar ubicación</span>
                    </button>
                    <button
                      onClick={abrirConfiguracionPermisos}
                      className="inline-flex items-center justify-center gap-1 bg-slate-500 hover:bg-slate-600 text-white text-xs sm:text-sm px-3 py-2 sm:py-1.5 rounded-md transition-colors"
                    >
                      <FaCog className="text-xs" />
                      <span>Ver ayuda de permisos</span>
                    </button>
                    <button
                      onClick={mostrarOpcionesDireccion}
                      className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm px-3 py-2 sm:py-1.5 rounded-md transition-colors"
                    >
                      <FaMapMarkerAlt className="text-xs" />
                      <span>Usar direcciones guardadas</span>
                    </button>
                  </div>
                </div>
              ) : ubicacion && !area ? (
                /* Caso 2: Coordenadas recibidas pero zona no cubierta */
                <div className="bg-orange-50 border border-orange-200 px-4 py-3 rounded-lg text-orange-800 max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <FaBan className="text-orange-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-orange-600">Zona no cubierta</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 mb-3 px-1">
                    {errorUbicacion}
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <button
                      onClick={mostrarOpcionesDireccion}
                      className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm px-3 py-2 sm:py-1.5 rounded-md transition-colors"
                    >
                      <FaMapMarkerAlt className="text-xs" />
                      <span>Probar con otra dirección</span>
                    </button>
                    <button
                      onClick={obtenerUbicacionYServicios}
                      className="inline-flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm px-3 py-2 sm:py-1.5 rounded-md transition-colors"
                    >
                      <FaLocationArrow className="text-xs" />
                      <span>Actualizar ubicación</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Caso 3: Error técnico (timeout, GPS no disponible, etc) */
                <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg text-amber-800 max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <FaExclamationCircle className="text-amber-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">Error al obtener ubicación</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 mb-2 px-1">{errorUbicacion}</p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <button
                      onClick={obtenerUbicacionYServicios}
                      className="inline-flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm px-3 py-2 sm:py-1.5 rounded-md transition-colors"
                    >
                      <FaLocationArrow className="text-xs" />
                      <span>Intentar de nuevo</span>
                    </button>
                    <button
                      onClick={mostrarOpcionesDireccion}
                      className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm px-3 py-2 sm:py-1.5 rounded-md transition-colors"
                    >
                      <FaMapMarkerAlt className="text-xs" />
                      <span>Usar direcciones guardadas</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botón de usar direcciones guardadas - Solo visible cuando NO hay error o cuando la ubicación funcionó correctamente */}
          {!errorUbicacion && (
            <div className="mb-4">
              <button
                onClick={mostrarOpcionesDireccion}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg transition-colors shadow-sm text-sm font-medium"
              >
                <FaMapMarkerAlt />
                <span>Usar mis direcciones guardadas</span>
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <FaSpinner className="animate-spin mr-2 text-primary" size={20} />
            <p className="text-gray-600">Cargando servicios...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-lg text-red-700 max-w-md mx-auto">
              <FaExclamationCircle className="mx-auto mb-2" size={24} />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && servicios.length === 0 && !error && (
          <div className="text-center py-12">
            <FaMapMarkerAlt className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {errorUbicacion
                ? 'No se puede mostrar servicios sin ubicación'
                : 'No hay servicios programables disponibles'
              }
            </h3>
            <p className="text-gray-500 mb-4">
              {errorUbicacion
                ? 'Los servicios programables requieren conocer tu ubicación para asignar técnicos disponibles en tu zona.'
                : area
                  ? `No hay servicios programables disponibles en ${area.nombre} en este momento.`
                  : 'No se encontraron servicios en tu zona actual.'
              }
            </p>
            {!errorUbicacion && (
              <button
                onClick={obtenerUbicacionYServicios}
                className="text-primary hover:text-primary-hover underline"
              >
                Actualizar ubicación
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {servicios.map((servicio, index) => (
            <div
              key={servicio._id || `servicio-${index}`}
              className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden"
            >
              <div className="relative h-48 sm:h-52 lg:h-60">
                <img
                  src={servicio.imagenUrl || "/images/sinbatallarmini.png"}
                  alt={servicio.nombre || 'Servicio'}
                  className="object-cover w-full h-full"
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = "/images/sinbatallarmini.png"; // Fallback image
                  }}
                />
                {servicio.contratistasDisponibles && servicio.contratistasDisponibles > 0 && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {servicio.contratistasDisponibles} disponible(s)
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4 flex flex-col gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{servicio.nombre || 'Servicio'}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {servicio.categoria || 'Categoría general'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {servicio.descripcion || 'Descripción no disponible'}
                  </p>
                  {servicio.precioMin && servicio.precioMax && (
                    <p className="text-xs sm:text-sm text-green-600 mt-1 font-medium">
                      ${servicio.precioMin} - ${servicio.precioMax}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleServicioClick(servicio)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors"
                >
                  Solicitar Cita
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Información adicional sobre zonas */}
        {area && (
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Servicios en tu zona: {area.nombre}
            </h3>
            <p className="text-blue-800 text-sm">
              Los servicios mostrados están disponibles en tu zona geográfica actual.
              Al solicitar un servicio, se asignará automáticamente un contratista de tu zona.
            </p>
          </div>
        )}


      </section>

      {/* Modal de selector de direcciones */}
      <SelectorDireccionesGuardadas
        isOpen={mostrarSelectorDirecciones}
        onClose={() => setMostrarSelectorDirecciones(false)}
        onDireccionSelect={handleDireccionSeleccionada}
        title="Selecciona una ubicación para ver servicios programables"
      />
    </div>
  );
};

export default ServiciosProgramablesNuevo;
