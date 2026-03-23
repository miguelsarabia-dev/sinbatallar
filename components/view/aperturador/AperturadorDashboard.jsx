"use client";
import { useState, useEffect } from 'react';
import { useSession, signOut } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Modal } from "../../ui";
import { useModal } from "../../../hooks/useModal";
import { formatDate } from "../../../lib/date-utils";
import DelimitadorAreas from "../../maps/DelimitadorAreasWrapper";
import VisualizadorZonas from "../../maps/VisualizadorZonas";
import { 
  FaMapMarkedAlt, FaSignOutAlt, FaPlus, FaSync, FaTimes,
  FaBars, FaChartBar, FaUsers, FaWarehouse, FaEdit
} from 'react-icons/fa';

export default function AperturadorDashboard() {
  const { modalState, showError, showSuccess, showConfirm, hideModal } = useModal();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [areas, setAreas] = useState([]); // Mis áreas
  const [todasLasAreas, setTodasLasAreas] = useState([]); // TODAS las áreas de la BD
  const [aperturadorData, setAperturadorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDelimitadorAreas, setShowDelimitadorAreas] = useState(false);
  const [showMapaZonas, setShowMapaZonas] = useState(false);
  const [showEditAreaForm, setShowEditAreaForm] = useState(false);
  const [editingArea, setEditingArea] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!session?.user?.id) {
        console.error('No hay sesión de usuario');
        return;
      }

      // Obtener datos del aperturador
      const aperturadorRes = await fetch(`/api/aperturadores?userId=${session.user.id}`);
      if (aperturadorRes.ok) {
        const aperturadorDataResponse = await aperturadorRes.json();
        setAperturadorData(aperturadorDataResponse);
        
        // Las áreas ya vienen pobladas en areasCreadas
        if (aperturadorDataResponse.areasCreadas) {
          setAreas(aperturadorDataResponse.areasCreadas);
        }
      } else {
        console.error('Error al cargar datos del aperturador');
        showError('Error al cargar tus datos');
      }

      // Cargar TODAS las áreas de la BD
      const todasAreasRes = await fetch('/api/areas');
      if (todasAreasRes.ok) {
        const todasAreasData = await todasAreasRes.json();
        setTodasLasAreas(todasAreasData);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    const userRole = session.user?.role;
    
    if (userRole !== 'aperturador') {
      showError('No tienes permisos para acceder a esta página');
      router.push('/');
      return;
    }
    
    loadData();
  }, [session, status, router]);

  const handleCreateArea = async (areaData) => {
    try {
      // Agregar el ID del aperturador al área
      const areaWithAperturador = {
        ...areaData,
        aperturadorId: aperturadorData._id
      };

      const response = await fetch('/api/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(areaWithAperturador),
      });

      if (response.ok) {
        showSuccess('Área creada exitosamente');
        setShowDelimitadorAreas(false);
        loadData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al crear área');
      }
    } catch (error) {
      console.error('Error creando área:', error);
      showError('Error de conexión al crear área');
    }
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
        loadData();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al actualizar área');
      }
    } catch (error) {
      console.error('Error actualizando área:', error);
      showError('Error de conexión al actualizar área');
    }
  };

  const EditAreaForm = () => {
    const [formData, setFormData] = useState({
      _id: editingArea?._id || '',
      nombre: editingArea?.nombre || '',
      descripcion: editingArea?.descripcion || '',
      clasificacion: editingArea?.clasificacion || 'C',
      estadisticas: {
        viviendas: editingArea?.estadisticas?.viviendas || 0,
        negocios: editingArea?.estadisticas?.negocios || 0,
        edificios: editingArea?.estadisticas?.edificios || 0
      }
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.nombre.trim()) {
        showError('El nombre del área es requerido');
        return;
      }
      handleUpdateArea(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Editar Área</h3>
            <button
              onClick={() => {
                setShowEditAreaForm(false);
                setEditingArea(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Área
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clasificación
                </label>
                <select
                  value={formData.clasificacion}
                  onChange={(e) => setFormData({...formData, clasificacion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="C">C - Básica</option>
                  <option value="B">B - Intermedia</option>
                  <option value="A">A - Avanzada</option>
                  <option value="AA">AA - Premium</option>
                  <option value="AAA">AAA - Élite</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Estadísticas Aproximadas</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Viviendas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estadisticas.viviendas || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      estadisticas: {
                        ...formData.estadisticas,
                        viviendas: e.target.value === '' ? 0 : parseInt(e.target.value)
                      }
                    })}
                    className="w-full border border-blue-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Negocios
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estadisticas.negocios || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      estadisticas: {
                        ...formData.estadisticas,
                        negocios: e.target.value === '' ? 0 : parseInt(e.target.value)
                      }
                    })}
                    className="w-full border border-blue-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Edificios
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estadisticas.edificios || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      estadisticas: {
                        ...formData.estadisticas,
                        edificios: e.target.value === '' ? 0 : parseInt(e.target.value)
                      }
                    })}
                    className="w-full border border-blue-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditAreaForm(false);
                  setEditingArea(null);
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
                <FaMapMarkedAlt className="text-white text-lg" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Aperturador</h1>
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
                  {aperturadorData?.estadisticas?.totalAreasCreadas || 0}
                </div>
              </div>
              <div className="text-sm opacity-90">Áreas Creadas</div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Áreas Activas</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {aperturadorData?.estadisticas?.areasActivas || 0}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Servicios</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {aperturadorData?.estadisticas?.serviciosGenerados || 0}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Comisión</span>
                  <span className="text-lg font-semibold text-green-600">
                    {aperturadorData?.configuracion?.porcentajeComision || 0}%
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
                    Bienvenido, {session?.user?.nombre || 'Aperturador'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Mis Zonas</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDelimitadorAreas(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                  >
                    <FaPlus size={16} />
                    Nueva Zona
                  </button>
                  {areas.length > 0 && (
                    <button
                      onClick={() => setShowMapaZonas(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FaMapMarkedAlt size={16} />
                      Ver Mapa
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900">{areas.length}</div>
                  <div className="text-sm text-gray-600">Total Zonas</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="text-2xl font-bold text-purple-600">
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

              {/* Areas Table */}
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
                            <p className="text-lg font-medium text-gray-900 mb-2">No has creado zonas aún</p>
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
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                area.clasificacion === 'AAA' ? 'bg-purple-100 text-purple-800' :
                                area.clasificacion === 'AA' ? 'bg-blue-100 text-blue-800' :
                                area.clasificacion === 'A' ? 'bg-green-100 text-green-800' :
                                area.clasificacion === 'B' ? 'bg-yellow-100 text-yellow-800' :
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
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic">Sin datos</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 font-medium">
                                {area.contratistas?.length || 0} contratistas
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {area.createdAt ? formatDate(area.createdAt) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleEditArea(area)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
                                title="Editar área"
                              >
                                <FaEdit size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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

      {/* Edit Area Form */}
      {showEditAreaForm && <EditAreaForm />}

      {/* Delimitador de Áreas */}
      {showDelimitadorAreas && (
        <DelimitadorAreas
          onAreaConfirmada={handleCreateArea}
          onCancel={() => setShowDelimitadorAreas(false)}
          areasExistentes={areas}
          hideContratistas={true}
          aperturadorId={aperturadorData?._id}
        />
      )}

      {/* Mapa de Zonas */}
      {showMapaZonas && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Todas las Zonas (Verdes: Tuyas | Rojas: Otros)</h2>
              <button
                onClick={() => setShowMapaZonas(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1">
              <VisualizadorZonas 
                areas={todasLasAreas} 
                aperturadorId={aperturadorData?._id}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal {...modalState} onClose={hideModal} />
    </div>
  );
}
