"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSession } from '@/contexts/AuthContext'
import { useRouter } from "next/navigation"
import { FaMapMarkerAlt, FaExclamationCircle, FaSpinner, FaLock, FaLocationArrow } from "react-icons/fa"
import SelectorDireccionesGuardadas from "@/components/ui/SelectorDireccionesGuardadas"

export default function Servicios() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [ubicacion, setUbicacion] = useState(null)
  const [area, setArea] = useState(null)
  const [loadingUbicacion, setLoadingUbicacion] = useState(true)
  const [errorUbicacion, setErrorUbicacion] = useState("")
  const [permisoUbicacion, setPermisoUbicacion] = useState(null) // 'granted', 'denied', 'prompt'
  const [mostrarSolicitudPermiso, setMostrarSolicitudPermiso] = useState(false)
  const [mostrarSelectorDirecciones, setMostrarSelectorDirecciones] = useState(false)

  useEffect(() => {
    if (status === "loading") {
      return; // No hacer nada mientras la sesión está cargando
    }

    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated") {
      obtenerUbicacionYServicios();
    }
  }, [status, router])

  const obtenerUbicacionYServicios = async () => {
    try {
      setLoadingUbicacion(true);
      setErrorUbicacion("");
      setMostrarSolicitudPermiso(false);

      // Verificar si el navegador soporta geolocalización
      if (!navigator.geolocation) {
        setErrorUbicacion('Tu navegador no soporta geolocalización');
        setPermisoUbicacion('denied');
        await cargarTodosLosServicios();
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

      // Buscar servicios en la zona del usuario
      await cargarServiciosPorZona(latitude, longitude);

    } catch (error) {
      console.error('Error obteniendo ubicación:', error);

      // Manejar diferentes tipos de errores de geolocalización
      if (error.code === 1) { // PERMISSION_DENIED
        setErrorUbicacion('Para ver servicios de tu zona, necesitas permitir el acceso a tu ubicación');
        setPermisoUbicacion('denied');
        setMostrarSolicitudPermiso(true);
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        setErrorUbicacion('No se pudo determinar tu ubicación. Verifica tu conexión GPS o internet');
        setPermisoUbicacion('granted');
      } else if (error.code === 3) { // TIMEOUT
        setErrorUbicacion('La solicitud de ubicación tardó demasiado. Intenta nuevamente');
        setPermisoUbicacion('granted');
      } else {
        setErrorUbicacion('Error al obtener ubicación. Verifica los permisos en tu navegador');
        setPermisoUbicacion('prompt');
        setMostrarSolicitudPermiso(true);
      }

      // Fallback: cargar todos los servicios si no se puede obtener ubicación
      await cargarTodosLosServicios();
    } finally {
      setLoadingUbicacion(false);
    }
  };

  const cargarServiciosPorZona = async (lat, lng) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/servicios-por-zona?lat=${lat}&lng=${lng}`);

      if (!res.ok) {
        throw new Error("Error al cargar servicios por zona");
      }

      const data = await res.json();

      // Los servicios ya vienen con imagenUrl de Cloudinary
      setServicios(data.servicios || []);
      setArea(data.area);
      setError("");

      if (!data.area) {
        setErrorUbicacion('No hay servicios disponibles en tu zona geográfica actual.');
        setArea(null);
      }

    } catch (err) {
      console.error('Error cargando servicios por zona:', err);
      setError("No se pudieron cargar los servicios de tu zona");
    } finally {
      setLoading(false);
    }
  };

  const cargarTodosLosServicios = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/servicios");
      if (!res.ok) throw new Error("Error al cargar servicios");
      const data = await res.json();

      // Mostrar todos los servicios (ya no hay filtro por tipo)
      setServicios(data);
    } catch (err) {
      setError("No se pudieron cargar los servicios");
    } finally {
      setLoading(false);
    }
  };

  const solicitarUbicacionNuevamente = () => {
    setErrorUbicacion("");
    setMostrarSolicitudPermiso(false);
    obtenerUbicacionYServicios();
  };

  const mostrarOpcionesDireccion = () => {
    setMostrarSelectorDirecciones(true);
  };

  const handleDireccionSeleccionada = async ({ direccion, coordenadas }) => {
    try {
      setLoadingUbicacion(true);
      setErrorUbicacion("");

      // Establecer la ubicación seleccionada
      setUbicacion(coordenadas);

      // Cargar servicios para esa zona
      await cargarServiciosPorZona(coordenadas.lat, coordenadas.lng);

    } catch (error) {
      console.error('Error cargando servicios para dirección seleccionada:', error);
      setErrorUbicacion('Error al cargar servicios para la dirección seleccionada');
      await cargarTodosLosServicios();
    } finally {
      setLoadingUbicacion(false);
    }
  };

  const abrirConfiguracionPermisos = () => {
    // En algunos navegadores, esto no es posible programáticamente
    // pero al menos damos instrucciones claras al usuario
    if (navigator.userAgent.includes('Chrome')) {
      alert('Para habilitar la ubicación:\n1. Haz clic en el ícono de candado en la barra de direcciones\n2. Cambia "Ubicación" a "Permitir"\n3. Recarga la página');
    } else {
      alert('Para habilitar la ubicación:\n1. Ve a la configuración de tu navegador\n2. Busca "Permisos de sitio" o "Ubicación"\n3. Permite el acceso para este sitio\n4. Recarga la página');
    }
  };

  if (status === "loading") {
    return <div className="text-gray-900 text-center mt-10 transition-colors">Cargando servicios...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 md:pb-0 transition-colors">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
            Servicios Express
          </h2>
          <p className="text-gray-600 mb-4">
            Servicios urgentes con atención inmediata en tu zona
          </p>

          {/* Leyenda de garantía */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-4 py-2.5 rounded-lg mb-4 shadow-sm">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-900">
              Todos nuestros servicios cuentan con garantía de satisfacción del 100%
            </span>
          </div>

          {/* Información de ubicación y zona */}
          {loadingUbicacion ? (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <FaSpinner className="animate-spin" />
              <span className="text-sm">Obteniendo tu ubicación...</span>
            </div>
          ) : area ? (
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-lg text-green-800">
              <FaMapMarkerAlt />
              <span className="text-sm font-medium">
                Servicios en {area.nombre} (Zona {area.clasificacion})
              </span>
            </div>
          ) : errorUbicacion ? (
            <div className={`border px-4 py-3 rounded-lg max-w-md mx-auto ${permisoUbicacion === 'denied' || mostrarSolicitudPermiso
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                {permisoUbicacion === 'denied' || mostrarSolicitudPermiso ? (
                  <FaLock className="text-red-600" />
                ) : (
                  <FaExclamationCircle />
                )}
                <span className="text-sm font-medium">
                  {permisoUbicacion === 'denied' || mostrarSolicitudPermiso
                    ? 'Permisos de ubicación requeridos'
                    : 'Ubicación no disponible'
                  }
                </span>
              </div>
              <p className="text-xs mb-3">{errorUbicacion}</p>
              <div className="flex flex-col gap-2">
                {permisoUbicacion === 'denied' || mostrarSolicitudPermiso ? (
                  <>
                    <button
                      onClick={solicitarUbicacionNuevamente}
                      className="text-xs sm:text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 sm:py-2.5 rounded border border-red-300 transition-colors flex items-center justify-center gap-1"
                    >
                      <FaLocationArrow className="text-xs" />
                      <span>Solicitar permisos de ubicación</span>
                    </button>
                    <button
                      onClick={mostrarOpcionesDireccion}
                      className="text-xs sm:text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 sm:py-2.5 rounded border border-blue-300 transition-colors flex items-center justify-center gap-1"
                    >
                      <FaMapMarkerAlt className="text-xs" />
                      <span>Usar mis direcciones guardadas</span>
                    </button>
                    <button
                      onClick={abrirConfiguracionPermisos}
                      className="text-xs sm:text-sm text-red-700 underline hover:text-red-900 py-1"
                    >
                      ¿Cómo habilitar la ubicación?
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={solicitarUbicacionNuevamente}
                      className="text-xs sm:text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 sm:py-2.5 rounded border border-yellow-300 transition-colors"
                    >
                      Intentar nuevamente
                    </button>
                    <button
                      onClick={mostrarOpcionesDireccion}
                      className="text-xs sm:text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 sm:py-2.5 rounded border border-blue-300 transition-colors flex items-center justify-center gap-1"
                    >
                      <FaMapMarkerAlt className="text-xs" />
                      <span>Usar mis direcciones guardadas</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <FaSpinner className="animate-spin mr-2 text-primary" size={20} />
            <p className="text-gray-600">Cargando servicios...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-lg text-red-800 max-w-md mx-auto">
              <FaExclamationCircle className="mx-auto mb-2" size={24} />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && servicios.length === 0 && !error && (
          <div className="text-center py-12">
            <FaMapMarkerAlt className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay servicios express disponibles
            </h3>
            <p className="text-gray-500 mb-4">
              {area
                ? `No hay servicios urgentes disponibles en ${area.nombre} en este momento.`
                : 'No se encontraron servicios en tu zona actual.'
              }
            </p>
            <button
              onClick={solicitarUbicacionNuevamente}
              className="text-primary hover:text-primary-hover underline"
            >
              Actualizar ubicación
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {servicios.map((servicio) => (
            <div
              key={servicio._id}
              className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden"
            >
              <div className="relative h-48 sm:h-52 lg:h-60">
                <img
                  src={servicio.imagenUrl || "/images/sinbatallarmini.png"}
                  alt={servicio.nombre}
                  className="object-cover w-full h-full"
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = "/images/sinbatallarmini.png"; // Fallback image
                  }}
                />
                {servicio.contratistasDisponibles && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {servicio.contratistasDisponibles} disponible(s)
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4 flex flex-col gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{servicio.nombre}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {servicio.categoria}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {servicio.descripcion}
                  </p>
                  {servicio.precioMin && servicio.precioMax && (
                    <p className="text-xs sm:text-sm text-green-600 mt-1 font-medium">
                      ${servicio.precioMin} - ${servicio.precioMax}
                    </p>
                  )}
                </div>
                <Link href={`/main/extra/serviceForm?tipo=${encodeURIComponent(servicio.nombre)}&servicioId=${servicio._id}`}>
                  <button className="w-full bg-primary hover:bg-primary-hover text-white py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors">
                    Solicitar Express
                  </button>
                </Link>
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
              Si cambias de ubicación, los servicios disponibles pueden variar.
            </p>
          </div>
        )}
      </section>

      {/* Modal de selector de direcciones */}
      <SelectorDireccionesGuardadas
        isOpen={mostrarSelectorDirecciones}
        onClose={() => setMostrarSelectorDirecciones(false)}
        onDireccionSelect={handleDireccionSeleccionada}
        title="Selecciona una ubicación para ver servicios"
      />
    </div>
  )
}
