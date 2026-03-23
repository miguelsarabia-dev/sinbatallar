'use client';

import { useEffect } from 'react';

export default function PWARegister() {

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Solo registrar service worker básico, SIN actualizaciones automáticas
      navigator.serviceWorker.ready.then((reg) => {
        console.log('[PWA] Service Worker registrado - actualizaciones deshabilitadas');
      }).catch((error) => {
        console.error('[PWA] Error con Service Worker:', error);
      });
    }
  }, []);

  // No mostrar nada y NO manejar actualizaciones
  return null;
}
