"use client";
import { useState, useEffect } from 'react';
import { signOut } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import useSessionPersistence from '../../../hooks/useSessionPersistence';
import { Modal } from "../../ui";
import { useModal } from "../../../hooks/useModal";
import { formatDate, formatDateTime, isValidDate } from "../../../lib/date-utils";
import DelimitadorAreas from "../../maps/DelimitadorAreasWrapper";
import VisualizadorZonas from "../../maps/VisualizadorZonas";
import {
  FaShieldAlt, FaCog, FaUsers, FaClipboardList, FaChartBar,
  FaSignOutAlt, FaPlus, FaEdit, FaTrash, FaEye, FaSync, FaUserPlus,
  FaTimes, FaCar, FaBars, FaWarehouse, FaTools, FaFileAlt, FaBan,
  FaPlay, FaPause, FaMapMarkedAlt, FaMoneyBillWave, FaCalendarAlt
} from 'react-icons/fa';
import CreateServiceForm from './forms/CreateServiceForm';
import EditServiceForm from './forms/EditServiceForm';
import UsersManager from './users/UsersManager';
import ContratistasManager from './contratistas/ContratistasManager';
import FinanzasDashboard from './finanzas/FinanzasDashboard';

export default function AdminDashboard() {
  const { modalState, showError, showSuccess, showConfirm, hideModal } = useModal();
  const { session, status, isAuthenticated, clearPersistedSession } = useSessionPersistence();
  const router = useRouter();

  // Helper para parsear respuestas JSON de forma segura
  const safeJsonParse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [contratistas, setContratistas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [citas, setCitas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [aperturadores, setAperturadores] = useState([]);
  const [incorporadores, setIncorporadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateServiceForm, setShowCreateServiceForm] = useState(false);
  const [showEditServiceForm, setShowEditServiceForm] = useState(false);
  const [showDelimitadorAreas, setShowDelimitadorAreas] = useState(false);
  const [showMapaZonas, setShowMapaZonas] = useState(false);
  const [showEditAreaForm, setShowEditAreaForm] = useState(false);
  const [showEditAperturadorForm, setShowEditAperturadorForm] = useState(false);
  const [showEditIncorporadorForm, setShowEditIncorporadorForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editingArea, setEditingArea] = useState(null);
  const [editingAperturador, setEditingAperturador] = useState(null);
  const [editingIncorporador, setEditingIncorporador] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalContratistas: 0,
    totalServicios: 0,
    totalCotizaciones: 0,
    cotizacionesPendientes: 0,
    totalCitas: 0,
    citasActivas: 0,
    totalAreas: 0,
    totalAperturadores: 0,
    totalIncorporadores: 0
  });

  // Debugging logs
  //console.log('AdminDashboard - Session:', session);
  //console.log('AdminDashboard - Status:', status);
  //console.log('AdminDashboard - User role:', session?.user?.role);
  //console.log('AdminDashboard - User type:', session?.user?.userType);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Cargando datos del dashboard...');
      // Cargar todos los datos en una sola llamada optimizada
      const response = await fetch('/api/admin/dashboard-data');

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Asignar datos a los estados
      if (data.users) setUsers(data.users);
      if (data.contratistas) setContratistas(data.contratistas);
      if (data.servicios) setServicios(data.servicios);
      if (data.cotizaciones) setCotizaciones(data.cotizaciones);
      if (data.citas) setCitas(data.citas);
      if (data.areas) setAreas(data.areas);
      if (data.aperturadores) setAperturadores(data.aperturadores);
      if (data.incorporadores) setIncorporadores(data.incorporadores);

      if (data.meta) {
        console.log(`Datos cargados en ${data.meta.loadTime}ms (Server-side processing)`);
      }


      // Calcular estadísticas con los datos cargados
      setStats({
        totalUsers: (data.users || []).length,
        totalContratistas: (data.contratistas || []).length,
        totalServicios: (data.servicios || []).length,
        totalCotizaciones: (data.cotizaciones || []).length,
        totalCitas: (data.citas || []).length,
        totalAreas: (data.areas || []).length,
        totalAperturadores: (data.aperturadores || []).length,
        totalIncorporadores: (data.incorporadores || []).length,
        cotizacionesPendientes: (data.cotizaciones || []).filter(c => c.estado === 'pendiente').length
      });

    } catch (error) {
      console.error('Error al cargar datos:', error);
      //showError('Error al cargar datos del panel administrativo');
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión correctamente
  const handleLogout = async () => {
    try {
      // 1. Limpiar sesión persistente primero
      await clearPersistedSession();

      // 2. Cerrar sesión de NextAuth
      await signOut({
        redirect: false,
        callbackUrl: '/login'
      });

      // 3. Redirigir manualmente
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: forzar redirección
      router.push('/login');
    }
  };

  // Verificar autorización y cargar datos
  useEffect(() => {
    if (status === 'loading') return;

    if (!session || !isAuthenticated) {
      console.log('No authenticated session found, redirecting to login');
      router.push('/login');
      return;
    }

    const userRole = session.user?.role || session.user?.userType;
    //console.log('User role detected:', userRole);

    if (userRole !== 'admin') {
      //console.log('User not authorized for admin. Redirecting based on role:', userRole);

      switch (userRole) {
        case 'contratista':
          router.push('/contratista/dashboard');
          break;

        case 'cliente':
        case 'user':
          router.push('/main/servicios-programables');
          break;
        default:
          router.push('/login');
      }
      return;
    }

    // Si llega aquí, el usuario es admin
    //console.log('User authorized as admin, loading data...');
    loadDashboardData();
  }, [session, status, router]);

  const handleDeleteUser = async (userId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar este usuario?',
      async () => {
        try {
          const response = await fetch(`/api/users?id=${userId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('Usuario eliminado exitosamente');
            loadDashboardData();
          } else {
            const error = await safeJsonParse(response);
            showError(error?.error || 'Error al eliminar usuario');
          }
        } catch (error) {
          showError('Error de conexión al eliminar usuario');
        }
      },
      'Eliminar Usuario'
    );
  };

  const handleDeleteContratista = async (contratistaId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar este contratista?',
      async () => {
        try {
          const response = await fetch(`/api/contratistas?id=${contratistaId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('Contratista eliminado exitosamente');
            loadDashboardData();
          } else {
            const error = await safeJsonParse(response);
            showError(error?.error || 'Error al eliminar contratista');
          }
        } catch (error) {
          showError('Error de conexión al eliminar contratista');
        }
      },
      'Eliminar Contratista'
    );
  };

  const handleDeleteServicio = async (servicioId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar este servicio?',
      async () => {
        try {
          const response = await fetch(`/api/servicios?id=${servicioId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('Servicio eliminado exitosamente');
            loadDashboardData();
          } else {
            const error = await safeJsonParse(response);
            showError(error?.error || 'Error al eliminar servicio');
          }
        } catch (error) {
          showError('Error de conexión al eliminar servicio');
        }
      },
      'Eliminar Servicio'
    );
  };

  const handleDeleteCotizacion = async (cotizacionId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar esta cotización? Esta acción no se puede deshacer.',
      async () => {
        try {
          const response = await fetch(`/api/cotizaciones/${cotizacionId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('Cotización eliminada exitosamente');
            loadDashboardData();
          } else {
            const error = await safeJsonParse(response);
            showError(error?.error || 'Error al eliminar cotización');
          }
        } catch (error) {
          console.error('Error deleting cotizacion:', error);
          showError('Error de conexión al eliminar cotización');
        }
      },
      'Eliminar Cotización'
    );
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setShowEditServiceForm(true);
  };

  const handleEditAperturador = (aperturador) => {
    setEditingAperturador(aperturador);
    setShowEditAperturadorForm(true);
  };

  const handleUpdateUser = async (userData) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        showSuccess('Usuario actualizado exitosamente');
        loadDashboardData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al actualizar usuario');
      }
    } catch (error) {
      showError('Error de conexión al actualizar usuario');
    }
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
        loadDashboardData();
      } else {
        const error = await response.json();
        console.error('Error del servidor:', error);
        console.error('Detalles del error:', error.details);
        showError(error.details ? error.details.join(', ') : (error.error || 'Error al actualizar contratista'));
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      showError('Error de conexión al actualizar contratista');
    }
  };

  const handleUpdateService = async (serviceData) => {
    try {
      const isFormData = serviceData instanceof FormData;

      const response = await fetch('/api/servicios', {
        method: 'PUT',
        headers: isFormData ? {} : {
          'Content-Type': 'application/json',
        },
        body: isFormData ? serviceData : JSON.stringify(serviceData),
      });

      if (response.ok) {
        showSuccess('Servicio actualizado exitosamente');
        setShowEditServiceForm(false);
        setEditingService(null);
        loadDashboardData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al actualizar servicio');
      }
    } catch (error) {
      showError('Error de conexión al actualizar servicio');
    }
  };

  // Funciones para manejar áreas
  const handleCreateArea = async (areaData) => {
    try {
      const response = await fetch('/api/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(areaData),
      });

      if (response.ok) {
        showSuccess('Área creada exitosamente. Puedes calcular estadísticas después desde el botón correspondiente.');
        setShowDelimitadorAreas(false);
        loadDashboardData(); // Recargar datos
      } else {
        const error = await response.json();
        showError(error.error || 'Error al crear área');
      }
    } catch (error) {
      console.error('Error creando área:', error);
      showError('Error de conexión al crear área');
    }
  };

  const handleDeleteArea = async (areaId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar esta área? Esta acción no se puede deshacer.',
      async () => {
        try {
          const response = await fetch(`/api/areas/${areaId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('Área eliminada exitosamente');
            loadDashboardData();
          } else {
            const error = await safeJsonParse(response);
            showError(error?.error || 'Error al eliminar área');
          }
        } catch (error) {
          showError('Error de conexión al eliminar área');
        }
      },
      'Eliminar Área'
    );
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setShowEditAreaForm(true);
  };

  const handleUpdateArea = async (areaData) => {
    try {
      const response = await fetch('/api/areas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(areaData),
      });

      if (response.ok) {
        showSuccess('Área actualizada exitosamente');
        setShowEditAreaForm(false);
        setEditingArea(null);
        loadDashboardData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al actualizar área');
      }
    } catch (error) {
      console.error('Error actualizando área:', error);
      showError('Error de conexión al actualizar área');
    }
  };

  // Funciones para manejar aperturadores
  const handleConvertToAperturador = async (userId) => {
    showConfirm(
      '¿Estás seguro de que quieres convertir este usuario en Aperturador? Cambiará su rol y podrá crear áreas.',
      async () => {
        try {
          const response = await fetch('/api/aperturadores', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          if (response.ok) {
            showSuccess('Usuario convertido a Aperturador exitosamente');
            loadDashboardData();
          } else {
            const error = await response.json();
            showError(error.message || 'Error al convertir usuario');
          }
        } catch (error) {
          showError('Error de conexión al convertir usuario');
        }
      },
      'Convertir a Aperturador'
    );
  };

  const handleUpdateAperturador = async (aperturadorData) => {
    try {
      const response = await fetch('/api/aperturadores', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aperturadorData),
      });

      if (response.ok) {
        showSuccess('Aperturador actualizado exitosamente');
        setShowEditAperturadorForm(false);
        setEditingAperturador(null);
        loadDashboardData();
      } else {
        const error = await response.json();
        showError(error.message || 'Error al actualizar aperturador');
      }
    } catch (error) {
      showError('Error de conexión al actualizar aperturador');
    }
  };

  const handleDeleteAperturador = async (aperturadorId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar este aperturador? El usuario volverá a ser cliente.',
      async () => {
        try {
          const response = await fetch(`/api/aperturadores/${aperturadorId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('Aperturador eliminado exitosamente');
            loadDashboardData();
          } else {
            const error = await safeJsonParse(response);
            showError(error?.message || error?.error || 'Error al eliminar aperturador');
          }
        } catch (error) {
          showError('Error de conexión al eliminar aperturador');
        }
      },
      'Eliminar Aperturador'
    );
  };

  const handleToggleAperturadorStatus = async (aperturadorId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activar' : 'desactivar';

    showConfirm(
      `¿Estás seguro de que quieres ${action} este aperturador?`,
      async () => {
        try {
          const response = await fetch('/api/aperturadores', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aperturadorId,
              activo: newStatus
            }),
          });

          if (response.ok) {
            showSuccess(`Aperturador ${action === 'activar' ? 'activado' : 'desactivado'} exitosamente`);
            loadDashboardData();
          } else {
            const error = await response.json();
            showError(error.message || `Error al ${action} aperturador`);
          }
        } catch (error) {
          showError(`Error de conexión al ${action} aperturador`);
        }
      },
      `${action.charAt(0).toUpperCase() + action.slice(1)} Aperturador`
    );
  };

  // Funciones para manejar incorporadores
  const handleConvertToIncorporador = async (userId) => {
    showConfirm(
      '¿Estás seguro de que quieres convertir este usuario en Incorporador? Cambiará su rol y podrá incorporar contratistas.',
      async () => {
        try {
          const response = await fetch('/api/incorporadores', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          if (response.ok) {
            showSuccess('Usuario convertido a Incorporador exitosamente');
            loadDashboardData();
          } else {
            const error = await response.json();
            showError(error.message || 'Error al convertir usuario');
          }
        } catch (error) {
          showError('Error de conexión al convertir usuario');
        }
      },
      'Convertir a Incorporador'
    );
  };

  const handleEditIncorporador = (incorporador) => {
    setEditingIncorporador(incorporador);
    setShowEditIncorporadorForm(true);
  };

  const handleUpdateIncorporador = async (incorporadorData) => {
    try {
      const response = await fetch('/api/incorporadores', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incorporadorData),
      });

      if (response.ok) {
        showSuccess('Incorporador actualizado exitosamente');
        setShowEditIncorporadorForm(false);
        setEditingIncorporador(null);
        loadDashboardData();
      } else {
        const error = await response.json();
        showError(error.message || 'Error al actualizar incorporador');
      }
    } catch (error) {
      showError('Error de conexión al actualizar incorporador');
    }
  };

  const handleDeleteIncorporador = async (incorporadorId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar este incorporador? El usuario volverá a ser cliente.',
      async () => {
        try {
          const response = await fetch(`/api/incorporadores/${incorporadorId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('Incorporador eliminado exitosamente');
            loadDashboardData();
          } else {
            const error = await safeJsonParse(response);
            showError(error?.message || error?.error || 'Error al eliminar incorporador');
          }
        } catch (error) {
          showError('Error de conexión al eliminar incorporador');
        }
      },
      'Eliminar Incorporador'
    );
  };

  const handleToggleIncorporadorStatus = async (incorporadorId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activar' : 'desactivar';

    showConfirm(
      `¿Estás seguro de que quieres ${action} este incorporador?`,
      async () => {
        try {
          const response = await fetch('/api/incorporadores', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              incorporadorId,
              activo: newStatus
            }),
          });

          if (response.ok) {
            showSuccess(`Incorporador ${action === 'activar' ? 'activado' : 'desactivado'} exitosamente`);
            loadDashboardData();
          } else {
            const error = await response.json();
            showError(error.message || `Error al ${action} incorporador`);
          }
        } catch (error) {
          showError(`Error de conexión al ${action} incorporador`);
        }
      },
      `${action.charAt(0).toUpperCase() + action.slice(1)} Incorporador`
    );
  };

  // Función para actualizar calificaciones de nivel
  const handleUpdateCalificacion = async (tipo, id, calificacionNivel) => {
    try {
      const response = await fetch('/api/calificaciones', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo,
          id,
          calificacionNivel,
          role: 'admin'
        }),
      });

      if (response.ok) {
        showSuccess(`Calificación de ${tipo} actualizada exitosamente`);
        loadDashboardData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al actualizar calificación');
      }
    } catch (error) {
      showError('Error de conexión al actualizar calificación');
    }
  };

  // Función para eliminar citas
  const handleDeleteCita = async (citaId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar esta cita? Esta acción no se puede deshacer.',
      async () => {
        try {
          const response = await fetch(`/api/citas/${citaId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            showSuccess('Cita eliminada exitosamente');
            loadDashboardData(); // Recargar datos
          } else {
            const error = await safeJsonParse(response);
            showError(error?.message || error?.error || 'Error al eliminar cita');
          }
        } catch (error) {
          console.error('Error deleting cita:', error);
          showError('Error al eliminar cita');
        }
      },
      'Eliminar Cita'
    );
  };

  // Función para cancelar citas
  const handleCancelCita = async (citaId) => {
    showConfirm(
      '¿Estás seguro de que quieres cancelar esta cita?',
      async () => {
        try {
          const response = await fetch(`/api/citas/${citaId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              estado: 'cancelada'
            }),
          });

          if (response.ok) {
            showSuccess('Cita cancelada exitosamente');
            loadDashboardData(); // Recargar datos
          } else {
            const error = await response.json();
            showError(error.message || 'Error al cancelar cita');
          }
        } catch (error) {
          console.error('Error canceling cita:', error);
          showError('Error al cancelar cita');
        }
      },
      'Cancelar Cita'
    );
  };

  // Función para actualizar estadísticas de un área específica
  const handleActualizarEstadisticasArea = async (areaId, areaNombre) => {
    try {
      showSuccess(`Calculando estadísticas para ${areaNombre}...`);

      const response = await fetch('/api/areas/estadisticas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId }),
      });

      if (response.ok) {
        const result = await response.json();
        showSuccess(`Estadísticas actualizadas para ${areaNombre}`);
        loadDashboardData(); // Recargar datos
      } else {
        const error = await response.json();
        showError(error.error || 'Error al actualizar estadísticas');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error al actualizar estadísticas. Se usó estimación por área.');
      loadDashboardData(); // Recargar de todos modos para mostrar estimación
    }
  };

  // Función para actualizar estadísticas de todas las áreas
  const handleActualizarTodasEstadisticas = async () => {
    showConfirm(
      '¿Deseas calcular estadísticas de todas las zonas? Esto puede tardar varios minutos y consumir recursos de la API de OpenStreetMap.',
      async () => {
        try {
          showSuccess('Calculando estadísticas de todas las zonas...');

          const response = await fetch('/api/areas/estadisticas?actualizarTodas=true');

          if (response.ok) {
            const result = await response.json();
            showSuccess(`Estadísticas calculadas para ${result.areasActualizadas} zonas`);
            loadDashboardData();
          } else {
            const error = await response.json();
            showError(error.error || 'Error al actualizar estadísticas');
          }
        } catch (error) {
          console.error('Error:', error);
          showError('Error al actualizar estadísticas');
        }
      },
      'Actualizar Todas las Estadísticas'
    );
  };

  const handleCreateService = async (serviceData) => {
    try {
      const isFormData = serviceData instanceof FormData;

      const response = await fetch('/api/servicios', {
        method: 'POST',
        headers: isFormData ? {} : {
          'Content-Type': 'application/json',
        },
        body: isFormData ? serviceData : JSON.stringify(serviceData),
      });

      if (response.ok) {
        showSuccess('Servicio creado exitosamente');
        setShowCreateServiceForm(false);
        loadDashboardData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al crear servicio');
      }
    } catch (error) {
      showError('Error de conexión al crear servicio');
    }
  };

  const EditAreaForm = () => {
    const [formData, setFormData] = useState({
      _id: editingArea?._id || '',
      nombre: editingArea?.nombre || '',
      descripcion: editingArea?.descripcion || '',
      clasificacion: editingArea?.clasificacion || 'C',
      contratistas: editingArea?.contratistas?.map(c => c._id) || [],
    });
    const [todosLosContratistas, setTodosLosContratistas] = useState([]);
    const [cargandoContratistas, setCargandoContratistas] = useState(true);
    const [conflictos, setConflictos] = useState([]);

    useEffect(() => {
      if (editingArea) {
        setFormData({
          _id: editingArea._id,
          nombre: editingArea.nombre,
          descripcion: editingArea.descripcion || '',
          clasificacion: editingArea.clasificacion,
          contratistas: editingArea.contratistas?.map(c => c._id) || [],
        });
        cargarTodosLosContratistas();
      }
    }, [editingArea]);

    const cargarTodosLosContratistas = async () => {
      try {
        setCargandoContratistas(true);
        const response = await fetch('/api/contratistas');
        if (response.ok) {
          const data = await response.json();
          setTodosLosContratistas(data.filter(c => c.activo));
        }
      } catch (error) {
        console.error('Error cargando contratistas:', error);
      } finally {
        setCargandoContratistas(false);
      }
    };

    const validarConflictos = (contratistasSeleccionados) => {
      const contratistasCompletos = todosLosContratistas.filter(c =>
        contratistasSeleccionados.includes(c._id)
      );

      const serviciosEncontrados = new Map();
      const nuevosConflictos = [];

      contratistasCompletos.forEach(contratista => {
        if (contratista.servicios && Array.isArray(contratista.servicios)) {
          contratista.servicios.forEach(servicio => {
            const servicioId = servicio._id || servicio;
            const servicioNombre = servicio.nombre || 'Servicio desconocido';

            if (serviciosEncontrados.has(servicioId)) {
              const conflictoExistente = serviciosEncontrados.get(servicioId);
              nuevosConflictos.push({
                servicio: { _id: servicioId, nombre: servicioNombre },
                contratistas: [conflictoExistente.contratista, contratista]
              });
            } else {
              serviciosEncontrados.set(servicioId, { contratista, servicio: servicioNombre });
            }
          });
        }
      });

      setConflictos(nuevosConflictos);
      return nuevosConflictos.length === 0;
    };

    const toggleContratista = (contratistaId) => {
      let nuevosSeleccionados;

      if (formData.contratistas.includes(contratistaId)) {
        nuevosSeleccionados = formData.contratistas.filter(id => id !== contratistaId);
      } else {
        nuevosSeleccionados = [...formData.contratistas, contratistaId];
      }

      setFormData({ ...formData, contratistas: nuevosSeleccionados });
      validarConflictos(nuevosSeleccionados);
    };

    const handleSubmit = (e) => {
      e.preventDefault();

      const sinConflictos = validarConflictos(formData.contratistas);
      if (!sinConflictos && conflictos.length > 0) {
        if (!confirm('Hay conflictos de servicios. ¿Desea continuar de todos modos?')) {
          return;
        }
      }

      handleUpdateArea(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Editar Área</h3>
            <button
              onClick={() => {
                setShowEditAreaForm(false);
                setEditingArea(null);
                setConflictos([]);
              }}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Área *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clasificación
                </label>
                <select
                  value={formData.clasificacion}
                  onChange={(e) => setFormData({ ...formData, clasificacion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Sección de Contratistas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Contratistas Asignados ({formData.contratistas.length} seleccionados)
              </label>

              {cargandoContratistas ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-gray-600">Cargando contratistas...</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {todosLosContratistas.map((contratista) => {
                    const isSelected = formData.contratistas.includes(contratista._id);
                    const serviciosDelContratista = contratista.servicios || [];

                    return (
                      <div
                        key={contratista._id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        onClick={() => toggleContratista(contratista._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleContratista(contratista._id)}
                                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">{contratista.nombre}</h4>
                                <p className="text-sm text-gray-600">{contratista.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-2 py-1 text-xs rounded-full ${contratista.promedioCalificacion >= 4 ? 'bg-green-100 text-green-800' :
                                    contratista.promedioCalificacion >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                    {contratista.promedioCalificacion?.toFixed(1) || '0.0'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {serviciosDelContratista.length} servicio(s)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {serviciosDelContratista.length > 0 && (
                              <div className="mt-2 ml-7">
                                <p className="text-xs text-gray-600 mb-1">Servicios:</p>
                                <div className="flex flex-wrap gap-1">
                                  {serviciosDelContratista.slice(0, 3).map((servicio, index) => (
                                    <span
                                      key={servicio._id || index}
                                      className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                    >
                                      {servicio.nombre || servicio.title || servicio.serviceName || `Servicio ${index + 1}`}
                                    </span>
                                  ))}
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

              {/* Mostrar conflictos */}
              {conflictos.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <h4 className="font-semibold text-red-800">Conflictos de Servicios</h4>
                  </div>
                  <div className="space-y-2">
                    {conflictos.map((conflicto, index) => (
                      <div key={index} className="text-sm text-red-700">
                        <strong>{conflicto.servicio.nombre}:</strong> Asignado a{' '}
                        {conflicto.contratistas.map(c => c.nombre).join(' y ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowEditAreaForm(false);
                  setEditingArea(null);
                  setConflictos([]);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`flex-1 px-6 py-3 rounded-lg transition-colors text-white ${conflictos.length > 0
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-primary hover:bg-primary-hover'
                  }`}
              >
                {conflictos.length > 0 ? 'Guardar con Conflictos' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const EditAperturadorForm = () => {
    const [formData, setFormData] = useState({
      aperturadorId: editingAperturador?._id || '',
      activo: editingAperturador?.activo !== false,
      porcentajeComision: editingAperturador?.configuracion?.porcentajeComision || 0,
      observaciones: editingAperturador?.observaciones || '',
      notificaciones: {
        nuevoServicio: editingAperturador?.configuracion?.notificaciones?.nuevoServicio !== false,
        reportesSemanal: editingAperturador?.configuracion?.notificaciones?.reportesSemanal !== false
      }
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      handleUpdateAperturador(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Editar Aperturador</h3>
            <button
              onClick={() => {
                setShowEditAperturadorForm(false);
                setEditingAperturador(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aperturador
              </label>
              <input
                type="text"
                value={editingAperturador?.user?.nombre || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  {formData.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje de Comisión (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.porcentajeComision}
                onChange={(e) => setFormData({ ...formData, porcentajeComision: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comisión por servicios en sus áreas (para implementar)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Notificaciones
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.notificaciones.nuevoServicio}
                    onChange={(e) => setFormData({
                      ...formData,
                      notificaciones: {
                        ...formData.notificaciones,
                        nuevoServicio: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Nuevos servicios</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.notificaciones.reportesSemanal}
                    onChange={(e) => setFormData({
                      ...formData,
                      notificaciones: {
                        ...formData.notificaciones,
                        reportesSemanal: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Reportes semanales</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows="3"
                placeholder="Notas administrativas..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estadísticas
              </label>
              <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Áreas creadas:</span>
                  <span className="font-semibold">{editingAperturador?.estadisticas?.totalAreasCreadas || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Áreas activas:</span>
                  <span className="font-semibold">{editingAperturador?.estadisticas?.areasActivas || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Servicios generados:</span>
                  <span className="font-semibold">{editingAperturador?.estadisticas?.serviciosGenerados || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditAperturadorForm(false);
                  setEditingAperturador(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
              >
                Actualizar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const EditIncorporadorForm = () => {
    const [formData, setFormData] = useState({
      incorporadorId: editingIncorporador?._id || '',
      activo: editingIncorporador?.activo !== false,
      porcentajeComision: editingIncorporador?.configuracion?.porcentajeComision || 0,
      observaciones: editingIncorporador?.observaciones || '',
      notificaciones: {
        nuevoContratista: editingIncorporador?.configuracion?.notificaciones?.nuevoContratista !== false,
        reportesSemanal: editingIncorporador?.configuracion?.notificaciones?.reportesSemanal !== false
      }
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      handleUpdateIncorporador(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Editar Incorporador</h3>
            <button
              onClick={() => {
                setShowEditIncorporadorForm(false);
                setEditingIncorporador(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Incorporador
              </label>
              <input
                type="text"
                value={editingIncorporador?.user?.nombre || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  {formData.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje de Comisión (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.porcentajeComision}
                onChange={(e) => setFormData({ ...formData, porcentajeComision: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comisión por servicios de sus contratistas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Notificaciones
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.notificaciones.nuevoContratista}
                    onChange={(e) => setFormData({
                      ...formData,
                      notificaciones: {
                        ...formData.notificaciones,
                        nuevoContratista: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Nuevos contratistas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.notificaciones.reportesSemanal}
                    onChange={(e) => setFormData({
                      ...formData,
                      notificaciones: {
                        ...formData.notificaciones,
                        reportesSemanal: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Reportes semanales</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows="3"
                placeholder="Notas administrativas..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estadísticas
              </label>
              <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contratistas incorporados:</span>
                  <span className="font-semibold">{editingIncorporador?.estadisticas?.totalContratistasIncorporados || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contratistas activos:</span>
                  <span className="font-semibold">{editingIncorporador?.estadisticas?.contratistasActivos || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Servicios generados:</span>
                  <span className="font-semibold">{editingIncorporador?.estadisticas?.serviciosGenerados || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditIncorporadorForm(false);
                  setEditingIncorporador(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
              >
                Actualizar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleToggleContratistaStatus = async (contratistaId, currentStatus) => {
    // Si currentStatus es undefined, asumir que está activo
    const isCurrentlyActive = currentStatus !== false;
    const newStatus = !isCurrentlyActive;

    //console.log('Toggling contratista status:', { 
    //  contratistaId, 
    //  currentStatus, 
    //  isCurrentlyActive, 
    //  newStatus 
    //});

    try {
      const response = await fetch(`/api/contratistas/${contratistaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: newStatus }),
      });

      //console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(`Error al actualizar el estado del contratista: ${errorData.error || 'Error desconocido'}`);
      }

      const updatedContratista = await response.json();
      //console.log('Updated contratista received:', updatedContratista);
      //console.log('Updated contratista activo field:', updatedContratista.activo);

      // Actualizar el estado local con el valor correcto
      setContratistas((prevContratistas) =>
        prevContratistas.map((contratista) =>
          contratista._id === contratistaId
            ? { ...contratista, activo: updatedContratista.activo ?? newStatus }
            : contratista
        )
      );

      showSuccess(`Contratista ${newStatus ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error('Error in handleToggleContratistaStatus:', error);
      showError(error.message || 'Hubo un error al actualizar el estado del contratista');
    }
  };

  const menuItems = [
    {
      key: 'overview',
      label: 'Panel General',
      icon: <FaChartBar />,
      count: null
    },
    {
      key: 'users',
      label: 'Usuarios',
      icon: <FaUsers />,
      count: users.length
    },
    {
      key: 'contratistas',
      label: 'Contratistas',
      icon: <FaWarehouse />,
      count: contratistas.length
    },
    {
      key: 'finanzas',
      label: 'Finanzas',
      icon: <FaMoneyBillWave />,
      count: null
    },
    {
      key: 'servicios',
      label: 'Servicios',
      icon: <FaTools />,
      count: servicios.length
    },
    {
      key: 'cotizaciones',
      label: 'Cotizaciones',
      icon: <FaClipboardList />,
      count: cotizaciones.length
    },
    {
      key: 'citas',
      label: 'Citas',
      icon: <FaCar />,
      count: citas.length
    },
    {
      key: 'areas',
      label: 'Zonas',
      icon: <FaMapMarkedAlt />,
      count: areas.length
    },
    {
      key: 'aperturadores',
      label: 'Aperturadores',
      icon: <FaUserPlus />,
      count: aperturadores.length
    },
    {
      key: 'incorporadores',
      label: 'Incorporadores',
      icon: <FaUsers />,
      count: incorporadores.length
    }
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Panel General</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FaUsers className="text-blue-600 text-lg" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs font-medium text-gray-600">Usuarios</p>
                    <p className="text-xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FaWarehouse className="text-green-600 text-lg" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs font-medium text-gray-600">Contratistas</p>
                    <p className="text-xl font-bold text-gray-900">{stats.totalContratistas}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FaTools className="text-purple-600 text-lg" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs font-medium text-gray-600">Servicios</p>
                    <p className="text-xl font-bold text-gray-900">{stats.totalServicios}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FaClipboardList className="text-yellow-600 text-lg" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs font-medium text-gray-600">Cotizaciones</p>
                    <p className="text-xl font-bold text-gray-900">{stats.totalCotizaciones}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FaCar className="text-indigo-600 text-lg" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs font-medium text-gray-600">Citas</p>
                    <p className="text-xl font-bold text-gray-900">{stats.totalCitas}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estadísticas detalladas */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sistema de Cotizaciones y Citas</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total de Cotizaciones</span>
                    <span className="font-semibold text-gray-900">{stats.totalCotizaciones}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pendientes de Respuesta</span>
                    <span className="font-semibold text-yellow-600">{stats.cotizacionesPendientes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Citas Activas</span>
                    <span className="font-semibold text-green-600">{stats.citasActivas}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
              <div className="space-y-3">
                {cotizaciones.slice(0, 5).map((cotizacion) => (
                  <div key={cotizacion._id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {cotizacion.cita?.servicio?.nombre || 'Servicio'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {cotizacion.cita?.cliente?.nombre || 'Cliente'} - {cotizacion.estado}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${cotizacion.estado === 'pendiente' ? 'bg-gray-100 text-gray-800' :
                      cotizacion.estado === 'enviada' ? 'bg-blue-100 text-blue-800' :
                        cotizacion.estado === 'aceptada' ? 'bg-green-100 text-green-800' :
                          cotizacion.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                      }`}>
                      {cotizacion.estado}
                    </span>
                  </div>
                ))}
                {cotizaciones.length === 0 && (
                  <p className="text-sm text-gray-500">No hay actividad reciente</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <UsersManager
            onDeleteUser={handleDeleteUser}
            onUpdateUser={handleUpdateUser}
            onConvertToAperturador={handleConvertToAperturador}
            onConvertToIncorporador={handleConvertToIncorporador}
            showError={showError}
            showSuccess={showSuccess}
            showConfirm={showConfirm}
          />
        );

      case 'contratistas':
        return (
          <ContratistasManager
            onDeleteContratista={handleDeleteContratista}
            onUpdateContratista={handleUpdateContratista}
            onToggleContratistaStatus={handleToggleContratistaStatus}
            serviciosDisponibles={servicios}
            showError={showError}
            showSuccess={showSuccess}
            showConfirm={showConfirm}
          />
        );

      case 'finanzas':
        return <FinanzasDashboard />;

      case 'servicios':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Servicios</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowCreateServiceForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <FaPlus size={16} />
                  Crear Servicio
                </button>
                <button
                  onClick={loadDashboardData}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                >
                  <FaSync size={16} />
                  Actualizar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicios.map((servicio) => (
                <div key={servicio._id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                  {/* Imagen del servicio */}
                  {servicio.imagenUrl && (
                    <div className="h-48 bg-gray-200">
                      <img
                        src={servicio.imagenUrl}
                        alt={servicio.nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/images/sinbatallarmini.png';
                        }}
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{servicio.nombre}</h3>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {servicio.categoria}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${servicio.tipo === 'urgente'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {servicio.tipo === 'urgente' ? 'Express' : 'Programable'}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{servicio.descripcion}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Categoría:</span>
                        <span className="font-medium text-gray-900">
                          {servicio.categoria}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Tipo:</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${servicio.tipo === 'urgente'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                          }`}>
                          {servicio.tipo === 'urgente' ? 'Express' : 'Programable'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Calificación:</span>
                        <select
                          value={servicio.promedioCalificacion || 'C'}
                          onChange={(e) => handleUpdateCalificacion('servicio', servicio._id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Creado: {formatDate(servicio.createdAt)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditService(servicio)}
                          className="text-blue-600 hover:text-blue-800:text-blue-200"
                        >
                          <FaEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteServicio(servicio._id)}
                          className="text-red-600 hover:text-red-800:text-red-200"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {servicios.length === 0 && !loading && (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-500">No hay servicios registrados</p>
                  <button
                    onClick={() => setShowCreateServiceForm(true)}
                    className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    Crear primer servicio
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'cotizaciones':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Cotizaciones</h2>
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
              >
                <FaSync size={16} />
                Actualizar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.totalCotizaciones}</div>
                <div className="text-sm text-gray-600">Total Cotizaciones</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-yellow-600">{stats.cotizacionesPendientes}</div>
                <div className="text-sm text-gray-600">Pendientes</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {cotizaciones.filter(c => c.estado === 'aceptada').length}
                </div>
                <div className="text-sm text-gray-600">Aceptadas</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">
                  {cotizaciones.filter(c => c.estado === 'enviada').length}
                </div>
                <div className="text-sm text-gray-600">Enviadas</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contratista</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cotizaciones.map((cotizacion) => (
                      <tr key={cotizacion._id} className="hover:bg-gray-50:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          #{cotizacion._id.slice(-6)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cotizacion.cita?.cliente?.nombre || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cotizacion.cita?.servicio?.nombre || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cotizacion.contratista?.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cotizacion.estado === 'pendiente' ? 'bg-gray-100 text-gray-800' :
                            cotizacion.estado === 'enviada' ? 'bg-blue-100 text-blue-800' :
                              cotizacion.estado === 'aceptada' ? 'bg-green-100 text-green-800' :
                                cotizacion.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                            }`}>
                            {cotizacion.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${(cotizacion.total || cotizacion.precio || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(cotizacion.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteCotizacion(cotizacion._id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Eliminar cotización"
                          >
                            <FaTrash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'citas':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Citas</h2>
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
              >
                <FaSync size={16} />
                Actualizar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.totalCitas}</div>
                <div className="text-sm text-gray-600">Total Citas</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">
                  {citas.filter(c => c.estado === 'programada').length}
                </div>
                <div className="text-sm text-gray-600">Programadas</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-yellow-600">
                  {citas.filter(c => c.estado === 'en_progreso').length}
                </div>
                <div className="text-sm text-gray-600">En Progreso</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {citas.filter(c => c.estado === 'completada').length}
                </div>
                <div className="text-sm text-gray-600">Completadas</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contratista</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calificación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {citas.map((cita) => (
                      <tr key={cita._id} className="hover:bg-gray-50:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          #{cita._id.slice(-6)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cita.cliente?.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cita.servicio?.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cita.contratista?.nombre || 'No asignado'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cita.estado === 'programada' ? 'bg-blue-100 text-blue-800' :
                            cita.estado === 'confirmada' ? 'bg-green-100 text-green-800' :
                              cita.estado === 'en_camino' ? 'bg-purple-100 text-purple-800' :
                                cita.estado === 'en_progreso' ? 'bg-yellow-100 text-yellow-800' :
                                  cita.estado === 'completada' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                            }`}>
                            {cita.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(cita.fechaProgramada, cita.horaInicio)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cita.calificacion?.puntaje ? `${cita.calificacion.puntaje}/5` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {(cita.estado !== 'cancelada' && cita.estado !== 'completada') && (
                              <button
                                onClick={() => handleCancelCita(cita._id)}
                                className="text-yellow-600 hover:text-yellow-800 p-1"
                                title="Cancelar cita"
                              >
                                <FaBan size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteCita(cita._id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Eliminar cita"
                            >
                              <FaTrash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'areas':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Zonas</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleActualizarTodasEstadisticas}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  title="Calcular estadísticas de todas las zonas (puede tardar)"
                >
                  <FaSync size={16} />
                  Calcular Todas las Estadísticas
                </button>
                <button
                  onClick={loadDashboardData}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <FaSync size={16} />
                  Recargar
                </button>
                <button
                  onClick={() => setShowDelimitadorAreas(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                >
                  <FaPlus size={16} />
                  Nueva Zona
                </button>
                <button
                  onClick={() => setShowMapaZonas(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FaMapMarkedAlt size={16} />
                  Ver Mapa de Zonas
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.totalAreas}</div>
                <div className="text-sm text-gray-600">Total Zonas</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">
                  {areas.filter(a => a.clasificacion === 'AAA').length}
                </div>
                <div className="text-sm text-gray-600">Élite (AAA)</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {areas.filter(a => ['AA', 'A'].includes(a.clasificacion)).length}
                </div>
                <div className="text-sm text-gray-600">Premium (AA-A)</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-yellow-600">
                  {areas.filter(a => ['B', 'C'].includes(a.clasificacion)).length}
                </div>
                <div className="text-sm text-gray-600">Básicas (B-C)</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clasificación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estadísticas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contratistas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {areas.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          <FaMapMarkedAlt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-lg font-medium text-gray-900 mb-2">No hay zonas registradas</p>
                          <p className="text-gray-600 mb-4">Crea tu primera zona delimitando un área en el mapa</p>
                          <button
                            onClick={() => setShowDelimitadorAreas(true)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                          >
                            Crear Primera Zona
                          </button>
                        </td>
                      </tr>
                    ) : (
                      areas.map((area) => (
                        <tr key={area._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{area.nombre}</div>
                            {area.descripcion && (
                              <div className="text-xs text-gray-500 mt-1">{area.descripcion}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${area.clasificacion === 'AAA' ? 'bg-purple-100 text-purple-800' :
                              area.clasificacion === 'AA' ? 'bg-blue-100 text-blue-800' :
                                area.clasificacion >= 4 ? 'bg-green-100 text-green-800' :
                                  area.clasificacion >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                              }`}>
                              {area.clasificacion}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {area.estadisticas ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <FaUsers className="text-blue-500 w-3 h-3" />
                                  <span className="text-gray-600">Viviendas:</span>
                                  <span className="font-semibold text-gray-900">~{area.estadisticas.viviendas || 0}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <FaWarehouse className="text-green-500 w-3 h-3" />
                                  <span className="text-gray-600">Negocios:</span>
                                  <span className="font-semibold text-gray-900">~{area.estadisticas.negocios || 0}</span>
                                </div>
                                {area.estadisticas.ultimaActualizacion && (
                                  <div className="text-[10px] text-gray-500 mt-1">
                                    Act: {new Date(area.estadisticas.ultimaActualizacion).toLocaleDateString('es-MX')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic">Sin datos</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900 font-medium">
                                {area.contratistas?.length || 0} contratistas
                              </div>
                              {area.contratistas && area.contratistas.length > 0 && (
                                <div className="space-y-1">
                                  {area.contratistas.slice(0, 2).map((contratista) => (
                                    <div key={contratista._id} className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600">
                                        {contratista.nombre}
                                      </span>
                                      <span className={`px-1.5 py-0.5 text-xs rounded ${contratista.promedioCalificacion >= 4 ? 'bg-green-100 text-green-700' :
                                        contratista.promedioCalificacion >= 3 ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                        {contratista.promedioCalificacion}
                                      </span>
                                    </div>
                                  ))}
                                  {area.contratistas.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{area.contratistas.length - 2} más
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {area.createdAt ? formatDate(area.createdAt) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleActualizarEstadisticasArea(area._id, area.nombre)}
                                className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                                title="Calcular estadísticas"
                              >
                                <FaSync size={14} />
                              </button>
                              <button
                                onClick={() => handleEditArea(area)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
                                title="Editar área"
                              >
                                <FaEdit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteArea(area._id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                title="Eliminar área"
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
          </div>
        );

      case 'aperturadores':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Aperturadores</h2>
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <FaSync size={16} />
                Recargar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.totalAperturadores}</div>
                <div className="text-sm text-gray-600">Total Aperturadores</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {aperturadores.filter(a => a.activo).length}
                </div>
                <div className="text-sm text-gray-600">Activos</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">
                  {aperturadores.reduce((sum, a) => sum + (a.estadisticas?.totalAreasCreadas || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Áreas Creadas Total</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aperturador</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Áreas Creadas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicios</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comisión</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {aperturadores.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <FaUserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-lg font-medium text-gray-900 mb-2">No hay aperturadores registrados</p>
                          <p className="text-gray-600">Convierte usuarios a aperturadores desde la sección de Usuarios</p>
                        </td>
                      </tr>
                    ) : (
                      aperturadores.map((aperturador) => (
                        <tr key={aperturador._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {aperturador.user?.nombre || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {aperturador.user?.email || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {aperturador.user?.telefono || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleAperturadorStatus(aperturador._id, aperturador.activo)}
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${aperturador.activo
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                            >
                              {aperturador.activo ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-gray-900">
                                {aperturador.estadisticas?.totalAreasCreadas || 0}
                              </div>
                              <div className="text-xs text-gray-500">
                                Activas: {aperturador.estadisticas?.areasActivas || 0}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {aperturador.estadisticas?.serviciosGenerados || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                              Ingresos: ${aperturador.estadisticas?.ingresosGenerados || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {aperturador.configuracion?.porcentajeComision || 0}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {aperturador.createdAt ? formatDate(aperturador.createdAt) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditAperturador(aperturador)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
                                title="Editar aperturador"
                              >
                                <FaEdit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteAperturador(aperturador._id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                title="Eliminar aperturador"
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

            {aperturadores.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FaUserPlus className="text-blue-600 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">
                      Convertir usuarios a Aperturadores
                    </h3>
                    <p className="text-sm text-blue-700">
                      Ve a la sección de Usuarios y selecciona un usuario para convertirlo en Aperturador.
                      Los aperturadores podrán crear y gestionar áreas en el sistema.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'incorporadores':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Incorporadores</h2>
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <FaSync size={16} />
                Recargar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.totalIncorporadores}</div>
                <div className="text-sm text-gray-600">Total Incorporadores</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {incorporadores.filter(i => i.activo).length}
                </div>
                <div className="text-sm text-gray-600">Activos</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">
                  {incorporadores.reduce((sum, i) => sum + (i.estadisticas?.totalContratistasIncorporados || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Contratistas Incorporados Total</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incorporador</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contratistas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicios</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comisión</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {incorporadores.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <FaUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-lg font-medium text-gray-900 mb-2">No hay incorporadores registrados</p>
                          <p className="text-gray-600">Convierte usuarios a incorporadores desde la sección de Usuarios</p>
                        </td>
                      </tr>
                    ) : (
                      incorporadores.map((incorporador) => (
                        <tr key={incorporador._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {incorporador.user?.nombre || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {incorporador.user?.email || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {incorporador.user?.telefono || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleIncorporadorStatus(incorporador._id, incorporador.activo)}
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${incorporador.activo
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                            >
                              {incorporador.activo ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-gray-900">
                                {incorporador.estadisticas?.totalContratistasIncorporados || 0}
                              </div>
                              <div className="text-xs text-gray-500">
                                Activos: {incorporador.estadisticas?.contratistasActivos || 0}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {incorporador.estadisticas?.serviciosGenerados || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                              Ingresos: ${incorporador.estadisticas?.ingresosGenerados || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {incorporador.configuracion?.porcentajeComision || 0}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {incorporador.createdAt ? formatDate(incorporador.createdAt) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditIncorporador(incorporador)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
                                title="Editar incorporador"
                              >
                                <FaEdit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteIncorporador(incorporador._id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                title="Eliminar incorporador"
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

            {incorporadores.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FaUsers className="text-blue-600 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">
                      Convertir usuarios a Incorporadores
                    </h3>
                    <p className="text-sm text-blue-700">
                      Ve a la sección de Usuarios y selecciona un usuario para convertirlo en Incorporador.
                      Los incorporadores podrán registrar y gestionar contratistas en el sistema.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (status === 'loading') {
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
        <div className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-300 ease-in-out border-r border-gray-200 lg:z-auto`}>
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-200">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
                <FaShieldAlt className="text-white text-sm sm:text-lg" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100"
            >
              <FaTimes size={18} />
            </button>
          </div>

          <nav className="mt-6 px-4 pb-20">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      setActiveTab(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-colors ${activeTab === item.key
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100:bg-gray-700'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.count !== null && (
                      <span className={`px-2 py-1 text-xs rounded-full ${activeTab === item.key
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-600'
                        }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50:bg-red-900/20 rounded-lg transition-colors"
            >
              <FaSignOutAlt />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-screen">
          {/* Top Bar */}
          <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100"
                >
                  <FaBars size={20} />
                </button>
                <div className="flex items-center space-x-4">
                  <span className="text-xs sm:text-sm text-gray-600 truncate">
                    Bienvenido, {session?.user?.nombre || 'Administrador'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 pt-6">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Create Service Form Modal */}
      {showCreateServiceForm && (
        <CreateServiceForm
          onClose={() => setShowCreateServiceForm(false)}
          onCreateService={handleCreateService}
          showError={showError}
        />
      )}

      {/* Edit Forms */}
      {showEditServiceForm && (
        <EditServiceForm
          editingService={editingService}
          onClose={() => {
            setShowEditServiceForm(false);
            setEditingService(null);
          }}
          onUpdateService={handleUpdateService}
          showError={showError}
        />
      )}
      {showEditAreaForm && <EditAreaForm />}
      {showEditAperturadorForm && <EditAperturadorForm />}
      {showEditIncorporadorForm && <EditIncorporadorForm />}

      {/* Delimitador de Áreas */}
      {showDelimitadorAreas && (
        <DelimitadorAreas
          onAreaConfirmada={handleCreateArea}
          onCancel={() => setShowDelimitadorAreas(false)}
          areasExistentes={areas}
        />
      )}

      {/* Modal Visualizador de Zonas */}
      {showMapaZonas && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Mapa de Zonas</h2>
              <button
                onClick={() => setShowMapaZonas(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1">
              <VisualizadorZonas areas={areas} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Component */}
      <Modal {...modalState} onClose={hideModal} />
    </div>
  );
}
