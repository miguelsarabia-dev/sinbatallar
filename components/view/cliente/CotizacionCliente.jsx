// components/view/cliente/CotizacionCliente.jsx
'use client';

import { useState } from 'react';
import { FaCheck, FaTimes, FaClock, FaDollarSign, FaTools, FaExclamationTriangle, FaCamera } from 'react-icons/fa';
import ImageViewer from '../../extra/ImageViewer';

export default function CotizacionCliente({ cotizacion, cita, onAceptar, onRechazar, isLoading = false }) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rejecting, setRejecting] = useState(false);

  if (!cotizacion) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaClock className="text-yellow-600 text-xl" />
          <div>
            <h3 className="font-semibold text-yellow-800">Esperando Cotización</h3>
            <p className="text-yellow-700 text-sm">El contratista está preparando tu cotización</p>
          </div>
        </div>
        <div className="animate-pulse bg-yellow-200 h-2 rounded-full"></div>
      </div>
    );
  }

  const handleAceptar = async () => {
    if (onAceptar) {
      await onAceptar(cotizacion._id);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      alert('Por favor, indica el motivo del rechazo');
      return;
    }

    setRejecting(true);
    try {
      if (onRechazar) {
        await onRechazar(cotizacion._id, motivoRechazo);
      }
    } finally {
      setRejecting(false);
      setShowRejectForm(false);
      setMotivoRechazo('');
    }
  };

  // Calcular precios con IVA obligatorio
  const precioMateriales = cotizacion.materiales?.reduce((total, material) => {
    // Usar el formato correcto del modelo
    return total + (material.total || ((material.cantidad || 0) * (material.precioPorUnidad || material.precio || 0)));
  }, 0) || 0;

  const manoDeObra = parseFloat(cotizacion.manoDeObra) || 0;
  const subtotal = manoDeObra + precioMateriales;

  // IVA obligatorio sobre TODA la facturación (mano de obra + materiales)
  const ivaAmount = Math.round((subtotal * (cotizacion.porcentajeIva || 16)) / 100);

  const precioTotal = subtotal + ivaAmount;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaDollarSign className="text-blue-600 text-xl" />
            <div>
              <h3 className="font-semibold text-blue-800">Cotización Recibida</h3>
              <p className="text-blue-700 text-sm">
                {cotizacion.contratista?.nombre || 'Contratista'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-800">
              ${precioTotal.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600">Precio Total</p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-6 space-y-6">
        {/* Descripción del trabajo */}
        {cotizacion.descripcionTrabajo && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <FaTools className="text-gray-600" />
              Trabajo a Realizar
            </h4>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
              {cotizacion.descripcionTrabajo}
            </p>
          </div>
        )}

        {/* Imágenes de evaluación/cotización */}
        {cotizacion.imagenesCotizacion && cotizacion.imagenesCotizacion.length > 0 && (
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <h4 className="font-medium text-indigo-900 mb-3 flex items-center gap-2">
              <FaCamera className="text-indigo-600" />
              Imágenes de la Cotización
            </h4>
            <ImageViewer
              images={cotizacion.imagenesCotizacion}
              title="Fotos de la cotización"
              showPreview={true}
            />
          </div>
        )}

        {/* Desglose de costos con formato de la imagen */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <FaDollarSign className="text-gray-600" />
            Desglose de Costos
          </h4>

          {/* Mano de obra */}
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">Mano de obra</span>
              <span className="font-medium text-gray-900">
                ${(cotizacion.manoDeObra || 0).toLocaleString()}
              </span>
            </div>

            {/* Materiales si existen */}
            {cotizacion.materiales && cotizacion.materiales.length > 0 && (
              <div className="border-t pt-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Materiales:</div>
                {cotizacion.materiales.map((material, index) => {
                  const cantidad = parseFloat(material.cantidad) || 0;
                  // Usar el formato correcto del modelo
                  const totalMaterial = material.total || ((material.precioPorUnidad || material.precio || 0) * cantidad);
                  return (
                    <div key={index} className="flex justify-between text-sm py-1 pl-4">
                      <span className="text-gray-600">
                        {material.nombre} (x{cantidad})
                      </span>
                      <span className="text-gray-900">
                        ${totalMaterial.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totales finales con formato de la imagen */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Subtotal:</span>
              <span className="text-lg font-medium text-gray-900">
                ${subtotal.toLocaleString()}
              </span>
            </div>

            {/* IVA obligatorio */}
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                IVA {cotizacion.porcentajeIva || 16}% (sobre subtotal):
              </span>
              <span className="font-medium text-gray-900">
                ${ivaAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xl font-bold border-t pt-3">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">
                ${precioTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


          {cotizacion.garantia && (
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="text-green-500" />
              <div>
                <span className="text-sm text-gray-600">Garantía:</span>
                <span className="ml-2 font-medium text-green-700">{cotizacion.garantia}</span>
              </div>
            </div>
          )}
        </div>

        {cotizacion.observaciones && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Observaciones</h5>
            <p className="text-blue-800 text-sm">{cotizacion.observaciones}</p>
          </div>
        )}
      </div>

      {/* Acciones */}
      {(cotizacion.estado === 'enviada' || cotizacion.estado === 'pendiente') && !showRejectForm && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleAceptar}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaCheck />
            {isLoading ? 'Procesando...' : 'Aceptar Cotización'}
          </button>

          <button
            onClick={() => setShowRejectForm(true)}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaTimes />
            Rechazar
          </button>
        </div>
      )}

      {/* Formulario de rechazo */}
      {showRejectForm && (
        <div className="px-6 py-4 bg-red-50 border-t border-red-200">
          <h5 className="font-medium text-red-900 mb-3">¿Por qué rechazas esta cotización?</h5>
          <textarea
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
            placeholder="Explica brevemente el motivo del rechazo..."
            className="w-full p-3 border border-red-300 rounded-md text-sm resize-none"
            rows={3}
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleRechazar}
              disabled={rejecting || !motivoRechazo.trim()}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setMotivoRechazo('');
              }}
              disabled={rejecting}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Estados finales */}
      {cotizacion.estado === 'aceptada' && (
        <div className="px-6 py-4 bg-green-50 border-t border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <FaCheck className="text-green-600" />
            <span className="font-medium">Cotización Aceptada</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            El técnico se dirigirá a tu ubicación para realizar el servicio.
          </p>
        </div>
      )}

      {cotizacion.estado === 'rechazada' && (
        <div className="px-6 py-4 bg-red-50 border-t border-red-200">
          <div className="flex items-center gap-2 text-red-800">
            <FaTimes className="text-red-600" />
            <span className="font-medium">Cotización Rechazada</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            Puedes solicitar una nueva cotización si lo deseas.
          </p>
        </div>
      )}
    </div>
  );
}
