import React from 'react';
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaTimesCircle,
  FaTimes 
} from 'react-icons/fa';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  children, // Agregar children
  type = 'info', 
  onConfirm = null,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  showCancel = false,
  showFooter = true // Controlar si mostrar el footer
}) => {
  if (!isOpen) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <FaCheckCircle className="text-green-500 text-4xl" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          buttonColor: 'bg-green-600 hover:bg-green-700:bg-green-600'
        };
      case 'error':
        return {
          icon: <FaTimesCircle className="text-red-500 text-4xl" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          buttonColor: 'bg-red-600 hover:bg-red-700:bg-red-600'
        };
      case 'warning':
        return {
          icon: <FaExclamationTriangle className="text-yellow-500 text-4xl" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700:bg-yellow-600'
        };
      default:
        return {
          icon: <FaInfoCircle className="text-blue-500 text-4xl" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          buttonColor: 'bg-blue-600 hover:bg-blue-700:bg-blue-600'
        };
    }
  };

  const typeConfig = getTypeConfig();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 transform transition-all duration-300 ${children ? 'max-h-[90vh] overflow-y-auto' : ''} ${typeConfig.bgColor} ${typeConfig.borderColor} border-2`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {!children && typeConfig.icon}
            <h3 className="text-lg font-semibold text-gray-900">
              {title || 'Información'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600:text-gray-300 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children ? children : (
            <p className="text-gray-700 text-base leading-relaxed">
              {message}
            </p>
          )}
        </div>

        {/* Footer */}
        {showFooter && !children && (
          <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
            {showCancel && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${typeConfig.buttonColor}`}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
