"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  FaCheckCircle,
  FaMoneyBillWave,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaTools,
  FaChevronDown,
  FaChevronUp,
  FaCamera,
  FaFileAlt,
  FaUser,
  FaCalendar,
  FaTimes,
  FaPlus,
  FaTrash,
  FaEdit,
  FaPlay
} from 'react-icons/fa';
import ImageViewer from '../../extra/ImageViewer';
import ImageUploader from '../../extra/ImageUploader';
import { useModal } from '../../../hooks/useModal';
import Modal from '../../ui/Modal';

/**
 * Componente unificado para gestión de citas
 * Usado por contratistas
 */
export default function GestionCitas({
  role,
  userId,
  onSuccess, // Callback cuando se completa una acción
  onError // Callback para errores
}) {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null);
  const [citasExpandidas, setCitasExpandidas] = useState({});
  const { modalState, showConfirm, hideModal } = useModal();

  // Estados para modal de cotización
  const [showModalCotizacion, setShowModalCotizacion] = useState(false);
  const [citaParaCotizar, setCitaParaCotizar] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cotizacionAEditar, setCotizacionAEditar] = useState(null);

  const [formCotizacion, setFormCotizacion] = useState({
    manoDeObra: '',
    descripcionTrabajo: '',

    materiales: [],
    imagenesCotizacion: []
  });

  // Cargar citas
  const fetchCitas = useCallback(async () => {
    try {
      setLoading(true);
      const params = `contratistaId=${userId}&estado=solicitada,atendida,cotizada,aceptada,en_progreso,verificando_pago`;

      const response = await fetch(`/api/citas?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCitas(data);
      }
    } catch (error) {
      console.error('Error al cargar citas:', error);
      onError?.('Error al cargar citas');
    } finally {
      setLoading(false);
    }
  }, [userId, onError]);

  useEffect(() => {
    if (userId) {
      fetchCitas();
      // Actualizar cada minuto
      const interval = setInterval(fetchCitas, 60000);
      return () => clearInterval(interval);
    }
  }, [userId, fetchCitas]);

  const toggleCitaExpandida = (citaId, e) => {
    e?.stopPropagation();
    setCitasExpandidas(prev => ({
      ...prev,
      [citaId]: !prev[citaId]
    }));
  };

  const verificarPago = async (citaId) => {
    showConfirm(
      '¿Confirmas que has recibido el pago correspondiente a esta cotización?',
      async () => {
        try {
          setLoadingAction(`verificar-${citaId}`);
          hideModal();

          const response = await fetch(`/api/citas/${citaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              estado: 'aceptada'
            })
          });

          if (response.ok) {
            onSuccess?.('Pago verificado y cita aceptada exitosamente');
            await fetchCitas();
          } else {
            const error = await response.json();
            onError?.(error.error || 'Error al verificar pago');
          }
        } catch (error) {
          console.error('Error verificando pago:', error);
          onError?.('Error al verificar pago');
        } finally {
          setLoadingAction(null);
        }
      },
      'Confirmar Pago'
    );
  };

  const aceptarCita = async (citaId) => {
    try {
      setLoadingAction(`aceptar-${citaId}`);

      const response = await fetch(`/api/citas/${citaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'atendida',
          comentario: `Contratista aceptó la cita y está evaluando`
        })
      });

      if (response.ok) {
        onSuccess?.('Cita aceptada exitosamente');
        await fetchCitas();
      } else {
        const error = await response.json();
        onError?.(error.error || 'Error al aceptar cita');
      }
    } catch (error) {
      console.error('Error aceptando cita:', error);
      onError?.('Error al aceptar cita');
    } finally {
      setLoadingAction(null);
    }
  };

  // Rechazar cita
  const rechazarCita = async (citaId) => {
    showConfirm(
      '¿Estás seguro de que deseas rechazar esta cita? Esta acción no se puede deshacer.',
      async () => {
        try {
          setLoadingAction(`rechazar-${citaId}`);
          hideModal();

          const response = await fetch(`/api/citas/${citaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              estado: 'cancelada',
              motivoCancelacion: 'Rechazada por el contratista',
              comentario: 'Cita rechazada por el contratista'
            })
          });

          if (response.ok) {
            onSuccess?.('Cita rechazada exitosamente');
            await fetchCitas();
          } else {
            const error = await response.json();
            onError?.(error.error || 'Error al rechazar cita');
          }
        } catch (error) {
          console.error('Error rechazando cita:', error);
          onError?.('Error al rechazar cita');
        } finally {
          setLoadingAction(null);
        }
      },
      'Rechazar Cita'
    );
  };

  // Abrir modal para crear cotización
  const abrirModalCotizacion = (cita, cotizacionExistente = null) => {
    setCitaParaCotizar(cita);

    if (cotizacionExistente) {
      // Modo edición
      setModoEdicion(true);
      setCotizacionAEditar(cotizacionExistente);
      setFormCotizacion({
        manoDeObra: cotizacionExistente.manoDeObra || '',
        descripcionTrabajo: cotizacionExistente.descripcionTrabajo || '',

        materiales: cotizacionExistente.materiales || [],
        imagenesCotizacion: []
      });
    } else {
      // Modo creación
      setModoEdicion(false);
      setCotizacionAEditar(null);
      setFormCotizacion({
        manoDeObra: '',
        descripcionTrabajo: '',

        materiales: [],
        imagenesCotizacion: []
      });
    }

    setShowModalCotizacion(true);
  };

  const cerrarModalCotizacion = () => {
    setShowModalCotizacion(false);
    setCitaParaCotizar(null);
    setModoEdicion(false);
    setCotizacionAEditar(null);
    setFormCotizacion({
      manoDeObra: '',
      descripcionTrabajo: '',

      materiales: [],
      imagenesCotizacion: []
    });
  };

  // Funciones de materiales
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

  // Enviar o editar cotización
  const enviarCotizacion = async () => {
    if (!citaParaCotizar) return;

    // Validaciones
    if (!formCotizacion.manoDeObra || parseFloat(formCotizacion.manoDeObra) <= 0) {
      onError?.('La mano de obra debe ser mayor a 0');
      return;
    }



    if (!formCotizacion.descripcionTrabajo || formCotizacion.descripcionTrabajo.trim() === '') {
      onError?.('Debes proporcionar una descripción del trabajo');
      return;
    }

    if (!modoEdicion && formCotizacion.imagenesCotizacion.length === 0) {
      onError?.('Debes subir al menos una imagen');
      return;
    }

    try {
      setLoadingAction('cotizacion');

      // Subir imágenes a Cloudinary primero solo si hay nuevas
      let imagenesUrls = [];
      if (formCotizacion.imagenesCotizacion.length > 0) {
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
        imagenesUrls = uploadData.urls;
      }

      // Formatear materiales
      const materialesFormateados = formCotizacion.materiales.map(material => {
        const cantidad = parseFloat(material.cantidad) || 1;
        const precioPorUnidad = parseFloat(material.precio) || parseFloat(material.precioPorUnidad) || 0;
        return {
          nombre: material.nombre,
          cantidad: cantidad,
          precioPorUnidad: precioPorUnidad,
          total: cantidad * precioPorUnidad
        };
      });

      let response;

      if (modoEdicion && cotizacionAEditar) {
        // EDITAR cotización existente
        response = await fetch(`/api/cotizaciones/${cotizacionAEditar._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contratistaId: userId,
            manoDeObra: parseFloat(formCotizacion.manoDeObra),
            materiales: materialesFormateados,
            descripcionTrabajo: formCotizacion.descripcionTrabajo,

          })
        });
      } else {
        // CREAR nueva cotización
        response = await fetch('/api/cotizaciones/crear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            citaId: citaParaCotizar._id,
            contratistaId: userId,
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
      }

      if (response.ok) {
        const data = await response.json();
        onSuccess?.(data.message || (modoEdicion ? 'Cotización actualizada exitosamente' : 'Cotización creada exitosamente'));
        cerrarModalCotizacion();
        await fetchCitas();
      } else {
        const error = await response.json();
        onError?.(error.error || 'Error al procesar cotización');
      }
    } catch (error) {
      console.error('Error procesando cotización:', error);
      onError?.('Error al procesar cotización');
    } finally {
      setLoadingAction(null);
    }
  };

  // Aprobar cotización (solo contratista)
  const aprobarCotizacion = async (cotizacionId) => {
    if (role !== 'contratista') return;

    try {
      setLoadingAction(`aprobar-${cotizacionId}`);

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contratistaId: userId })
      });

      if (response.ok) {
        onSuccess?.('Cotización aprobada y enviada al cliente');
        await fetchCitas();
      } else {
        const error = await response.json();
        onError?.(error.error || 'Error al aprobar cotización');
      }
    } catch (error) {
      console.error('Error aprobando cotización:', error);
      onError?.('Error al aprobar cotización');
    } finally {
      setLoadingAction(null);
    }
  };

  // Iniciar trabajo (solo contratista)
  const iniciarTrabajo = async (cotizacionId) => {
    if (role !== 'contratista') return;

    try {
      setLoadingAction(`iniciar-${cotizacionId}`);

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/iniciar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contratistaId: userId })
      });

      if (response.ok) {
        onSuccess?.('Trabajo iniciado exitosamente');
        await fetchCitas();
      } else {
        const error = await response.json();
        onError?.(error.error || error.details || 'Error al iniciar trabajo');
      }
    } catch (error) {
      console.error('Error iniciando trabajo:', error);
      onError?.('Error al iniciar trabajo');
    } finally {
      setLoadingAction(null);
    }
  };

  // Completar trabajo (solo contratista)
  const completarTrabajo = async (cotizacionId) => {
    if (role !== 'contratista') return;

    try {
      setLoadingAction(`completar-${cotizacionId}`);

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/completar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contratistaId: userId })
      });

      if (response.ok) {
        onSuccess?.('Trabajo completado exitosamente');
        await fetchCitas();
      } else {
        const error = await response.json();
        onError?.(error.error || error.details || 'Error al completar trabajo');
      }
    } catch (error) {
      console.error('Error completando trabajo:', error);
      onError?.('Error al completar trabajo');
    } finally {
      setLoadingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (citas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <FaCalendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay citas activas</h3>
        <p className="text-gray-500">Las citas aparecerán aquí cuando sean asignadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {citas.map((cita) => {
        const isExpanded = citasExpandidas[cita._id] || false;
        const tieneCotizacion = cita.cotizaciones && cita.cotizaciones.length > 0;
        const cotizacionActiva = cita.cotizacionAceptada || cita.cotizaciones?.[0];

        const puedeAceptar = cita.estado === 'solicitada';
        const puedeCrearCotizacion = cita.estado === 'atendida' && !tieneCotizacion;
        const puedeEditarCotizacion = cotizacionActiva &&
          (cotizacionActiva.estado === 'pendiente' ||
            cotizacionActiva.estado === 'pendiente_aprobacion' ||
            cotizacionActiva.estado === 'enviada') &&
          cotizacionActiva.estado !== 'aceptada';
        const puedeAprobar = false;
        const puedeIniciarTrabajo = role === 'contratista' &&
          cita.estado === 'aceptada' &&
          cotizacionActiva?.estado === 'aceptada';
        const puedeCompletar = role === 'contratista' &&
          cita.estado === 'en_progreso';

        return (
          <div key={cita._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-secondary/50 to-secondary/35 px-4 py-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FaTools className="text-primary flex-shrink-0" />
                    <h3 className="text-secondary font-bold text-base truncate">
                      {cita.servicio?.nombre || 'Servicio'}
                    </h3>
                  </div>

                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${cita.estado === 'solicitada' ? 'bg-yellow-100 text-yellow-800' :
                  cita.estado === 'atendida' ? 'bg-blue-100 text-blue-800' :
                    cita.estado === 'cotizada' ? 'bg-purple-100 text-purple-800' :
                      cita.estado === 'verificando_pago' ? 'bg-orange-100 text-orange-800' :
                        cita.estado === 'aceptada' ? 'bg-green-100 text-green-800' :
                          cita.estado === 'en_progreso' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                  }`}>
                  {cita.estado?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-3">
              {/* Cliente */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FaUser className="text-slate-600 flex-shrink-0 text-sm" />
                    <span className="text-secondary font-bold text-sm truncate">
                      {cita.cliente?.nombre || 'No especificado'}
                    </span>
                  </div>
                  {cita.cliente?.telefono && (
                    <a
                      href={`tel:${cita.cliente.telefono}`}
                      className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-medium flex-shrink-0"
                    >
                      <FaPhone />
                      <span>Llamar</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Fecha */}
              {cita.fechaProgramada && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FaCalendar className="text-amber-600 flex-shrink-0" />
                      <span className="font-bold text-foreground">
                        {new Date(cita.fechaProgramada).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    {cita.horaInicio && (
                      <div className="flex items-center gap-2">
                        <FaClock className="text-amber-600 flex-shrink-0" />
                        <span className="font-bold text-foreground">{cita.horaInicio}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cotización si existe */}
              {tieneCotizacion && cotizacionActiva && (
                <div className={`rounded-lg p-3 border ${cotizacionActiva.estado === 'aceptada'
                  ? 'bg-emerald-50 border-emerald-200'
                  : cotizacionActiva.estado === 'pendiente_aprobacion'
                    ? 'bg-orange-50 border-orange-200'
                    : cotizacionActiva.estado === 'enviada'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaMoneyBillWave className={`${cotizacionActiva.estado === 'aceptada' ? 'text-emerald-600' :
                        cotizacionActiva.estado === 'pendiente_aprobacion' ? 'text-orange-600' :
                          cotizacionActiva.estado === 'enviada' ? 'text-blue-600' :
                            'text-amber-600'
                        } flex-shrink-0 text-sm`} />
                      <div>
                        <p className={`text-xs font-medium ${cotizacionActiva.estado === 'aceptada' ? 'text-emerald-700' :
                          cotizacionActiva.estado === 'pendiente_aprobacion' ? 'text-orange-700' :
                            cotizacionActiva.estado === 'enviada' ? 'text-blue-700' :
                              'text-amber-700'
                          }`}>
                          {cotizacionActiva.estado === 'aceptada' ? 'Aprobada por Cliente' :
                            cotizacionActiva.estado === 'pendiente_aprobacion' ? 'Pendiente de Aprobación' :
                              cotizacionActiva.estado === 'enviada' ? 'Enviada al Cliente' :
                                'Estado de Cotización'}
                        </p>
                        <p className={`text-lg font-bold ${cotizacionActiva.estado === 'aceptada' ? 'text-emerald-700' :
                          cotizacionActiva.estado === 'pendiente_aprobacion' ? 'text-orange-700' :
                            cotizacionActiva.estado === 'enviada' ? 'text-blue-700' :
                              'text-amber-700'
                          }`}>
                          ${cotizacionActiva.total || cotizacionActiva.precio || 0}
                        </p>
                        {cotizacionActiva.creadoPor && (
                          <p className="text-xs text-slate-600 mt-1">
                            Creada por: Contratista
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón Ver Detalles */}
              <button
                type="button"
                onClick={(e) => toggleCitaExpandida(cita._id, e)}
                className="w-full bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-700 py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold border border-slate-200"
              >
                {isExpanded ? (
                  <>
                    <FaChevronUp className="flex-shrink-0" />
                    <span>Ocultar Detalles</span>
                  </>
                ) : (
                  <>
                    <FaChevronDown className="flex-shrink-0" />
                    <span>Ver Detalles</span>
                  </>
                )}
              </button>

              {/* Drawer con detalles */}
              {isExpanded && (
                <div className="pt-3 space-y-3 animate-fadeIn">
                  {/* Descripción del problema */}
                  {cita.descripcionProblema && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-slate-600 font-medium mb-2 flex items-center gap-2">
                        <FaFileAlt className="flex-shrink-0" />
                        <span>Descripción del problema</span>
                      </p>
                      <p className="text-sm text-foreground break-words">
                        {cita.descripcionProblema}
                      </p>
                    </div>
                  )}

                  {/* Ubicación */}
                  {cita.ubicacion && (cita.ubicacion.calle || cita.ubicacion.coordenadas?.lat) && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-start gap-2">
                        <FaMapMarkerAlt className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-blue-700 mb-2">Dirección del servicio</p>
                          <p className="text-sm text-foreground break-words">
                            {[cita.ubicacion.calle, cita.ubicacion.numeroCasa, cita.ubicacion.colonia, cita.ubicacion.municipio, cita.ubicacion.estado, cita.ubicacion.codigoPostal].filter(Boolean).join(', ')}
                          </p>
                          {cita.ubicacion.coordenadas?.lat && cita.ubicacion.coordenadas?.lng && (
                            <button
                              onClick={() => window.open(`https://www.google.com/maps?q=${cita.ubicacion.coordenadas.lat},${cita.ubicacion.coordenadas.lng}`, '_blank')}
                              className="mt-2 w-full bg-blue-50 text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-100 transition-all flex items-center justify-center gap-2 text-xs font-medium border border-blue-200"
                            >
                              <FaMapMarkerAlt />
                              <span>Abrir en Google Maps</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Imágenes del problema */}
                  {cita.imagenesProblema && cita.imagenesProblema.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <p className="text-xs text-red-600 font-medium mb-2 flex items-center gap-2">
                        <FaCamera className="flex-shrink-0" />
                        <span>Fotos del problema reportado</span>
                      </p>
                      <ImageViewer images={cita.imagenesProblema} title="Fotos del problema" showPreview={true} />
                    </div>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-col gap-2 pt-2">
                {puedeAceptar && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => aceptarCita(cita._id)}
                      disabled={loadingAction === `aceptar-${cita._id}` || loadingAction === `rechazar-${cita._id}`}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                    >
                      <FaCheckCircle />
                      {loadingAction === `aceptar-${cita._id}` ? 'Aceptando...' : 'Aceptar'}
                    </button>
                    <button
                      onClick={() => rechazarCita(cita._id)}
                      disabled={loadingAction === `rechazar-${cita._id}` || loadingAction === `aceptar-${cita._id}`}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                    >
                      <FaTimes />
                      {loadingAction === `rechazar-${cita._id}` ? 'Rechazando...' : 'Rechazar'}
                    </button>
                  </div>
                )}

                {/* Verificar Pago - Nuevo botón para estado verificando_pago */}
                {cita.estado === 'verificando_pago' && (
                  <button
                    onClick={() => verificarPago(cita._id)}
                    disabled={loadingAction === `verificar-${cita._id}`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                  >
                    <FaMoneyBillWave />
                    {loadingAction === `verificar-${cita._id}` ? 'Verificando...' : 'Confirmar Pago Recibido'}
                  </button>
                )}

                {puedeCrearCotizacion && (
                  <button
                    onClick={() => abrirModalCotizacion(cita)}
                    disabled={loadingAction === 'cotizacion'}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                  >
                    <FaMoneyBillWave />
                    {loadingAction === 'cotizacion' ? 'Creando...' : 'Crear Cotización'}
                  </button>
                )}

                {puedeEditarCotizacion && (
                  <button
                    onClick={() => abrirModalCotizacion(cita, cotizacionActiva)}
                    disabled={loadingAction === 'cotizacion'}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                  >
                    <FaEdit />
                    {loadingAction === 'cotizacion' ? 'Editando...' : 'Editar Cotización'}
                  </button>
                )}

                {puedeAprobar && (
                  <button
                    onClick={() => aprobarCotizacion(cotizacionActiva._id)}
                    disabled={loadingAction === `aprobar-${cotizacionActiva._id}`}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 animate-pulse"
                  >
                    <FaCheckCircle />
                    {loadingAction === `aprobar-${cotizacionActiva._id}` ? 'Aprobando...' : 'Aprobar y Enviar al Cliente'}
                  </button>
                )}

                {puedeIniciarTrabajo && (
                  <button
                    onClick={() => iniciarTrabajo(cotizacionActiva._id)}
                    disabled={loadingAction === `iniciar-${cotizacionActiva._id}`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                  >
                    <FaPlay />
                    {loadingAction === `iniciar-${cotizacionActiva._id}` ? 'Iniciando...' : 'Iniciar Trabajo'}
                  </button>
                )}

                {puedeCompletar && (
                  <button
                    onClick={() => completarTrabajo(cotizacionActiva._id)}
                    disabled={loadingAction === `completar-${cotizacionActiva._id}`}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                  >
                    <FaCheckCircle />
                    {loadingAction === `completar-${cotizacionActiva._id}` ? 'Completando...' : 'Marcar como Completado'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Modal de Cotización */}
      {showModalCotizacion && citaParaCotizar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {modoEdicion ? 'Editar' : 'Crear'} Cotización - {citaParaCotizar.servicio?.nombre}
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
                      value={material.precio || material.precioPorUnidad || 0}
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

              {/* Imágenes - solo en modo creación */}
              {!modoEdicion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imágenes de Evaluación *
                  </label>
                  <ImageUploader
                    images={formCotizacion.imagenesCotizacion}
                    onChange={(files) => setFormCotizacion(prev => ({ ...prev, imagenesCotizacion: files }))}
                    maxImages={5}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sube fotos del área de trabajo (mínimo 1, máximo 5)
                  </p>
                </div>
              )}

              {/* Total estimado */}
              {(formCotizacion.manoDeObra || formCotizacion.materiales.length > 0) && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Total Estimado (con IVA 16%):</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ${(() => {
                      const manoDeObra = parseFloat(formCotizacion.manoDeObra) || 0;
                      const materiales = formCotizacion.materiales.reduce((sum, m) =>
                        sum + ((parseFloat(m.cantidad) || 0) * (parseFloat(m.precio) || m.precioPorUnidad || 0)), 0
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
                {loadingAction === 'cotizacion' ? 'Procesando...' : (modoEdicion ? 'Guardar Cambios' : 'Enviar Cotización')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Genérico */}
      <Modal
        {...modalState}
        onClose={hideModal}
      />
    </div>
  );
}
