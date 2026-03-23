'use client';

import { useState, useEffect, useCallback } from 'react';

export const useNotifications = () => {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Verificar si las notificaciones están soportadas
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Solicitar permisos de notificación
   */
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('[Notifications] Las notificaciones no están soportadas en este navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('[Notifications] Error al solicitar permisos:', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Mostrar notificación local (sin service worker)
   */
  const showLocalNotification = useCallback((title, options = {}) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('[Notifications] Permisos no concedidos o no soportado');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon512_rounded.png',
        badge: '/icon512_maskable.png',
        vibrate: [200, 100, 200],
        ...options
      });

      // Cerrar automáticamente después de 5 segundos
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error('[Notifications] Error al mostrar notificación local:', error);
      return null;
    }
  }, [isSupported, permission]);

  /**
   * Mostrar notificación a través del Service Worker (para PWA)
   */
  const showPushNotification = useCallback(async (title, options = {}) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('[Notifications] Permisos no concedidos o no soportado');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[Notifications] Service Worker no disponible');
      // Fallback a notificación local
      showLocalNotification(title, options);
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(title, {
        icon: '/icon512_rounded.png',
        badge: '/icon512_maskable.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        ...options
      });

      return true;
    } catch (error) {
      console.error('[Notifications] Error al mostrar notificación push:', error);
      // Fallback a notificación local
      showLocalNotification(title, options);
      return false;
    }
  }, [isSupported, permission, showLocalNotification]);

  /**
   * Mostrar notificación de servicio solicitado
   */
  const notifyServiceRequested = useCallback(async (serviceName, contratistaName) => {
    const title = '✅ Solicitud Recibida';
    const body = `Recibimos tu solicitud de servicio${serviceName ? ` de ${serviceName}` : ''}. ${contratistaName || 'Un contratista'} te contactará pronto.`;

    return await showPushNotification(title, {
      body,
      tag: 'service-requested',
      data: {
        type: 'service-requested',
        url: '/main/citas'
      },
      actions: [
        {
          action: 'view',
          title: 'Ver mis citas'
        }
      ]
    });
  }, [showPushNotification]);

  /**
   * Mostrar notificación de nueva cotización
   */
  const notifyNewQuote = useCallback(async (serviceName) => {
    const title = '💰 Nueva Cotización';
    const body = `Has recibido una nueva cotización${serviceName ? ` para ${serviceName}` : ''}.`;

    return await showPushNotification(title, {
      body,
      tag: 'new-quote',
      data: {
        type: 'new-quote',
        url: '/main/citas'
      }
    });
  }, [showPushNotification]);

  /**
   * Mostrar notificación de cita confirmada
   */
  const notifyCitaConfirmed = useCallback(async (fecha, hora) => {
    const title = '📅 Cita Confirmada';
    const body = `Tu cita ha sido confirmada${fecha ? ` para el ${fecha}` : ''}${hora ? ` a las ${hora}` : ''}.`;

    return await showPushNotification(title, {
      body,
      tag: 'cita-confirmed',
      data: {
        type: 'cita-confirmed',
        url: '/main/citas'
      }
    });
  }, [showPushNotification]);

  return {
    permission,
    isSupported,
    requestPermission,
    showLocalNotification,
    showPushNotification,
    notifyServiceRequested,
    notifyNewQuote,
    notifyCitaConfirmed
  };
};

export default useNotifications;
