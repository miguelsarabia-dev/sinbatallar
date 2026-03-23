// components/ui/PaymentModal.jsx
'use client';

import { useState } from 'react';
import { FaCreditCard, FaUniversity, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';

export default function PaymentModal({
  isOpen,
  onClose,
  cotizacion,
  onPaymentSuccess
}) {
  const [paymentData, setPaymentData] = useState({
    numeroOperacion: '',
    concepto: '',
    referencia: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !cotizacion) return null;

  // Función helper para calcular el precio total con IVA
  const calcularPrecioTotal = () => {
    const manoDeObra = parseFloat(cotizacion.manoDeObra) || 0;
    const costoMateriales = cotizacion.materiales?.reduce((total, material) => {
      const cantidad = parseFloat(material.cantidad) || 0;
      const totalMaterial = material.total || ((material.precioPorUnidad || material.precio || 0) * cantidad);
      return total + totalMaterial;
    }, 0) || 0;

    const subtotal = manoDeObra + costoMateriales;

    // IVA obligatorio sobre TODA la facturación (mano de obra + materiales)
    const iva = cotizacion.iva || Math.round((subtotal * (cotizacion.porcentajeIva || 16)) / 100);

    return cotizacion.total || (subtotal + iva);
  };

  const calcularSubtotal = () => {
    const manoDeObra = parseFloat(cotizacion.manoDeObra) || 0;
    const costoMateriales = cotizacion.materiales?.reduce((total, material) => {
      const cantidad = parseFloat(material.cantidad) || 0;
      const totalMaterial = material.total || ((material.precioPorUnidad || material.precio || 0) * cantidad);
      return total + totalMaterial;
    }, 0) || 0;

    return manoDeObra + costoMateriales;
  };

  const calcularIVA = () => {
    const subtotal = calcularSubtotal();
    return cotizacion.iva || Math.round((subtotal * (cotizacion.porcentajeIva || 16)) / 100);
  };

  const precioTotal = calcularPrecioTotal();

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Validar que todos los campos estén llenos
    if (!paymentData.numeroOperacion.trim() || !paymentData.concepto.trim() || !paymentData.referencia.trim()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setIsProcessing(true);

    try {
      // Simular procesamiento de pago SPEI
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Aquí iría la integración con pasarela de pago real
      const paymentResult = {
        success: true,
        transactionId: paymentData.numeroOperacion || `SPEI${Date.now()}`,
        amount: precioTotal,
        method: 'transferencia_spei',
        numeroOperacion: paymentData.numeroOperacion,
        concepto: paymentData.concepto,
        referencia: paymentData.referencia,
        timestamp: new Date().toISOString()
      };

      onPaymentSuccess(paymentResult);

    } catch (error) {
      console.error('Error procesando pago:', error);
      alert('Error procesando el pago. Por favor intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold">Confirmar Pago</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl"
              disabled={isProcessing}
            >
              ✕
            </button>
          </div>        {/* Resumen de la cotización */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
            <h3 className="font-semibold mb-2 text-sm sm:text-base">{cotizacion.servicio?.nombre}</h3>
            <div className="text-xs sm:text-sm text-gray-600 space-y-1 mb-3">
              <p>Contratista: {cotizacion.contratista?.nombre}</p>
              <p>Descripción: {cotizacion.descripcionTrabajo}</p>

            </div>

            {/* Desglose de precios */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Mano de obra:</span>
                <span className="font-medium">${(parseFloat(cotizacion.manoDeObra) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Materiales:</span>
                <span className="font-medium">${(cotizacion.materiales?.reduce((total, material) => {
                  const cantidad = parseFloat(material.cantidad) || 0;
                  const totalMaterial = material.total || ((material.precioPorUnidad || material.precio || 0) * cantidad);
                  return total + totalMaterial;
                }, 0) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm border-t pt-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${calcularSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600 pr-2">IVA {cotizacion.porcentajeIva || 16}%:</span>
                <span className="font-medium">${calcularIVA().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-lg font-bold text-green-600 border-t pt-2">
                <span>Total a pagar:</span>
                <span>${calcularPrecioTotal().toLocaleString()}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handlePaymentSubmit}>
            {/* Método de pago único */}
            <div className="mb-4 sm:mb-6">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center gap-2">
                  <FaUniversity className="text-blue-600 text-base sm:text-lg" />
                  <span className="text-base sm:text-lg font-semibold text-blue-800">Transferencia SPEI</span>
                </div>
                <p className="text-xs sm:text-sm text-blue-600 text-center mt-1">
                  Realiza tu pago por transferencia bancaria
                </p>
              </div>
            </div>

            {/* Formulario de transferencia SPEI */}
            <div className="space-y-4">
              {/* Información bancaria del contratista */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-md">
                <p className="text-xs sm:text-sm text-gray-700 mb-2 font-semibold">
                  Datos para la transferencia:
                </p>
                {cotizacion.contratista?.informacionPago ? (
                  <div className="text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="font-medium">Contratista:</span>
                      <span>{cotizacion.contratista.nombre}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="font-medium">Banco:</span>
                      <span>{cotizacion.contratista.informacionPago.banco}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="font-medium">CLABE:</span>
                      <span className="font-mono">{cotizacion.contratista.informacionPago.clabe}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="font-medium">Cuenta:</span>
                      <span className="font-mono">{cotizacion.contratista.informacionPago.numeroCuenta}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="font-medium">Beneficiario:</span>
                      <span>{cotizacion.contratista.informacionPago.nombreTitular}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between border-t pt-1 sm:pt-2">
                      <span className="font-medium">Monto:</span>
                      <span className="font-bold text-green-600">${calcularPrecioTotal().toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                    <div className="flex items-center text-yellow-800">
                      <FaInfoCircle className="mr-2" />
                      <span className="font-medium">Información bancaria no disponible</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      El contratista aún no ha configurado su información bancaria.
                      Contacta directamente con {cotizacion.contratista?.nombre || 'el contratista'} para coordinar el pago.
                    </p>
                    <div className="mt-2 text-sm">
                      <p><strong>Contratista:</strong> {cotizacion.contratista?.nombre}</p>
                      <p><strong>Email:</strong> {cotizacion.contratista?.email}</p>
                      <p><strong>Teléfono:</strong> {cotizacion.contratista?.telefono}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulario de datos de transferencia - Solo si hay información bancaria */}
              {cotizacion.contratista?.informacionPago && (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700">
                      Número de Operación <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="numeroOperacion"
                      value={paymentData.numeroOperacion}
                      onChange={handleInputChange}
                      placeholder="Ej: 1234567890"
                      className="w-full p-2 sm:p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Número de referencia u operación de tu banco
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700">
                      Concepto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="concepto"
                      value={paymentData.concepto}
                      onChange={handleInputChange}
                      placeholder="Ej: Pago de servicio de contratista"
                      className="w-full p-2 sm:p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Descripción del pago que aparecerá en tu estado de cuenta
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700">
                      Referencia <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="referencia"
                      value={paymentData.referencia}
                      onChange={handleInputChange}
                      placeholder="Ej: COTIZ-2024-001"
                      className="w-full p-2 sm:p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Referencia adicional para identificar el pago
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-3 sm:p-4 rounded-md border border-yellow-200">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <FaInfoCircle className="text-yellow-600 text-xs sm:text-sm mt-0.5 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-yellow-800">
                        <strong>Nota:</strong> Una vez confirmado el pago, nuestro equipo verificará la transferencia y procederá con la programación del servicio.
                      </p>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isProcessing}
                      className="w-full sm:flex-1 px-4 py-2 sm:py-3 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm sm:text-base order-2 sm:order-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing || !cotizacion.contratista?.informacionPago}
                      className="w-full sm:flex-1 px-4 py-2 sm:py-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-sm sm:text-base font-medium order-1 sm:order-2"
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span className="text-xs sm:text-sm">Procesando...</span>
                        </div>
                      ) : (
                        cotizacion.contratista?.informacionPago ? 'Confirmar Transferencia' : 'Información bancaria no disponible'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
