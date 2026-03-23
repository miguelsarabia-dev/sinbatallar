"use client";
import { useState, useEffect } from 'react';
import { useSession, signOut } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Modal } from "../../ui";
import { useModal } from "../../../hooks/useModal";
import { formatDate } from "../../../lib/date-utils";
import MapLocationSelector from "../../maps/MapLocationSelector";
import { 
  FaUserTie, FaSignOutAlt, FaPlus, FaSync, FaTimes,
  FaBars, FaChartBar, FaUsers, FaWarehouse, FaEdit,
  FaTrash, FaMapMarkedAlt, FaTools, FaEye, FaCheck,
  FaBan, FaPlay, FaPause
} from 'react-icons/fa';

export default function IncorporadorDashboard() {
  const { modalState, showError, showSuccess, showConfirm, hideModal } = useModal();
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [incorporadorData, setIncorporadorData] = useState(null);
  const [contratistas, setContratistas] = useState([]);
  const [contratistasDisponibles, setContratistasDisponibles] = useState([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [areasDisponibles, setAreasDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('mis-contratistas');
  
  // Modales
  const [showCreateContratistaForm, setShowCreateContratistaForm] = useState(false);
  const [showEditContratistaForm, setShowEditContratistaForm] = useState(false);
  const [showGestionZonasModal, setShowGestionZonasModal] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [mapSelectorMode, setMapSelectorMode] = useState(null); // 'create' or 'edit'
  const [editingContratista, setEditingContratista] = useState(null);
  const [selectedContratistaForZonas, setSelectedContratistaForZonas] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!session?.user?.id) {
        console.error('No hay sesión de usuario');
        return;
      }

      // Obtener datos del incorporador
      const incorporadorRes = await fetch(`/api/incorporadores?userId=${session.user.id}`);
      if (incorporadorRes.ok) {
        const incorporadorDataResponse = await incorporadorRes.json();
        setIncorporadorData(incorporadorDataResponse);
        
        // Los contratistas ya vienen poblados
        if (incorporadorDataResponse.contratistasIncorporados) {
          setContratistas(incorporadorDataResponse.contratistasIncorporados);
        }
      } else {
        console.error('Error al cargar datos del incorporador');
        showError('Error al cargar tus datos');
      }

      // Cargar servicios disponibles
      const serviciosRes = await fetch('/api/servicios');
      if (serviciosRes.ok) {
        const serviciosData = await serviciosRes.json();
        setServiciosDisponibles(serviciosData);
      }

      // Cargar todas las áreas disponibles
      const areasRes = await fetch('/api/areas');
      if (areasRes.ok) {
        const areasData = await areasRes.json();
        setAreasDisponibles(areasData);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadContratistasDisponibles = async () => {
    try {
      setLoadingDisponibles(true);
      const response = await fetch('/api/contratistas?sinIncorporador=true');
      if (response.ok) {
        const data = await response.json();
        setContratistasDisponibles(data);
      } else {
        showError('Error al cargar contratistas disponibles');
      }
    } catch (error) {
      console.error('Error cargando contratistas disponibles:', error);
      showError('Error al cargar contratistas disponibles');
    } finally {
      setLoadingDisponibles(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    const userRole = session.user?.role;
    
    if (userRole !== 'incorporador') {
      showError('No tienes permisos para acceder a esta página');
      router.push('/');
      return;
    }
    
    loadData();
  }, [session, status, router]);

  // Handlers para CRUD de contratistas
  const handleCreateContratista = async (contratistaData) => {
    try {
      // Agregar el ID del incorporador
      const dataWithIncorporador = {
        ...contratistaData,
        incorporador: incorporadorData._id
      };

      const response = await fetch('/api/contratistas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataWithIncorporador),
      });

      if (response.ok) {
        showSuccess('Contratista creado exitosamente');
        setShowCreateContratistaForm(false);
        loadData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al crear contratista');
      }
    } catch (error) {
      console.error('Error creando contratista:', error);
      showError('Error de conexión al crear contratista');
    }
  };

  const handleEditContratista = (contratista) => {
    setEditingContratista(contratista);
    setShowEditContratistaForm(true);
  };

  const handleUpdateContratista = async (contratistaData) => {
    try {
      const response = await fetch('/api/contratistas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contratistaData),
      });

      if (response.ok) {
        showSuccess('Contratista actualizado exitosamente');
        setShowEditContratistaForm(false);
        setEditingContratista(null);
        loadData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al actualizar contratista');
      }
    } catch (error) {
      console.error('Error actualizando contratista:', error);
      showError('Error de conexión al actualizar contratista');
    }
  };

  const handleMapLocationSelect = (selectedLocation) => {
    // Extraer datos de la ubicación seleccionada
    const { lat, lng, addressData } = selectedLocation;
    
    // Construir la dirección completa
    const direccion = addressData?.direccionCompleta || 
                     `${addressData?.calle || ''}, ${addressData?.colonia || ''}, ${addressData?.ciudad || ''}, ${addressData?.estado || ''}`.trim();
    
    // Actualizar el estado según el modo (crear o editar)
    if (mapSelectorMode === 'create') {
      // Buscar el input de latitud y longitud en el formulario de crear
      // y actualizar sus valores (simulamos un evento de cambio)
      const ubicacionData = {
        lat: lat,
        lng: lng,
        direccion: direccion
      };
      
      // Disparar eventos personalizados para actualizar el formulario
      window.dispatchEvent(new CustomEvent('mapLocationSelected', {
        detail: { mode: 'create', ubicacion: ubicacionData, addressData }
      }));
    } else if (mapSelectorMode === 'edit') {
      // Lo mismo para el formulario de editar
      const ubicacionData = {
        lat: lat,
        lng: lng,
        direccion: direccion
      };
      
      window.dispatchEvent(new CustomEvent('mapLocationSelected', {
        detail: { mode: 'edit', ubicacion: ubicacionData, addressData }
      }));
    }
    
    // Cerrar el modal del mapa
    setShowMapSelector(false);
  };

  const handleDeleteContratista = async (contratistaId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar este contratista? Esta acción no se puede deshacer.',
      async () => {
        try {
          const response = await fetch(`/api/contratistas?id=${contratistaId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('Contratista eliminado exitosamente');
            loadData();
          } else {
            const error = await response.json();
            showError(error.error || 'Error al eliminar contratista');
          }
        } catch (error) {
          showError('Error de conexión al eliminar contratista');
        }
      },
      'Eliminar Contratista'
    );
  };

  const handleToggleContratistaStatus = async (contratistaId, currentStatus) => {
    const isCurrentlyActive = currentStatus !== false;
    const newStatus = !isCurrentlyActive;
    
    try {
      const response = await fetch(`/api/contratistas/${contratistaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: newStatus }),
      });

      if (response.ok) {
        showSuccess(`Contratista ${newStatus ? 'activado' : 'desactivado'} correctamente`);
        loadData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al actualizar estado');
      }
    } catch (error) {
      showError('Error de conexión al actualizar estado');
    }
  };

  const handleGestionarZonas = (contratista) => {
    setSelectedContratistaForZonas(contratista);
    setShowGestionZonasModal(true);
  };

  const handleReclamarContratista = (contratistaId) => {
    showConfirm(
      '¿Estás seguro de que quieres reclamar este contratista? Una vez reclamado, será asignado a tu perfil de incorporador.',
      async () => {
        try {
          const response = await fetch('/api/contratistas/reclamar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contratistaId }),
          });

          if (response.ok) {
            showSuccess('Contratista reclamado exitosamente');
            loadData();
            loadContratistasDisponibles();
          } else {
            const error = await response.json();
            showError(error.error || 'Error al reclamar contratista');
          }
        } catch (error) {
          showError('Error de conexión al reclamar contratista');
        }
      },
      'Reclamar Contratista'
    );
  };

  // Componente: Formulario de Crear Contratista
  const CreateContratistaForm = () => {
    const [formData, setFormData] = useState({
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      password: '',
      calificacionNivel: 'C',
      servicios: [],
      ubicacion: {
        lat: 19.4326,
        lng: -99.1332
      }
    });

    const toggleServicio = (servicioId) => {
      setFormData(prev => ({
        ...prev,
        servicios: prev.servicios.includes(servicioId)
          ? prev.servicios.filter(id => id !== servicioId)
          : [...prev.servicios, servicioId]
      }));
    };

    // Escuchar eventos de selección de ubicación del mapa
    useEffect(() => {
      const handleMapLocationEvent = (event) => {
        if (event.detail.mode === 'create') {
          setFormData(prev => ({
            ...prev,
            ubicacion: event.detail.ubicacion
          }));
        }
      };

      window.addEventListener('mapLocationSelected', handleMapLocationEvent);
      return () => {
        window.removeEventListener('mapLocationSelected', handleMapLocationEvent);
      };
    }, []);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.nombre || !formData.email || !formData.telefono || !formData.password || !formData.direccion) {
        showError('Todos los campos son obligatorios');
        return;
      }
      handleCreateContratista(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="w-full min-h-screen md:min-h-0 md:my-8 md:max-w-4xl md:mx-4">
          <div className="bg-white md:rounded-lg shadow-lg w-full max-h-screen md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Nuevo Contratista</h3>
              <button
                onClick={() => {
                  setShowCreateContratistaForm(false);
                }}
                className="text-gray-500 hover:text-gray-700 p-2 -mr-2"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Dirección *
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Calificación de Nivel
                </label>
                <select
                  value={formData.calificacionNivel}
                  onChange={(e) => setFormData({...formData, calificacionNivel: e.target.value})}
                  className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="C">C - Básica</option>
                  <option value="B">B - Intermedia</option>
                  <option value="A">A - Avanzada</option>
                </select>
              </div>

              {/* Servicios */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 md:mb-3">
                  Servicios que ofrece
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 max-h-48 md:max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 md:p-4 bg-gray-50">
                  {serviciosDisponibles.length > 0 ? serviciosDisponibles.map((servicio) => {
                    const isSelected = formData.servicios.includes(servicio._id);
                    return (
                      <div
                        key={servicio._id}
                        onClick={() => toggleServicio(servicio._id)}
                        className={`
                          cursor-pointer rounded-lg border-2 p-2.5 md:p-3 transition-all duration-200 
                          ${isSelected 
                            ? 'border-primary bg-primary text-white shadow-md' 
                            : 'border-gray-200 bg-white hover:border-primary hover:shadow-sm'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-900'} truncate`}>
                              {servicio.nombre}
                            </h4>
                            <p className={`text-xs mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-500'} truncate`}>
                              {servicio.categoria}
                            </p>
                          </div>
                          <div className={`ml-2 flex-shrink-0 text-lg ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                            {isSelected ? '✓' : '+'}
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="col-span-full text-center py-6 md:py-8 text-gray-500">
                      <FaTools className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">No hay servicios disponibles</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Seleccionados: {formData.servicios.length} servicio(s)
                </p>
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Ubicación *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMapSelectorMode('create');
                    setShowMapSelector(true);
                  }}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-primary"
                >
                  <FaMapMarkedAlt size={20} />
                  <span className="font-medium">
                    {formData.ubicacion.lat !== 19.4326 || formData.ubicacion.lng !== -99.1332
                      ? 'Ubicación seleccionada - Click para cambiar'
                      : 'Seleccionar ubicación en el mapa'}
                  </span>
                </button>
                {(formData.ubicacion.lat !== 19.4326 || formData.ubicacion.lng !== -99.1332) && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FaCheck className="text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900">Ubicación configurada</p>
                        <p className="text-xs text-green-700 mt-1">
                          Coordenadas: {formData.ubicacion.lat.toFixed(6)}, {formData.ubicacion.lng.toFixed(6)}
                        </p>
                        {formData.ubicacion.direccion && (
                          <p className="text-xs text-green-700 mt-1 truncate">
                            {formData.ubicacion.direccion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="sticky bottom-0 bg-white pt-4 md:pt-6 border-t border-gray-200 -mx-4 md:-mx-6 px-4 md:px-6 pb-4 md:pb-6 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateContratistaForm(false);
                  }}
                  className="w-full sm:flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Crear Contratista
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Componente: Formulario de Editar Contratista
  const EditContratistaForm = () => {
    const [formData, setFormData] = useState({
      _id: editingContratista?._id || '',
      nombre: editingContratista?.nombre || '',
      direccion: editingContratista?.direccion || '',
      telefono: editingContratista?.telefono || '',
      email: editingContratista?.email || '',
      calificacionNivel: editingContratista?.calificacionNivel || 'C',
      servicios: (editingContratista?.servicios || []).map(servicio => 
        typeof servicio === 'string' ? servicio : servicio._id
      ),
      ubicacion: {
        lat: editingContratista?.ubicacion?.lat || 0,
        lng: editingContratista?.ubicacion?.lng || 0,
        direccion: editingContratista?.ubicacion?.direccion || editingContratista?.direccion || ''
      }
    });

    useEffect(() => {
      if (editingContratista) {
        const serviciosIds = (editingContratista.servicios || []).map(servicio => 
          typeof servicio === 'string' ? servicio : servicio._id
        );
        
        setFormData(prev => ({
          ...prev,
          servicios: serviciosIds
        }));
      }
    }, [editingContratista]);

    // Escuchar eventos de selección de ubicación del mapa
    useEffect(() => {
      const handleMapLocationEvent = (event) => {
        if (event.detail.mode === 'edit') {
          setFormData(prev => ({
            ...prev,
            ubicacion: event.detail.ubicacion
          }));
        }
      };

      window.addEventListener('mapLocationSelected', handleMapLocationEvent);
      return () => {
        window.removeEventListener('mapLocationSelected', handleMapLocationEvent);
      };
    }, []);

    const toggleServicio = (servicioId) => {
      setFormData(prev => ({
        ...prev,
        servicios: prev.servicios.includes(servicioId)
          ? prev.servicios.filter(id => id !== servicioId)
          : [...prev.servicios, servicioId]
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.nombre || !formData.email || !formData.telefono || !formData.direccion) {
        showError('Todos los campos son obligatorios');
        return;
      }
      handleUpdateContratista(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="w-full min-h-screen md:min-h-0 md:my-8 md:max-w-4xl md:mx-4">
          <div className="bg-white md:rounded-lg shadow-lg w-full max-h-screen md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Editar Contratista</h3>
              <button
                onClick={() => {
                  setShowEditContratistaForm(false);
                  setEditingContratista(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-2 -mr-2"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Calificación de Nivel
                  </label>
                  <select
                    value={formData.calificacionNivel}
                    onChange={(e) => setFormData({...formData, calificacionNivel: e.target.value})}
                    className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="C">C - Básica</option>
                    <option value="B">B - Intermedia</option>
                    <option value="A">A - Avanzada</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Dirección *
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  className="w-full px-3 py-2 md:py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* Servicios */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 md:mb-3">
                  Servicios que ofrece
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 max-h-48 md:max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 md:p-4 bg-gray-50">
                  {serviciosDisponibles.length > 0 ? serviciosDisponibles.map((servicio) => {
                    const isSelected = formData.servicios.includes(servicio._id);
                    return (
                      <div
                        key={servicio._id}
                        onClick={() => toggleServicio(servicio._id)}
                        className={`
                          cursor-pointer rounded-lg border-2 p-2.5 md:p-3 transition-all duration-200 
                          ${isSelected 
                            ? 'border-primary bg-primary text-white shadow-md' 
                            : 'border-gray-200 bg-white hover:border-primary hover:shadow-sm'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-900'} truncate`}>
                              {servicio.nombre}
                            </h4>
                            <p className={`text-xs mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-500'} truncate`}>
                              {servicio.categoria}
                            </p>
                          </div>
                          <div className={`ml-2 flex-shrink-0 text-lg ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                            {isSelected ? '✓' : '+'}
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="col-span-full text-center py-6 md:py-8 text-gray-500">
                      <FaTools className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">No hay servicios disponibles</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Seleccionados: {formData.servicios.length} servicio(s)
                </p>
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Ubicación *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMapSelectorMode('edit');
                    setShowMapSelector(true);
                  }}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-primary"
                >
                  <FaMapMarkedAlt size={20} />
                  <span className="font-medium">
                    Ubicación seleccionada - Click para cambiar
                  </span>
                </button>
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FaCheck className="text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-900">Ubicación configurada</p>
                      <p className="text-xs text-green-700 mt-1">
                        Coordenadas: {formData.ubicacion.lat.toFixed(6)}, {formData.ubicacion.lng.toFixed(6)}
                      </p>
                      {formData.ubicacion.direccion && (
                        <p className="text-xs text-green-700 mt-1 truncate">
                          {formData.ubicacion.direccion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-white pt-4 md:pt-6 border-t border-gray-200 -mx-4 md:-mx-6 px-4 md:px-6 pb-4 md:pb-6 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditContratistaForm(false);
                    setEditingContratista(null);
                  }}
                  className="w-full sm:flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Componente: Modal de Gestión de Zonas
  const GestionZonasModal = () => {
    const [zonasAsignadas, setZonasAsignadas] = useState([]);
    const [loadingZonas, setLoadingZonas] = useState(true);

    useEffect(() => {
      if (selectedContratistaForZonas) {
        cargarZonasDelContratista();
      }
    }, [selectedContratistaForZonas]);

    const cargarZonasDelContratista = async () => {
      try {
        setLoadingZonas(true);
        // Las zonas donde está el contratista
        const zonasConEsteContratista = areasDisponibles.filter(area => 
          area.contratistas && area.contratistas.some(c => 
            (typeof c === 'string' ? c : c._id) === selectedContratistaForZonas._id
          )
        );
        setZonasAsignadas(zonasConEsteContratista.map(z => z._id));
      } catch (error) {
        console.error('Error cargando zonas:', error);
      } finally {
        setLoadingZonas(false);
      }
    };

    const handleToggleZona = async (areaId) => {
      try {
        const area = areasDisponibles.find(a => a._id === areaId);
        if (!area) return;

        const contratistaId = selectedContratistaForZonas._id;
        const estaAsignado = zonasAsignadas.includes(areaId);

        let nuevosContratistas;
        if (estaAsignado) {
          // Quitar
          nuevosContratistas = (area.contratistas || [])
            .map(c => typeof c === 'string' ? c : c._id)
            .filter(id => id !== contratistaId);
        } else {
          // Agregar
          nuevosContratistas = [
            ...(area.contratistas || []).map(c => typeof c === 'string' ? c : c._id),
            contratistaId
          ];
        }

        const response = await fetch('/api/areas', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            _id: areaId,
            contratistas: nuevosContratistas
          }),
        });

        if (response.ok) {
          showSuccess(`Contratista ${estaAsignado ? 'removido de' : 'asignado a'} la zona exitosamente`);
          
          // Actualizar estado local
          if (estaAsignado) {
            setZonasAsignadas(prev => prev.filter(id => id !== areaId));
          } else {
            setZonasAsignadas(prev => [...prev, areaId]);
          }
          
          // Recargar datos generales
          loadData();
        } else {
          const error = await response.json();
          showError(error.error || 'Error al actualizar zona');
        }
      } catch (error) {
        console.error('Error toggling zona:', error);
        showError('Error de conexión al actualizar zona');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="w-full min-h-screen md:min-h-0 md:my-8 md:max-w-4xl md:mx-4">
          <div className="bg-white md:rounded-lg shadow-lg w-full max-h-screen md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 z-10">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate">Gestionar Zonas</h3>
                  <p className="text-xs md:text-sm text-gray-600 mt-1 truncate">
                    Contratista: <span className="font-semibold">{selectedContratistaForZonas?.nombre}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowGestionZonasModal(false);
                    setSelectedContratistaForZonas(null);
                    setZonasAsignadas([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2 -mr-2 ml-2 flex-shrink-0"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6">
              {loadingZonas ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs md:text-sm text-blue-800">
                      <strong>Zonas asignadas:</strong> {zonasAsignadas.length} de {areasDisponibles.length} disponibles
                    </p>
                  </div>

                  <div className="space-y-2 md:space-y-3">
                    {areasDisponibles.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FaMapMarkedAlt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm md:text-base">No hay zonas disponibles en el sistema</p>
                      </div>
                    ) : (
                      areasDisponibles.map((area) => {
                        const estaAsignado = zonasAsignadas.includes(area._id);
                        const otrosContratistas = (area.contratistas || [])
                          .filter(c => {
                            const cId = typeof c === 'string' ? c : c._id;
                            return cId !== selectedContratistaForZonas._id;
                          })
                          .length;
                        
                        return (
                          <div
                            key={area._id}
                            className={`p-3 md:p-4 border-2 rounded-lg transition-all cursor-pointer ${
                              estaAsignado
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleToggleZona(area._id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={estaAsignado}
                                  onChange={() => handleToggleZona(area._id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-0.5 w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm md:text-base text-gray-900 truncate">{area.nombre}</h4>
                                  {area.descripcion && (
                                    <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2">{area.descripcion}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className={`inline-flex px-2 py-0.5 md:py-1 text-xs font-semibold rounded-full ${
                                      area.clasificacion === 'AAA' ? 'bg-purple-100 text-purple-800' :
                                      area.clasificacion === 'AA' ? 'bg-blue-100 text-blue-800' :
                                      area.clasificacion >= 4 ? 'bg-green-100 text-green-800' :
                                      area.clasificacion >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {area.clasificacion}
                                    </span>
                                    {otrosContratistas > 0 && (
                                      <span className="text-xs text-gray-500 whitespace-nowrap">
                                        +{otrosContratistas} otro(s)
                                      </span>
                                    )}
                                  </div>
                                  {area.aperturador && (
                                    <p className="text-xs text-gray-500 mt-1 truncate">
                                      Creada por: {area.aperturador.user?.nombre || 'Aperturador'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                {estaAsignado ? (
                                  <span className="inline-flex items-center gap-1 px-2 md:px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold whitespace-nowrap">
                                    <FaCheck size={10} />
                                    <span className="hidden sm:inline">Asignada</span>
                                    <span className="sm:hidden">✓</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 md:px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs whitespace-nowrap">
                                    <FaPlus size={10} />
                                    <span className="hidden sm:inline">Asignar</span>
                                    <span className="sm:hidden">+</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="sticky bottom-0 bg-white mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200 -mx-4 md:-mx-6 px-4 md:px-6 pb-4 md:pb-6">
                    <button
                      onClick={() => {
                        setShowGestionZonasModal(false);
                        setSelectedContratistaForZonas(null);
                        setZonasAsignadas([]);
                      }}
                      className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-300 ease-in-out border-r border-gray-200`}>
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FaUserTie className="text-white text-lg" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Incorporador</h1>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="p-6">
            <div className="bg-gradient-to-r from-primary to-primary-hover rounded-lg p-4 text-white mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="text-3xl font-bold">
                  {incorporadorData?.estadisticas?.totalContratistasIncorporados || 0}
                </div>
              </div>
              <div className="text-sm opacity-90">Contratistas Incorporados</div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Activos</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {incorporadorData?.estadisticas?.contratistasActivos || 0}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Servicios Generados</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {incorporadorData?.estadisticas?.serviciosGenerados || 0}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Comisión</span>
                  <span className="text-lg font-semibold text-green-600">
                    {incorporadorData?.configuracion?.porcentajeComision || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FaSignOutAlt />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-screen">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  <FaBars size={20} />
                </button>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Bienvenido, {session?.user?.nombre || 'Incorporador'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Tabs */}
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <div className="flex space-x-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('mis-contratistas')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      activeTab === 'mis-contratistas'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <FaUsers className="inline mr-2" />
                    Mis Contratistas
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('contratistas-disponibles');
                      loadContratistasDisponibles();
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      activeTab === 'contratistas-disponibles'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <FaUserTie className="inline mr-2" />
                    Contratistas Disponibles
                    {contratistasDisponibles.length > 0 && (
                      <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                        {contratistasDisponibles.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Contenido según tab activo */}
              {activeTab === 'mis-contratistas' && (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Mis Contratistas</h2>
                    <button
                      onClick={() => setShowCreateContratistaForm(true)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                    >
                      <FaPlus size={16} />
                      Nuevo Contratista
                    </button>
                  </div>

                  {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900">{contratistas.length}</div>
                  <div className="text-sm text-gray-600">Total Contratistas</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-2xl font-bold text-green-600">
                    {contratistas.filter(c => c.activo !== false).length}
                  </div>
                  <div className="text-sm text-gray-600">Activos</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {contratistas.filter(c => c.calificacionNivel === 'A').length}
                  </div>
                  <div className="text-sm text-gray-600">Nivel A</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {areasDisponibles.length}
                  </div>
                  <div className="text-sm text-gray-600">Zonas Disponibles</div>
                </div>
              </div>

              {/* Contratistas Table */}
              <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contratista</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicios</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nivel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contratistas.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                            <FaUserTie className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-900 mb-2">No has incorporado contratistas aún</p>
                            <p className="text-gray-600 mb-4">Comienza registrando tu primer contratista</p>
                            <button
                              onClick={() => setShowCreateContratistaForm(true)}
                              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                            >
                              Crear Primer Contratista
                            </button>
                          </td>
                        </tr>
                      ) : (
                        contratistas.map((contratista) => (
                          <tr key={contratista._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{contratista.nombre}</div>
                              <div className="text-xs text-gray-500">{contratista.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{contratista.telefono}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {contratista.servicios?.length || 0} servicio(s)
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                contratista.promedioCalificacion >= 4 ? 'bg-green-100 text-green-800' :
                                contratista.promedioCalificacion >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                Nivel {contratista.promedioCalificacion}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleToggleContratistaStatus(contratista._id, contratista.activo)}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                                  contratista.activo !== false
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                              >
                                {contratista.activo !== false ? (
                                  <>
                                    <FaCheck size={10} />
                                    Activo
                                  </>
                                ) : (
                                  <>
                                    <FaBan size={10} />
                                    Inactivo
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end items-center gap-2">
                                <button
                                  onClick={() => handleGestionarZonas(contratista)}
                                  className="text-purple-600 hover:text-purple-900 p-1 rounded transition-colors"
                                  title="Gestionar zonas"
                                >
                                  <FaMapMarkedAlt size={14} />
                                </button>
                                <button
                                  onClick={() => handleEditContratista(contratista)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                                  title="Editar contratista"
                                >
                                  <FaEdit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteContratista(contratista._id)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                  title="Eliminar contratista"
                                >
                                  <FaTrash size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
                </>
              )}

              {/* Tab: Contratistas Disponibles */}
              {activeTab === 'contratistas-disponibles' && (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Contratistas Disponibles</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Estos contratistas no tienen un incorporador asignado. Puedes reclamarlos para tu red.
                      </p>
                    </div>
                    <button
                      onClick={loadContratistasDisponibles}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <FaSync size={14} />
                      Actualizar
                    </button>
                  </div>

                  {loadingDisponibles ? (
                    <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-gray-600 mt-4">Cargando contratistas disponibles...</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contratista</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicios</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nivel</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {contratistasDisponibles.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                  <FaUserTie className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                  <p className="text-lg font-medium text-gray-900 mb-2">No hay contratistas disponibles</p>
                                  <p className="text-gray-600">Todos los contratistas tienen un incorporador asignado</p>
                                </td>
                              </tr>
                            ) : (
                              contratistasDisponibles.map((contratista) => (
                                <tr key={contratista._id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{contratista.nombre}</div>
                                    <div className="text-xs text-gray-500">{contratista.email}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{contratista.telefono}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">
                                      {contratista.servicios?.length || 0} servicio(s)
                                    </div>
                                    {contratista.servicios && contratista.servicios.length > 0 && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {contratista.servicios.slice(0, 2).map(s => s.nombre).join(', ')}
                                        {contratista.servicios.length > 2 && '...'}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      contratista.promedioCalificacion >= 4 ? 'bg-green-100 text-green-800' :
                                      contratista.promedioCalificacion >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      Nivel {contratista.promedioCalificacion}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{contratista.direccion || 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleReclamarContratista(contratista._id)}
                                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 ml-auto"
                                    >
                                      <FaUserTie size={14} />
                                      Reclamar
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Modales */}
      {showCreateContratistaForm && <CreateContratistaForm />}
      {showEditContratistaForm && <EditContratistaForm />}
      {showGestionZonasModal && <GestionZonasModal />}

      {/* Selector de ubicación en mapa */}
      {showMapSelector && (
        <MapLocationSelector
          isOpen={showMapSelector}
          onClose={() => setShowMapSelector(false)}
          onLocationSelect={handleMapLocationSelect}
          initialLocation={
            mapSelectorMode === 'edit' && editingContratista?.ubicacion
              ? { lat: editingContratista.ubicacion.lat, lng: editingContratista.ubicacion.lng }
              : null
          }
          title="Selecciona la ubicación del contratista"
        />
      )}

      {/* Modal */}
      <Modal {...modalState} onClose={hideModal} />
    </div>
  );
}
