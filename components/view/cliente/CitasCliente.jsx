'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { FaStar, FaCar, FaChevronDown, FaChevronUp, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaTools, FaFileAlt } from 'react-icons/fa';
import { useModal } from '../../../hooks/useModal';
import Modal from '../../ui/Modal';
import PaymentModal from '../../ui/PaymentModal';
import CotizacionCliente from './CotizacionCliente';
import ImageViewer from '../../extra/ImageViewer';

export default function CitasCliente() {
  const { data: session } = useSession();
  const { modalState, showSuccess, showError, showConfirm, hideModal } = useModal();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('activas');
  const [loadingAction, setLoadingAction] = useState(false);

  // Estado para el drawer expandible
  const [citasExpandidas, setCitasExpandidas] = useState({});

  // Estado para PaymentModal
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    cotizacion: null
  });

  const [modalCalificacion, setModalCalificacion] = useState({
    isOpen: false,
    cita: null,
    puntajeContratista: 0,
    comentarioContratista: '',
    enviando: false
  });

  useEffect(() => {
    if (session?.user) {
      cargarCitas();
    }
  }, [session, filtroEstado]);

  // Detectar citas completadas o canceladas sin calificar y abrir modal automáticamente
  useEffect(() => {
    if (!citas || citas.length === 0 || modalCalificacion.isOpen) return;

    // Buscar la primera cita que requiere calificación:
    // 1. Completadas (servicio terminado exitosamente)
    // 2. Canceladas por rechazo de cotización (el técnico/contratista ya trabajó evaluando)
    const citaSinCalificar = citas.find(cita => {
      // Verificar si ya fue calificada
      if (cita.calificadoContratista) return false;

      // Citas completadas siempre deben calificarse
      if (cita.estado === 'completada') return true;

      // Citas canceladas SOLO si fue por rechazo de cotización
      // (no cancelación directa del cliente)
      if (cita.estado === 'cancelada') {
        // Verificar el motivo de cancelación
        const motivoCancelacion = cita.motivoCancelacion?.toLowerCase() || '';
        const esRechazo = motivoCancelacion.includes('cotización rechazada') ||
          motivoCancelacion.includes('cotizacion rechazada');
        return esRechazo;
      }

      return false;
    });

    // Solo abrir si hay una cita sin calificar Y no es la misma que ya está en el modal
    if (citaSinCalificar && citaSinCalificar._id !== modalCalificacion.cita?._id) {
      setModalCalificacion({
        isOpen: true,
        cita: citaSinCalificar,
        puntajeContratista: 0,
        comentarioContratista: '',
        enviando: false
      });
    }
  }, [citas?.length, modalCalificacion.isOpen, modalCalificacion.cita?._id]);

  const cargarCitas = async () => {
    try {
      setLoading(true);
      const clienteId = session.user.id || session.user._id;
      const params = new URLSearchParams({ clienteId });
      if (filtroEstado !== 'todas' && filtroEstado !== 'activas') {
        params.append('estado', filtroEstado);
      }

      const response = await fetch(`/api/citas?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCitas(data);
      }
    } catch (error) {
      console.error('Error al cargar citas:', error);
    } finally {
      setLoading(false);
    }
  };

  const aceptarCotizacion = async (cotizacionId) => {
    // Buscar la cotización completa
    const cita = citas.find(c => c.cotizaciones?.some(cot => cot._id === cotizacionId));
    const cotizacion = cita?.cotizaciones?.find(cot => cot._id === cotizacionId);

    if (!cotizacion) {
      showError('No se pudo encontrar la cotización');
      return;
    }

    // Abrir PaymentModal
    setPaymentModal({
      isOpen: true,
      cotizacion: {
        ...cotizacion,
        _id: cotizacionId,
        servicio: cita.servicio,
        contratista: cotizacion.contratista || cita.contratista
      }
    });
  };

  const handlePaymentSuccess = async (paymentResult) => {
    setLoadingAction(true);
    try {
      // Primero aceptar la cotización con la información de pago
      const response = await fetch(`/api/cotizaciones/${paymentModal.cotizacion._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'aceptada',
          paymentInfo: paymentResult
        })
      });

      if (response.ok) {
        setPaymentModal({ isOpen: false, cotizacion: null });

        cargarCitas();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al confirmar el pago');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error de conexión al confirmar el pago');
    } finally {
      setLoadingAction(false);
    }
  };

  const rechazarCotizacion = async (cotizacionId, motivo) => {
    setLoadingAction(true);
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'rechazada', motivoRechazo: motivo })
      });

      if (response.ok) {
        cargarCitas();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al rechazar la cotización');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error de conexión al rechazar la cotización');
    } finally {
      setLoadingAction(false);
    }
  };

  const cancelarCita = async (citaId) => {
    showConfirm(
      '¿Está seguro de que desea cancelar esta cita? Esta acción no se puede deshacer.',
      async () => {
        try {
          const response = await fetch('/api/citas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              citaId,
              nuevoEstado: 'cancelada',
              comentario: 'Cancelada por el cliente',
              userId: session.user.id || session.user._id,
              userRole: 'cliente'
            }),
          });

          if (response.ok) {
            cargarCitas();
            hideModal();
          } else {
            const error = await response.json();
            showError(error.error || 'Error desconocido al cancelar la cita');
          }
        } catch (error) {
          console.error('Error:', error);
          showError('Error de conexión al cancelar la cita');
        }
      },
      'Confirmar Cancelación'
    );
  };

  const enviarCalificacion = async () => {
    if (modalCalificacion.puntajeContratista === 0) {
      showError('Por favor califica al contratista antes de enviar');
      return;
    }

    setModalCalificacion(prev => ({ ...prev, enviando: true }));

    try {
      const response = await fetch(`/api/citas/${modalCalificacion.cita._id}/calificar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puntajeContratista: modalCalificacion.puntajeContratista,
          comentarioContratista: (modalCalificacion.comentarioContratista || '').trim(),
          clienteId: session.user.id || session.user._id
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Actualizar inmediatamente la cita en el estado local con los datos devueltos por la API
        setCitas(prevCitas =>
          prevCitas.map(c =>
            c._id === modalCalificacion.cita._id
              ? { ...c, calificadoContratista: true }
              : c
          )
        );

        // Cerrar modal actual
        setModalCalificacion({
          isOpen: false,
          cita: null,
          puntajeContratista: 0,
          comentarioContratista: '',
          enviando: false
        });

        // El useEffect detectará automáticamente si hay otra cita pendiente
      } else {
        const error = await response.json();
        showError(error.error || 'Error desconocido al enviar la calificación');
        setModalCalificacion(prev => ({ ...prev, enviando: false }));
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error de conexión al enviar la calificación');
      setModalCalificacion(prev => ({ ...prev, enviando: false }));
    }
  };

  const renderEstrellas = (puntaje, estaSeleccionando = false, onSelect = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((estrella) => (
          <FaStar
            key={estrella}
            className={`${estrella <= puntaje ? 'text-yellow-400' : 'text-gray-300'} ${estaSeleccionando ? 'cursor-pointer hover:text-yellow-300' : ''
              } text-xl`}
            onClick={() => estaSeleccionando && onSelect && onSelect(estrella)}
          />
        ))}
      </div>
    );
  };

  // Función para toggle del drawer (sin scroll)
  const toggleCitaExpandida = (citaId, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setCitasExpandidas(prev => ({
      ...prev,
      [citaId]: !prev[citaId]
    }));
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'solicitada': 'bg-gradient-to-r from-warning/60 to-warning/40 text-warning border-2 border-warning/50',
      'atendida': 'bg-gradient-to-r from-secondary/60 to-secondary/40 text-secondary border-2 border-secondary/50',
      'cotizada': 'bg-gradient-to-r from-primary/60 to-primary/40 text-primary border-2 border-primary/50',
      'aceptada': 'bg-gradient-to-r from-success/60 to-success/40 text-success border-2 border-success/50',
      'en_progreso': 'bg-gradient-to-r from-accent/60 to-accent/40 text-accent border-2 border-accent/50',
      'completada': 'bg-gradient-to-r from-success/60 to-success/40 text-success border-2 border-success/50',
      'cancelada': 'bg-gradient-to-r from-error/60 to-error/40 text-error border-2 border-error/50'
    };
    return colores[estado] || 'bg-gradient-to-r from-neutral/60 to-neutral/40 text-muted border-2 border-neutral/50';
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      'solicitada': 'Solicitada',
      'atendida': 'En Evaluación',
      'cotizada': 'Cotizada',
      'aceptada': 'Aceptada',
      'en_progreso': 'En Progreso',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    return labels[estado] || estado;
  };

  const citasFiltradas = citas.filter(cita => {
    if (filtroEstado === 'todas') return true;
    if (filtroEstado === 'activas') return !['completada', 'cancelada', 'no_presentado'].includes(cita.estado);
    return cita.estado === filtroEstado;
  });

  if (loading) return <div className="text-center py-8 px-4">Cargando citas...</div>;
  if (!session) return <div className="text-center py-8 px-4">Debe iniciar sesión para ver sus citas.</div>;

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6">
      <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-secondary">Mis Citas</h2>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="p-2 border border-neutral rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="activas">Citas Activas</option>
          <option value="todas">Todas</option>
          <option value="solicitada">Solicitadas</option>
          <option value="atendida">En Evaluación</option>
          <option value="cotizada">Cotizadas</option>
          <option value="aceptada">Aceptadas</option>
          <option value="en_progreso">En Progreso</option>
          <option value="completada">Completadas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>

      {citasFiltradas.length === 0 ? (
        <div className="text-center py-12 px-4 bg-neutral/10 rounded-lg">
          <p className="text-sm sm:text-base text-muted">
            No hay citas {filtroEstado === 'todas' ? '' : filtroEstado === 'activas' ? 'activas' : `en estado "${getEstadoLabel(filtroEstado)}"`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {citasFiltradas.map((cita) => {
            const isExpanded = citasExpandidas[cita._id] || false;

            return (
              <div key={cita._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden">
                {/* Header compacto */}
                <div className="bg-slate-100 px-3 py-2.5 sm:px-4 sm:py-3 border-b-2 border-slate-200">
                  <div className="flex justify-between items-start gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <FaTools className="text-slate-600 flex-shrink-0 text-sm sm:text-base" />
                        <h3 className="text-secondary font-bold text-sm sm:text-base truncate">
                          {cita.servicio?.nombre}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground font-bold truncate bg-white px-2 py-1 rounded inline-block">
                        {cita.contratista?.nombre || cita.contratista?.nombreEmpresa}
                      </p>
                      <p className="text-xs text-muted hidden sm:block mt-1">Cita #{cita._id.slice(-8)}</p>
                    </div>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 whitespace-nowrap ${getEstadoColor(cita.estado)}`}>
                      {getEstadoLabel(cita.estado)}
                    </span>
                  </div>
                </div>

                {/* Contenido compacto */}
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {/* Problema y fecha en compacto */}
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded-lg p-2.5 sm:p-3 border border-slate-200">
                      <p className="text-xs text-slate-600 font-bold mb-1">Problema:</p>
                      <p className="text-sm text-foreground font-bold line-clamp-2">{cita.descripcionProblema}</p>
                    </div>

                    {cita.fechaProgramada && (
                      <div className="bg-amber-50 rounded-lg p-2.5 sm:p-3 border border-amber-200">
                        <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <FaCalendarAlt className="text-amber-600 flex-shrink-0" />
                            <span className="font-bold text-foreground">{new Date(cita.fechaProgramada).toLocaleDateString('es-MX')}</span>
                          </div>
                          {cita.horaInicio && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <FaClock className="text-amber-600 flex-shrink-0" />
                              <span className="font-bold text-foreground">{cita.horaInicio}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botón Ver Más Detalles (Drawer) */}
                  <button
                    type="button"
                    onClick={(e) => toggleCitaExpandida(cita._id, e)}
                    className="w-full bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-700 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-bold border border-slate-200"
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

                  {/* DRAWER CON TODA LA INFORMACIÓN */}
                  {isExpanded && (
                    <div className="pt-3 sm:pt-4 space-y-2.5 sm:space-y-3 animate-fadeIn">
                      {/* Ubicación */}
                      {cita.ubicacion?.direccion && (
                        <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
                          <div className="flex items-start gap-2">
                            <FaMapMarkerAlt className="text-blue-600 flex-shrink-0 mt-0.5 text-sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-blue-700 mb-1">Ubicación del servicio</p>
                              <p className="text-xs sm:text-sm text-foreground break-words">{cita.ubicacion.direccion}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Imágenes del problema */}
                      {cita.imagenesProblema && cita.imagenesProblema.length > 0 && (
                        <div className="bg-red-100 rounded-lg p-2.5 sm:p-3 border border-red-200">
                          <ImageViewer
                            images={cita.imagenesProblema}
                            title="Fotos del problema que reportaste"
                            showPreview={true}
                          />
                        </div>
                      )}

                      {/* Cotizaciones */}
                      {cita.cotizaciones && cita.cotizaciones.length > 0 && (
                        <div className="space-y-2 sm:space-y-3 bg-indigo-50 rounded-lg p-2.5 sm:p-3 border border-indigo-200">
                          <p className="text-xs font-semibold text-indigo-600 flex items-center gap-2">
                            <FaFileAlt className="flex-shrink-0" />
                            Cotizaciones ({cita.cotizaciones.length})
                          </p>
                          <div className="space-y-2">
                            {cita.cotizaciones.map((cotizacion, index) => (
                              <CotizacionCliente
                                key={cotizacion._id || index}
                                cotizacion={cotizacion}
                                cita={cita}
                                onAceptar={aceptarCotizacion}
                                onRechazar={rechazarCotizacion}
                                isLoading={loadingAction}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mensaje si no hay cotizaciones */}
                      {(!cita.cotizaciones || cita.cotizaciones.length === 0) && ['solicitada', 'atendida'].includes(cita.estado) && (
                        <div className="bg-amber-50 p-2.5 sm:p-3 rounded-lg border border-amber-200">
                          <p className="text-xs text-amber-700 text-center font-bold">
                            {cita.estado === 'solicitada' ? 'Esperando que el técnico acepte la cita' : 'El técnico está evaluando para crear la cotización'}
                          </p>
                        </div>
                      )}



                      {/* Trabajo realizado */}
                      {cita.estado === 'completada' && cita.trabajoRealizado && (
                        <div className="bg-emerald-50 rounded-lg p-2.5 sm:p-3 border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 mb-1">Trabajo realizado:</p>
                          <p className="text-xs sm:text-sm text-foreground">{cita.trabajoRealizado}</p>
                        </div>
                      )}

                      {/* Imágenes de evaluación/cotización */}
                      {cita.imagenesCotizacion && cita.imagenesCotizacion.length > 0 && (
                        <div className="bg-indigo-50 rounded-lg p-2.5 sm:p-3 border border-indigo-200">
                          <ImageViewer
                            images={cita.imagenesCotizacion}
                            title="Fotos de evaluación del técnico"
                            showPreview={true}
                          />
                        </div>
                      )}

                      {/* Fotos antes del trabajo */}
                      {cita.fotosAntes && cita.fotosAntes.length > 0 && (
                        <div className="bg-teal-50 rounded-lg p-2.5 sm:p-3 border border-teal-200">
                          <ImageViewer
                            images={cita.fotosAntes}
                            title="Fotos antes del trabajo"
                            showPreview={true}
                          />
                        </div>
                      )}

                      {/* Fotos después del trabajo */}
                      {cita.fotosDespues && cita.fotosDespues.length > 0 && (
                        <div className="bg-emerald-50 rounded-lg p-2.5 sm:p-3 border border-emerald-200">
                          <ImageViewer
                            images={cita.fotosDespues}
                            title="Fotos después del trabajo terminado"
                            showPreview={true}
                          />
                        </div>
                      )}

                      {/* Calificación */}
                      {cita.estado === 'completada' && cita.calificacion && (
                        <div className="bg-amber-50 rounded-lg p-2.5 sm:p-3 border border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-amber-600">Mi Calificación:</p>
                            <div className="flex gap-0.5 sm:gap-1">
                              {renderEstrellas(cita.calificacion.puntaje)}
                            </div>
                          </div>
                          {cita.calificacion.comentario && (
                            <p className="text-xs text-foreground italic mt-2">"{cita.calificacion.comentario}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botones de acción FUERA del drawer */}
                  <div className="mt-3 sm:mt-4 flex flex-col xs:flex-row gap-2">
                    {['solicitada', 'atendida', 'cotizada'].includes(cita.estado) && (
                      <button
                        onClick={() => cancelarCita(cita._id)}
                        className="bg-error text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-error/90 transition-colors text-xs sm:text-sm font-medium"
                      >
                        Cancelar Cita
                      </button>
                    )}
                    {cita.estado === 'completada' && !cita.calificacion && (
                      <button
                        onClick={() => setModalCalificacion({
                          isOpen: true,
                          cita,
                          puntajeContratista: 0,
                          comentarioContratista: '',
                          enviando: false
                        })}
                        className="bg-warning text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-warning/90 transition-colors text-xs sm:text-sm font-medium"
                      >
                        Calificar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal calificación */}
      <Modal
        isOpen={modalCalificacion.isOpen}
        onClose={() => {
          // No permitir cerrar el modal si hay citas pendientes de calificar
          const citasPendientes = citas.filter(cita => {
            // Verificar si ya fue calificada
            if (cita.calificadoContratista) return false;

            // Citas completadas siempre deben calificarse
            if (cita.estado === 'completada') return true;

            // Citas canceladas SOLO si fue por rechazo de cotización
            if (cita.estado === 'cancelada') {
              const motivoCancelacion = cita.motivoCancelacion?.toLowerCase() || '';
              const esRechazo = motivoCancelacion.includes('cotización rechazada') ||
                motivoCancelacion.includes('cotizacion rechazada');
              return esRechazo;
            }

            return false;
          });

          if (citasPendientes.length > 0) {
            showError('Debes calificar todos los servicios completados antes de continuar. Es obligatorio para garantizar la calidad del servicio.');
          } else {
            setModalCalificacion({
              isOpen: false,
              cita: null,
              puntajeContratista: 0,
              comentarioContratista: '',
              enviando: false
            });
          }
        }}
        title="Calificar Servicio - Obligatorio"
      >
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-warning/25 to-warning/15 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaStar className="h-5 w-5 text-warning" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Importante:</strong> Tu calificación es obligatoria y nos ayuda a mejorar nuestros servicios y garantizar la calidad del trabajo realizado.
                </p>
                {modalCalificacion.cita && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-yellow-800">
                      <strong>Servicio:</strong> {modalCalificacion.cita.servicio?.nombre || 'N/A'}
                    </p>
                    {modalCalificacion.cita.fechaProgramada && (
                      <p className="text-xs text-yellow-800">
                        <strong>Fecha:</strong> {new Date(modalCalificacion.cita.fechaProgramada).toLocaleDateString('es-MX', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                    {modalCalificacion.cita.descripcionProblema && (
                      <p className="text-xs text-yellow-800">
                        <strong>Problema:</strong> {modalCalificacion.cita.descripcionProblema}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Calificación del Contratista */}
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Califica al Contratista</h3>
                <p className="text-xs text-gray-600">
                  {modalCalificacion.cita?.contratista?.nombre || 'Contratista'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm mb-2 font-semibold">Calificación:</p>
                {renderEstrellas(modalCalificacion.puntajeContratista, true, (puntaje) =>
                  setModalCalificacion(prev => ({ ...prev, puntajeContratista: puntaje }))
                )}
                {modalCalificacion.puntajeContratista === 0 && (
                  <p className="text-xs text-red-500 mt-1">Selecciona al menos una estrella</p>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Comentarios (opcional):</label>
                <textarea
                  value={modalCalificacion.comentarioContratista}
                  onChange={(e) => setModalCalificacion(prev => ({ ...prev, comentarioContratista: e.target.value }))}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows="2"
                  placeholder="¿Cómo fue el servicio general?"
                />
              </div>
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex flex-col gap-3">
            <button
              onClick={enviarCalificacion}
              disabled={modalCalificacion.enviando || modalCalificacion.puntajeContratista === 0}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {modalCalificacion.enviando ? 'Enviando calificaciones...' : 'Enviar Calificaciones'}
            </button>
            <p className="text-xs text-gray-500 text-center">
              Debes calificar tanto al técnico como al contratista para continuar
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal sistema */}
      {modalState.isOpen && (
        <Modal isOpen={modalState.isOpen} onClose={hideModal} title={modalState.title}>
          <div className="space-y-4">
            <p>{modalState.message}</p>
            {modalState.showCancel ? (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (modalState.onConfirm) modalState.onConfirm();
                    hideModal();
                  }}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-medium"
                >
                  {modalState.confirmText || 'Confirmar'}
                </button>
                <button
                  onClick={hideModal}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 font-medium"
                >
                  {modalState.cancelText || 'Cancelar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (modalState.onConfirm) modalState.onConfirm();
                  hideModal();
                }}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
              >
                Cerrar
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, cotizacion: null })}
        cotizacion={paymentModal.cotizacion}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
