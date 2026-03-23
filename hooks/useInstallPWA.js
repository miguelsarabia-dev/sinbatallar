'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para manejar la instalación de PWA
 * Soporta tanto Android (con beforeinstallprompt) como iOS (con instrucciones manuales)
 */
export default function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState(null); // 'ios', 'android', 'desktop', 'other'

  useEffect(() => {
    // Detectar plataforma
    const detectPlatform = () => {
      const userAgent = navigator.userAgent;
      
      if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return 'ios';
      } else if (/Android/.test(userAgent)) {
        return 'android';
      } else if (/Windows|Macintosh|Linux/.test(userAgent)) {
        return 'desktop';
      }
      return 'other';
    };

    // Detectar si la app ya está instalada (modo standalone)
    const checkIfInstalled = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
      );
    };

    const detectedPlatform = detectPlatform();
    const installed = checkIfInstalled();

    setPlatform(detectedPlatform);
    setIsInstalled(installed);

    // Si ya está instalada, no hacer nada más
    if (installed) {
      setIsInstallable(false);
      return;
    }

    // Para iOS, siempre es "instalable" (manualmente)
    if (detectedPlatform === 'ios') {
      setIsInstallable(true);
    }

    // Para Android y otros, escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Escuchar cuando la app se instale
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Muestra el prompt de instalación nativo (solo para Android/Chrome)
   */
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('No hay prompt de instalación disponible');
      return { outcome: 'unavailable' };
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
      
      return choiceResult;
    } catch (error) {
      console.error('Error al mostrar el prompt de instalación:', error);
      return { outcome: 'error', error };
    }
  }, [deferredPrompt]);

  /**
   * Verifica si el navegador es Safari (para iOS)
   */
  const isSafari = useCallback(() => {
    return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  }, []);

  /**
   * Retorna si el dispositivo es iOS
   */
  const isIOS = useCallback(() => {
    return platform === 'ios';
  }, [platform]);

  /**
   * Retorna si el dispositivo es Android
   */
  const isAndroid = useCallback(() => {
    return platform === 'android';
  }, [platform]);

  /**
   * Retorna si es desktop
   */
  const isDesktop = useCallback(() => {
    return platform === 'desktop';
  }, [platform]);

  return {
    // Estados
    isInstallable,      // Si la app puede ser instalada
    isInstalled,        // Si la app ya está instalada
    platform,           // Plataforma detectada
    canPromptInstall: !!deferredPrompt, // Si hay un prompt nativo disponible
    
    // Funciones
    promptInstall,      // Muestra el prompt de instalación
    isIOS,              // Verifica si es iOS
    isAndroid,          // Verifica si es Android
    isDesktop,          // Verifica si es desktop
    isSafari,           // Verifica si es Safari
  };
}
