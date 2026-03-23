'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para detectar estado de conectividad de red
 * Específicamente para mostrar pantalla offline cuando no hay internet
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState(Date.now());

  /**
   * Probar conectividad real haciendo una petición pequeña
   */
  const testRealConnection = useCallback(async () => {
    try {
      const startTime = Date.now();
      
      // Hacer una petición pequeña a un recurso que sabemos que existe
      const response = await fetch('/manifest.json?t=' + Date.now(), {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Considerar conexión lenta si tarda más de 3 segundos
      setIsSlowConnection(responseTime > 3000);
      
      return response.ok;
    } catch (error) {
      console.log('[NetworkStatus] Test de conectividad falló:', error.message);
      return false;
    }
  }, []);

  /**
   * Actualizar estado de conectividad
   */
  const updateOnlineStatus = useCallback(async () => {
    const browserOnline = navigator.onLine;
    
    if (!browserOnline) {
      // Si el navegador dice que está offline, confiar en eso
      setIsOnline(false);
      setIsSlowConnection(false);
      return;
    }

    // Si el navegador dice que está online, verificar con una petición real
    const realConnection = await testRealConnection();
    setIsOnline(realConnection);
    
    if (realConnection) {
      setLastOnlineTime(Date.now());
    }
  }, [testRealConnection]);

  /**
   * Handlers para eventos de conectividad
   */
  const handleOnline = useCallback(() => {
    console.log('[NetworkStatus] Navegador reporta: ONLINE');
    updateOnlineStatus();
  }, [updateOnlineStatus]);

  const handleOffline = useCallback(() => {
    console.log('[NetworkStatus] Navegador reporta: OFFLINE');
    setIsOnline(false);
    setIsSlowConnection(false);
  }, []);

  // Configurar listeners de eventos de red
  useEffect(() => {
    // Estado inicial basado en navigator.onLine
    setIsOnline(navigator.onLine);
    
    // Probar conectividad real al iniciar
    updateOnlineStatus();

    // Event listeners para cambios de conectividad
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, updateOnlineStatus]);

  // Verificar conectividad periódicamente cuando está online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      updateOnlineStatus();
    }, 30000); // Verificar cada 30 segundos

    return () => clearInterval(interval);
  }, [isOnline, updateOnlineStatus]);

  // Verificar conectividad cuando la ventana vuelve a tener foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && navigator.onLine) {
        updateOnlineStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [updateOnlineStatus]);

  return {
    isOnline,
    isOffline: !isOnline,
    isSlowConnection,
    lastOnlineTime,
    // Función manual para refrescar estado
    refreshConnectionStatus: updateOnlineStatus
  };
}