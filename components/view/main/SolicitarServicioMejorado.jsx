"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from '@/contexts/AuthContext';
import { useSearchParams, useRouter } from "next/navigation";
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaUser, FaTools, FaHome, FaGlobe, FaComments, FaCamera, FaPlus, FaCheck, FaBuilding, FaMailBulk, FaInfoCircle } from "react-icons/fa";
import DireccionFormConMapa from "../../forms/DireccionFormConMapa";
import Modal from "../../ui/Modal";
import useNotifications from "../../../hooks/useNotifications";

const SolicitarServicioMejoradoContent = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { notifyServiceRequested, requestPermission, permission } = useNotifications();

  // Estados del formulario
  const [formData, setFormData] = useState({
    descripcionProblema: '',
    ubicacionServicio: {
      tipo: 'domicilio', // Solo manejamos direcciones guardadas
      direccionSeleccionada: null,
      zona: null
    },
    fechaPreferida: '',
    horaPreferida: '',
    notas: '',
    imagenesProblema: []
  });

  const [loading, setLoading] = useState(false);
  const [loadingContratistas, setLoadingContratistas] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para direcciones
  const [direccionesGuardadas, setDireccionesGuardadas] = useState([]);
  const [mostrarFormularioDireccion, setMostrarFormularioDireccion] = useState(false);
  const [loadingDirecciones, setLoadingDirecciones] = useState(false);

  // Estados para validación de zona
  const [areaServicio, setAreaServicio] = useState(null);
  const [direccionFueraDeZona, setDireccionFueraDeZona] = useState(false);
  const [validandoZona, setValidandoZona] = useState(false);

  // Datos del servicio y contratistas
  const [servicioInfo, setServicioInfo] = useState(null);
  const [contratistasDisponibles, setContratistasDisponibles] = useState([]);
  const [contratistaSeleccionado, setContratistaSeleccionado] = useState(null);
  // Datos del usuario
  const [datosUsuario, setDatosUsuario] = useState(null);

  // Estado para el modal de confirmación
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [datosConfirmacion, setDatosConfirmacion] = useState(null);

  // Datos pre-llenados de la URL
  const servicioId = searchParams.get('servicioId');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  // Cargar contratistas disponibles cuando se determina la ubicación
  const cargarContratistas = useCallback(async (coordenadas) => {
    if (!coordenadas.lat || !coordenadas.lng || !servicioId) return;

    try {
      setLoadingContratistas(true);
      setError('');

      // Obtener contratistas en la zona que ofrecen servicios programables
      let url = `/api/servicios-por-zona?lat=${coordenadas.lat}&lng=${coordenadas.lng}&tipo=programable`;

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const servicioData = data.servicios?.find(s => s.servicio._id === servicioId);

        if (servicioData && servicioData.contratistas.length > 0) {
          let contradistasFiltrados = servicioData.contratistas;

          if (contradistasFiltrados.length > 0) {
            setContratistasDisponibles(contradistasFiltrados);

            // Auto-seleccionar el primer contratista con mejor calificación
            const mejorContratista = contradistasFiltrados.sort((a, b) =>
              (b.calificacion || 0) - (a.calificacion || 0)
            )[0];
            setContratistaSeleccionado(mejorContratista);


          } else {
            setContratistasDisponibles([]);
            setContratistaSeleccionado(null);
            setError('No hay contratistas disponibles para este servicio en la ubicación especificada');
          }
        } else {
          setContratistasDisponibles([]);
          setContratistaSeleccionado(null);
          setError('No hay contratistas disponibles para este servicio en la ubicación especificada');
        }
      }
    } catch (error) {
      console.error('Error cargando contratistas:', error);
      setError('Error al buscar contratistas disponibles');
      setContratistasDisponibles([]);
      setContratistaSeleccionado(null);
    } finally {
      setLoadingContratistas(false);
    }
  }, [servicioId]);



  // Cargar direcciones guardadas del usuario
  const cargarDirecciones = useCallback(async (autoSeleccionar = false) => {
    if (!session?.user?.id) return [];

    try {
      setLoadingDirecciones(true);
      const response = await fetch(`/api/users/direcciones?userId=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        // El API devuelve { success: true, direcciones: [...] }
        const direccionesArray = data.direcciones || [];

        // Formatear direcciones
        const direccionesFormateadas = direccionesArray.map((dir, index) => ({
          ...dir,
          _id: dir._id || `dir-${index}`,
          alias: `Dirección ${index + 1}`,
          esPrincipal: index === 0
        }));

        setDireccionesGuardadas(direccionesFormateadas);

        // Si autoSeleccionar es true y hay direcciones, retornar la principal
        if (autoSeleccionar && direccionesFormateadas.length > 0) {
          const direccionPrincipal = direccionesFormateadas.find(d => d.esPrincipal);
          return { direcciones: direccionesFormateadas, direccionPrincipal };
        }

        return direccionesFormateadas;
      }
    } catch (error) {
      console.error('Error cargando direcciones:', error);
    } finally {
      setLoadingDirecciones(false);
    }
    return [];
  }, [session?.user?.id]);

  // Cargar datos del usuario y direcciones
  useEffect(() => {
    const cargarDatosUsuario = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch(`/api/users?id=${session.user.email}`);
        if (response.ok) {
          const usuario = await response.json();
          setDatosUsuario(usuario);
          await cargarDirecciones(false);
        }
      } catch (error) {
        console.error('Error cargando datos del usuario:', error);
      }
    };

    cargarDatosUsuario();
  }, [session, cargarDirecciones]);

  // Auto-seleccionar dirección principal (ejecuta después de que handleSeleccionarDireccion esté definido)
  useEffect(() => {
    // Solo ejecutar si hay direcciones, no hay dirección seleccionada, y el tipo es domicilio
    if (direccionesGuardadas.length > 0 &&
      formData.ubicacionServicio.tipo === 'domicilio' &&
      !formData.ubicacionServicio.direccionSeleccionada &&
      !loadingDirecciones) {

      const direccionPrincipal = direccionesGuardadas.find(d => d.esPrincipal);
      if (direccionPrincipal?.coordenadas) {
        console.log('🏠 Auto-seleccionando dirección principal:', direccionPrincipal);
        // Seleccionar la dirección directamente sin llamar a la función
        setFormData(prev => ({
          ...prev,
          ubicacionServicio: {
            ...prev.ubicacionServicio,
            direccionSeleccionada: direccionPrincipal
          }
        }));
      }
    }
  }, [direccionesGuardadas, formData.ubicacionServicio.tipo, formData.ubicacionServicio.direccionSeleccionada, loadingDirecciones]);

  // Cargar contratistas cuando se selecciona una dirección
  useEffect(() => {
    const validarYCargarContratistas = async () => {
      const direccionSeleccionada = formData.ubicacionServicio.direccionSeleccionada;

      if (direccionSeleccionada?.coordenadas && servicioId) {
        console.log('🗺️ Validando y cargando contratistas para dirección seleccionada');

        // Verificar zona
        try {
          const response = await fetch(`/api/servicios-por-zona?lat=${direccionSeleccionada.coordenadas.lat}&lng=${direccionSeleccionada.coordenadas.lng}&tipo=programable`);

          if (response.ok) {
            const data = await response.json();

            if (!data.area || !data.servicios || data.servicios.length === 0) {
              setDireccionFueraDeZona(true);
              setError('Esta dirección está fuera de las zonas de servicio disponibles');
              setAreaServicio(null);
              return;
            }

            const servicioDisponible = data.servicios.find(s => s.servicio._id === servicioId);
            if (!servicioDisponible) {
              setDireccionFueraDeZona(true);
              setError(`Este servicio no está disponible en la zona donde se encuentra esta dirección (${data.area.nombre})`);
              setAreaServicio(data.area);
              return;
            }

            // La dirección está en zona válida
            setAreaServicio(data.area);
            setDireccionFueraDeZona(false);
            setError('');

            // Cargar contratistas
            await cargarContratistas(direccionSeleccionada.coordenadas);
          }
        } catch (error) {
          console.error('❌ Error validando zona:', error);
          setError('Error al verificar la zona de servicio');
        }
      }
    };

    validarYCargarContratistas();
  }, [formData.ubicacionServicio.direccionSeleccionada, servicioId, cargarContratistas]);
  useEffect(() => {
    const cargarServicio = async () => {
      if (!servicioId) return;

      try {
        // Cargar información básica del servicio
        const response = await fetch(`/api/servicios?id=${servicioId}`);
        if (response.ok) {
          const servicio = await response.json();
          setServicioInfo(servicio);
        }
      } catch (error) {
        console.error('Error cargando servicio:', error);
      }
    };

    cargarServicio();
  }, [servicioId, lat, lng]);



  // Determinar zona basada en coordenadas
  const determinarZona = useCallback(async (coordenadas) => {
    if (!coordenadas.lat || !coordenadas.lng) return null;

    try {
      const response = await fetch(`/api/areas/determinar-zona?lat=${coordenadas.lat}&lng=${coordenadas.lng}`);
      if (response.ok) {
        const zona = await response.json();
        return zona;
      }
    } catch (error) {
      console.error('Error determinando zona:', error);
    }
    return null;
  }, []);

  // Verificar si una dirección está dentro del área de servicio
  const verificarDireccionEnZona = useCallback(async (direccion) => {
    if (!direccion?.coordenadas?.lat || !direccion?.coordenadas?.lng) {
      return { enZona: false, error: 'Sin coordenadas' };
    }

    try {
      setValidandoZona(true);

      // Verificar si las coordenadas están dentro de algún área con servicios
      const response = await fetch(`/api/servicios-por-zona?lat=${direccion.coordenadas.lat}&lng=${direccion.coordenadas.lng}&tipo=programable`);

      if (response.ok) {
        const data = await response.json();

        // Si no hay área o no hay servicios, la dirección está fuera de zona
        if (!data.area || !data.servicios || data.servicios.length === 0) {
          return {
            enZona: false,
            error: 'Esta dirección está fuera de las zonas de servicio disponibles',
            ubicacion: { lat: direccion.coordenadas.lat, lng: direccion.coordenadas.lng }
          };
        }

        // Si encontró servicios pero no el servicio específico que estamos solicitando
        const servicioDisponible = data.servicios.find(s => s.servicio._id === servicioId);
        if (!servicioDisponible) {
          return {
            enZona: false,
            error: `Este servicio no está disponible en la zona donde se encuentra esta dirección (${data.area.nombre})`,
            area: data.area,
            ubicacion: { lat: direccion.coordenadas.lat, lng: direccion.coordenadas.lng }
          };
        }

        // La dirección está en zona y el servicio está disponible
        return {
          enZona: true,
          area: data.area,
          ubicacion: { lat: direccion.coordenadas.lat, lng: direccion.coordenadas.lng }
        };
      } else {
        return {
          enZona: false,
          error: 'Error al verificar la zona de servicio'
        };
      }
    } catch (error) {
      console.error('Error verificando zona:', error);
      return {
        enZona: false,
        error: 'Error al verificar la zona de servicio'
      };
    } finally {
      setValidandoZona(false);
    }
  }, [servicioId]);

  // Manejar cambio de ubicación (simplificado para solo 'domicilio')
  const handleUbicacionChange = async (nuevoTipo) => {
    if (nuevoTipo !== 'domicilio') return; // Solo manejamos direcciones guardadas

    setFormData(prev => ({
      ...prev,
      ubicacionServicio: {
        ...prev.ubicacionServicio,
        tipo: nuevoTipo,
        direccionSeleccionada: null
      }
    }));

    setContratistasDisponibles([]);
    setContratistaSeleccionado(null);
    setError('');

    // Auto-seleccionar dirección principal si existe
    const direccionPrincipal = direccionesGuardadas.find(d => d.esPrincipal);
    if (direccionPrincipal) {
      handleSeleccionarDireccion(direccionPrincipal);
    }
  };

  // Manejar selección de dirección guardada
  const handleSeleccionarDireccion = useCallback(async (direccion) => {
    console.log('📍 Seleccionando dirección:', direccion);

    setFormData(prev => ({
      ...prev,
      ubicacionServicio: {
        ...prev.ubicacionServicio,
        direccionSeleccionada: direccion
      }
    }));

    // Limpiar estados previos
    setDireccionFueraDeZona(false);
    setError('');

    if (direccion.coordenadas) {
      console.log('🗺️ Coordenadas de la dirección:', direccion.coordenadas);

      // Verificar si la dirección está dentro de la zona de servicio
      const validacionZona = await verificarDireccionEnZona(direccion);

      if (!validacionZona.enZona) {
        console.log('❌ Dirección fuera de zona');
        setDireccionFueraDeZona(true);
        setError(validacionZona.error || 'Esta dirección está fuera de la zona de servicio');
        setAreaServicio(validacionZona.area || null);

        // Limpiar contratistas ya que la dirección no es válida
        setContratistasDisponibles([]);
        setContratistaSeleccionado(null);
        return;
      } else {
        // La dirección está en zona válida
        console.log('✅ Dirección válida en zona:', validacionZona.area?.nombre);
        setAreaServicio(validacionZona.area);
        setDireccionFueraDeZona(false);

        const zona = await determinarZona(direccion.coordenadas);
        if (zona) {
          console.log('🎯 Zona determinada:', zona);
          setFormData(prev => ({
            ...prev,
            ubicacionServicio: {
              ...prev.ubicacionServicio,
              zona: zona._id || zona.zona?._id
            }
          }));
        }

        // Cargar contratistas
        console.log('🔍 Cargando contratistas para coordenadas:', direccion.coordenadas);
        await cargarContratistas(direccion.coordenadas);
      }
    }
  }, [verificarDireccionEnZona, determinarZona, cargarContratistas]);

  // Callback para cuando se guarda una dirección desde el modal
  const handleDireccionModal = useCallback(async (nuevaDireccion) => {
    try {
      // Primero guardamos la dirección en el perfil del usuario
      const response = await fetch('/api/users/direcciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          direccion: nuevaDireccion
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Cerrar el modal
        setMostrarFormularioDireccion(false);

        // Cambiar automáticamente a "Mis Direcciones"
        setFormData(prev => ({
          ...prev,
          ubicacionServicio: {
            ...prev.ubicacionServicio,
            tipo: 'domicilio'
          }
        }));

        // Recargar direcciones y seleccionar la nueva automáticamente
        const direccionesActualizadas = await cargarDirecciones();

        // Buscar y seleccionar la dirección recién creada (será la última)
        if (direccionesActualizadas && direccionesActualizadas.length > 0) {
          const nuevaDireccionGuardada = direccionesActualizadas[direccionesActualizadas.length - 1];

          if (nuevaDireccionGuardada) {
            // Verificar zona antes de seleccionar
            await handleSeleccionarDireccion(nuevaDireccionGuardada);
          }
        }

      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al guardar la dirección. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error guardando dirección:', error);
      setError('Error al guardar la dirección');
    }
  }, [session?.user?.id, direccionesGuardadas.length, cargarDirecciones, handleSeleccionarDireccion]);



  // Obtener coordenadas actuales según la dirección seleccionada
  const obtenerCoordenadasActuales = () => {
    const { direccionSeleccionada } = formData.ubicacionServicio;

    if (direccionSeleccionada?.coordenadas) {
      return direccionSeleccionada.coordenadas;
    }

    return null;
  };

  // Manejar subida de imágenes
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxFiles = 5;

    if (formData.imagenesProblema.length + files.length > maxFiles) {
      setError(`Máximo ${maxFiles} imágenes permitidas`);
      return;
    }

    // Función para comprimir imagen
    const compressImage = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Redimensionar si es muy grande
            const maxDimension = 1920;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = (height / width) * maxDimension;
                width = maxDimension;
              } else {
                width = (width / height) * maxDimension;
                height = maxDimension;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convertir a blob con compresión
            canvas.toBlob(
              (blob) => {
                // Crear nuevo archivo con el blob comprimido
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              },
              'image/jpeg',
              0.85 // Calidad de compresión (85%)
            );
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    };

    try {
      const processedFiles = [];

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setError(`El archivo ${file.name} no es una imagen válida`);
          continue;
        }

        // Comprimir la imagen
        const compressedFile = await compressImage(file);

        if (compressedFile.size > maxSize) {
          setError(`La imagen ${file.name} es muy grande incluso después de compresión. Intenta con una imagen de menor resolución.`);
          continue;
        }

        processedFiles.push(compressedFile);
      }

      if (processedFiles.length > 0) {
        setFormData(prev => ({
          ...prev,
          imagenesProblema: [...prev.imagenesProblema, ...processedFiles]
        }));
        setError(''); // Limpiar error si todo salió bien
      }
    } catch (err) {
      console.error('Error procesando imágenes:', err);
      setError('Error al procesar las imágenes. Por favor intenta nuevamente.');
    }
  };

  // Función para eliminar una imagen
  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      imagenesProblema: prev.imagenesProblema.filter((_, i) => i !== index)
    }));
  };

  // Enviar solicitud
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!session?.user?.email) {
      setError('Debes iniciar sesión para solicitar servicios');
      return;
    }

    if (!formData.descripcionProblema.trim()) {
      setError('Por favor describe el problema o servicio que necesitas');
      return;
    }

    if (!formData.fechaPreferida) {
      setError('Por favor selecciona una fecha preferida');
      return;
    }

    if (!formData.horaPreferida) {
      setError('Por favor selecciona una hora preferida');
      return;
    }

    if (direccionFueraDeZona) {
      setError('No se puede enviar la solicitud porque la dirección seleccionada está fuera de la zona de servicio');
      return;
    }

    if (!contratistaSeleccionado) {
      setError('No hay contratistas disponibles para este servicio en la dirección seleccionada');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Crear FormData para enviar archivos
      const formDataToSend = new FormData();

      // Datos básicos
      formDataToSend.append('clienteId', session.user.id || session.user.email);
      formDataToSend.append('servicioId', servicioId);
      formDataToSend.append('contratistaId', contratistaSeleccionado._id);
      formDataToSend.append('descripcionProblema', formData.descripcionProblema);

      formDataToSend.append('notas', formData.notas);

      // Datos de ubicación
      const ubicacionData = {
        tipo: formData.ubicacionServicio.tipo,
        zona: formData.ubicacionServicio.zona
      };

      if (formData.ubicacionServicio.direccionSeleccionada) {
        ubicacionData.direccion = formData.ubicacionServicio.direccionSeleccionada;
        ubicacionData.coordenadas = formData.ubicacionServicio.direccionSeleccionada.coordenadas;
      } else {
        setError('Por favor selecciona una dirección para el servicio');
        return;
      }

      formDataToSend.append('ubicacionServicio', JSON.stringify(ubicacionData));

      // Fecha y hora preferidas
      if (formData.fechaPreferida) {
        formDataToSend.append('fechaPreferida', formData.fechaPreferida);
      }
      if (formData.horaPreferida) {
        formDataToSend.append('horaPreferida', formData.horaPreferida);
      }

      // Imágenes
      formData.imagenesProblema.forEach((file, index) => {
        formDataToSend.append(`imagen_${index}`, file);
      });

      const response = await fetch('/api/servicios-programables/solicitar', {
        method: 'POST',
        body: formDataToSend,
      });

      console.log('📡 Respuesta recibida:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();

        console.log('✅ Respuesta del servidor:', result); // Debug

        // Preparar datos para el modal de confirmación
        const direccion = formData.ubicacionServicio.direccionSeleccionada;
        const direccionCompleta = `${direccion.calle} ${direccion.numeroCasa}, ${direccion.colonia}, ${direccion.municipio || direccion.ciudad}, ${direccion.estado}`;

        setDatosConfirmacion({
          solicitud: result.cita, // La respuesta devuelve 'cita', no 'cotizacion'
          servicio: servicioInfo,
          direccion: direccionCompleta,
          fecha: formData.fechaPreferida,
          hora: formData.horaPreferida,

          contratista: contratistaSeleccionado,
          area: areaServicio
        });

        console.log('📋 Datos de confirmación preparados');

        // Mostrar modal de confirmación INMEDIATAMENTE
        setMostrarModalConfirmacion(true);
        setSuccess('¡Solicitud enviada exitosamente!');
        setLoading(false); // Desactivar loading inmediatamente

        // Enviar notificación en segundo plano (no bloqueante)
        const serviceName = servicioInfo?.nombre || 'servicio';
        const contratistaName = contratistaSeleccionado?.nombre || contratistaSeleccionado?.user?.nombre;

        // Ejecutar notificación de forma asíncrona sin bloquear
        setTimeout(async () => {
          try {
            if (permission !== 'granted') {
              const granted = await requestPermission();
              if (granted) {
                await notifyServiceRequested(serviceName, contratistaName);
              }
            } else {
              await notifyServiceRequested(serviceName, contratistaName);
            }
          } catch (notifError) {
            console.error('Error al enviar notificación:', notifError);
          }
        }, 0);

      } else {
        const error = await response.json();
        setLoading(false);
        throw new Error(error.error || 'Error al enviar la solicitud');
      }
    } catch (error) {
      console.error('❌ Error en handleSubmit:', error);
      setError('Error al solicitar el servicio: ' + error.message);
      setLoading(false);
    }
  };

  if (!servicioId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">Faltan datos necesarios para procesar la solicitud</p>
          <button
            onClick={() => router.push('/main/servicios-programables')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver a Servicios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h1 className="text-xl font-bold">Solicitar Servicio Programable</h1>
            <p className="text-blue-100 text-sm">Completa los detalles para tu cita</p>
          </div>

          {/* Información del servicio */}
          {servicioInfo && (
            <div className="p-6 bg-gray-50 border-b">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FaTools className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Servicio</p>
                  <p className="font-semibold text-gray-900">{servicioInfo.nombre}</p>
                  <p className="text-sm text-gray-600">{servicioInfo.descripcion}</p>
                </div>
              </div>


            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Descripción del problema */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe el servicio que necesitas *
              </label>
              <textarea
                value={formData.descripcionProblema}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcionProblema: e.target.value }))}
                placeholder="Describe detalladamente lo que necesitas..."
                rows="4"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>

            {/* Ubicación del servicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ¿Dónde se realizará el servicio? *
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => handleUbicacionChange('domicilio')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${formData.ubicacionServicio.tipo === 'domicilio'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                    }`}
                >
                  <FaHome className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium">Mis direcciones</span>
                  <span className="text-xs text-gray-500 text-center">
                    {direccionesGuardadas.length > 0 ? `${direccionesGuardadas.length} guardadas` : 'Sin direcciones'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarFormularioDireccion(true)}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 transition-all hover:border-green-400 hover:bg-green-50"
                >
                  <FaPlus className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Agregar dirección</span>
                  <span className="text-xs text-gray-500">Guardar nueva</span>
                </button>
              </div>

              {/* Selección de direcciones guardadas */}
              {formData.ubicacionServicio.tipo === 'domicilio' && direccionesGuardadas.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-blue-600" />
                    Selecciona una dirección:
                  </h4>
                  <div className="space-y-3">
                    {direccionesGuardadas.map((direccion) => (
                      <div
                        key={direccion._id}
                        onClick={() => handleSeleccionarDireccion(direccion)}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${formData.ubicacionServicio.direccionSeleccionada?._id === direccion._id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {direccion.esPrincipal && (
                                <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                  <FaHome className="w-3 h-3" />
                                  Principal
                                </span>
                              )}
                              <span className="text-base font-semibold text-gray-900">
                                {direccion.calle} {direccion.numeroCasa}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-700 flex items-center gap-2">
                                <FaMapMarkerAlt className="w-3 h-3 text-gray-500" />
                                {direccion.colonia}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <FaBuilding className="w-3 h-3 text-gray-500" />
                                {direccion.municipio || direccion.ciudad}, {direccion.estado}
                              </p>
                              {direccion.codigoPostal && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                  <FaMailBulk className="w-3 h-3 text-gray-500" />
                                  CP: {direccion.codigoPostal}
                                </p>
                              )}
                              {direccion.referencia && (
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                  <FaInfoCircle className="w-3 h-3 text-gray-500" />
                                  Ref: {direccion.referencia}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-3">
                            {formData.ubicacionServicio.direccionSeleccionada?._id === direccion._id ? (
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <FaCheck className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensaje si no hay direcciones guardadas */}
              {formData.ubicacionServicio.tipo === 'domicilio' && direccionesGuardadas.length === 0 && !loadingDirecciones && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    No tienes direcciones guardadas. Puedes agregar una nueva dirección o usar otra opción.
                  </p>
                </div>
              )}

              {/* Mostrar dirección seleccionada */}
              {(() => {
                const coordenadas = obtenerCoordenadasActuales();
                const direccionTexto = (() => {
                  if (formData.ubicacionServicio.tipo === 'domicilio' && formData.ubicacionServicio.direccionSeleccionada) {
                    const dir = formData.ubicacionServicio.direccionSeleccionada;
                    return `${dir.calle} ${dir.numeroCasa}, ${dir.colonia}`;
                  }
                  return null;
                })();

                return direccionTexto ? (
                  <div className="mt-3">
                    {/* Dirección válida */}
                    {!direccionFueraDeZona && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Dirección del servicio:</span>
                        </div>
                        <p className="text-sm text-blue-800 mt-1">{direccionTexto}</p>
                        {areaServicio && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Dirección válida en zona: {areaServicio.nombre}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dirección fuera de zona */}
                    {direccionFueraDeZona && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-red-900">Dirección fuera de zona de servicio</span>
                            <p className="text-sm text-red-800 mt-1">{direccionTexto}</p>
                            <p className="text-xs text-red-700 mt-1">
                              Esta dirección no está dentro de las zonas donde ofrecemos este servicio. Por favor selecciona una dirección diferente o contacta soporte.
                            </p>
                            {areaServicio && (
                              <p className="text-xs text-red-600 mt-1">
                                La dirección está en zona: {areaServicio.nombre}, pero este servicio no está disponible ahí.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Validando zona */}
                    {validandoZona && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                          <span className="text-sm font-medium text-yellow-900">Verificando zona de servicio...</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Fecha y hora preferidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaCalendarAlt className="inline mr-2" />
                  Fecha preferida *
                </label>
                <input
                  type="date"
                  value={formData.fechaPreferida}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaPreferida: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  El contratista puede sugerir otros horarios disponibles
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaClock className="inline mr-2" />
                  Hora preferida *
                </label>
                <select
                  value={formData.horaPreferida}
                  onChange={(e) => setFormData(prev => ({ ...prev, horaPreferida: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar hora...</option>
                  <option value="08:00">08:00 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                </select>
              </div>
            </div>

            {/* Imágenes del problema */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCamera className="inline mr-2" />
                Imágenes del problema (opcional)
              </label>

              {/* Botones para captura y selección */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {/* Botón para capturar con cámara */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={formData.imagenesProblema.length >= 5}
                  />
                  <div className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${formData.imagenesProblema.length >= 5
                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400'
                    }`}>
                    <FaCamera className="w-5 h-5" />
                    <span className="text-sm font-medium">Tomar Foto</span>
                  </div>
                </label>

                {/* Botón para seleccionar de galería */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={formData.imagenesProblema.length >= 5}
                  />
                  <div className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${formData.imagenesProblema.length >= 5
                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400'
                    }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Elegir de Galería</span>
                  </div>
                </label>
              </div>

              <p className="text-xs text-gray-500 mt-1">
                Máximo 5 imágenes. Las imágenes se comprimen automáticamente para optimizar la carga.
              </p>

              {formData.imagenesProblema.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    {formData.imagenesProblema.length} de 5 imágenes seleccionadas
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.imagenesProblema.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-medium">
                          {index + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar imagen"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
                          {(file.size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notas adicionales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas adicionales (opcional)
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Información adicional, horarios preferidos, instrucciones especiales..."
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Comunicación */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaComments className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Comunicación</span>
              </div>
              <p className="text-sm text-blue-800">
                Una vez enviada la solicitud, podrás chatear directamente con el contratista
                para coordinar detalles, horarios exactos y resolver cualquier duda antes de la cita.
              </p>
            </div>

            {/* Mensajes de estado */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            {loadingContratistas && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">Buscando contratistas disponibles en tu zona...</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.descripcionProblema.trim() || !formData.fechaPreferida || !formData.horaPreferida || !contratistaSeleccionado || direccionFueraDeZona || validandoZona}
                className={`flex-1 py-3 rounded-lg transition-colors ${direccionFueraDeZona
                  ? 'bg-red-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
                  }`}
              >
                {loading ? 'Enviando...' :
                  validandoZona ? 'Verificando zona...' :
                    direccionFueraDeZona ? 'Dirección fuera de zona' :
                      'Enviar Solicitud'}
              </button>
            </div>
          </form>
        </div>

        {/* Modal para agregar nueva dirección con mapa */}
        <DireccionFormConMapa
          isOpen={mostrarFormularioDireccion}
          onClose={() => setMostrarFormularioDireccion(false)}
          onSave={handleDireccionModal}
          title="Agregar Nueva Dirección"
        />

        {/* Modal de confirmación de solicitud */}
        {mostrarModalConfirmacion && datosConfirmacion && (
          <Modal
            isOpen={mostrarModalConfirmacion}
            onClose={() => {
              setMostrarModalConfirmacion(false);
              router.push('/main/citas');
            }}
            title="¡Solicitud Enviada Exitosamente!"
          >
            <div className="space-y-6">
              {/* Mensaje de éxito */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Tu solicitud ha sido enviada</h3>
                    <p className="text-sm text-green-700">El contratista te contactará pronto para coordinar los detalles</p>
                  </div>
                </div>
              </div>

              {/* Información del servicio */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FaTools className="text-blue-600" />
                  Resumen del Servicio
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Servicio:</span>
                    <span className="font-medium text-gray-900">{datosConfirmacion.servicio.nombre}</span>
                  </div>



                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Dirección:</span>
                    <span className="font-medium text-gray-900 text-right max-w-xs">{datosConfirmacion.direccion}</span>
                  </div>

                  {datosConfirmacion.area && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zona:</span>
                      <span className="font-medium text-gray-900">{datosConfirmacion.area.nombre}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha preferida:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(datosConfirmacion.fecha + 'T00:00:00').toLocaleDateString('es-MX', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Hora preferida:</span>
                    <span className="font-medium text-gray-900">{datosConfirmacion.hora}</span>
                  </div>
                </div>
              </div>



              {/* Información adicional */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <FaComments className="text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-900 font-medium mb-1">Próximos pasos:</p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• El contratista revisará tu solicitud</li>
                      <li>• Podrás chatear con ellos para coordinar detalles</li>
                      <li>• Recibirás una cotización formal si es necesario</li>
                      <li>• Revisa tus cotizaciones para seguimiento</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botón de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMostrarModalConfirmacion(false);
                    router.push('/main/citas');
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Ver mis citas
                </button>
                <button
                  onClick={() => {
                    setMostrarModalConfirmacion(false);
                    router.push('/main/servicios-programables');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Solicitar otro servicio
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

const SolicitarServicioMejorado = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    }>
      <SolicitarServicioMejoradoContent />
    </Suspense>
  );
};

export default SolicitarServicioMejorado;
