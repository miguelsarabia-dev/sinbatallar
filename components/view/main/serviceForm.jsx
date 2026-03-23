"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from '@/contexts/AuthContext';
import { Modal } from "../../ui";
import { useModal } from "../../../hooks/useModal";
import { FaMapMarkerAlt, FaCheckCircle, FaExclamationCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";

const ServiceForm = () => {
  const { modalState, showError, hideModal } = useModal();
  const [formData, setFormData] = useState({
    descripcionProblema: "",
    detallesServicio: {} // Objeto flexible para cualquier tipo de servicio
  });
  const [imagenesProblema, setImagenesProblema] = useState([]); // Nuevo estado para imágenes

  const [price, setPrice] = useState(0);
  const [servicioDB, setServicioDB] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [esServicioExpress, setEsServicioExpress] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Obtener el tipo de servicio desde la URL
  const serviceType = searchParams.get("tipo") || "";
  const servicioId = searchParams.get("servicioId") || "";

  useEffect(() => {
    // Obtener ubicación del usuario
    const getUserLocation = () => {
      if (navigator.geolocation) {
        setIsRequestingLocation(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setLocationError(false);
            setIsRequestingLocation(false);
          },
          (error) => {
            console.log("Geolocalización fallida:", error.message);
            setLocationError(true);
            setIsRequestingLocation(false);
          }
        );
      } else {
        setLocationError(true);
        setIsRequestingLocation(false);
      }
    };

    getUserLocation();

    // Cargar servicios desde la API
    const fetchServicios = async () => {
      try {
        const res = await fetch("/api/servicios");
        if (res.ok) {
          const data = await res.json();
          setServicios(data);
          
          // Buscar el servicio actual
          let sDB;
          if (servicioId) {
            sDB = data.find(s => s._id === servicioId);
          } else {
            sDB = data.find(s => s.nombre?.trim().toLowerCase() === serviceType.trim().toLowerCase());
          }
          
          setServicioDB(sDB);
          setEsServicioExpress(sDB?.tipo === 'urgente'); // Determinar si es express
        }
      } catch (error) {
        console.error("Error cargando servicios:", error);
      }
    };
    
    fetchServicios();
  }, [serviceType, servicioId]);

  // Función para volver a solicitar la ubicación
  const requestLocationAgain = () => {
    if (navigator.geolocation) {
      setIsRequestingLocation(true);
      setLocationError(false);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(false);
          setIsRequestingLocation(false);
        },
        (error) => {
          console.log("Error al solicitar ubicación nuevamente:", error.message);
          setLocationError(true);
          setIsRequestingLocation(false);
          
          // Si el usuario sigue denegando, mostrar un mensaje más específico
          if (error.code === 1) { // PERMISSION_DENIED
            showError(
              "Para usar este servicio es necesario permitir el acceso a tu ubicación. Por favor, permite el acceso en tu navegador y vuelve a intentar.",
              "Ubicación requerida"
            );
          }
        }
      );
    }
  };

  // Validación: campos requeridos
  const isFormValid = () => {
    return (
      formData.descripcionProblema &&
      formData.descripcionProblema.trim().length > 0 &&
      userLocation // Solo ubicación automática
    );
  };

  // Función para manejar la carga de imágenes
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      showError("Máximo 5 imágenes permitidas");
      return;
    }
    setImagenesProblema(files);
  };

  // Actualizar detalles del servicio según la categoría
  const updateDetallesServicio = (key, value) => {
    setFormData(prev => ({
      ...prev,
      detallesServicio: {
        ...prev.detallesServicio,
        [key]: value
      }
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      showError("Por favor, completa todos los campos obligatorios correctamente.", "Campos incompletos");
      return;
    }
    
    setIsLoading(true);
    
    // Obtener usuario autenticado
    let userId = null;
    if (session?.user) {
      userId = session.user.id || session.user._id || null;
    }
    
    // Preparar FormData para envío con imágenes
    const formDataToSend = new FormData();
    formDataToSend.append('clienteId', userId);
    formDataToSend.append('servicioId', servicioDB?._id);
    formDataToSend.append('descripcionProblema', formData.descripcionProblema);
    formDataToSend.append('detallesServicio', JSON.stringify(formData.detallesServicio));
    formDataToSend.append('ubicacion', JSON.stringify(userLocation));
    formDataToSend.append('esExpress', esServicioExpress);
    
    // Agregar imágenes
    imagenesProblema.forEach((imagen, index) => {
      formDataToSend.append(`imagenesProblema`, imagen);
    });
    
    try {
      const res = await fetch("/api/citas", {
        method: "POST",
        body: formDataToSend,
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Para ambos tipos de servicios, redirigir a citas donde funciona correctamente el sistema simplificado
        router.push("/main/citas");
      } else {
        const errorData = await res.json();
        showError(errorData.error || "No se pudo enviar la solicitud");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error enviando solicitud:", error);
      showError("Error de red al enviar la solicitud");
      setIsLoading(false);
    }
  };

  // Mostrar en consola los datos seleccionados para depuración
  useEffect(() => {
    console.log("formData:", formData);
    console.log("servicioDB:", servicioDB);
    console.log("imagenesProblema:", imagenesProblema);
  }, [formData, servicioDB, imagenesProblema]);

  // Renderizar campos dinámicos según la categoría del servicio
  const renderCamposDinamicos = () => {
    if (!servicioDB?.categoria) return null;
    
    const categoria = servicioDB.categoria.toLowerCase();
    
    if (categoria.includes('automotriz') || categoria.includes('vehiculo')) {
      return (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-gray-900 font-semibold mb-3">Datos del Vehículo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Marca"
              onChange={(e) => updateDetallesServicio('marca', e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Modelo"
              onChange={(e) => updateDetallesServicio('modelo', e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md text-sm"
            />
            <input
              type="number"
              placeholder="Año"
              onChange={(e) => updateDetallesServicio('año', e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Tipo de vehículo"
              onChange={(e) => updateDetallesServicio('tipoVehiculo', e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md text-sm"
            />
          </div>
        </div>
      );
    }
    
    if (categoria.includes('hogar') || categoria.includes('domestico')) {
      return (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-gray-900 font-semibold mb-3">Detalles del Hogar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Tipo de vivienda"
              onChange={(e) => updateDetallesServicio('tipoVivienda', e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Área aproximada"
              onChange={(e) => updateDetallesServicio('area', e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md text-sm"
            />
          </div>
        </div>
      );
    }
    
    if (categoria.includes('construccion') || categoria.includes('obra')) {
      return (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-gray-900 font-semibold mb-3">Detalles de la Obra</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Tipo de proyecto"
              onChange={(e) => updateDetallesServicio('tipoProyecto', e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Metros cuadrados"
              onChange={(e) => updateDetallesServicio('metrosCuadrados', e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md text-sm"
            />
          </div>
        </div>
      );
    }
    
    // Campos genéricos para otros servicios
    return (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-gray-900 font-semibold mb-3">Detalles de ubicación</h3>
        <h4 className="text-gray-600 text-sm mb-2">Proporciona detalles sobre tu ubicación (tiendas, referencias cercanas, etc.)</h4>
        <input
          type="text"
          placeholder="Información adicional relevante"
          onChange={(e) => updateDetallesServicio('informacionAdicional', e.target.value)}
          className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md text-sm"
        />
      </div>
    );
  };

  // Mostrar precio destacado en grande y en blanco antes del botón de solicitar servicio
  return (
    <div className="bg-gray-50 min-h-screen text-gray-900 py-4 sm:py-8 pb-20 transition-colors">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md mx-auto shadow-md border border-gray-200 transition-colors mx-4">
        <form onSubmit={handleSubmit}>
          <h2 className="text-gray-900 text-lg sm:text-xl font-bold mb-4 sm:mb-6 transition-colors">
            {servicioDB?.nombre || "Servicio"}
            {esServicioExpress && (
              <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">EXPRESS</span>
            )}
          </h2>
          {servicioDB?.descripcion && (
            <div className="mb-4 text-gray-600 text-sm transition-colors">{servicioDB.descripcion}</div>
          )}
          
          {/* Campo obligatorio: Descripción del problema */}
          <div className="mb-4">
            <label className="text-gray-900 text-sm mb-1 block transition-colors">
              Describe el problema <span className="text-red-500">*</span>
            </label>
            <textarea
              name="descripcionProblema"
              value={formData.descripcionProblema}
              onChange={handleChange}
              placeholder="Describe detalladamente el problema que necesitas resolver..."
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 sm:py-3 px-3 sm:px-4 rounded-md transition-colors focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base min-h-[80px]"
              required
            />
          </div>
          
          {/* Campo para subir imágenes */}
          <div className="mb-4">
            <label className="text-gray-900 text-sm mb-1 block transition-colors">
              Imágenes del problema (opcional)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full bg-white text-gray-900 border border-gray-300 py-2 px-3 rounded-md transition-colors focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo 5 imágenes. Formatos: JPG, PNG, GIF
            </p>
            {imagenesProblema.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-green-600">
                  {imagenesProblema.length} imagen(es) seleccionada(s)
                </p>
              </div>
            )}
          </div>
          
          {/* Campos dinámicos según el tipo de servicio */}
          {renderCamposDinamicos()}
          
          {/* Sección de ubicación obligatoria */}
          <div className="mb-4">
            <label className="text-gray-900 text-sm mb-2 block font-medium transition-colors">
              Ubicación del servicio <span className="text-red-500">*</span>
            </label>
            
            {/* Estado de ubicación */}
            <div className="mb-3">
              {isRequestingLocation ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <FaSpinner className="animate-spin text-blue-600" />
                  <span className="text-blue-700 text-sm font-medium">
                    Obteniendo tu ubicación...
                  </span>
                </div>
              ) : userLocation ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FaCheckCircle className="text-green-600" />
                  <span className="text-green-700 text-sm font-medium">
                    Ubicación detectada automáticamente
                  </span>
                </div>
              ) : locationError ? (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <FaTimesCircle className="text-red-700" />
                    <p className="text-red-700 text-sm font-medium mb-1">
                      No se pudo obtener tu ubicación
                    </p>
                    <p className="text-red-600 text-xs">
                      Es necesario permitir el acceso a la ubicación para solicitar el servicio.
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={requestLocationAgain}
                    disabled={isRequestingLocation}
                    className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaMapMarkerAlt />
                    {isRequestingLocation ? 'Solicitando ubicación...' : 'Permitir acceso a la ubicación'}
                  </button>
                  
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <FaExclamationCircle className="text-gray-600" />
                    <p className="text-gray-600 text-xs">
                      <strong>Sugerencia:</strong> Si el botón no funciona, verifica que hayas permitido el acceso a la ubicación en la configuración de tu navegador.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <FaExclamationCircle className="text-yellow-700" />
                  <p className="text-yellow-700 text-sm font-medium mb-2">
                    Ubicación requerida
                  </p>
                  <p className="text-yellow-600 text-xs">
                    Detectando tu ubicación automáticamente...
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Información del servicio */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-blue-800 font-semibold mb-2">
              {esServicioExpress ? "Servicio Express" : "Servicio Programable"}
            </h3>
            <p className="text-blue-600 text-sm">
              {esServicioExpress 
                ? "Tu solicitud será enviada inmediatamente a contratistas disponibles. Se creará una cita que será atendida lo antes posible."
                : "Se creará una cita que será asignada a un contratista disponible. Una vez completado el servicio, recibirás la cotización con el costo final."
              }
            </p>
          </div>
          
          <button
            type="submit"
            disabled={!isFormValid() || isLoading}
            className={`mt-2 py-2 sm:py-3 px-4 rounded-md transition-colors w-full font-semibold text-sm sm:text-base ${isFormValid() && !isLoading
              ? "bg-primary hover:bg-primary-hover text-white"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                Procesando...
              </div>
            ) : (
              esServicioExpress ? 'Solicitar Servicio Express' : 'Crear Cita'
            )}
          </button>
        </form>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
      />
    </div>
  );
};

export default ServiceForm;
