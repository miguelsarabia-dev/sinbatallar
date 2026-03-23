// components/ui/PaymentInfoDropdown.jsx
'use client';

import { useState } from 'react';
import { FaMoneyBillWave, FaChevronDown, FaChevronUp, FaReceipt, FaInfoCircle, FaCalendarAlt, FaHashtag } from 'react-icons/fa';

const PaymentInfoDropdown = ({ paymentInfo, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!paymentInfo || !paymentInfo.transactionId) {
    return null;
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'No especificado';
    return new Date(timestamp).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      'transferencia_spei': 'Transferencia SPEI',
      'transferencia': 'Transferencia Bancaria',
      'tarjeta': 'Tarjeta de Crédito/Débito',
      'efectivo': 'Efectivo'
    };
    return methods[method] || method;
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'text-green-600 bg-green-100',
      'pending': 'text-yellow-600 bg-yellow-100',
      'failed': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'completed': 'Completado',
      'pending': 'Pendiente',
      'failed': 'Fallido'
    };
    return labels[status] || status;
  };

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <FaReceipt className="text-blue-600 text-sm" />
          <span className="text-sm font-medium text-gray-700">Ver Detalles del Pago</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(paymentInfo.status)}`}>
            {getStatusLabel(paymentInfo.status)}
          </span>
        </div>
        {isOpen ? (
          <FaChevronUp className="text-gray-400 text-xs" />
        ) : (
          <FaChevronDown className="text-gray-400 text-xs" />
        )}
      </button>

      {/* Contenido desplegable */}
      {isOpen && (
        <div className="px-3 pb-3 border-t bg-gray-50">
          <div className="space-y-3 pt-3">
            {/* Resumen principal */}
            <div className="bg-white rounded-md p-3 border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800">Información de Pago</h4>
                <FaMoneyBillWave className="text-green-600 text-sm" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-medium text-gray-600">Método:</span>
                  <p className="text-gray-800">{getPaymentMethodLabel(paymentInfo.method)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Monto:</span>
                  <p className="text-gray-800 font-semibold">{formatAmount(paymentInfo.amount)}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium text-gray-600">Fecha de Pago:</span>
                  <p className="text-gray-800 flex items-center">
                    <FaCalendarAlt className="mr-1 text-gray-400" />
                    {formatDateTime(paymentInfo.timestamp)}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalles de SPEI (solo si existen) */}
            {(paymentInfo.numeroOperacion || paymentInfo.concepto || paymentInfo.referencia) && (
              <div className="bg-white rounded-md p-3 border">
                <h5 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <FaHashtag className="mr-1 text-blue-600" />
                  Detalles de Transferencia SPEI
                </h5>
                
                <div className="space-y-2 text-xs">
                  {paymentInfo.numeroOperacion && (
                    <div>
                      <span className="font-medium text-gray-600">Número de Operación:</span>
                      <p className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded">
                        {paymentInfo.numeroOperacion}
                      </p>
                    </div>
                  )}
                  
                  {paymentInfo.concepto && (
                    <div>
                      <span className="font-medium text-gray-600">Concepto:</span>
                      <p className="text-gray-800">{paymentInfo.concepto}</p>
                    </div>
                  )}
                  
                  {paymentInfo.referencia && (
                    <div>
                      <span className="font-medium text-gray-600">Referencia:</span>
                      <p className="text-gray-800">{paymentInfo.referencia}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ID de transacción */}
            <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
              <div className="flex items-start space-x-2">
                <FaInfoCircle className="text-blue-600 text-sm mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-medium text-blue-800">ID de Transacción:</span>
                  <p className="text-blue-700 font-mono break-all">{paymentInfo.transactionId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInfoDropdown;