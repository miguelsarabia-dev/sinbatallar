'use client';

import { useState, useEffect, createContext, useContext } from 'react';

const NotificationContext = createContext();

/**
 * Provider para mostrar notificaciones toast en la aplicación
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      ...notification,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remover después de 5 segundos (a menos que sea persistente)
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </NotificationContext.Provider>
  );
}

/**
 * Hook para usar notificaciones toast
 */
export function useNotificationToast() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationToast debe usarse dentro de NotificationProvider');
  }
  return context;
}

/**
 * Contenedor de notificaciones toast
 */
function NotificationContainer({ notifications, onRemove }) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
}

/**
 * Componente individual de notificación toast
 */
function NotificationToast({ notification, onRemove }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animar entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onRemove, 300); // Esperar animación de salida
  };

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500 border-green-600';
      case 'error':
        return 'bg-red-500 border-red-600';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600';
      case 'info':
        return 'bg-blue-500 border-blue-600';
      default:
        return 'bg-gray-800 border-gray-700';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full shadow-lg rounded-lg border-l-4
        ${getTypeStyles()}
        text-white p-4
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 text-lg">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          {notification.title && (
            <h4 className="font-semibold text-sm mb-1">
              {notification.title}
            </h4>
          )}
          
          <p className="text-sm opacity-90">
            {notification.message || notification.body}
          </p>
          
          {notification.data?.timestamp && (
            <p className="text-xs opacity-70 mt-1">
              {new Date(notification.data.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-2 text-white/70 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      
      {notification.actions && (
        <div className="mt-3 flex space-x-2">
          {notification.actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.handler();
                handleClose();
              }}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}