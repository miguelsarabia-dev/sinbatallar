// components/view/contratista/CotizacionesContratista.jsx
'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaTimes, FaTrash, FaPlus, FaMoneyBillWave } from 'react-icons/fa';
import { useModal } from '../../../hooks/useModal';
import Modal from '../../ui/Modal';
import { PaymentInfoDropdown } from '../../ui';
import ImageViewer from '../../extra/ImageViewer';

export default function CotizacionesContratista({ contratistaId }) {
  const { modalState, showSuccess, showError, showConfirm, hideModal } = useModal();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [respondiendo, setRespondiendo] = useState(null);

  // Estado para el formulario de respuesta
  const [respuestaForm, setRespuestaForm] = useState({
    precio: '',
    descripcionTrabajo: '',

    manoDeObra: '',
    materiales: []
  });

  useEffect(() => {
    cargarCotizaciones();
  }, [contratistaId, filtroEstado]);

  const cargarCotizaciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ contratistaId });
      if (filtroEstado !== 'todas') {
        params.append('estado', filtroEstado);
      }

      const response = await fetch(`/api/cotizaciones?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCotizaciones(data);
      }
    } catch (error) {
      console.error('Error al cargar cotizaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const iniciarRespuesta = (cotizacion) => {
    setRespondiendo(cotizacion._id);
    // Pre-llenar con valores base si están disponibles
    setRespuestaForm({
      precio: '',
      descripcionTrabajo: '',

      manoDeObra: '',
      materiales: [],
      incluirIva: false
    });
  };

  const cancelarRespuesta = () => {
    setRespondiendo(null);
    setRespuestaForm({
      precio: '',
      descripcionTrabajo: '',

      manoDeObra: '',
      materiales: []
    });
  };

  const agregarMaterial = () => {
    setRespuestaForm(prev => ({
      ...prev,
      materiales: [...prev.materiales, { nombre: '', cantidad: 1, precio: 0 }]
    }));
  };

  const actualizarMaterial = (index, campo, valor) => {
    setRespuestaForm(prev => ({
      ...prev,
      materiales: prev.materiales.map((material, i) =>
        i === index ? { ...material, [campo]: valor } : material
      )
    }));
  };

  const eliminarMaterial = (index) => {
    setRespuestaForm(prev => ({
      ...prev,
      materiales: prev.materiales.filter((_, i) => i !== index)
    }));
  };

  const calcularPrecioTotal = () => {
    const manoDeObra = parseFloat(respuestaForm.manoDeObra) || 0;
    const costoMateriales = respuestaForm.materiales.reduce((total, material) => {
      const cantidad = parseFloat(material.cantidad) || 0;
      const totalMaterial = material.total || ((material.precioPorUnidad || material.precio || 0) * cantidad);
      return total + totalMaterial;
    }, 0);
    const subtotal = manoDeObra + costoMateriales;

    // IVA obligatorio sobre TODA la facturación (mano de obra + materiales)
    const iva = Math.round((subtotal * 16) / 100);

    return subtotal + iva;
  };

  const calcularSubtotal = () => {
    const manoDeObra = parseFloat(respuestaForm.manoDeObra) || 0;
    const costoMateriales = respuestaForm.materiales.reduce((total, material) => {
      const cantidad = parseFloat(material.cantidad) || 0;
      const totalMaterial = material.total || ((material.precioPorUnidad || material.precio || 0) * cantidad);
      return total + totalMaterial;
    }, 0);
    return manoDeObra + costoMateriales;
  };

  const calcularIVA = () => {
    const subtotal = calcularSubtotal();
    return Math.round((subtotal * 16) / 100);
  };

  const aprobarCotizacion = async (cotizacionId) => {
    const confirmed = await showConfirm(
      '¿Aprobar y enviar cotización?',
      'La cotización será aprobada y enviada al cliente para su revisión.',
      'Aprobar'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/aprobar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contratistaId
        }),
      });

      if (response.ok) {
        cargarCotizaciones();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al aprobar cotización');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error de conexión al aprobar cotización');
    }
  };

  const enviarRespuesta = async (cotizacionId) => {
    try {
      // Validar que los campos requeridos estén llenos
      if (!respuestaForm.manoDeObra || parseFloat(respuestaForm.manoDeObra) <= 0) {
        showError('La mano de obra debe ser mayor a 0');
        return;
      }



      const precioTotal = calcularPrecioTotal();

      // Enviar SOLO los datos necesarios (sin horasEstimadas)
      const dataToSend = {
        descripcionTrabajo: respuestaForm.descripcionTrabajo,

        manoDeObra: respuestaForm.manoDeObra,
        materiales: respuestaForm.materiales,
        contratistaId
      };

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/responder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        cancelarRespuesta();
        cargarCotizaciones();
      } else {
        const error = await response.json();
        showError(error.error || 'Error desconocido al enviar la cotización');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error de conexión al enviar la cotización');
    }
  };

  const marcarTrabajoCompletado = async (cotizacionId) => {
    showConfirm(
      '¿Está seguro de que el trabajo ha sido completado? Esta acción marcará el servicio como finalizado.',
      async () => {
        try {
          const response = await fetch(`/api/cotizaciones/${cotizacionId}/completar`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contratistaId }),
          });

          if (response.ok) {
            cargarCotizaciones();
          } else {
            const error = await response.json();
            showError(error.error || 'Error desconocido al completar el trabajo');
          }
        } catch (error) {
          console.error('Error:', error);
          showError('Error de conexión al marcar el trabajo como completado');
        }
      },
      'Confirmar Finalización'
    );
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'pendiente_aprobacion': 'bg-orange-100 text-orange-800',
      'enviada': 'bg-blue-100 text-blue-800',
      'aceptada': 'bg-green-100 text-green-800',
      'rechazada': 'bg-red-100 text-red-800',
      'expirada': 'bg-gray-100 text-gray-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      'pendiente': 'Pendiente',
      'pendiente_aprobacion': 'Pendiente de Aprobación',
      'enviada': 'Enviada',
      'aceptada': 'Aceptada',
      'rechazada': 'Rechazada',
      'expirada': 'Expirada'
    };
    return textos[estado] || estado;
  };

  const cotizacionesFiltradas = cotizaciones.filter(cotizacion =>
    filtroEstado === 'todas' || cotizacion.estado === filtroEstado
  );

  // Separar cotizaciones pendientes de aprobación para destacarlas
  const cotizacionesPendientesAprobacion = cotizaciones.filter(cot =>
    cot.estado === 'pendiente_aprobacion'
  );

  if (loading) {
    return <div className="text-center py-8">Cargando cotizaciones...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Alerta de cotizaciones pendientes de aprobación */}
      {cotizacionesPendientesAprobacion.length > 0 && (
        <div className="mb-6 bg-orange-50 border-2 border-orange-400 rounded-lg p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-orange-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-orange-900">
                {cotizacionesPendientesAprobacion.length} Cotización{cotizacionesPendientesAprobacion.length > 1 ? 'es' : ''} Pendiente{cotizacionesPendientesAprobacion.length > 1 ? 's' : ''} de Tu Aprobación
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Tienes cotizaciones que requieren tu revisión y aprobación antes de enviarlas al cliente.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Solicitudes de Cotización</h2>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="w-full sm:w-auto p-2 border rounded-md"
        >
          <option value="todas">Todas</option>
          <option value="pendiente">Pendientes</option>
          <option value="pendiente_aprobacion">Pendientes de Aprobación ({cotizacionesPendientesAprobacion.length})</option>
          <option value="enviada">Enviadas</option>
          <option value="aceptada">Aceptadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="expirada">Expiradas</option>
        </select>
      </div>

      {cotizacionesFiltradas.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hay cotizaciones {filtroEstado !== 'todas' ? `en estado "${filtroEstado}"` : ''}
        </div>
      ) : (
        <div className="grid gap-6">
          {cotizacionesFiltradas.map((cotizacion) => (
            <div key={cotizacion._id} className="bg-white border rounded-lg shadow-md p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {cotizacion.cita?.servicio?.nombre || 'Servicio General'}
                  </h3>
                  <p className="text-gray-600">
                    Cliente: {cotizacion.cita?.cliente?.nombre || 'Cliente'}
                  </p>
                  <p className="text-sm text-gray-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span className="flex items-center gap-1">
                      <FaEnvelope className="text-gray-400" size={12} />
                      {cotizacion.cita?.cliente?.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaPhone className="text-gray-400" size={12} />
                      {cotizacion.cita?.cliente?.telefono}
                    </span>
                  </p>

                </div>
                <div className="flex flex-col gap-2 items-stretch sm:items-end w-full sm:w-auto">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium text-center ${getEstadoColor(cotizacion.estado)}`}>
                    {getEstadoTexto(cotizacion.estado)}
                  </span>
                  {cotizacion.estado === 'pendiente_aprobacion' && (
                    <button
                      onClick={() => aprobarCotizacion(cotizacion._id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
                    >
                      <FaCheckCircle />
                      Aprobar y Enviar
                    </button>
                  )}
                </div>
              </div>

              {/* Detalles de la solicitud */}
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Problema:</p>
                    <p className="font-medium">{cotizacion.cita?.descripcionProblema || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Detalles del servicio:</p>
                    {cotizacion.cita?.detallesServicio && Object.keys(cotizacion.cita.detallesServicio).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(cotizacion.cita.detallesServicio).map(([key, value]) => (
                          <p key={key} className="text-sm">
                            <strong>{key}:</strong> {value}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No hay detalles específicos</p>
                    )}
                  </div>
                </div>

                {cotizacion.cita?.ubicacion?.direccion && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Ubicación:</p>
                    <p className="font-medium">{cotizacion.cita?.ubicacion?.direccion}</p>
                  </div>
                )}
              </div>

              {/* Mostrar cotización enviada */}
              {cotizacion.estado !== 'pendiente' && (
                <div className="bg-blue-50 p-4 rounded-md mb-4">
                  <h4 className="font-semibold mb-3">Mi Cotización:</h4>

                  {/* Totales principales */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Subtotal:</p>
                      <p className="text-lg font-medium text-gray-900">
                        ${(() => {
                          const manoDeObra = parseFloat(cotizacion.manoDeObra) || 0;
                          const costoMateriales = cotizacion.materiales?.reduce((total, material) => {
                            // Usar el formato correcto del modelo: total o (cantidad * precioPorUnidad)
                            return total + (material.total || ((material.cantidad || 0) * (material.precioPorUnidad || material.precio || 0)));
                          }, 0) || 0;
                          return (manoDeObra + costoMateriales).toLocaleString();
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">IVA {cotizacion.porcentajeIva || 16}%:</p>
                      <p className="text-lg font-medium text-gray-900">
                        ${(() => {
                          const manoDeObra = parseFloat(cotizacion.manoDeObra) || 0;
                          const costoMateriales = cotizacion.materiales?.reduce((total, material) => {
                            // Usar el formato correcto del modelo
                            return total + (material.total || ((material.cantidad || 0) * (material.precioPorUnidad || material.precio || 0)));
                          }, 0) || 0;
                          const subtotal = manoDeObra + costoMateriales;
                          const iva = cotizacion.iva || Math.round((subtotal * (cotizacion.porcentajeIva || 16)) / 100);
                          return iva.toLocaleString();
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total:</p>
                      <p className="text-xl font-bold text-blue-600">
                        ${(() => {
                          const manoDeObra = parseFloat(cotizacion.manoDeObra) || 0;
                          const costoMateriales = cotizacion.materiales?.reduce((total, material) => {
                            // Usar el formato correcto del modelo
                            return total + (material.total || ((material.cantidad || 0) * (material.precioPorUnidad || material.precio || 0)));
                          }, 0) || 0;
                          const subtotal = manoDeObra + costoMateriales;
                          const iva = cotizacion.iva || Math.round((subtotal * (cotizacion.porcentajeIva || 16)) / 100);
                          return (subtotal + iva).toLocaleString();
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Detalles adicionales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <p className="text-sm text-gray-600">Mano de obra:</p>
                      <p className="font-medium">${cotizacion.manoDeObra?.toLocaleString()}</p>
                    </div>

                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-gray-600">Descripción del trabajo:</p>
                    <p className="font-medium">{cotizacion.descripcionTrabajo}</p>
                  </div>

                  {/* Imágenes de evaluación/cotización */}
                  {cotizacion.imagenesCotizacion && cotizacion.imagenesCotizacion.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Imágenes adjuntas:</p>
                      <div className="bg-white p-2 rounded border">
                        <ImageViewer
                          images={cotizacion.imagenesCotizacion}
                          title="Fotos de la cotización"
                          showPreview={true}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mostrar materiales si los hay */}
                  {cotizacion.materiales && cotizacion.materiales.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Materiales:</p>
                      <div className="space-y-1">
                        {cotizacion.materiales.map((material, index) => (
                          <div key={index} className="flex justify-between text-sm bg-white p-2 rounded border">
                            <span>{material.nombre} (x{material.cantidad})</span>
                            <span>${(material.total || ((material.precioPorUnidad || material.precio || 0) * (material.cantidad || 1)))?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Formulario de respuesta */}
              {respondiendo === cotizacion._id && (
                <div className="bg-green-50 p-4 rounded-md mb-4">
                  <h4 className="font-semibold mb-4">Responder Cotización:</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Mano de obra ($)</label>
                      <input
                        type="number"
                        value={respuestaForm.manoDeObra || ''}
                        onChange={(e) => setRespuestaForm(prev => ({ ...prev, manoDeObra: e.target.value }))}
                        className="w-full p-2 border rounded-md"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                  </div>



                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Descripción del trabajo</label>
                    <textarea
                      value={respuestaForm.descripcionTrabajo}
                      onChange={(e) => setRespuestaForm(prev => ({ ...prev, descripcionTrabajo: e.target.value }))}
                      className="w-full p-2 border rounded-md h-20"
                      placeholder="Describe el trabajo que realizarás..."
                      required
                    />
                  </div>

                  {/* Materiales */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">Materiales</label>
                      <button
                        type="button"
                        onClick={agregarMaterial}
                        className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors flex items-center gap-1"
                      >
                        <FaPlus size={10} />
                        Agregar material
                      </button>
                    </div>

                    {respuestaForm.materiales.map((material, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Material"
                          value={material.nombre || ''}
                          onChange={(e) => actualizarMaterial(index, 'nombre', e.target.value)}
                          className="p-2 border rounded-md"
                        />
                        <input
                          type="number"
                          placeholder="Cantidad"
                          value={material.cantidad || ''}
                          onChange={(e) => actualizarMaterial(index, 'cantidad', parseInt(e.target.value) || 0)}
                          className="p-2 border rounded-md"
                          min="1"
                        />
                        <input
                          type="number"
                          placeholder="Precio total"
                          value={material.precio || ''}
                          onChange={(e) => actualizarMaterial(index, 'precio', parseFloat(e.target.value) || 0)}
                          className="p-2 border rounded-md"
                          min="0"
                          step="0.01"
                        />
                        <button
                          type="button"
                          onClick={() => eliminarMaterial(index)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors flex items-center justify-center"
                          title="Eliminar material"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Desglose de precios calculado */}
                  <div className="mb-4 p-4 bg-white rounded border">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Mano de obra:</span>
                        <span className="font-medium">${(parseFloat(respuestaForm.manoDeObra) || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Materiales:</span>
                        <span className="font-medium">${(respuestaForm.materiales.reduce((total, material) => {
                          const cantidad = parseFloat(material.cantidad) || 0;
                          const totalMaterial = material.total || ((material.precioPorUnidad || material.precio || 0) * cantidad);
                          return total + totalMaterial;
                        }, 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-700">Subtotal:</span>
                        <span className="font-medium">${calcularSubtotal().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">IVA 16% (sobre subtotal):</span>
                        <span className="font-medium">${calcularIVA().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span className="text-blue-600">${calcularPrecioTotal().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => enviarRespuesta(cotizacion._id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                    >
                      Enviar Cotización
                    </button>
                    <button
                      onClick={cancelarRespuesta}
                      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Fechas */}
              <div className="text-xs text-gray-500 mb-4">
                <p>Solicitud: {new Date(cotizacion.createdAt).toLocaleString()}</p>
                {cotizacion.fechaExpiracion && (
                  <p>Expira: {new Date(cotizacion.fechaExpiracion).toLocaleString()}</p>
                )}
              </div>

              {/* Acciones */}
              {cotizacion.estado === 'pendiente' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => iniciarRespuesta(cotizacion)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Responder Cotización
                  </button>
                </div>
              )}

              {cotizacion.estado === 'aceptada' && (
                <div className="bg-green-100 p-3 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    {/* Verificar si la cita ya está completada o verificando pago */}
                    {cotizacion.cita && cotizacion.cita.estado === 'completada' ? (
                      <p className="text-green-800 font-medium flex items-center gap-2">
                        <FaCheckCircle className="text-green-600" size={16} />
                        Trabajo completado exitosamente
                        {cotizacion.cita.horaFin && (
                          <span className="text-sm text-green-600">
                            (Finalizado a las {cotizacion.cita.horaFin})
                          </span>
                        )}
                      </p>
                    ) : cotizacion.cita && cotizacion.cita.estado === 'verificando_pago' ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-orange-800 font-medium flex items-center gap-2">
                          <FaMoneyBillWave className="text-orange-600" size={16} />
                          Pago pendiente de verificación
                        </p>
                        <p className="text-sm text-orange-700 ml-6">
                          El cliente ha aceptado. Ve a la pestaña <strong>Citas</strong> para confirmar la recepción del pago y comenzar el trabajo.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-green-800 font-medium flex items-center gap-2">
                          <FaCheckCircle className="text-green-600" size={16} />
                          Cotización aceptada - Trabajo en progreso
                        </p>
                        <button
                          onClick={() => marcarTrabajoCompletado(cotizacion._id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                        >
                          Marcar como Completado
                        </button>
                      </>
                    )}
                  </div>

                  {/* Información de pago */}
                  {cotizacion.paymentInfo && (
                    <PaymentInfoDropdown
                      paymentInfo={cotizacion.paymentInfo}
                      className="bg-white border-green-200"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal personalizado */}
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
}
