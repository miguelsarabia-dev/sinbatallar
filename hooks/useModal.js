import { useState } from 'react';

export const useModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    showCancel: false
  });

  const showModal = ({
    title,
    message,
    type = 'info',
    onConfirm = null,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    showCancel = false
  }) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText,
      showCancel
    });
  };

  const hideModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  // Funciones de conveniencia para tipos específicos
  const showSuccess = (message, title = 'Operación exitosa', onConfirm = null) => {
    showModal({
      title,
      message,
      type: 'success',
      onConfirm
    });
  };

  const showError = (message, title = 'Error', onConfirm = null) => {
    showModal({
      title,
      message,
      type: 'error',
      onConfirm
    });
  };

  const showWarning = (message, title = 'Advertencia', onConfirm = null) => {
    showModal({
      title,
      message,
      type: 'warning',
      onConfirm
    });
  };

  const showInfo = (message, title = 'Información', onConfirm = null) => {
    showModal({
      title,
      message,
      type: 'info',
      onConfirm
    });
  };

  const showConfirm = (messageOrOptions, onConfirm, title = 'Confirmación') => {
    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      // Uso avanzado: pasar un objeto con opciones
      showModal({
        type: 'warning',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        showCancel: true,
        ...messageOrOptions,
        isOpen: true
      });
    } else {
      // Uso simple: pasar argumentos individuales
      showModal({
        title,
        message: messageOrOptions,
        type: 'warning',
        onConfirm,
        showCancel: true,
        confirmText: 'Confirmar',
        isOpen: true
      });
    }
  };

  return {
    modalState,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm
  };
};
