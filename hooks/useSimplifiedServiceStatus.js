// hooks/useSimplifiedServiceStatus.js
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Estados simplificados del servicio
export const SERVICE_STATES = {
  SOLICITADA: 'solicitada',
  COTIZADA: 'cotizada',
  ACEPTADA: 'aceptada',
  EN_PROGRESO: 'en_progreso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada'
};

// Información de cada estado
const STATE_INFO = {
  [SERVICE_STATES.SOLICITADA]: {
    label: 'Servicio Solicitado',
    description: 'Esperando cotización del contratista',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
    borderColor: 'border-l-yellow-500',
    canCancel: true,
    showTracking: false
  },
  [SERVICE_STATES.COTIZADA]: {
    label: 'Cotización Recibida',
    description: 'Revisa y acepta/rechaza la cotización',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    borderColor: 'border-l-blue-500',
    canCancel: true,
    showTracking: false,
    requiresAction: true
  },
  [SERVICE_STATES.ACEPTADA]: {
    label: 'Servicio Confirmado',
    description: 'El contratista se dirigirá a tu ubicación',
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-800',
    borderColor: 'border-l-orange-500',
    canCancel: true,
    showTracking: true
  },
  [SERVICE_STATES.EN_PROGRESO]: {
    label: 'Servicio en Progreso',
    description: 'El contratista está trabajando en tu servicio',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-800',
    borderColor: 'border-l-green-500',
    canCancel: false,
    showTracking: true
  },
  [SERVICE_STATES.COMPLETADA]: {
    label: 'Servicio Completado',
    description: 'El servicio ha sido completado exitosamente',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-800',
    borderColor: 'border-l-green-500',
    canCancel: false,
    showTracking: false,
    isFinished: true
  },
  [SERVICE_STATES.CANCELADA]: {
    label: 'Servicio Cancelado',
    description: 'El servicio fue cancelado',
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    borderColor: 'border-l-red-500',
    canCancel: false,
    showTracking: false,
    isFinished: true
  }
};

export function useSimplifiedServiceStatus() {
  const { data: session } = useSession();
  const [activeService, setActiveService] = useState(null);
  const [showServiceStatus, setShowServiceStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para obtener información del estado
  const getStateInfo = useCallback((estado) => {
    return STATE_INFO[estado] || STATE_INFO[SERVICE_STATES.SOLICITADA];
  }, []);

  // Función para cargar el servicio activo
  const fetchActiveService = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/citas?clienteId=${session.user.id}&activa=true`);
      if (!response.ok) throw new Error('Error al cargar servicio activo');

      const data = await response.json();

      if (data && data.length > 0) {
        const servicioActivo = data[0];
        setActiveService(servicioActivo);

        // Auto-mostrar si hay un servicio activo y no está en estado final
        // PERO NO mostrar para servicios express en estado 'solicitada' (esperando contratista)
        const stateInfo = getStateInfo(servicioActivo.estado);
        const isExpressWaiting = servicioActivo.esExpress && servicioActivo.estado === 'solicitada';

        if (!stateInfo.isFinished && !isExpressWaiting) {
          setShowServiceStatus(true);
        }
      } else {
        setActiveService(null);
        setShowServiceStatus(false);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching active service:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, getStateInfo]);

  // Función para actualizar el estado del servicio
  const updateServiceState = useCallback(async (citaId, nuevoEstado, comentario = '') => {
    if (!citaId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/citas/${citaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevoEstado,
          comentario
        })
      });

      if (!response.ok) throw new Error('Error al actualizar el servicio');

      const updatedService = await response.json();
      setActiveService(updatedService);

      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error updating service state:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para aceptar cotización
  const aceptarCotizacion = useCallback(async (cotizacionId) => {
    return await updateServiceState(activeService?._id, SERVICE_STATES.ACEPTADA, 'Cliente aceptó la cotización');
  }, [activeService?._id, updateServiceState]);

  // Función para rechazar cotización  
  const rechazarCotizacion = useCallback(async (cotizacionId, motivo = '') => {
    return await updateServiceState(activeService?._id, SERVICE_STATES.CANCELADA, `Cliente rechazó la cotización: ${motivo}`);
  }, [activeService?._id, updateServiceState]);

  // Función para cancelar servicio
  const cancelarServicio = useCallback(async (motivo = '') => {
    return await updateServiceState(activeService?._id, SERVICE_STATES.CANCELADA, `Servicio cancelado: ${motivo}`);
  }, [activeService?._id, updateServiceState]);

  // Cargar servicio activo al inicializar o cambiar sesión
  useEffect(() => {
    fetchActiveService();

    // Polling cada 30 segundos para servicios activos
    const interval = setInterval(() => {
      if (activeService && !getStateInfo(activeService.estado).isFinished) {
        fetchActiveService();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchActiveService, activeService, getStateInfo]);

  return {
    // Estado
    activeService,
    showServiceStatus,
    setShowServiceStatus,
    isLoading,
    error,

    // Funciones
    getStateInfo,
    fetchActiveService,
    updateServiceState,
    aceptarCotizacion,
    rechazarCotizacion,
    cancelarServicio,

    // Constantes
    SERVICE_STATES
  };
}
