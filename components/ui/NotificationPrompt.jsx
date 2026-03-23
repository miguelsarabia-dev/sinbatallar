'use client';

import { useState, useEffect } from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';
import useNotifications from '../../hooks/useNotifications';

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { permission, requestPermission, isSupported } = useNotifications();

  useEffect(() => {
    // Verificar si ya se mostró el prompt antes
    const hasSeenPrompt = localStorage.getItem('notification-prompt-seen');
    
    // Mostrar el prompt si:
    // 1. Las notificaciones están soportadas
    // 2. No se han concedido permisos
    // 3. No se ha visto el prompt antes (o se vio hace más de 7 días)
    if (isSupported && permission === 'default' && !hasSeenPrompt) {
      // Esperar 3 segundos antes de mostrar el prompt
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPrompt(false);
      localStorage.setItem('notification-prompt-seen', Date.now().toString());
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    // Guardar que se vio el prompt (volver a preguntar en 7 días)
    const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('notification-prompt-seen', sevenDaysFromNow.toString());
  };

  if (!showPrompt || dismissed || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FaBell className="text-blue-600 text-lg" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              ¡Activa las notificaciones!
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Recibe actualizaciones en tiempo real sobre tus servicios, citas y cotizaciones.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                className="flex-1 bg-blue-600 text-white text-xs font-medium px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Activar
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
}
