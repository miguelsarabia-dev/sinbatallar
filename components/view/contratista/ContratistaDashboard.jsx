"use client";

import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FaUsers,
  FaSignOutAlt,
  FaStar,
  FaServicestack,
  FaClipboard,
  FaCalendar,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaUserPlus,
  FaSearch,
  FaUser,
  FaPlay,
  FaPause,
  FaBan,
  FaTimes,
  FaCheckCircle,
  FaMoneyBillWave,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaTools,
  FaChevronDown,
  FaChevronUp,
  FaCamera,
  FaFileAlt
} from 'react-icons/fa';
import { useModal } from '../../../hooks/useModal';
import Modal from '../../ui/Modal';

import CotizacionesContratista from './CotizacionesContratista';
import GananciasWidget from '../../features/finance/GananciasWidget';
import GestionPagos from './GestionPagos';
import GestionCitas from '../shared/GestionCitas';
import ImageViewer from '../../extra/ImageViewer';
import ImageUploader from '../../extra/ImageUploader';

const ContratistaDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { modalState, showError, showSuccess, showConfirm, hideModal } = useModal();

  // Estados principales
  const [contratistaData, setContratistaData] = useState(null);
  const [cotizacionesPendientes, setCotizacionesPendientes] = useState([]);
  const [citasActivas, setCitasActivas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');


  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Estados para gestión de citas (similares al técnico)
  const [showModalCotizacion, setShowModalCotizacion] = useState(false);
  const [citaParaCotizar, setCitaParaCotizar] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [citasExpandidas, setCitasExpandidas] = useState({});

  // Estado para el formulario de cotización
  const [formCotizacion, setFormCotizacion] = useState({
    manoDeObra: '',
    descripcionTrabajo: '',

    materiales: [],
    imagenesCotizacion: []
  });

  // Validación de sesión y rol
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'contratista' && session?.user?.userType !== 'contratista') {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchContratistaData();
    }
  }, [session]);

  useEffect(() => {
    if (contratistaData?._id) {
      fetchCotizacionesPendientes();
      fetchCitasActivas();

    }
  }, [contratistaData]);

  const fetchContratistaData = async () => {
    try {
      const response = await fetch('/api/contratistas');
      if (response.ok) {
        const data = await response.json();
        const contratista = data.find(c => c.user?.email === session?.user?.email || c.email === session?.user?.email);
        if (contratista) {
          setContratistaData(contratista);
        }
      }
    } catch (error) {
      console.error('Error fetching contratista data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCotizacionesPendientes = async () => {
    try {
      if (!contratistaData?._id) return;

      // Buscar cotizaciones en estado pendiente o pendiente_aprobacion
      const response = await fetch(`/api/cotizaciones?contratistaId=${contratistaData._id}`);
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo las que están pendientes o pendientes de aprobación
        const pendientes = data.filter(cot =>
          cot.estado === 'pendiente' || cot.estado === 'pendiente_aprobacion'
        );
        setCotizacionesPendientes(pendientes);
      }
    } catch (error) {
      console.error('Error fetching cotizaciones pendientes:', error);
    }
  };

  // Contar específicamente las pendientes de aprobación
  const cotizacionesPendientesAprobacion = cotizacionesPendientes.filter(
    cot => cot.estado === 'pendiente_aprobacion'
  ).length;

  const fetchCitasActivas = async () => {
    try {
      if (!contratistaData?._id) return;

      // Buscar citas activas: solicitada, atendida, cotizada, aceptada, en_progreso
      const response = await fetch(
        `/api/citas?contratistaId=${contratistaData._id}&estado=solicitada,atendida,cotizada,verificando_pago,aceptada,en_progreso`
      ); if (response.ok) {
        const data = await response.json();
        setCitasActivas(data);
      }
    } catch (error) {
      console.error('Error fetching citas activas:', error);
    }
  };



  // Funciones para gestión de citas (similar al técnico)
  const toggleCitaExpandida = (citaId, e) => {
    e?.stopPropagation();
    setCitasExpandidas(prev => ({
      ...prev,
      [citaId]: !prev[citaId]
    }));
  };

  const aceptarCita = async (citaId) => {
    try {
      setLoadingAction(`aceptar-${citaId}`);

      const response = await fetch(`/api/citas/${citaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'atendida',
          comentario: 'Contratista aceptó la cita y está evaluando para cotizar'
        })
      });

      if (response.ok) {
        fetchCitasActivas();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al aceptar cita');
      }
    } catch (error) {
      console.error('Error aceptando cita:', error);
      showError('Error al aceptar cita');
    } finally {
      setLoadingAction(null);
    }
  };

  const abrirModalCotizacion = (cita) => {
    setCitaParaCotizar(cita);
    setFormCotizacion({
      manoDeObra: '',
      descripcionTrabajo: '',

      materiales: [],
      imagenesCotizacion: []
    });
    setShowModalCotizacion(true);
  };

  const cerrarModalCotizacion = () => {
    setShowModalCotizacion(false);
    setCitaParaCotizar(null);
    setFormCotizacion({
      manoDeObra: '',
      descripcionTrabajo: '',

      materiales: [],
      imagenesCotizacion: []
    });
  };

  const agregarMaterial = () => {
    setFormCotizacion(prev => ({
      ...prev,
      materiales: [...prev.materiales, { nombre: '', cantidad: 1, precio: 0 }]
    }));
  };

  const actualizarMaterial = (index, campo, valor) => {
    setFormCotizacion(prev => ({
      ...prev,
      materiales: prev.materiales.map((m, i) =>
        i === index ? { ...m, [campo]: valor } : m
      )
    }));
  };

  const eliminarMaterial = (index) => {
    setFormCotizacion(prev => ({
      ...prev,
      materiales: prev.materiales.filter((_, i) => i !== index)
    }));
  };

  const enviarCotizacion = async () => {
    if (!citaParaCotizar || !contratistaData) return;

    // Validaciones
    if (!formCotizacion.manoDeObra || parseFloat(formCotizacion.manoDeObra) <= 0) {
      showError('La mano de obra debe ser mayor a 0');
      return;
    }



    if (!formCotizacion.descripcionTrabajo || formCotizacion.descripcionTrabajo.trim() === '') {
      showError('Debes proporcionar una descripción del trabajo');
      return;
    }

    if (formCotizacion.imagenesCotizacion.length === 0) {
      showError('Debes subir al menos una imagen para crear la cotización');
      return;
    }

    try {
      setLoadingAction('cotizacion');

      // Subir imágenes a Cloudinary primero
      const formData = new FormData();
      formCotizacion.imagenesCotizacion.forEach((file, index) => {
        formData.append(`imagen_${index}`, file);
      });

      const uploadResponse = await fetch('/api/upload/cotizacion-images', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir las imágenes');
      }

      const uploadData = await uploadResponse.json();
      const imagenesUrls = uploadData.urls;

      // Formatear materiales
      const materialesFormateados = formCotizacion.materiales.map(material => ({
        nombre: material.nombre,
        cantidad: parseFloat(material.cantidad) || 1,
        precio: parseFloat(material.precio) || 0,
        total: (parseFloat(material.cantidad) || 1) * (parseFloat(material.precio) || 0)
      }));

      const response = await fetch('/api/cotizaciones/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citaId: citaParaCotizar._id,
          contratistaId: contratistaData._id,

          manoDeObra: parseFloat(formCotizacion.manoDeObra),
          materiales: materialesFormateados,
          descripcion: formCotizacion.descripcionTrabajo,
          horasEstimadas: 0,
          metodoPago: 'efectivo',
          garantia: '',
          observaciones: '',

          imagenesCotizacion: imagenesUrls
        })
      });

      if (response.ok) {
        const data = await response.json();
        cerrarModalCotizacion();
        fetchCitasActivas();
        fetchCotizacionesPendientes();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al crear cotización');
      }
    } catch (error) {
      console.error('Error creando cotización:', error);
      showError('Error al crear cotización');
    } finally {
      setLoadingAction(null);
    }
  };

  // Mostrar loader mientras carga la sesión
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si no hay sesión o el rol no es correcto, no mostrar nada (el useEffect redirigirá)
  if (!session || (session?.user?.role !== 'contratista' && session?.user?.userType !== 'contratista')) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-4 sm:mb-6">
          <nav className="flex overflow-x-auto border-b border-gray-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${activeTab === 'dashboard'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <FaServicestack className="inline mr-1 sm:mr-2" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('pagos')}
              className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${activeTab === 'pagos'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <FaUser className="inline mr-1 sm:mr-2" />
              Info. Bancaria
            </button>
            <button
              onClick={() => setActiveTab('cotizaciones')}
              className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${activeTab === 'cotizaciones'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <FaClipboard className="inline mr-1 sm:mr-2" />
              Cotizaciones ({cotizacionesPendientes.length})
              {cotizacionesPendientesAprobacion > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold animate-pulse">
                  {cotizacionesPendientesAprobacion}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('citas')}
              className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${activeTab === 'citas'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <FaCalendar className="inline mr-1 sm:mr-2" />
              Citas Activas ({citasActivas.length})
            </button>
          </nav>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Alerta de cotizaciones pendientes de aprobación */}
            {cotizacionesPendientesAprobacion > 0 && (
              <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-orange-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-900">
                      ¡Atención! {cotizacionesPendientesAprobacion} Cotización{cotizacionesPendientesAprobacion > 1 ? 'es' : ''} Requiere{cotizacionesPendientesAprobacion > 1 ? 'n' : ''} Tu Aprobación
                    </h3>
                    <p className="text-sm text-orange-700 mt-1">
                      Tus técnicos han creado cotizaciones que necesitan tu revisión antes de enviarlas al cliente.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('cotizaciones')}
                    className="flex-shrink-0 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Revisar Ahora
                  </button>
                </div>
              </div>
            )}

            {/* Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar / Stats Column */}
              <div className="lg:col-span-1 space-y-6">
                {/* Ganancias Compact Widget */}
                <div className="h-64">
                  <GananciasWidget
                    userId={contratistaData?._id}
                    role="contratista"
                    refreshTrigger={refreshTrigger}
                    compact={true}
                  />
                </div>



                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <FaClipboard className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Cotizaciones</p>
                      <p className="text-2xl font-bold text-gray-900">{cotizacionesPendientes.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <FaCalendar className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Citas Activas</p>
                      <p className="text-2xl font-bold text-gray-900">{citasActivas.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Column */}
              <div className="lg:col-span-3 space-y-6">
                <GananciasWidget
                  userId={contratistaData?._id}
                  role="contratista"
                  refreshTrigger={refreshTrigger}
                  compact={false}
                />
              </div>
            </div>
          </div>
        )}


        {/* Información Bancaria Tab */}
        {activeTab === 'pagos' && (
          <GestionPagos contratistaId={contratistaData?._id} />
        )}

        {/* Cotizaciones Tab */}
        {activeTab === 'cotizaciones' && (
          <CotizacionesContratista contratistaId={contratistaData?._id} />
        )}

        {/* Citas Tab */}
        {activeTab === 'citas' && (
          <div className="space-y-4">
            <GestionCitas
              role="contratista"
              userId={contratistaData?._id}
              onSuccess={() => {
                fetchCitasActivas();
                setRefreshTrigger(prev => prev + 1);
              }}
              onError={showError}
            />
          </div>
        )}


        {/* Modal de Cotización */}
        {
          showModalCotizacion && citaParaCotizar && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">
                    Crear Cotización - {citaParaCotizar.servicio?.nombre}
                  </h3>
                  <button
                    onClick={cerrarModalCotizacion}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Mano de Obra */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mano de Obra ($) *
                    </label>
                    <input
                      type="number"
                      value={formCotizacion.manoDeObra}
                      onChange={(e) => setFormCotizacion(prev => ({ ...prev, manoDeObra: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Descripción del Trabajo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción del Trabajo *
                    </label>
                    <textarea
                      value={formCotizacion.descripcionTrabajo}
                      onChange={(e) => setFormCotizacion(prev => ({ ...prev, descripcionTrabajo: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                      placeholder="Describe el trabajo a realizar..."
                    />
                  </div>

                  {/* Fechas */}


                  {/* Materiales */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Materiales
                      </label>
                      <button
                        type="button"
                        onClick={agregarMaterial}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <FaPlus size={12} />
                        Agregar Material
                      </button>
                    </div>

                    {formCotizacion.materiales.map((material, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Nombre"
                          value={material.nombre}
                          onChange={(e) => actualizarMaterial(index, 'nombre', e.target.value)}
                          className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Cant."
                          value={material.cantidad}
                          onChange={(e) => actualizarMaterial(index, 'cantidad', e.target.value)}
                          className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          min="1"
                        />
                        <input
                          type="number"
                          placeholder="Precio"
                          value={material.precio}
                          onChange={(e) => actualizarMaterial(index, 'precio', e.target.value)}
                          className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                        <button
                          type="button"
                          onClick={() => eliminarMaterial(index)}
                          className="col-span-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                        >
                          <FaTrash className="mx-auto" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Imágenes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imágenes de Evaluación *
                    </label>
                    <ImageUploader
                      onImagesSelected={(files) => setFormCotizacion(prev => ({ ...prev, imagenesCotizacion: files }))}
                      maxImages={5}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Sube fotos del área de trabajo, daños o situación actual (mínimo 1, máximo 5)
                    </p>
                  </div>

                  {/* Total estimado */}
                  {(formCotizacion.manoDeObra || formCotizacion.materiales.length > 0) && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Total Estimado (con IVA 16%):</p>
                      <p className="text-2xl font-bold text-blue-700">
                        ${(() => {
                          const manoDeObra = parseFloat(formCotizacion.manoDeObra) || 0;
                          const materiales = formCotizacion.materiales.reduce((sum, m) =>
                            sum + ((parseFloat(m.cantidad) || 0) * (parseFloat(m.precio) || 0)), 0
                          );
                          const subtotal = manoDeObra + materiales;
                          const iva = Math.round((subtotal * 16) / 100);
                          return (subtotal + iva).toLocaleString();
                        })()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t">
                  <button
                    onClick={cerrarModalCotizacion}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviarCotizacion}
                    disabled={loadingAction === 'cotizacion'}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingAction === 'cotizacion' ? 'Enviando...' : 'Enviar Cotización'}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Modal Component */}
        <Modal {...modalState} onClose={hideModal} />

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-1 gap-4 mt-6">
          <button
            onClick={() => window.location.href = '/api/auth/signout'}
            className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
          >
            <FaSignOutAlt />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div >
    </div >
  );
};

export default ContratistaDashboard;
