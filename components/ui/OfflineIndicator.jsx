'use client';

import { useState, useEffect } from 'react';
import { FaWifi, FaExclamationTriangle, FaRedo, FaSignal } from 'react-icons/fa';
import { MdSignalWifiOff, MdRefresh } from 'react-icons/md';
import useNetworkStatus from '../../hooks/useNetworkStatus';

export default function OfflineIndicator() {
  const { isOffline, isSlowConnection, refreshConnectionStatus } = useNetworkStatus();
  const [showOfflineScreen, setShowOfflineScreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mostrar pantalla offline con un pequeño delay para evitar flickers
  useEffect(() => {
    if (isOffline) {
      const timer = setTimeout(() => {
        setShowOfflineScreen(true);
      }, 1000); // 1 segundo de delay

      return () => clearTimeout(timer);
    } else {
      setShowOfflineScreen(false);
    }
  }, [isOffline]);

  const handleRetry = async () => {
    setIsRefreshing(true);
    try {
      await refreshConnectionStatus();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1500); // Mostrar spinner por al menos 1.5s
    }
  };

  // No mostrar nada si hay conexión
  if (!showOfflineScreen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        
        {/* Contenedor principal */}
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
          
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center text-white relative">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <MdSignalWifiOff className="text-3xl text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Sin conexión</h2>
              <p className="text-sm opacity-90">
                Se requiere acceso a internet para continuar
              </p>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-6">
            
            {/* Estado de conexión */}
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600 text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">
                  No hay conexión a internet
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Verifica tu conexión Wi-Fi o datos móviles
                </p>
              </div>
            </div>

            {/* Sugerencias */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <FaWifi className="text-blue-600" />
                Soluciones sugeridas:
              </h4>
              
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Verifica que el Wi-Fi esté conectado</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Asegúrate de tener datos móviles activos</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Intenta moverte a una zona con mejor señal</span>
                </li>
              </ul>
            </div>

            {/* Indicador de conexión lenta */}
            {isSlowConnection && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <FaSignal className="text-yellow-600" />
                <div className="flex-1">
                  <p className="text-xs text-yellow-800 font-medium">
                    Conexión lenta detectada
                  </p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    La aplicación puede tardar en cargar
                  </p>
                </div>
              </div>
            )}

            {/* Botón de reintentar */}
            <button
              onClick={handleRetry}
              disabled={isRefreshing}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
            >
              {isRefreshing ? (
                <>
                  <MdRefresh className="text-lg animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <FaRedo className="text-lg" />
                  <span>Intentar de nuevo</span>
                </>
              )}
            </button>

            {/* Nota informativa */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                La aplicación funcionará normalmente cuando se restablezca la conexión
              </p>
            </div>
          </div>

          {/* Footer con branding */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-sm"></div>
              <span className="font-medium">Sin Batallar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para animaciones */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .bg-white {
          animation: slideUp 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}